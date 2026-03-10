export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cost_codes: {
        Row: {
          id: string
          project_id: string | null
          extra_id: string | null
          phase_code: string
          phase_description: string | null
          full_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          extra_id?: string | null
          phase_code: string
          phase_description?: string | null
          full_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          extra_id?: string | null
          phase_code?: string
          phase_description?: string | null
          full_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "project_extras"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          id: string
          spectrum_code: string | null
          description: string
          equipment_type: string | null
          type_code: string | null
          brand: string | null
          model: string | null
          serial_number: string | null
          year: number | null
          status: string | null
          current_location: string | null
          plate: string | null
          capacity: string | null
          inspection_type: string | null
          current_project_id: string | null
          weight_class: string | null
          acquisition_type: string | null
          last_inspection_date: string | null
          next_inspection_due: string | null
          meter_reading: number | null
          insurance_expiry: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          spectrum_code?: string | null
          description: string
          equipment_type?: string | null
          type_code?: string | null
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          year?: number | null
          status?: string | null
          current_location?: string | null
          plate?: string | null
          capacity?: string | null
          inspection_type?: string | null
          current_project_id?: string | null
          weight_class?: string | null
          acquisition_type?: string | null
          last_inspection_date?: string | null
          next_inspection_due?: string | null
          meter_reading?: number | null
          insurance_expiry?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          spectrum_code?: string | null
          description?: string
          equipment_type?: string | null
          type_code?: string | null
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          year?: number | null
          status?: string | null
          current_location?: string | null
          plate?: string | null
          capacity?: string | null
          inspection_type?: string | null
          current_project_id?: string | null
          weight_class?: string | null
          acquisition_type?: string | null
          last_inspection_date?: string | null
          next_inspection_due?: string | null
          meter_reading?: number | null
          insurance_expiry?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          id: string
          name: string
          location_type: string | null
          address: string | null
          project_id: string | null
          is_active: boolean | null
          contact_name: string | null
          contact_phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location_type?: string | null
          address?: string | null
          project_id?: string | null
          is_active?: boolean | null
          contact_name?: string | null
          contact_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location_type?: string | null
          address?: string | null
          project_id?: string | null
          is_active?: boolean | null
          contact_name?: string | null
          contact_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
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
      mobilization_rates: {
        Row: {
          id: string
          code: string
          description: string
          rate: number
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          description: string
          rate: number
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string
          rate?: number
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          id: string
          auth_id: string | null
          code: string | null
          name: string
          department: string | null
          position: string | null
          phone: string | null
          email: string | null
          app_role: string | null
          status: string | null
          city: string | null
          supervisor_id: string | null
          cedula: string | null
          license_type: string | null
          license_expiry: string | null
          hire_date: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id?: string | null
          code?: string | null
          name: string
          department?: string | null
          position?: string | null
          phone?: string | null
          email?: string | null
          app_role?: string | null
          status?: string | null
          city?: string | null
          supervisor_id?: string | null
          cedula?: string | null
          license_type?: string | null
          license_expiry?: string | null
          hire_date?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string | null
          code?: string | null
          name?: string
          department?: string | null
          position?: string | null
          phone?: string | null
          email?: string | null
          app_role?: string | null
          status?: string | null
          city?: string | null
          supervisor_id?: string | null
          cedula?: string | null
          license_type?: string | null
          license_expiry?: string | null
          hire_date?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          created_at?: string
          updated_at?: string
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
          id: string
          person_id: string
          project_id: string
          role: string | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          person_id: string
          project_id: string
          role?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          person_id?: string
          project_id?: string
          role?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
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
          id: string
          project_id: string
          code: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          code: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          code?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
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
          id: string
          code: string
          name: string
          manager: string | null
          status: string | null
          location: string | null
          start_date: string | null
          end_date: string | null
          notes: string | null
          billing_code: string | null
          budget: number | null
          client: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          manager?: string | null
          status?: string | null
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          billing_code?: string | null
          budget?: number | null
          client?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          manager?: string | null
          status?: string | null
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          billing_code?: string | null
          budget?: number | null
          client?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sequences: {
        Row: {
          id: string
          seq_type: string
          project_id: string | null
          next_number: number
        }
        Insert: {
          id?: string
          seq_type: string
          project_id?: string | null
          next_number?: number
        }
        Update: {
          id?: string
          seq_type?: string
          project_id?: string | null
          next_number?: number
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
          id: string
          request_id: string
          line_number: number
          line_type: string
          equipment_id: string | null
          description: string
          equipment_text: string | null
          from_location_id: string | null
          from_text: string | null
          to_location_id: string | null
          to_text: string | null
          quantity: number
          unit_id: string | null
          unit_text: string | null
          cost_code_id: string | null
          category: string | null
          po_reference: string | null
          notes: string | null
          status: string
          qty_scheduled: number | null
          qty_delivered: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          line_number: number
          line_type: string
          equipment_id?: string | null
          description: string
          equipment_text?: string | null
          from_location_id?: string | null
          from_text?: string | null
          to_location_id?: string | null
          to_text?: string | null
          quantity?: number
          unit_id?: string | null
          unit_text?: string | null
          cost_code_id?: string | null
          category?: string | null
          po_reference?: string | null
          notes?: string | null
          status?: string
          qty_scheduled?: number | null
          qty_delivered?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          line_number?: number
          line_type?: string
          equipment_id?: string | null
          description?: string
          equipment_text?: string | null
          from_location_id?: string | null
          from_text?: string | null
          to_location_id?: string | null
          to_text?: string | null
          quantity?: number
          unit_id?: string | null
          unit_text?: string | null
          cost_code_id?: string | null
          category?: string | null
          po_reference?: string | null
          notes?: string | null
          status?: string
          qty_scheduled?: number | null
          qty_delivered?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sm_request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sm_requests"
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
            foreignKeyName: "sm_request_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_requests: {
        Row: {
          id: string
          request_id: string | null
          project_id: string
          requester_id: string
          approved_by: string | null
          date_required: string
          date_created: string | null
          status: string
          priority: string | null
          notes: string | null
          attachments: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id?: string | null
          project_id: string
          requester_id: string
          approved_by?: string | null
          date_required: string
          date_created?: string | null
          status?: string
          priority?: string | null
          notes?: string | null
          attachments?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string | null
          project_id?: string
          requester_id?: string
          approved_by?: string | null
          date_required?: string
          date_created?: string | null
          status?: string
          priority?: string | null
          notes?: string | null
          attachments?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "sm_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          id: string
          table_name: string
          suggested_value: string
          suggested_by: string | null
          status: string | null
          reviewed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          suggested_value: string
          suggested_by?: string | null
          status?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          suggested_value?: string
          suggested_by?: string | null
          status?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_events: {
        Row: {
          id: string
          trip_id: string
          event_type: string
          event_timestamp: string | null
          location: string | null
          registered_by: string | null
          confirmation_code_used: string | null
          received_by_name: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          event_type: string
          event_timestamp?: string | null
          location?: string | null
          registered_by?: string | null
          confirmation_code_used?: string | null
          received_by_name?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          event_type?: string
          event_timestamp?: string | null
          location?: string | null
          registered_by?: string | null
          confirmation_code_used?: string | null
          received_by_name?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_line_assignments: {
        Row: {
          id: string
          trip_id: string
          request_line_id: string
          quantity_assigned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          request_line_id: string
          quantity_assigned: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          request_line_id?: string
          quantity_assigned?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_line_assignments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_line_assignments_request_line_id_fkey"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "sm_request_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          id: string
          trip_id: string | null
          scheduled_date: string
          driver_id: string | null
          vehicle_id: string | null
          trailer_id: string | null
          rate_id: string | null
          cost: number | null
          att_permit: boolean | null
          escort: boolean | null
          confirmation_code: string | null
          status: string
          notes: string | null
          actual_departure: string | null
          actual_arrival: string | null
          route_summary: string | null
          is_external: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id?: string | null
          scheduled_date: string
          driver_id?: string | null
          vehicle_id?: string | null
          trailer_id?: string | null
          rate_id?: string | null
          cost?: number | null
          att_permit?: boolean | null
          escort?: boolean | null
          confirmation_code?: string | null
          status?: string
          notes?: string | null
          actual_departure?: string | null
          actual_arrival?: string | null
          route_summary?: string | null
          is_external?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string | null
          scheduled_date?: string
          driver_id?: string | null
          vehicle_id?: string | null
          trailer_id?: string | null
          rate_id?: string | null
          cost?: number | null
          att_permit?: boolean | null
          escort?: boolean | null
          confirmation_code?: string | null
          status?: string
          notes?: string | null
          actual_departure?: string | null
          actual_arrival?: string | null
          route_summary?: string | null
          is_external?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
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
          {
            foreignKeyName: "trips_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "mobilization_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          id: string
          code: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Tipos de conveniencia para uso en la app
type PublicSchema = Database["public"]
type Tables = PublicSchema["Tables"]

export type Row<T extends keyof Tables> = Tables[T]["Row"]
export type InsertDto<T extends keyof Tables> = Tables[T]["Insert"]
export type UpdateDto<T extends keyof Tables> = Tables[T]["Update"]
