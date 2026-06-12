# Events V2 — Issues, Bugs & Design Discussions

> **Living document.** Updated as bugs are found, fixed, or design decisions made.
> Last updated: 2026-04-07 | Session: Events V2 Stabilization + Retiro OC Design

---

## 🔴 BUGS — Must Fix Before Production

### Bug 1: `hasSalida`/`hasEntrega`/`hasRetorno` don't filter reverted events
- **Status:** ✅ Fixed — commit `54a44db`
- **File:** `src/app/(app)/mis-viajes/[id]/page.tsx`
- **Symptom:** After reverting Salida, user cannot re-register Salida. Button doesn't reappear.
- **Root cause:** `events.some(e => e.event_type === 'Salida')` returns `true` for the reverted event (events are immutable). The `revertedIds` set already exists for `lastRevertible` but isn't used in `has*` computations.
- **Fix:** Add `&& !revertedIds.has(e.id)` to all `has*` computations. Move `revertedIds` computation before these lines.

### Bug 2: Reversión doesn't decrement `qty_delivered` *(RE-VERIFIED: code IS correct)*
- **Status:** ✅ Code is correct — the double-delivery was caused by Bug 1 (re-registering on a line that appeared still deliverable)
- **Root cause of confusion:** Bug 1 allowed a second Entrega on the laptop line because `hasEntrega` was still false after reversion (wrong — it was true, but the Entrega button showed because the line was still 'En Transito' from the reversion). The `handleRevert` code correctly fetches `trip_event_lines` and decrements.
- **Data cleanup:** Staging wiped clean on 2026-03-25.

### Bug 3: Banner "Confirmar Recepción" bypasses code verification
- **Status:** ✅ Re-diagnosed — NOT a bypass bug
- **Root cause:** The laptop line had `requires_code=false` in the DB because of the `bulkRequiresCode` bug (fixed in Batch 9). The DeliveryModal correctly checks `requires_code` per line. The banner itself just navigates to `/mis-viajes/[id]?action=deliver` which opens DeliveryModal — no bypass.
- **Remaining concern:** If NO line in the trip has `requires_code=true`, the modal allows delivery without code. This is BY DESIGN — code is optional per line.

### Bug 4: `qty_dispatched` not reflected in UI
- **Status:** ✅ Fixed — commit `54a44db`
- **File:** `src/app/(app)/mis-viajes/[id]/page.tsx` — `AssignmentRow`
- **Symptom:** Charris edits qty from 30→20 in DispatchModal, but trip detail and solicitud detail still show 30.
- **Root cause:** `AssignmentRow` displays `quantity_assigned` (programmed qty). `qty_dispatched` is saved to `trip_line_assignments` but never read in the UI.
- **Fix:** Show `qty_dispatched` when different from `quantity_assigned`, with "(programado: X)" annotation.

### Bug 5: Double delivery on laptop (SM-002) — qty_delivered=2 for qty=1
- **Status:** ✅ Root cause identified — combination of Bug 1 + bulkRequiresCode bug
- **Data cleanup:** Staging wiped clean.
- **Prevention:** Fix Bug 1 (filter reverted events) prevents the re-delivery scenario.

### Bug 6: Reversion event doesn't specify WHAT was reverted in timeline
- **Status:** ✅ Fixed — commit `54a44db`
- **File:** `src/components/viajes/EventTimeline.tsx`
- **Symptom:** Timeline shows "Reversion" with reason but not "Revirtió: Entrega".
- **Fix:** Look up `reverts_event_id` in events array, show the original event type.

### Bug 7: `handleRevert` of Entrega doesn't update `trip_line_assignments.qty_delivered`
- **Status:** ✅ Fixed — Code commit (Phase B fixes)
- **File:** `src/app/(app)/mis-viajes/[id]/page.tsx` — `handleRevert`
- **Symptom:** After reverting an Entrega, `sm_request_lines.qty_delivered` is correctly decremented, but `trip_line_assignments.qty_delivered` retains the old value.
- **Impact:** Causes stale data in AssignmentRow display and future reporting. Not critical for functionality (logic uses `sm_request_lines`), but data inconsistency.
- **Fix:** In handleRevert for Entrega, also decrement `trip_line_assignments.qty_delivered` for each reverted line.
- **Found by:** Claude Chat audit, 2026-03-25

### Bug 8: Retorno completes trip without checking line delivery status
- **Status:** ✅ Fixed — undelivered lines return to Pendiente/Parcial with qty_scheduled decremented
- **Refinement (Audit #2, A4):** Original fix included 'Programada' lines — incorrect. Lines still 'Programada' were never dispatched, Retorno shouldn't touch them. Filter changed to `['En Transito']` only.
- **File:** `src/hooks/useTripEvents.ts` — `registerEvent` Retorno handler
- **Symptom:** Retorno sets `trips.status = 'Completado'` without verifying if lines are delivered. Creates inconsistent data (trip Completado + lines En Transito).
- **Root cause:** Retorno goes through old EventModal → `handleRegisterEvent` → `registerEvent`. The handler just does `UPDATE trips SET status = 'Completado'` without any line check.
- **This is the direct cause of Data Integrity issue DI-1.**
- **Fix options:** See Design D1 discussion. Minimum: add warning before completing with undelivered lines.
- **Found by:** Claude Chat audit, 2026-03-25

---

## 🔍 ADDITIONAL FINDINGS — Code Audit 2026-03-25

### Finding 1: Dead code — old `registerEvent` Salida/Entrega handlers ✅ RESOLVED by C3
- Guard added, dead code removed.

### Finding 2: Reverse-order reversion works naturally ✅
- **Good news:** `lastRevertible` takes the last non-reverted event. So for [Salida, Entrega, Retorno], you MUST revert Retorno first, then Entrega, then Salida. Design D7 is already implemented implicitly.
- **Status:** D7 updated below.

---

## 🔴 CODE AUDIT — Issues found by Claude Code (2026-03-25)

> Claude Code ran a full codebase audit. Issues cross-referenced with Claude Chat findings.

### CRITICAL

**C1: `notifyReversionRegistrada()` hardcodes placeholder data** ✅ FIXED
- **File:** `notifications/actions.ts`
- **Fix applied:** Function now receives real eventType + reverter personId, fetches name.

**C2: `qty_dispatched` column missing from PRODUCTION database** ⚠️ DEPLOYMENT BLOCKER
- **File:** `hooks/useTrips.ts`
- **Issue:** Column exists in staging but NOT in production. If code deploys before DB migration, queries fail silently and `qty_dispatched` always defaults to 0.
- **VERIFIED by Claude Chat:** ALL Batch 4 columns/tables missing from production:
  - `trip_line_assignments.qty_dispatched` ❌
  - `trip_events.source` ❌
  - `trip_events.reverts_event_id` ❌
  - `sm_request_lines.requires_code` ❌
  - `sm_requests.fulfillment_type` ❌
  - `trips.is_self_pickup` ❌
  - `trip_event_lines` table ❌
  - `delivery_observations` table ❌
- **Fix:** Must `merge_branch` (staging → prod) BEFORE merging `jaime/dev` → `main`. Order matters.

**C3: `registerEvent()` Salida/Entrega handlers** ✅ FIXED
- **Fix applied:** Guard added — returns error directing to correct modal. Dead code removed.

### HIGH

**H1: `fulfillment_type` not preserved on edit** ✅ FIXED
- **Fix applied:** `fulfillment_type: 'fleet'` added to initial header state.

**H2: `notifyViajeEditado()` wrong eventType** ✅ FIXED
- **Fix applied:** Changed from `'viaje_reprogramado'` to `'viaje_editado'`.

**H3: `notifyEntregaConfirmada()` hardcodes receiver name** ✅ FIXED
- **Fix applied:** Function accepts and displays real receiver name from caller.

**H4: Duplicate recipient filtering in notification functions**
- **File:** `notifications/actions.ts`
- **Issue:** `notifySolicitudUrgenteNueva()` and `notifyAlertaDiariaUrgentes()` filter recipients manually instead of using centralized `sendNotification()` filter. Double source of truth.
- **Fix:** Consolidate to use `sendNotification()` filtering only.

### MEDIUM

**M1:** EventModal inline component is partial dead code (only Llegada/Retorno/Incidencia use it)
**M2:** `updateTrip()` doesn't validate `quantity_assigned` against `qty_delivered` — can create impossible state
**M3:** Line deletion not atomic — trip_line_assignments then sm_request_line, second failure leaves orphan
**M4:** `registerEvent()` doesn't validate assignedLineIds belong to trip — could update wrong lines
**M5:** Dashboard "En Tránsito" has unsafe type casting — `firstLine.to_location[0]` can be undefined
**M6:** Proxy excludes `/api/cron` entirely — new sub-endpoints bypass middleware
**M7:** New notification types (material_preparado, reversion_registrada) not in `notification_preferences` — users can't control them
**M8:** Race condition in `useAuth` — `getUser()` and `onAuthStateChange()` both call `fetchPersonAndProjects()` async

### LOW

**L1:** `TripWithRelations.attachments` typed as `unknown[]` not `Attachment[]`
**L2:** `_deletedLineIds` param in `saveSolicitud()` is dead parameter
**L3:** `APP_URL` hardcoded to `rein-eisenwerk.com` — domain change breaks links
**L4:** `formatQty()` doesn't handle negative numbers
**L5:** 50+ `console.log` in notifications — consider formal logger

---

## 🟠 DATA INTEGRITY — Issues Found in Staging Audit

> All staging data was wiped on 2026-03-25. These issues document patterns to watch for.

### DI-1: Trip Completado with lines still "En Transito" (MOV-2026-001)
- **Pattern:** Salida → Entrega (REVERTED) → Retorno. Retorno completed trip, but reverted Entrega left lines in En Transito.
- **Status:** ✅ Prevented by Bug 8 fix — Retorno now returns undelivered lines to Pendiente/Parcial.

### DI-2: Reverted Salida with active Llegada (MOV-2026-004)
- **Pattern:** Salida (REVERTED) → Llegada (active). Logically impossible.
- **Status:** ✅ Prevented by D7 fix — Llegada now in revertibleTypes, must revert before Salida.

### DI-3: Pickup lines mixed with fleet lines (MOV-2026-005)
- **Pattern:** Solicitud `25-505-SM-002` (fulfillment_type='pickup') had a line in MOV-2026-005 which is a fleet trip (`is_self_pickup=false`).
- **No validation prevents this.** See Design D4 below.

---

## 🟡 DESIGN — Needs Discussion Before Implementing

### D1: Retorno without Entrega → Trip Completado but lines En Transito
- **Status:** ✅ Resolved — Bug 8 fix implements option (b): undelivered lines return to Pendiente/Parcial with qty_scheduled decremented. Trip still completes. Cascade re-evaluates solicitudes.

### D2: Shortcuts in programación are irrelevant
- **Current:** "Despachar →" and "Ver Eventos →" just link to trip detail page (same as clicking the row).
- **James's idea:** Button on solicitud that pre-selects all its lines for a new trip, pre-fills fields.
- **Recommendation:** Replace shortcuts with "Programar solicitud" button. Much more useful for Charris.
- **Status:** ⏳ Pending design

### D3: No signifiers for pickup/requires_code in backlog
- **Problem:** Charris can't tell which lines require confirmation code when programming trips.
- **Fix:** Badge 🔑 on lines with `requires_code=true` in the backlog. Pickup badges deferred until pickup feature is redesigned.
- **Status:** ⏳ Pending implementation (pickup portion deferred)

### D4: Pickup + fleet lines can be mixed in one trip
- **Status:** ⏳ DEFERRED — Pickup feature being hidden from solicitud form. Will redesign properly when Charris and PMs clarify how pickup decisions happen in reality. Decision: pickup should be at programming level (Charris decides), not solicitud level (PM decides).

### D5: Reversión should be restricted to who registered the event
- **Current:** Any logistica/admin can revert any event.
- **Problem:** If Jacome registered Entrega, Charris shouldn't revert it.
- **Fix:** Only `registered_by` + admin can revert. Compare `revertEvent.registered_by` with `person.id`.
- **Status:** ⏳ Pending implementation

### D6: Dashboard "En Tránsito" needs clickable links
- **Current:** Shows trip info but doesn't link anywhere.
- **Fix:** Click on trip → `/mis-viajes/[id]`. Click on solicitud → `/solicitudes/[id]`.
- **Future:** GPS integration will make this section much more valuable.
- **Status:** ⏳ Pending implementation

### D7: Reversión cascade — Llegada edge case
- **Status:** ✅ Fixed — Llegada added to revertibleTypes. Revert clears actual_arrival. Must revert Llegada before Salida (enforced by lastRevertible).

### D8: PM with Incidencia — was designed for conductors
- **Current:** PM can register Incidencia.
- **Question:** Should PM have this? Originally designed for conductors reporting problems in route.
- **Recommendation:** Keep — PM may need to report issues like "material never arrived" or "wrong item delivered".
- **Status:** ⏳ Pending James's decision

### D9: Línea removed from dispatch stays as Programada
- **Current:** When Charris unchecks a line in DispatchModal, it stays assigned to the trip with status Programada.
- **Options:**
  - a) Unassign from trip (delete trip_line_assignment) → returns to backlog
  - b) Keep as is — line stays in trip for next dispatch attempt
- **Recommendation:** Option (a) — cleaner. If Charris didn't dispatch it, it should be available for other trips.
- **Status:** ⏳ Pending James's decision

### D10: Pickup badge missing in solicitudes list (#15 from testing)
- **Current:** Batch 11 added pickup badge but James reports it's not showing.
- **Needs verification** after staging wipe + new test data.
- **Status:** ⏳ Needs re-test

---

## 🔍 TECHNICAL CONSIDERATIONS

### TC-1: Dual code path for Entrega
- **Issue:** Old `handleRegisterEvent` (via EventModal) and new `handleDelivery` (via DeliveryModal) both handle Entrega but with different logic. Old path doesn't insert `trip_event_lines`.
- **Risk:** If any edge case routes Entrega to EventModal, `trip_event_lines` won't exist → reversion will fail silently.
- **Mitigation:** The rendering logic explicitly routes `activeEvent === 'Entrega'` to DeliveryModal. EventModal catch-all excludes 'Entrega'. Should be safe unless new event types are added without updating the catch-all.

### TC-2: Race condition on qty_delivered
- **Issue:** Two users registering delivery simultaneously both read `qty_delivered=0`, both calculate `0+1=1`, both UPDATE to 1. Result: 1 instead of 2.
- **Likelihood:** Very low — only one person typically registers delivery per trip.
- **Mitigation (future):** Use `SET qty_delivered = qty_delivered + X` instead of fetching-then-setting. Requires Supabase RPC or raw SQL.

### TC-3: `confirmation_code_used` doesn't track WHO validated
- **Current:** Records the code used but not who entered it.
- **Future:** When `recibidor` role exists, need to know if the authorized receiver validated.

### TC-4: `enforce_qty_integrity` trigger exists and works
- **Confirmed:** Trigger blocks `qty_delivered < 0` and `qty_delivered > quantity`.
- **Frontend protection:** `Math.max(0, ...)` in `handleRevert` prevents triggering the constraint.

---

## ✅ COMPLETED FIXES (This Session)

| Fix | Commit | Description |
|-----|--------|-------------|
| Error #310 | `b14ba4c` + hook fix | `useSearchParams` → `window.location.search`, hook order fix |
| Type gaps (Batch 6) | `a267467` | Missing fields in `LineWithRelations`, `SolicitudWithRelations`, `lineToInput` |
| Lifecycle timestamps | Migration (prod+staging) | Trigger fires on INSERT+UPDATE, backfilled `date_submitted` |
| DispatchModal conductor | In Batch 8 commit | Filter only `app_role='campo'` |
| bulkRequiresCode | In Batch 9 commit | New lines inherit bulk checkbox state |
| complete_pickup_trip() | Migration (staging) | SECURITY DEFINER function for PM to complete pickup trips |
| Staging data wipe | Direct SQL | All transactional data deleted, master data preserved |
| Phase A fixes | `54a44db` | Reverted events filtering, qty_dispatched display, reversion timeline detail |
| Phase B fixes (8) | Code commit | Bug 7+8, C1+C3, H1-H3, D7 — notifications, reversion, Retorno line cleanup, Llegada revertible |
| Defensive fixes (8) | Code commit | Retorno resets qty_dispatched, orphan trip cleanup, delivery clamp, terminal status guard, cron auth, PII logging |
| Audit #2 fixes (5) | Code commit | A1: busyRef finally, A2: PMs in retorno, A3: dead deliveredQuantities, A4: Retorno filter fix, M1+M3: error log + qty clamp |

---

## 📋 TESTING CHECKLIST — Post-Fix Validation

After Phase A fixes land, test these scenarios on clean staging:

### Flow 1: Basic fleet — create → program → dispatch → deliver → retorno
- [ ] Create solicitud with 2 lines (1 equipo, 1 material)
- [ ] Program trip with conductor + vehículo
- [ ] Dispatch via DispatchModal (change conductor, edit qty)
- [ ] Verify qty_dispatched shows correctly
- [ ] Register Entrega via DeliveryModal
- [ ] Register Retorno
- [ ] Verify solicitud → Completada

### Flow 2: Code verification
- [ ] Create solicitud with `bulkRequiresCode` ON
- [ ] Verify line has `requires_code=true` in DB
- [ ] Program + dispatch
- [ ] Entrega → code field appears, wrong code blocked, correct code allows

### Flow 3: Reversion cycle
- [ ] Dispatch → Revert Salida → trip back to Programado → re-dispatch works
- [ ] Deliver → Revert Entrega → qty_delivered decremented → re-deliver works
- [ ] Verify timeline shows "Revirtió: Salida" / "Revirtió: Entrega"

### Flow 4: Pickup
- [ ] Create pickup solicitud (fulfillment_type='pickup')
- [ ] Program as "Retiro en Chilibre" (no conductor/vehículo, MVLPUP rate)
- [ ] Register Preparación
- [ ] Register Retiro with code (always required)
- [ ] Trip → Completado

### Flow 5: Multi-delivery
- [ ] Create solicitud with qty=10
- [ ] Dispatch
- [ ] Deliver partial (qty=6) → line status Parcial, qty_delivered=6
- [ ] Deliver remaining (qty=4) → line status Entregada, qty_delivered=10

### Flow 6: Integrity audit (run SQL after each flow)
```sql
-- No qty_delivered > quantity
SELECT * FROM sm_request_lines WHERE qty_delivered > quantity;
-- No Completada solicitud with non-Entregada lines
SELECT r.request_id, srl.status FROM sm_request_lines srl
JOIN sm_requests r ON r.id = srl.request_id
WHERE r.status = 'Completada' AND srl.status NOT IN ('Entregada','Cancelada');
-- No Completado trip with En Transito lines
SELECT t.trip_id, srl.status FROM trips t
JOIN trip_line_assignments tla ON tla.trip_id = t.id
JOIN sm_request_lines srl ON srl.id = tla.request_line_id
WHERE t.status = 'Completado' AND srl.status = 'En Transito';
```

---

## 🏗️ ARCHITECTURAL DEBT — Critical for Professional-Grade System

> These items represent gaps between the current implementation and the architecture defined in project documents (`Self-Pickup_Rewires_the_Entire_Execution_Lifecycle.md`, `VISION_ROADMAP.md`). The current implementation works as MVP but diverges from the recommended professional architecture.

### AD-1: Self-pickup forced into Trip entity — should be separate `PickupOrder`
- **Project doc says:** *"Do not create a Trip for self-pickup. Create a separate `PickupOrder` entity. A Trip implies fleet vehicle assignment, driver tracking, departure/arrival events — none of which apply."* (Self-Pickup doc, page 1)
- **What we built:** `trips.is_self_pickup=true` — forced pickup into Trip with null driver, null vehicle, phantom conductor fields.
- **Why it matters:**
  - A Trip with no driver, no vehicle is semantically broken — every Trip query/display must now check `is_self_pickup` to hide nonsensical fields
  - ToolWatch and Hilti ON!Track both use separate entities for walk-up pickups vs shipments (Pick Tickets vs Express Check-Out)
  - Future transport methods (third-party, inter-project transfers) will require the same hack — each one adding more conditionals to Trip
- **Correct architecture:** `pickup_orders` table with 3-state machine (Creado → Preparado → Completado). Both Trip.Entrega and PickupOrder.Retiro converge at `custody_transfers`.
- **Migration path:** Create `pickup_orders` + `custody_transfers` tables, migrate existing pickup trips, refactor frontend to use new entities.
- **Effort:** ~2 weeks (schema + frontend + data migration)
- **Status:** ⏳ Must plan before building more features on top of the hack

### AD-2: No `custody_transfers` table — the fundamental primitive is missing
- **VISION_ROADMAP says:** *"La tabla `custody_transfers` es el punto de convergencia. Un solo trigger actualiza equipment.current_location."*
- **Self-Pickup doc says:** *"Both Entrega (delivery) and Retiro (pickup) should write to a `custody_transfers` table. A single trigger on that table updates equipment.current_location."*
- **What we have:** Equipment location trigger is coupled directly to `trip_events` → checks `sm_request_lines.status = 'Entregada'`. No universal custody abstraction.
- **Why it matters:**
  - Adding any new fulfillment method (third-party, inter-project) requires modifying the trigger
  - No immutable chain-of-custody log — critical for construction compliance
  - Tenna and Hilti ON!Track both use scan-confirmed location changes regardless of transport method
- **Correct architecture:**
  ```
  Fleet:    Trip.Entrega ──► INSERT custody_transfer ──► trigger UPDATE equipment.location
  Pickup:   PickupOrder.Retiro ──► INSERT custody_transfer ──► trigger UPDATE equipment.location
  Third-party: (future) ──► INSERT custody_transfer ──► same trigger
  ```
- **`custody_transfers` schema (from VISION_ROADMAP):**
  - equipment_id, from_location, to_location
  - from_custodian (warehouse), to_custodian (PM)
  - timestamp, confirmation_method, fulfillment_method (enum: fleet_delivery | self_pickup | third_party)
- **Effort:** ~1 week (schema + trigger refactor + data backfill)
- **Status:** ⏳ Should be built BEFORE more fulfillment methods are added

### AD-3: Fulfillment at Trip level, not line level — blocks hybrid fulfillment
- **Self-Pickup doc says:** *"A single solicitud should absolutely support mixed fulfillment. The PM might pick up five bags of cement personally but need Charris to send a lowboy for the excavator."* And: *"Shopify notably does NOT support mixed ship/pickup on one order, which is a known limitation. MovimientOS should avoid this mistake."*
- **What we built:** `sm_requests.fulfillment_type` (header-level) + `trips.is_self_pickup` (trip-level). A solicitud is EITHER fleet OR pickup, not mixed.
- **Correct architecture:** `fulfillment_method` on each `sm_request_lines` (line-level). When Charris programs, she assigns some lines to a Trip and creates a PickupOrder for others. The solicitud aggregates status across both.
- **Impact:** Currently a PM who needs 1 item by truck and 1 by pickup must create 2 separate solicitudes. Extra work, no visibility of the combined need.
- **Effort:** ~1 week (move field to line level, update UI, update programming flow)
- **Status:** ⏳ Depends on AD-1 (PickupOrder entity)

### AD-4: Confirmation code reversal not implemented for pickup
- **Self-Pickup doc says:** *"For self-pickup, the PM is the receiver, so the code dynamic inverts. The warehouse worker verbally shares [the code]. The PM enters it in their app to confirm pickup."*
- **What we built:** PickupModal does require code always (correct), but the code visibility logic hasn't been verified — warehouse role should see the code, PM should NOT see it until entering it.
- **Current behavior:** `canSeeConfirmationCode = role === 'logistica' || role === 'admin' || role === 'pm'` — PM CAN see the code, which breaks the verification purpose for pickup.
- **Fix:** For pickup trips, PM should NOT see confirmation_code. Only almacen/logistica/admin should see it.
- **Effort:** Small — add `&& !isPickup` condition to PM code visibility, or check `trip.is_self_pickup` in the display logic.
- **Status:** ⏳ Quick fix, should do before production

### AD-5: No warehouse worker mobile UX optimization
- **Self-Pickup doc says:** Use 4 distinct audio tones, minimum 56×56dp touch targets for gloved hands, high contrast for outdoor/dim warehouse, offline support with queued sync.
- **What we have:** Same generic UI for all roles.
- **Status:** 🔮 Future — not blocking for MVP but important for adoption in Chilibre warehouse

---

## Priority Matrix — What to fix and when

### ⛔ DEPLOYMENT BLOCKER (must do BEFORE merging to production):
| Item | Type | Action |
|------|------|--------|
| C2: Batch 4 migration not in production | DB | `merge_branch` staging → production BEFORE code deploy |
| `complete_pickup_trip()` function | DB | Also only in staging — needs merge |

**Deploy sequence:** 1) merge_branch → 2) git merge jaime/dev → main → 3) Vercel auto-deploys

### 🎯 IMMEDIATE NEXT STEPS (in order)

**Step 1: Code prompt — Remove pickup from solicitud + Playwright test setup**
- Remove `fulfillment_type` radio from solicitud creation form (D11)
- After implementing, run Playwright test flow #1 (basic fleet) to verify nothing broke
- Pickup toggle in programación (crear viaje) stays as-is — it works correctly there

**Step 2: Design review — Parada Level 1**
- Review D12 Level 1 design in this document
- Confirm modal fields, event sequence, notification targets
- Identify any DB changes needed (new fields on trip_events)

**Step 3: Implement Parada Level 1**
- Code implements from goal-oriented prompt
- New event type, ParadaModal, EventTimeline updates, notifications
- Playwright tests verify the complete flow

**Step 4: Full staging test + production deploy**
- All test flows pass on staging (including new Parada flow)
- merge_branch staging → prod
- git merge jaime/dev → main

### ✅ Pre-production code fixes — ALL COMPLETED
| Item | Status |
|------|--------|
| C1: notifyReversionRegistrada placeholders | ✅ Fixed |
| C3: registerEvent Salida/Entrega guards | ✅ Fixed |
| H1: fulfillment_type preserved on edit | ✅ Fixed |
| H2: notifyViajeEditado eventType | ✅ Fixed |
| H3: notifyEntregaConfirmada receiver name | ✅ Fixed |
| Bug 7: handleRevert trip_line_assignments | ✅ Fixed |
| Bug 8: Retorno with undelivered lines | ✅ Fixed |
| D7: Llegada in revertibleTypes | ✅ Fixed |
| A1: busyRef in saveSolicitud finally | ✅ Fixed (Audit #2) |
| A2: PMs in retorno notification | ✅ Fixed (Audit #2) |
| A3: deliveredQuantities dead code | ✅ Fixed (Audit #2) |
| A4: Retorno filter En Transito only | ✅ Fixed (Audit #2) |
| Defensive fixes (8) | ✅ Fixed (orphan trips, clamp, terminal guard, etc.) |

### Next: Perfecting the Event System
| Item | Type | Description |
|------|------|-------------|
| **D11: Remove pickup from solicitud form** | Decision MADE | Remove `fulfillment_type` radio from solicitud creation entirely. Pickup already works correctly at trip level in programación (Charris toggles "Retiro", hides conductor/vehículo, uses MVLPUP $75 tarifa). Pickup is Charris's decision, not PM's. **Ready for Code prompt.** |
| **D12: Parada — intermediate stop event** | New feature | Conductor registers stops at suppliers/warehouses/other locations. Types: retiro, entrega, intercambio. Attach invoices. Notify stakeholders. **3-level design documented. Level 1 ready for implementation.** |
| **D13: DGI QR invoice scanning** | Level 2 of D12 | Scan factura QR → extract CUFE → store for verification. Panama-specific. Depends on Level 1 being in use. |
| D3: Signifiers in backlog | Design | Badges for requires_code lines. Pickup badges deferred until pickup redesign. |
| D5: Reversión restricted to registrant | Design | Only who registered + admin can revert |
| D6: Dashboard links | Design | Click → trip/solicitud detail |

### Architectural debt (plan before more features):
| Item | Type | Status |
|------|------|--------|
| AD-1: PickupOrder entity | Arch debt | ⏳ DEFERRED — hide pickup first, redesign later with user input |
| AD-2: custody_transfers table | Arch debt | ⏳ Still needed, foundation for Parada + pickup + future methods |
| AD-3: Line-level fulfillment | Arch debt | ⏳ Depends on AD-1, deferred with pickup |
| AD-4: PM sees code on pickup | Arch debt | ⏳ Deferred with pickup feature |
| AD-5: Warehouse mobile UX | Arch debt | 🔮 Future |

---

## 🆕 D12: Parada — Intermediate Stop Event Design

> **Status:** Design agreed, ready for Level 1 implementation (2026-04-07)
> **Renamed:** Originally "Retiro OC" → renamed to "Parada" because stops aren't always OC pickups.
> **Context:** Real example: SM-041 (MOV-2026-009). Trip went Taller → TUBOTEC → FEINSA → Muelle 14 → Taller. System only captured Salida/Entrega/Retorno — lost all supplier stop data.

### The problem
Trips frequently make intermediate stops that the system can't record. These stops include:
- Retiro de OC en proveedor (most common — pickup purchase order materials)
- Entrega de tanques vacíos / material a devolver
- Buscar material en taller externo
- Dejar materiales en bodega/almacén de la empresa
- Intercambio (dejar y recoger en el mismo punto)

All share the same structure: conductor stops at a location, does something, optionally documents what happened.

### Real-world flow (from Charris)
1. Charris programs trip with lines from different origins (order of lines = route order)
2. Conductor leaves Taller → goes to Supplier A → Supplier B → Project → returns to Taller
3. At each stop: picks up/drops off material, sometimes receives invoice
4. Conductor delivers everything to project
5. For OC stops: project scans paper invoice, sends to Calderon (often weeks late)

### What MovimientOS should capture
New event type: **"Parada"** — registered by conductor at each intermediate stop.

```
MOV-2026-009 Timeline:
  🚛 Despacho    8:30  — Charris (Taller Chilibre)
  📍 Parada      9:15  — Conductor en TUBOTEC SA
       Tipo: Retiro de material
       OC 29902: PARCIAL — "Faltan 65 tubos PVC, los tendrán el jueves"
       📎 Factura-TUBOTEC-1234.pdf
  📍 Parada     10:30  — Conductor en FEINSA SA
       Tipo: Retiro de material
       OC 29903: COMPLETO
       📎 Factura-FEINSA-5678.pdf
  ✅ Entrega     1:45  — Jacome en Muelle 14
       Todo lo recogido entregado OK
  🏠 Retorno     3:35  — Conductor (Taller)
```

### Design decisions (confirmed with James 2026-04-07)
- **Name: "Parada"** — generic, covers all intermediate stop types
- Route is implicit from line order (no trip_stops table needed)
- OC works at bulk level (1 OC = 1 line), not item-by-item per Charris's preference
- Partial pickup is common — conductor always picks up what's available, notes what's pending
- Each supplier gives a separate invoice
- Parada is **informational** — does NOT change solicitud line status. Entrega at project is what changes status.
- Pending items from partial pickups are recorded as text notes (Level 1). Future levels add structured tracking.
- Calderon does NOT use the app. Invoice reach him via email notification with attachment link.
- The Parada button appears in the event buttons panel (mis-viajes/[id]) alongside Salida/Entrega/Retorno
- Lines from locations ≠ Taller Chilibre are auto-identified as potential intermediate stops
- Parada is optional — not required before Entrega. Available after Salida, before Retorno.
- Multiple Paradas per trip (one per stop)

---

### 📐 LEVEL 1 — Implement NOW (with Parada feature)

**Scope:** Conductor registers what happened at each stop. Everything is text + attachments. Zero document processing.

**ParadaModal (new component):**
```
┌─────────────── PARADA INTERMEDIA ────────────────────┐
│                                                       │
│  Ubicación: [TUBOTEC SA - Milla 8___________]        │
│  (auto-suggested from "desde" of trip lines,          │
│   or free text for unplanned stops)                   │
│                                                       │
│  Tipo de parada:                                      │
│  ○ Retiro de material/equipo                          │
│  ○ Entrega de material/equipo                         │
│  ○ Intercambio (deja y recoge)                        │
│                                                       │
│  ── Líneas afectadas (optional) ──                    │
│  ☑ OC 29902 Tubos PVC    [Completo ▼]               │
│     Notas: [Faltan 65 tubos, los tendrán el jueves]  │
│  ☑ OC 29903 Tubos cuadrados  [Completo ▼]           │
│                                                       │
│  ── Referencia OC (optional) ──                       │
│  Nro OC: [29902____]                                 │
│                                                       │
│  ── Documentos ──                                     │
│  📎 [Subir factura / nota de entrega / foto]          │
│                                                       │
│  Notas: [________________________________]           │
│                                                       │
│            [Cancelar]  [✅ Registrar Parada]          │
└───────────────────────────────────────────────────────┘
```

**Technical implementation:**
- New event type `'Parada'` in trip_events
- `trip_event_lines` records per-line status at this stop (completo/parcial/no_disponible) — optional, not all Paradas have associated lines
- New fields on trip_events for Parada: `stop_location` (text), `stop_type` (enum: retiro/entrega/intercambio)
- Invoice/photos attached via existing `trip_events.attachments`
- Email notification to relevant stakeholders when Parada has attachments (invoice uploaded)
- EventTimeline shows 📍 icon with stop details
- EventButton for "Parada" appears after Salida, available until Retorno

**What this does NOT do:**
- Does not change any solicitud/line status
- Does not parse or digitize OC PDFs
- Does not extract data from invoices
- Does not track OC completion status in structured form
- Pending items are free-text notes only

**What this DOES solve (the 80%):**
- ✅ System records what happened at each stop — no more lost information
- ✅ Invoices are uploaded immediately at the stop — Calderon gets them same-day via email
- ✅ Partial pickups documented — everyone can see what's pending
- ✅ Timeline shows the complete route story, not just Salida/Entrega/Retorno

---

### 📐 LEVEL 2 — After Level 1 is in use (DGI QR invoice scanning)

**Scope:** When conductor uploads a factura, option to scan the QR code for structured data.

**How it works:**
1. Conductor takes photo of factura OR taps "Escanear QR"
2. Camera opens, scans the DGI QR code on the factura
3. QR contains URL like `https://dgi-fep.mef.gob.pa/Consultas/FacturasPorCUFE?cufe=FE01...`
4. App extracts the CUFE (Código Único de Factura Electrónica) from the URL
5. CUFE is stored in the database alongside the attachment
6. Anyone can verify the factura against DGI by clicking the CUFE link

**What this adds:**
- `invoice_cufe` field on trip_events (or a new `invoices` table linked to trip_events)
- QR scanner component (camera + URL parsing — no external API needed)
- CUFE stored = factura is now verifiable and searchable
- Notification to Calderon includes CUFE link for instant DGI verification

**What this does NOT do:**
- Does not query DGI API for structured data (requires ICONSA to be registered as electronic receiver)
- Does not auto-match invoices to purchase orders
- Does not extract line items from invoices

**Why it's valuable:**
- Panama-specific competitive advantage — no US/international construction software has this
- Every factura electrónica has a QR by law (since 2023 for all new RUCs)
- Verification takes seconds vs manual lookup
- Structured CUFE enables future matching and reporting

---

### 📐 LEVEL 3 — Future (Full Procurement Module)

**Scope:** Activate `purchase_orders` + `purchase_order_lines` tables. Digitize OCs. Track fulfillment. Match invoices.

**Prerequisites:**
- IC-LOG-PO-01 (Procurement procedure) must be fully understood and mapped
- Calderon/Jose Miguel workflow for creating OCs must be defined
- Decision: does ICONSA register with a PAC for electronic invoicing? (mandatory for >B/.36,000/yr or >100 invoices/mo since Jan 2026)

**What this adds:**
- **OC digitization:** Upload OC PDF → Claude API extracts lines, quantities, prices → stored in `purchase_order_lines`
- **OC tracking:** Each line has `qty_ordered`, `qty_received`, `qty_pending` — updated when Parada registers partial pickup
- **Invoice matching:** Invoice CUFE linked to OC → system validates amounts match
- **OC status dashboard:** Calderon sees all OCs with fulfillment status (Pendiente/Parcial/Completa)
- **DGI API integration:** If ICONSA is registered, query `feConsFE` web service for full structured invoice data (RUC, items, amounts, ITBMS)
- **Solicitud-OC linking:** `sm_request_lines.purchase_order_line_id` already exists (FK ready) — enables traceability from request to OC to delivery to invoice

**Schema activation:**
```
purchase_orders (already exists, empty):
  - id, po_number, vendor_id, project_id, status, total_amount, 
  - created_by, approved_by, document_url
  
purchase_order_lines (already exists, empty):
  - id, purchase_order_id, description, quantity, unit_price, 
  - qty_received, qty_pending (generated)

vendors (already exists, empty):
  - id, name, ruc, contact, normalized name (prevents MECO vs Meco vs MECO SA)
```

**What this does NOT cover:**
- Approval workflows for new OCs (Calderon → gerencia)
- Budget tracking per project
- Vendor evaluation/scoring
- Contract management

**This is a separate sprint/feature set — NOT part of the Parada event.**

---

### Reference: Market leaders for each level
| Level | Reference | What they do |
|-------|-----------|-------------|
| 1 (Parada) | **HCSS Dispatcher** — multi-stop scheduling with field notifications | Track stops, status per stop, attachments |
| 2 (QR) | **DGI Panama SFEP** — unique to Panama, no intl tool has this | QR → CUFE → verification |
| 3 (Procurement) | **Procore Commitments** — PO + SOV + invoice + change orders | Full procurement lifecycle |
| 3 (AI extraction) | **Stampli, BILL** — AI invoice processing (12-18mo ahead of Procore) | PDF → structured data |

---

## 🧪 TESTING STRATEGY — Playwright Automated Testing

> **Decision (2026-04-07):** Claude Code should use Playwright MCP to test changes automatically against staging preview.

### Setup
- Playwright MCP already installed in Claude Code
- Staging preview URL: Vercel preview deployment from `jaime/dev` branch
- Test accounts (staging):
  | Email | Role | Password |
  |-------|------|----------|
  | pm@iconsa.test | pm | Test2026! |
  | logistica@iconsa.test | logistica | Test2026! |
  | conductor@iconsa.test | campo | Test2026! |
  | almacen@iconsa.test | almacen | Test2026! |

### Standard test flows (run after every significant change)
1. **Fleet básico:** Login as logistica → crear solicitud → programar viaje → despachar → login as campo → registrar llegada → login as pm → confirmar entrega → login as logistica → registrar retorno → verificar solicitud completada
2. **Código verificación:** Crear solicitud con requires_code → despachar → intentar entrega sin código (debe fallar) → entrega con código correcto
3. **Reversión:** Despachar → revertir salida → re-despachar → entregar → revertir entrega → verificar qty_delivered decrementado
4. **Multi-delivery:** Despachar con qty=10 → entregar parcial qty=6 → verificar status Parcial → entregar resto qty=4 → verificar Entregada
5. **Retorno sin entrega:** Despachar → registrar retorno sin entrega → verificar líneas vuelven a Pendiente
6. **Parada intermedia:** Crear solicitud con líneas de proveedor (from_text=proveedor) → programar → despachar → registrar Parada en proveedor (parcial, con foto de factura, con notas de pendiente) → registrar Entrega en proyecto → Retorno → verificar timeline completo

### After each test: integrity audit
```sql
SELECT * FROM sm_request_lines WHERE qty_delivered > quantity;
SELECT r.request_id, srl.status FROM sm_request_lines srl
JOIN sm_requests r ON r.id = srl.request_id
WHERE r.status = 'Completada' AND srl.status NOT IN ('Entregada','Cancelada');
```

### Prompt pattern for Code
```
After implementing [change], test it using Playwright:
1. Open the staging preview URL
2. Run test flows [1, 3, 5] (specify which)
3. Verify both UI state and DB state
4. Report any failures with screenshots
```

---

## 🔮 FUTURE — Priorities (defined by James)

### Priority 1: Event system perfected
- All current fixes deployed and tested ✅ (code ready, needs staging test + deploy)
- Remove pickup from solicitud form (D11) — decided, needs implementation
- Parada intermediate stop event (D12 Level 1) — design complete, needs implementation
- DGI QR invoice scanning (D12 Level 2) — after Level 1 is in use
- OC procurement module (D12 Level 3) — future, separate sprint

### Priority 2: GPS integration
- Tenna-style geofencing + real-time tracking
- Dashboard "En Tránsito" with map (currently just cards)
- Equipment location auto-update from GPS

### Priority 3: Professional dashboards by role
- PM: costo por proyecto, status solicitudes, equipos asignados
- Charris: dispatch board (HCSS-style), pendientes, flota disponible
- Gerencia: KPIs empresa, tendencias, drill-down
- Taller: WO, equipos grounded, combustible

### Priority 4: Admin settings page
- User management, notification preferences, system config

### Priority 5: Auto-generated reports
- Facturación mensual (highest priority)
- Other reports TBD

### Priority 6: Purchase orders + invoices
- Activate existing `purchase_orders`/`purchase_order_lines` tables
- Link OC lines to solicitud lines
- DGI QR scanning for invoice data extraction
- Calderon instant notifications
