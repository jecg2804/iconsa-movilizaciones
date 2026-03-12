// Auto-generated from Supabase — 2026-03-12
// 19 tables + audit_log (20). Includes: project_extras, extra_id, created_by/updated_by, initial_priority, scheduled_time
// Manual additions: date_submitted/date_completed/date_cancelled (sm_requests), date_cancelled (trips), delivered_at (sm_request_lines)
// Place in: src/lib/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.1" }
  public: {
    Tables: {
      cost_categories: {
        Row: { code: string; created_at: string | null; description: string; id: string; is_active: boolean | null; updated_at: string | null }
        Insert: { code: string; created_at?: string | null; description: string; id?: string; is_active?: boolean | null; updated_at?: string | null }
        Update: { code?: string; created_at?: string | null; description?: string; id?: string; is_active?: boolean | null; updated_at?: string | null }
        Relationships: []
      }
      cost_code_categories: {
        Row: { cost_category_id: string; cost_code_id: string; created_at: string | null; id: string }
        Insert: { cost_category_id: string; cost_code_id: string; created_at?: string | null; id?: string }
        Update: { cost_category_id?: string; cost_code_id?: string; created_at?: string | null; id?: string }
        Relationships: []
      }
      cost_codes: {
        Row: { created_at: string | null; extra_id: string | null; full_code: string | null; id: string; phase_code: string; phase_description: string | null; project_id: string | null; updated_at: string | null }
        Insert: { created_at?: string | null; extra_id?: string | null; full_code?: string | null; id?: string; phase_code: string; phase_description?: string | null; project_id?: string | null; updated_at?: string | null }
        Update: { created_at?: string | null; extra_id?: string | null; full_code?: string | null; id?: string; phase_code?: string; phase_description?: string | null; project_id?: string | null; updated_at?: string | null }
        Relationships: []
      }
      equipment: {
        Row: { acquisition_type: string | null; brand: string | null; capacity: string | null; created_at: string | null; current_location: string | null; current_project_id: string | null; description: string; equipment_type: string | null; id: string; inspection_type: string | null; insurance_expiry: string | null; last_inspection_date: string | null; meter_reading: number | null; model: string | null; next_inspection_due: string | null; notes: string | null; parent_equipment_id: string | null; plate: string | null; serial_number: string | null; spectrum_code: string | null; status: string | null; type_code: string | null; updated_at: string | null; weight_class: string | null; year: number | null }
        Insert: { acquisition_type?: string | null; brand?: string | null; capacity?: string | null; created_at?: string | null; current_location?: string | null; current_project_id?: string | null; description: string; equipment_type?: string | null; id?: string; inspection_type?: string | null; insurance_expiry?: string | null; last_inspection_date?: string | null; meter_reading?: number | null; model?: string | null; next_inspection_due?: string | null; notes?: string | null; parent_equipment_id?: string | null; plate?: string | null; serial_number?: string | null; spectrum_code?: string | null; status?: string | null; type_code?: string | null; updated_at?: string | null; weight_class?: string | null; year?: number | null }
        Update: { acquisition_type?: string | null; brand?: string | null; capacity?: string | null; created_at?: string | null; current_location?: string | null; current_project_id?: string | null; description?: string; equipment_type?: string | null; id?: string; inspection_type?: string | null; insurance_expiry?: string | null; last_inspection_date?: string | null; meter_reading?: number | null; model?: string | null; next_inspection_due?: string | null; notes?: string | null; parent_equipment_id?: string | null; plate?: string | null; serial_number?: string | null; spectrum_code?: string | null; status?: string | null; type_code?: string | null; updated_at?: string | null; weight_class?: string | null; year?: number | null }
        Relationships: []
      }
      locations: {
        Row: { address: string | null; contact_name: string | null; contact_phone: string | null; created_at: string | null; id: string; is_active: boolean | null; location_type: string | null; name: string; notes: string | null; project_id: string | null; updated_at: string | null }
        Insert: { address?: string | null; contact_name?: string | null; contact_phone?: string | null; created_at?: string | null; id?: string; is_active?: boolean | null; location_type?: string | null; name: string; notes?: string | null; project_id?: string | null; updated_at?: string | null }
        Update: { address?: string | null; contact_name?: string | null; contact_phone?: string | null; created_at?: string | null; id?: string; is_active?: boolean | null; location_type?: string | null; name?: string; notes?: string | null; project_id?: string | null; updated_at?: string | null }
        Relationships: []
      }
      mobilization_rates: {
        Row: { code: string; created_at: string | null; description: string; id: string; is_active: boolean | null; rate: number; updated_at: string | null }
        Insert: { code: string; created_at?: string | null; description: string; id?: string; is_active?: boolean | null; rate: number; updated_at?: string | null }
        Update: { code?: string; created_at?: string | null; description?: string; id?: string; is_active?: boolean | null; rate?: number; updated_at?: string | null }
        Relationships: []
      }
      people: {
        Row: { app_role: string | null; auth_id: string | null; cedula: string | null; city: string | null; code: string | null; created_at: string | null; department: string | null; email: string | null; emergency_contact_name: string | null; emergency_contact_phone: string | null; hire_date: string | null; id: string; license_expiry: string | null; license_type: string | null; name: string; phone: string | null; position: string | null; status: string | null; supervisor_id: string | null; updated_at: string | null }
        Insert: { app_role?: string | null; auth_id?: string | null; cedula?: string | null; city?: string | null; code?: string | null; created_at?: string | null; department?: string | null; email?: string | null; emergency_contact_name?: string | null; emergency_contact_phone?: string | null; hire_date?: string | null; id?: string; license_expiry?: string | null; license_type?: string | null; name: string; phone?: string | null; position?: string | null; status?: string | null; supervisor_id?: string | null; updated_at?: string | null }
        Update: { app_role?: string | null; auth_id?: string | null; cedula?: string | null; city?: string | null; code?: string | null; created_at?: string | null; department?: string | null; email?: string | null; emergency_contact_name?: string | null; emergency_contact_phone?: string | null; hire_date?: string | null; id?: string; license_expiry?: string | null; license_type?: string | null; name?: string; phone?: string | null; position?: string | null; status?: string | null; supervisor_id?: string | null; updated_at?: string | null }
        Relationships: []
      }
      person_projects: {
        Row: { created_at: string | null; id: string; is_active: boolean | null; person_id: string; project_id: string; role: string | null; updated_at: string | null }
        Insert: { created_at?: string | null; id?: string; is_active?: boolean | null; person_id: string; project_id: string; role?: string | null; updated_at?: string | null }
        Update: { created_at?: string | null; id?: string; is_active?: boolean | null; person_id?: string; project_id?: string; role?: string | null; updated_at?: string | null }
        Relationships: []
      }
      project_extras: {
        Row: { code: string; created_at: string | null; description: string; id: string; is_active: boolean | null; notes: string | null; project_id: string; updated_at: string | null }
        Insert: { code: string; created_at?: string | null; description: string; id?: string; is_active?: boolean | null; notes?: string | null; project_id: string; updated_at?: string | null }
        Update: { code?: string; created_at?: string | null; description?: string; id?: string; is_active?: boolean | null; notes?: string | null; project_id?: string; updated_at?: string | null }
        Relationships: []
      }
      projects: {
        Row: { billing_code: string | null; budget: number | null; client: string | null; code: string; created_at: string | null; end_date: string | null; id: string; location: string | null; manager: string | null; name: string; notes: string | null; start_date: string | null; status: string | null; updated_at: string | null }
        Insert: { billing_code?: string | null; budget?: number | null; client?: string | null; code: string; created_at?: string | null; end_date?: string | null; id?: string; location?: string | null; manager?: string | null; name: string; notes?: string | null; start_date?: string | null; status?: string | null; updated_at?: string | null }
        Update: { billing_code?: string | null; budget?: number | null; client?: string | null; code?: string; created_at?: string | null; end_date?: string | null; id?: string; location?: string | null; manager?: string | null; name?: string; notes?: string | null; start_date?: string | null; status?: string | null; updated_at?: string | null }
        Relationships: []
      }
      sequences: {
        Row: { id: string; next_number: number; project_id: string | null; seq_type: string }
        Insert: { id?: string; next_number?: number; project_id?: string | null; seq_type: string }
        Update: { id?: string; next_number?: number; project_id?: string | null; seq_type?: string }
        Relationships: []
      }
      sm_request_lines: {
        Row: { category: string | null; cost_category_id: string | null; cost_code_id: string | null; created_at: string | null; delivered_at: string | null; description: string; equipment_id: string | null; equipment_text: string | null; from_location_id: string | null; from_text: string | null; id: string; line_number: number; line_type: string; material_category: string | null; notes: string | null; po_reference: string | null; qty_delivered: number | null; qty_scheduled: number | null; quantity: number; request_id: string; status: string; to_location_id: string | null; to_text: string | null; unit_id: string | null; unit_text: string | null; updated_at: string | null; updated_by: string | null }
        Insert: { category?: string | null; cost_category_id?: string | null; cost_code_id?: string | null; created_at?: string | null; delivered_at?: string | null; description: string; equipment_id?: string | null; equipment_text?: string | null; from_location_id?: string | null; from_text?: string | null; id?: string; line_number: number; line_type: string; material_category?: string | null; notes?: string | null; po_reference?: string | null; qty_delivered?: number | null; qty_scheduled?: number | null; quantity?: number; request_id: string; status?: string; to_location_id?: string | null; to_text?: string | null; unit_id?: string | null; unit_text?: string | null; updated_at?: string | null; updated_by?: string | null }
        Update: { category?: string | null; cost_category_id?: string | null; cost_code_id?: string | null; created_at?: string | null; delivered_at?: string | null; description?: string; equipment_id?: string | null; equipment_text?: string | null; from_location_id?: string | null; from_text?: string | null; id?: string; line_number?: number; line_type?: string; material_category?: string | null; notes?: string | null; po_reference?: string | null; qty_delivered?: number | null; qty_scheduled?: number | null; quantity?: number; request_id?: string; status?: string; to_location_id?: string | null; to_text?: string | null; unit_id?: string | null; unit_text?: string | null; updated_at?: string | null; updated_by?: string | null }
        Relationships: []
      }
      sm_requests: {
        Row: { approved_by: string | null; attachments: Json | null; created_at: string | null; created_by: string | null; date_cancelled: string | null; date_completed: string | null; date_created: string | null; date_required: string; date_submitted: string | null; id: string; initial_priority: string | null; notes: string | null; priority: string | null; project_id: string; request_id: string | null; requester_id: string; status: string; updated_at: string | null; updated_by: string | null }
        Insert: { approved_by?: string | null; attachments?: Json | null; created_at?: string | null; created_by?: string | null; date_cancelled?: string | null; date_completed?: string | null; date_created?: string | null; date_required: string; date_submitted?: string | null; id?: string; initial_priority?: string | null; notes?: string | null; priority?: string | null; project_id: string; request_id?: string | null; requester_id: string; status?: string; updated_at?: string | null; updated_by?: string | null }
        Update: { approved_by?: string | null; attachments?: Json | null; created_at?: string | null; created_by?: string | null; date_cancelled?: string | null; date_completed?: string | null; date_created?: string | null; date_required?: string; date_submitted?: string | null; id?: string; initial_priority?: string | null; notes?: string | null; priority?: string | null; project_id?: string; request_id?: string | null; requester_id?: string; status?: string; updated_at?: string | null; updated_by?: string | null }
        Relationships: []
      }
      suggestions: {
        Row: { created_at: string | null; id: string; reviewed_by: string | null; status: string | null; suggested_by: string | null; suggested_value: string; table_name: string }
        Insert: { created_at?: string | null; id?: string; reviewed_by?: string | null; status?: string | null; suggested_by?: string | null; suggested_value: string; table_name: string }
        Update: { created_at?: string | null; id?: string; reviewed_by?: string | null; status?: string | null; suggested_by?: string | null; suggested_value?: string; table_name?: string }
        Relationships: []
      }
      trip_events: {
        Row: { confirmation_code_used: string | null; created_at: string | null; event_timestamp: string | null; event_type: string; id: string; location: string | null; notes: string | null; received_by_id: string | null; received_by_name: string | null; registered_by: string | null; trip_id: string }
        Insert: { confirmation_code_used?: string | null; created_at?: string | null; event_timestamp?: string | null; event_type: string; id?: string; location?: string | null; notes?: string | null; received_by_id?: string | null; received_by_name?: string | null; registered_by?: string | null; trip_id: string }
        Update: { confirmation_code_used?: string | null; created_at?: string | null; event_timestamp?: string | null; event_type?: string; id?: string; location?: string | null; notes?: string | null; received_by_id?: string | null; received_by_name?: string | null; registered_by?: string | null; trip_id?: string }
        Relationships: []
      }
      trip_line_assignments: {
        Row: { created_at: string | null; id: string; qty_delivered: number; quantity_assigned: number; request_line_id: string; trip_id: string; updated_at: string | null }
        Insert: { created_at?: string | null; id?: string; qty_delivered?: number; quantity_assigned: number; request_line_id: string; trip_id: string; updated_at?: string | null }
        Update: { created_at?: string | null; id?: string; qty_delivered?: number; quantity_assigned?: number; request_line_id?: string; trip_id?: string; updated_at?: string | null }
        Relationships: []
      }
      trips: {
        Row: { actual_arrival: string | null; actual_departure: string | null; att_permit: boolean | null; confirmation_code: string | null; cost: number | null; created_at: string | null; created_by: string | null; date_cancelled: string | null; driver_id: string | null; escort: boolean | null; id: string; is_external: boolean | null; notes: string | null; rate_id: string | null; route_summary: string | null; scheduled_date: string; scheduled_time: string | null; status: string; trailer_id: string | null; trip_id: string | null; updated_at: string | null; updated_by: string | null; vehicle_id: string | null }
        Insert: { actual_arrival?: string | null; actual_departure?: string | null; att_permit?: boolean | null; confirmation_code?: string | null; cost?: number | null; created_at?: string | null; created_by?: string | null; date_cancelled?: string | null; driver_id?: string | null; escort?: boolean | null; id?: string; is_external?: boolean | null; notes?: string | null; rate_id?: string | null; route_summary?: string | null; scheduled_date: string; scheduled_time?: string | null; status?: string; trailer_id?: string | null; trip_id?: string | null; updated_at?: string | null; updated_by?: string | null; vehicle_id?: string | null }
        Update: { actual_arrival?: string | null; actual_departure?: string | null; att_permit?: boolean | null; confirmation_code?: string | null; cost?: number | null; created_at?: string | null; created_by?: string | null; date_cancelled?: string | null; driver_id?: string | null; escort?: boolean | null; id?: string; is_external?: boolean | null; notes?: string | null; rate_id?: string | null; route_summary?: string | null; scheduled_date?: string; scheduled_time?: string | null; status?: string; trailer_id?: string | null; trip_id?: string | null; updated_at?: string | null; updated_by?: string | null; vehicle_id?: string | null }
        Relationships: []
      }
      units: {
        Row: { code: string; created_at: string | null; description: string | null; id: string; updated_at: string | null }
        Insert: { code: string; created_at?: string | null; description?: string | null; id?: string; updated_at?: string | null }
        Update: { code?: string; created_at?: string | null; description?: string | null; id?: string; updated_at?: string | null }
        Relationships: []
      }
      user_app_roles: {
        Row: { app_code: string; created_at: string | null; granted_at: string | null; granted_by: string | null; id: string; is_active: boolean | null; notes: string | null; person_id: string; role_code: string; updated_at: string | null }
        Insert: { app_code: string; created_at?: string | null; granted_at?: string | null; granted_by?: string | null; id?: string; is_active?: boolean | null; notes?: string | null; person_id: string; role_code: string; updated_at?: string | null }
        Update: { app_code?: string; created_at?: string | null; granted_at?: string | null; granted_by?: string | null; id?: string; is_active?: boolean | null; notes?: string | null; person_id?: string; role_code?: string; updated_at?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { get_my_app_role: { Args: never; Returns: string } }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Helper types
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
