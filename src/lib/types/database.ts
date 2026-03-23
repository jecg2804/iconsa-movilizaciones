export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          changed_fields: string[] | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_code_categories: {
        Row: {
          cost_category_id: string
          cost_code_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          cost_category_id: string
          cost_code_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          cost_category_id?: string
          cost_code_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_categories_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_code_categories_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_codes: {
        Row: {
          created_at: string | null
          extra_id: string | null
          full_code: string | null
          id: string
          phase_code: string
          phase_description: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          extra_id?: string | null
          full_code?: string | null
          id?: string
          phase_code: string
          phase_description?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          extra_id?: string | null
          full_code?: string | null
          id?: string
          phase_code?: string
          phase_description?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "project_extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_observations: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          notes: string | null
          observation_type: string
          reported_by: string | null
          request_line_id: string
          trip_event_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          observation_type: string
          reported_by?: string | null
          request_line_id: string
          trip_event_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          observation_type?: string
          reported_by?: string | null
          request_line_id?: string
          trip_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_observations_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_observations_request_line_id_fkey"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "sm_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_observations_trip_event_id_fkey"
            columns: ["trip_event_id"]
            isOneToOne: false
            referencedRelation: "trip_events"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          acquisition_type: string | null
          brand: string | null
          capacity: string | null
          category_id: string | null
          created_at: string | null
          current_location: string | null
          current_project_id: string | null
          description: string
          disposal_date: string | null
          engine_serial_number: string | null
          equipment_type: string | null
          fuel_tank_capacity_liters: number | null
          id: string
          inspection_type: string | null
          insurance_expiry: string | null
          internal_asset_tag: string | null
          last_inspection_date: string | null
          last_meter_reading_date: string | null
          meter_reading: number | null
          model: string | null
          next_inspection_due: string | null
          notes: string | null
          ownership_type: string | null
          parent_equipment_id: string | null
          photo_url: string | null
          plate: string | null
          purchase_cost: number | null
          purchase_date: string | null
          qr_code_url: string | null
          serial_number: string | null
          spectrum_code: string | null
          status: string | null
          tracking_tier: string | null
          type_code: string | null
          updated_at: string | null
          weight_class: string | null
          year: number | null
        }
        Insert: {
          acquisition_type?: string | null
          brand?: string | null
          capacity?: string | null
          category_id?: string | null
          created_at?: string | null
          current_location?: string | null
          current_project_id?: string | null
          description: string
          disposal_date?: string | null
          engine_serial_number?: string | null
          equipment_type?: string | null
          fuel_tank_capacity_liters?: number | null
          id?: string
          inspection_type?: string | null
          insurance_expiry?: string | null
          internal_asset_tag?: string | null
          last_inspection_date?: string | null
          last_meter_reading_date?: string | null
          meter_reading?: number | null
          model?: string | null
          next_inspection_due?: string | null
          notes?: string | null
          ownership_type?: string | null
          parent_equipment_id?: string | null
          photo_url?: string | null
          plate?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          qr_code_url?: string | null
          serial_number?: string | null
          spectrum_code?: string | null
          status?: string | null
          tracking_tier?: string | null
          type_code?: string | null
          updated_at?: string | null
          weight_class?: string | null
          year?: number | null
        }
        Update: {
          acquisition_type?: string | null
          brand?: string | null
          capacity?: string | null
          category_id?: string | null
          created_at?: string | null
          current_location?: string | null
          current_project_id?: string | null
          description?: string
          disposal_date?: string | null
          engine_serial_number?: string | null
          equipment_type?: string | null
          fuel_tank_capacity_liters?: number | null
          id?: string
          inspection_type?: string | null
          insurance_expiry?: string | null
          internal_asset_tag?: string | null
          last_inspection_date?: string | null
          last_meter_reading_date?: string | null
          meter_reading?: number | null
          model?: string | null
          next_inspection_due?: string | null
          notes?: string | null
          ownership_type?: string | null
          parent_equipment_id?: string | null
          photo_url?: string | null
          plate?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          qr_code_url?: string | null
          serial_number?: string | null
          spectrum_code?: string | null
          status?: string | null
          tracking_tier?: string | null
          type_code?: string | null
          updated_at?: string | null
          weight_class?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_parent_equipment_id_fkey"
            columns: ["parent_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assemblies: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          primary_equipment_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          primary_equipment_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          primary_equipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assemblies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assemblies_primary_equipment_id_fkey"
            columns: ["primary_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assembly_members: {
        Row: {
          assembly_id: string
          equipment_id: string
          id: string
          is_required: boolean | null
          notes: string | null
        }
        Insert: {
          assembly_id: string
          equipment_id: string
          id?: string
          is_required?: boolean | null
          notes?: string | null
        }
        Update: {
          assembly_id?: string
          equipment_id?: string
          id?: string
          is_required?: boolean | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assembly_members_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "equipment_assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assembly_members_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          code: string
          created_at: string | null
          default_inspection_template_id: string | null
          default_tracking_tier: string | null
          description: string | null
          id: string
          is_minor_equipment: boolean | null
          name: string
          requires_inspection_on_dispatch: boolean | null
          requires_operator_license: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          default_inspection_template_id?: string | null
          default_tracking_tier?: string | null
          description?: string | null
          id?: string
          is_minor_equipment?: boolean | null
          name: string
          requires_inspection_on_dispatch?: boolean | null
          requires_operator_license?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          default_inspection_template_id?: string | null
          default_tracking_tier?: string | null
          description?: string | null
          id?: string
          is_minor_equipment?: boolean | null
          name?: string
          requires_inspection_on_dispatch?: boolean | null
          requires_operator_license?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_categories_default_template_fkey"
            columns: ["default_inspection_template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inspections: {
        Row: {
          context: string
          created_at: string | null
          equipment_id: string
          id: string
          inspection_date: string | null
          inspector_id: string
          location_id: string | null
          meter_reading: number | null
          notes: string | null
          overall_result: string
          pdf_url: string | null
          project_id: string | null
          signature_url: string | null
          template_id: string
          trip_id: string | null
        }
        Insert: {
          context: string
          created_at?: string | null
          equipment_id: string
          id?: string
          inspection_date?: string | null
          inspector_id: string
          location_id?: string | null
          meter_reading?: number | null
          notes?: string | null
          overall_result: string
          pdf_url?: string | null
          project_id?: string | null
          signature_url?: string | null
          template_id: string
          trip_id?: string | null
        }
        Update: {
          context?: string
          created_at?: string | null
          equipment_id?: string
          id?: string
          inspection_date?: string | null
          inspector_id?: string
          location_id?: string | null
          meter_reading?: number | null
          notes?: string | null
          overall_result?: string
          pdf_url?: string | null
          project_id?: string | null
          signature_url?: string | null
          template_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inspections_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_status_log: {
        Row: {
          changed_at: string | null
          changed_by: string
          equipment_id: string
          id: string
          new_status: string
          notes: string | null
          previous_status: string | null
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          equipment_id: string
          id?: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          equipment_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_status_log_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          attachments: Json | null
          category: string
          created_at: string | null
          description: string
          id: string
          person_id: string | null
          person_name: string
          person_role: string
          priority: string
          screen: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          attachments?: Json | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          person_id?: string | null
          person_name: string
          person_role: string
          priority?: string
          screen: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          attachments?: Json | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          person_id?: string | null
          person_name?: string
          person_role?: string
          priority?: string
          screen?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          created_at: string | null
          date: string
          equipment_id: string
          fuel_type: string | null
          id: string
          location_id: string | null
          logged_by: string
          meter_reading: number | null
          notes: string | null
          project_id: string | null
          quantity_liters: number
          receipt_url: string | null
          source: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          equipment_id: string
          fuel_type?: string | null
          id?: string
          location_id?: string | null
          logged_by: string
          meter_reading?: number | null
          notes?: string | null
          project_id?: string | null
          quantity_liters: number
          receipt_url?: string | null
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          equipment_id?: string
          fuel_type?: string | null
          id?: string
          location_id?: string | null
          logged_by?: string
          meter_reading?: number | null
          notes?: string | null
          project_id?: string | null
          quantity_liters?: number
          receipt_url?: string | null
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          caption: string | null
          id: string
          photo_url: string
          response_id: string
          taken_at: string | null
        }
        Insert: {
          caption?: string | null
          id?: string
          photo_url: string
          response_id: string
          taken_at?: string | null
        }
        Update: {
          caption?: string | null
          id?: string
          photo_url?: string
          response_id?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "inspection_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_responses: {
        Row: {
          id: string
          inspection_id: string
          notes: string | null
          result: string
          severity: string | null
          template_item_id: string
          work_order_id: string | null
        }
        Insert: {
          id?: string
          inspection_id: string
          notes?: string | null
          result: string
          severity?: string | null
          template_item_id: string
          work_order_id?: string | null
        }
        Update: {
          id?: string
          inspection_id?: string
          notes?: string | null
          result?: string
          severity?: string | null
          template_item_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_responses_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "equipment_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_responses_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_responses_work_order_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_items: {
        Row: {
          help_text: string | null
          id: string
          is_critical: boolean | null
          label: string
          options: Json | null
          requires_photo_on_fail: boolean | null
          response_type: string
          section_id: string
          sort_order: number
        }
        Insert: {
          help_text?: string | null
          id?: string
          is_critical?: boolean | null
          label: string
          options?: Json | null
          requires_photo_on_fail?: boolean | null
          response_type: string
          section_id: string
          sort_order: number
        }
        Update: {
          help_text?: string | null
          id?: string
          is_critical?: boolean | null
          label?: string
          options?: Json | null
          requires_photo_on_fail?: boolean | null
          response_type?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_sections: {
        Row: {
          description: string | null
          id: string
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          sort_order: number
          template_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          applies_to_categories: string[] | null
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_blocking: boolean | null
          is_mandatory: boolean | null
          name: string
          trigger_context: string[] | null
          validity_hours: number | null
          version: number | null
        }
        Insert: {
          applies_to_categories?: string[] | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_blocking?: boolean | null
          is_mandatory?: boolean | null
          name: string
          trigger_context?: string[] | null
          validity_hours?: number | null
          version?: number | null
        }
        Update: {
          applies_to_categories?: string[] | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_blocking?: boolean | null
          is_mandatory?: boolean | null
          name?: string
          trigger_context?: string[] | null
          validity_hours?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location_type: string | null
          name: string
          notes: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name: string
          notes?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name?: string
          notes?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_readings: {
        Row: {
          created_at: string | null
          equipment_id: string
          hours: number | null
          id: string
          is_verified: boolean | null
          kilometers: number | null
          notes: string | null
          reading_date: string | null
          reading_type: string
          recorded_by: string | null
          source: string
          source_id: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          hours?: number | null
          id?: string
          is_verified?: boolean | null
          kilometers?: number | null
          notes?: string | null
          reading_date?: string | null
          reading_type: string
          recorded_by?: string | null
          source: string
          source_id?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          hours?: number | null
          id?: string
          is_verified?: boolean | null
          kilometers?: number | null
          notes?: string | null
          reading_date?: string | null
          reading_type?: string
          recorded_by?: string | null
          source?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilization_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_period: string | null
          campaign_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          notes: string | null
          override_cost: number | null
          project_id: string
          rate_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          target_equipment_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_period?: string | null
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          override_cost?: number | null
          project_id: string
          rate_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_equipment_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_period?: string | null
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          override_cost?: number | null
          project_id?: string
          rate_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_equipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobilization_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "mobilization_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_target_equipment_id_fkey"
            columns: ["target_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilization_rates: {
        Row: {
          code: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          rate: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          rate: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          provider_message_id: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_qualifications: {
        Row: {
          category_id: string
          created_at: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          issue_date: string | null
          license_number: string | null
          license_type: string | null
          notes: string | null
          person_id: string
          verified_by: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          license_number?: string | null
          license_type?: string | null
          notes?: string | null
          person_id: string
          verified_by?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          license_number?: string | null
          license_type?: string | null
          notes?: string | null
          person_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_qualifications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_qualifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_qualifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          app_role: string | null
          auth_id: string | null
          cedula: string | null
          city: string | null
          code: string | null
          created_at: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          hire_date: string | null
          id: string
          license_expiry: string | null
          license_type: string | null
          name: string
          notification_preferences: Json | null
          notifications_enabled: boolean
          phone: string | null
          position: string | null
          status: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          app_role?: string | null
          auth_id?: string | null
          cedula?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          id?: string
          license_expiry?: string | null
          license_type?: string | null
          name: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean
          phone?: string | null
          position?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          app_role?: string | null
          auth_id?: string | null
          cedula?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          id?: string
          license_expiry?: string | null
          license_type?: string | null
          name?: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean
          phone?: string | null
          position?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_projects: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          person_id: string
          project_id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          person_id: string
          project_id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          person_id?: string
          project_id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_projects_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_extras: {
        Row: {
          code: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          notes: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_extras_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          billing_code: string | null
          budget: number | null
          client: string | null
          code: string
          created_at: string | null
          end_date: string | null
          id: string
          location: string | null
          manager: string | null
          name: string
          notes: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          billing_code?: string | null
          budget?: number | null
          client?: string | null
          code: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          manager?: string | null
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_code?: string | null
          budget?: number | null
          client?: string | null
          code?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          manager?: string | null
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          cost_code_id: string | null
          description: string
          id: string
          line_number: number
          notes: string | null
          purchase_order_id: string
          qty_pending: number | null
          qty_received: number | null
          quantity: number
          status: string | null
          total_cost: number | null
          unit_cost: number | null
          unit_id: string | null
        }
        Insert: {
          cost_code_id?: string | null
          description: string
          id?: string
          line_number: number
          notes?: string | null
          purchase_order_id: string
          qty_pending?: number | null
          qty_received?: number | null
          quantity: number
          status?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_id?: string | null
        }
        Update: {
          cost_code_id?: string | null
          description?: string
          id?: string
          line_number?: number
          notes?: string | null
          purchase_order_id?: string
          qty_pending?: number | null
          qty_received?: number | null
          quantity?: number
          status?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          date_expected: string | null
          date_issued: string | null
          document_url: string | null
          id: string
          notes: string | null
          po_number: string
          project_id: string | null
          requester_id: string | null
          status: string | null
          total_amount: number | null
          vendor_contact: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date_expected?: string | null
          date_issued?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          po_number: string
          project_id?: string | null
          requester_id?: string | null
          status?: string | null
          total_amount?: number | null
          vendor_contact?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date_expected?: string | null
          date_issued?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          project_id?: string | null
          requester_id?: string | null
          status?: string | null
          total_amount?: number | null
          vendor_contact?: string | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_agreements: {
        Row: {
          billing_type: string | null
          condition_at_delivery: string | null
          condition_at_return: string | null
          contract_number: string | null
          created_at: string | null
          created_by: string | null
          daily_rate: number | null
          delivery_photos_url: string | null
          end_date: string | null
          equipment_id: string
          id: string
          monthly_rate: number | null
          notes: string | null
          project_id: string | null
          return_photos_url: string | null
          start_date: string
          status: string | null
          vendor_contact: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          billing_type?: string | null
          condition_at_delivery?: string | null
          condition_at_return?: string | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          delivery_photos_url?: string | null
          end_date?: string | null
          equipment_id: string
          id?: string
          monthly_rate?: number | null
          notes?: string | null
          project_id?: string | null
          return_photos_url?: string | null
          start_date: string
          status?: string | null
          vendor_contact?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          billing_type?: string | null
          condition_at_delivery?: string | null
          condition_at_return?: string | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          delivery_photos_url?: string | null
          end_date?: string | null
          equipment_id?: string
          id?: string
          monthly_rate?: number | null
          notes?: string | null
          project_id?: string | null
          return_photos_url?: string | null
          start_date?: string
          status?: string | null
          vendor_contact?: string | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          id: string
          next_number: number
          project_id: string | null
          seq_type: string
        }
        Insert: {
          id?: string
          next_number?: number
          project_id?: string | null
          seq_type: string
        }
        Update: {
          id?: string
          next_number?: number
          project_id?: string | null
          seq_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_request_lines: {
        Row: {
          category: string | null
          cost_category_id: string | null
          cost_code_id: string | null
          created_at: string | null
          delivered_at: string | null
          description: string
          designated_receiver_id: string | null
          designated_receiver_name: string | null
          equipment_id: string | null
          equipment_text: string | null
          from_location_id: string | null
          from_text: string | null
          id: string
          line_number: number
          line_type: string
          material_category: string | null
          notes: string | null
          po_reference: string | null
          purchase_order_line_id: string | null
          qty_delivered: number | null
          qty_scheduled: number | null
          quantity: number
          request_id: string
          requires_code: boolean | null
          status: string
          to_location_id: string | null
          to_text: string | null
          unit_id: string | null
          unit_text: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          cost_category_id?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          description: string
          designated_receiver_id?: string | null
          designated_receiver_name?: string | null
          equipment_id?: string | null
          equipment_text?: string | null
          from_location_id?: string | null
          from_text?: string | null
          id?: string
          line_number: number
          line_type: string
          material_category?: string | null
          notes?: string | null
          po_reference?: string | null
          purchase_order_line_id?: string | null
          qty_delivered?: number | null
          qty_scheduled?: number | null
          quantity?: number
          request_id: string
          requires_code?: boolean | null
          status?: string
          to_location_id?: string | null
          to_text?: string | null
          unit_id?: string | null
          unit_text?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          cost_category_id?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          description?: string
          designated_receiver_id?: string | null
          designated_receiver_name?: string | null
          equipment_id?: string | null
          equipment_text?: string | null
          from_location_id?: string | null
          from_text?: string | null
          id?: string
          line_number?: number
          line_type?: string
          material_category?: string | null
          notes?: string | null
          po_reference?: string | null
          purchase_order_line_id?: string | null
          qty_delivered?: number | null
          qty_scheduled?: number | null
          quantity?: number
          request_id?: string
          requires_code?: boolean | null
          status?: string
          to_location_id?: string | null
          to_text?: string | null
          unit_id?: string | null
          unit_text?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_request_lines_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_designated_receiver_id_fkey"
            columns: ["designated_receiver_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sm_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_requests: {
        Row: {
          approved_by: string | null
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          date_cancelled: string | null
          date_completed: string | null
          date_created: string | null
          date_required: string
          date_submitted: string | null
          fulfillment_type: string | null
          id: string
          initial_priority: string | null
          notes: string | null
          priority: string | null
          project_id: string
          request_id: string | null
          requester_id: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          date_cancelled?: string | null
          date_completed?: string | null
          date_created?: string | null
          date_required: string
          date_submitted?: string | null
          fulfillment_type?: string | null
          id?: string
          initial_priority?: string | null
          notes?: string | null
          priority?: string | null
          project_id: string
          request_id?: string | null
          requester_id: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          date_cancelled?: string | null
          date_completed?: string | null
          date_created?: string | null
          date_required?: string
          date_submitted?: string | null
          fulfillment_type?: string | null
          id?: string
          initial_priority?: string | null
          notes?: string | null
          priority?: string | null
          project_id?: string
          request_id?: string | null
          requester_id?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string | null
          id: string
          reviewed_by: string | null
          status: string | null
          suggested_by: string | null
          suggested_value: string
          table_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string | null
          suggested_by?: string | null
          suggested_value: string
          table_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string | null
          suggested_by?: string | null
          suggested_value?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_event_lines: {
        Row: {
          created_at: string | null
          id: string
          line_status: string
          quantity: number
          request_line_id: string
          trip_event_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_status: string
          quantity: number
          request_line_id: string
          trip_event_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          line_status?: string
          quantity?: number
          request_line_id?: string
          trip_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_event_lines_request_line_id_fkey"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "sm_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_event_lines_trip_event_id_fkey"
            columns: ["trip_event_id"]
            isOneToOne: false
            referencedRelation: "trip_events"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_events: {
        Row: {
          attachments: Json | null
          confirmation_code_used: string | null
          created_at: string | null
          event_timestamp: string | null
          event_type: string
          id: string
          location: string | null
          notes: string | null
          received_by_id: string | null
          received_by_name: string | null
          registered_by: string | null
          reverts_event_id: string | null
          source: string | null
          trip_id: string
        }
        Insert: {
          attachments?: Json | null
          confirmation_code_used?: string | null
          created_at?: string | null
          event_timestamp?: string | null
          event_type: string
          id?: string
          location?: string | null
          notes?: string | null
          received_by_id?: string | null
          received_by_name?: string | null
          registered_by?: string | null
          reverts_event_id?: string | null
          source?: string | null
          trip_id: string
        }
        Update: {
          attachments?: Json | null
          confirmation_code_used?: string | null
          created_at?: string | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          received_by_id?: string | null
          received_by_name?: string | null
          registered_by?: string | null
          reverts_event_id?: string | null
          source?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_received_by_id_fkey"
            columns: ["received_by_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_reverts_event_id_fkey"
            columns: ["reverts_event_id"]
            isOneToOne: false
            referencedRelation: "trip_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_line_assignments: {
        Row: {
          created_at: string | null
          id: string
          qty_delivered: number | null
          qty_dispatched: number | null
          quantity_assigned: number
          request_line_id: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          qty_delivered?: number | null
          qty_dispatched?: number | null
          quantity_assigned: number
          request_line_id: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          qty_delivered?: number | null
          qty_dispatched?: number | null
          quantity_assigned?: number
          request_line_id?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_line_assignments_request_line_id_fkey"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "sm_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_line_assignments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          att_permit: boolean | null
          attachments: Json | null
          campaign_id: string | null
          confirmation_code: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          date_cancelled: string | null
          driver_id: string | null
          escort: boolean | null
          id: string
          is_external: boolean | null
          is_self_pickup: boolean | null
          notes: string | null
          rate_id: string | null
          route_summary: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: string
          trailer_id: string | null
          trip_id: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          att_permit?: boolean | null
          attachments?: Json | null
          campaign_id?: string | null
          confirmation_code?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          date_cancelled?: string | null
          driver_id?: string | null
          escort?: boolean | null
          id?: string
          is_external?: boolean | null
          is_self_pickup?: boolean | null
          notes?: string | null
          rate_id?: string | null
          route_summary?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          trailer_id?: string | null
          trip_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          att_permit?: boolean | null
          attachments?: Json | null
          campaign_id?: string | null
          confirmation_code?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          date_cancelled?: string | null
          driver_id?: string | null
          escort?: boolean | null
          id?: string
          is_external?: boolean | null
          is_self_pickup?: boolean | null
          notes?: string | null
          rate_id?: string | null
          route_summary?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          trailer_id?: string | null
          trip_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mobilization_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "mobilization_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_app_roles: {
        Row: {
          app_code: string
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          person_id: string
          role_code: string
          updated_at: string | null
        }
        Insert: {
          app_code: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          person_id: string
          role_code: string
          updated_at?: string | null
        }
        Update: {
          app_code?: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          person_id?: string
          role_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_app_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_app_roles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          ruc: string | null
          trade_name: string | null
          vendor_type: string[] | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          ruc?: string | null
          trade_name?: string | null
          vendor_type?: string[] | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          ruc?: string | null
          trade_name?: string | null
          vendor_type?: string[] | null
        }
        Relationships: []
      }
      warehouse_items: {
        Row: {
          category: string | null
          code: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          description: string
          id: string
          is_active: boolean | null
          location: string | null
          min_stock: number | null
          photo_url: string | null
          unit_id: string | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          description: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          min_stock?: number | null
          photo_url?: string | null
          unit_id?: string | null
        }
        Update: {
          category?: string | null
          code?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          min_stock?: number | null
          photo_url?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_transactions: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          project_id: string | null
          quantity: number
          reference: string | null
          transacted_by: string
          transaction_type: string
          warehouse_item_id: string
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          quantity: number
          reference?: string | null
          transacted_by: string
          transaction_type: string
          warehouse_item_id: string
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          quantity?: number
          reference?: string | null
          transacted_by?: string
          transaction_type?: string
          warehouse_item_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transactions_transacted_by_fkey"
            columns: ["transacted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transactions_warehouse_item_id_fkey"
            columns: ["warehouse_item_id"]
            isOneToOne: false
            referencedRelation: "warehouse_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transactions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          description: string
          id: string
          notes: string | null
          part_number: string | null
          quantity: number
          source: string | null
          total_cost: number | null
          unit_cost: number | null
          work_order_id: string
        }
        Insert: {
          description: string
          id?: string
          notes?: string | null
          part_number?: string | null
          quantity?: number
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          work_order_id: string
        }
        Update: {
          description?: string
          id?: string
          notes?: string | null
          part_number?: string | null
          quantity?: number
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          date_closed: string | null
          date_completed: string | null
          date_due: string | null
          date_opened: string | null
          description: string | null
          equipment_id: string
          estimated_hours: number | null
          external_cost: number | null
          id: string
          inspection_response_id: string | null
          labor_cost: number | null
          meter_reading: number | null
          notes: string | null
          parts_cost: number | null
          priority: string | null
          project_id: string | null
          requested_by: string | null
          status: string | null
          title: string
          total_cost: number | null
          type: string
          work_order_number: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          date_closed?: string | null
          date_completed?: string | null
          date_due?: string | null
          date_opened?: string | null
          description?: string | null
          equipment_id: string
          estimated_hours?: number | null
          external_cost?: number | null
          id?: string
          inspection_response_id?: string | null
          labor_cost?: number | null
          meter_reading?: number | null
          notes?: string | null
          parts_cost?: number | null
          priority?: string | null
          project_id?: string | null
          requested_by?: string | null
          status?: string | null
          title: string
          total_cost?: number | null
          type: string
          work_order_number?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          date_closed?: string | null
          date_completed?: string | null
          date_due?: string | null
          date_opened?: string | null
          description?: string | null
          equipment_id?: string
          estimated_hours?: number | null
          external_cost?: number | null
          id?: string
          inspection_response_id?: string | null
          labor_cost?: number | null
          meter_reading?: number | null
          notes?: string | null
          parts_cost?: number | null
          priority?: string | null
          project_id?: string | null
          requested_by?: string | null
          status?: string | null
          title?: string
          total_cost?: number | null
          type?: string
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_inspection_response_id_fkey"
            columns: ["inspection_response_id"]
            isOneToOne: false
            referencedRelation: "inspection_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_app_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Helper type used throughout the codebase
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
