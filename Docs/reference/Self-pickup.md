# Self-pickup rewires the entire execution lifecycle, not just scheduling

**The self-pickup pattern fundamentally changes who acts, what events fire, and how custody is proven — but the equipment location trigger must remain invariant.** The key architectural insight is to introduce a universal `custody_transferred` event that both fleet delivery and self-pickup produce, decoupling the location-tracking trigger from any specific transport method. Industry leaders like ToolWatch and Hilti ON!Track already work this way: they don't track *how* an asset moved, only that a scan confirmed it changed hands. For MovimientOS, this means self-pickup should NOT be forced into the Trip entity. It needs its own `PickupOrder` entity with a simpler state machine, while both flows converge at the same custody transfer point that fires the equipment location update.

The practical implementation path is clear: reverse the 4-digit confirmation code (warehouse holds it, PM enters it), require cost codes with explicit $0 mobilization, support hybrid fulfillment at the line-item level, and give warehouse workers a 2-tap mobile handover flow.

---

## Self-pickup needs its own event sequence, not a modified delivery flow

The current fleet delivery sequence — Salida → Llegada → Entrega → Retorno — assumes a fleet vehicle departing a workshop, arriving at a project, handing over materials, and returning. For self-pickup, **three of these four events are meaningless**. There is no fleet departure, no fleet arrival, and no fleet return. Forcing self-pickup into the Trip model creates phantom events and confused semantics.

The recommended self-pickup sequence has only two required events:

| Phase | Fleet Delivery | Self-Pickup | What triggers it |
|-------|---------------|-------------|-----------------|
| Preparation | Equipment loaded on truck | **Preparado** — warehouse stages items | Warehouse worker marks ready |
| Handover | **Entrega** — driver delivers, PM enters code | **Retiro** — PM picks up, enters warehouse code | Dual confirmation |
| Completion | **Retorno** — driver returns to workshop | *None needed* | Auto-complete after Retiro |

The critical design decision: **do not create a Trip for self-pickup**. Create a separate `PickupOrder` (or `Retiro`) entity. A Trip implies fleet vehicle assignment, driver tracking, departure/arrival events — none of which apply. ToolWatch models this correctly: their system uses distinct **Pick Tickets** for warehouse-to-field movements and **Express Check-Out** for walk-up pickups, rather than forcing both through a delivery workflow. Hilti ON!Track similarly separates **transfers** (warehouse-initiated shipments) from **checkouts** (person-initiated pickups).

Both entities must implement a shared behavior: upon completion, they emit a `custody_transferred` event. This is the **only** event that should trigger equipment location updates.

## The custody transfer event is the architectural linchpin

The existing `update_equipment_location_on_delivery()` trigger fires on the Entrega event. This creates a brittle coupling: add a new fulfillment method and you must add a new trigger. The fix is a single abstraction layer.

**Both Entrega (delivery) and Retiro (pickup) should write to a `custody_transfers` table.** A single trigger on that table updates `equipment.current_location` and `current_project_id`. The trigger doesn't know or care whether the equipment arrived by fleet truck or PM's personal pickup.

```
Fleet Delivery:  Trip.Entrega ──► INSERT custody_transfer ──► UPDATE equipment.current_location
Self-Pickup:     PickupOrder.Retiro ──► INSERT custody_transfer ──► UPDATE equipment.current_location
Future Method:   ThirdParty.Recepción ──► INSERT custody_transfer ──► UPDATE equipment.current_location
```

Each `custody_transfer` record captures: **equipment_id, from_location, to_location, from_custodian (warehouse), to_custodian (PM), timestamp, confirmation_method, and fulfillment_method** (enum: `fleet_delivery | self_pickup | third_party`). This table becomes the immutable chain-of-custody log — critical for construction equipment compliance and dispute resolution. Hilti ON!Track and Tenna both use this exact pattern: they track scan-confirmed location changes regardless of transport method. Tenna additionally uses GPS geofences to auto-detect equipment crossing site boundaries, which could be a future enhancement but isn't necessary for v1.

## Reverse the confirmation code — warehouse holds it, PM enters it

The current 4-digit code works because the PM shares it with the delivery receiver as proof of authorized receipt. For self-pickup, **the PM is the receiver**, so the code dynamic inverts.

The **minimal-change v1 recommendation** reuses the existing code infrastructure: when a self-pickup order is created, the system generates a 4-digit release code visible only to the warehouse worker's app. When the PM arrives and collects the materials, the warehouse worker verbally shares this code. The PM enters it in their app to confirm pickup. This mirrors the delivery flow exactly — just reversed. The warehouse "releases" the code instead of the PM. Implementation requires changing approximately one conditional: who sees the code depends on `fulfillment_method`.

For v2, a **QR-based dual confirmation** is stronger. The PM's app displays a QR code for the pickup order. The warehouse worker scans it, which simultaneously authorizes release and creates the first half of the audit record. The PM then taps "Received" (or the system auto-confirms after the warehouse scan). This produces a dual-signature audit trail: **warehouse_worker_id + pm_id + timestamp + GPS + items**. Received Digital and Track-POD both document this as the industry standard for proof-of-pickup, and it's how Amazon Counter and nShift handle will-call retail pickups.

The key distinction to encode in the system is **authorization vs. confirmation**. Authorization answers "is this person allowed to take these items?" (checked before release). Confirmation answers "did the handover actually happen?" (recorded after release). For fleet delivery, the driver is pre-authorized by Charris's assignment, and the confirmation code proves receipt. For self-pickup, the pickup order itself is the authorization, and the reverse code or QR scan proves release.

## Cost codes stay required — mobilization rate becomes explicit zero

**Every self-pickup movement must carry a cost code.** The cost code tracks *where* the cost is allocated (which project, which phase), not *how much* the transport cost. The material or equipment being moved has the same value regardless of transport method. Procore and Sage 300 CRE both structure costs as **Cost Code × Cost Type** (Labor, Equipment, Materials, Subcontractor). The transport/mobilization component is one cost type within a broader cost code.

For self-pickup, set `mobilization_rate = $0.00` explicitly — never null. **$0 is meaningful data** saying "this movement occurred and fleet transport was not used." Null is ambiguous and breaks comparison analytics. Add a `transport_method` field (enum: `fleet_delivery | self_pickup`) to every movement record so reports can segment by method.

Reports should always include self-pickup movements with their $0 mobilization visible:

- Show a **transport method column** in the movement log so PMs and Charris see the delivery method mix
- Break summary totals by method: "45 deliveries, $12,500 mobilization / 12 self-pickups, $0 mobilization"
- Optionally track a **"delivery method mix" ratio** over time — if self-pickups spike, it may indicate fleet capacity problems or scheduling friction that's pushing PMs to pick up themselves (hidden labor cost)

Self-pickup has real but implicit costs (PM time, fuel, vehicle wear) that are not captured in mobilization rate. For v1, these can be ignored. For a future version, optionally logging PM travel time as a labor cost type against the project would enable true cost comparison.

## Hybrid fulfillment works at the line-item level

A single solicitud should absolutely support mixed fulfillment. The PM might pick up five bags of cement personally but need Charris to send a lowboy for the excavator. This is common in construction — **Shopify notably does NOT support mixed ship/pickup on one order**, which is a known limitation that merchants work around with plugins. MovimientOS should avoid this mistake.

The design is straightforward: add `fulfillment_method` and `fulfillment_entity_id` (polymorphic) to each `solicitud_line_item`. When Charris programs a trip, she assigns some lines to a Trip and marks others as self-pickup, creating a PickupOrder for those lines. The solicitud-level status aggregates across its lines:

- All lines pending → `Pendiente`
- Some lines fulfilled → `Parcialmente Cumplida`
- All lines fulfilled → `Cumplida`

Each fulfillment entity (Trip or PickupOrder) independently manages its own lines through its own state machine. When either completes, it emits `custody_transferred` for its equipment, and the solicitud checks whether all lines are now fulfilled. This pattern comes directly from commercetools, which supports configurable per-line-item state machines — the most flexible model in e-commerce.

## The warehouse worker's mobile handover flow

No construction logistics platform reviewed has an explicit "will-call" status. The closest equivalents are **ToolWatch's Express Check-Out** (self-service kiosk mode with barcode scanning) and **Hilti ON!Track's transfer workflow** (RFID bulk scanning with delivery notes). Both prioritize speed and scanning over manual data entry.

For MovimientOS, the warehouse worker needs two flows, selectable by administrator configuration based on item value and company policy:

**Minimum viable handover (2 taps — for routine pickups):**
1. **Scan** the pickup order QR from PM's phone (or search by order number)
2. **Tap "Confirmar Entrega"** — large green button, full-width, in the thumb zone

Behind the scenes, the system auto-captures: warehouse worker ID (from session), timestamp, GPS, all line items from the order. Total interaction time: **under 10 seconds**.

**Full audit handover (5-7 taps — for high-value equipment):**
1. Scan pickup order QR → system displays items and authorized pickup person
2. Verify picker identity (scan employee badge or confirm name on screen)
3. Scan each item barcode (progress indicator: "3 de 5 escaneados")
4. Quick condition toggle per item: Bueno / Dañado / Incompleto
5. Optional photo of loaded items (auto-geotagged)
6. PM enters release code OR signs on glass
7. Tap "Completar Retiro"

**Critical mobile UX details for construction warehouse workers**: use **4 distinct audio tones** (scan received, success, error, complete) so workers can react without looking at the screen. Make touch targets **minimum 56×56dp** for gloved hands. Use **high contrast** for outdoor/dim warehouse visibility. Support **offline mode** with queued sync — Panama construction sites frequently lose connectivity. Disable the OS navigation bar to prevent accidental app exits. These patterns come from specialized warehouse UX research by Karabin and Barcoding.com, validated across multiple WMS implementations.

## Conclusion

The self-pickup pattern exposes a deeper truth about MovimientOS's event model: it was built around a **single transport method** rather than a **universal custody concept**. The fix is not to bolt pickup events onto the Trip entity but to extract the custody transfer as the fundamental primitive. Three concrete changes make this work: (1) a `pickup_orders` table with its own 3-state machine that emits the same `custody_transferred` event as Trip.Entrega, (2) a reversed 4-digit code where the warehouse holds and shares the code instead of the PM, and (3) `fulfillment_method` on each solicitud line item enabling hybrid fulfillment. The warehouse mobile UX should default to a 2-tap scan-and-confirm flow, escalating to full audit documentation only for high-value equipment. This architecture also future-proofs for third-party transport, inter-project transfers, and return logistics — all of which will eventually need the same custody transfer abstraction.