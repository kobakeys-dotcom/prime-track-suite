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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          approver_id: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          entity_id: string
          entity_type: string
          id: string
          project_id: string
          requested_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          project_id: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          project_id?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_items: {
        Row: {
          category: string | null
          completed_qty: number
          created_at: string
          description: string
          id: string
          item_code: string | null
          project_id: string
          quantity: number
          unit: string | null
          unit_rate: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_qty?: number
          created_at?: string
          description: string
          id?: string
          item_code?: string | null
          project_id: string
          quantity?: number
          unit?: string | null
          unit_rate?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_qty?: number
          created_at?: string
          description?: string
          id?: string
          item_code?: string | null
          project_id?: string
          quantity?: number
          unit?: string | null
          unit_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_codes: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          author_id: string | null
          created_at: string
          equipment: Json
          id: string
          issues: string | null
          manpower: Json
          materials_used: Json
          next_day_plan: string | null
          photos: Json
          project_id: string
          report_date: string
          status: Database["public"]["Enums"]["report_status"]
          temperature_c: number | null
          updated_at: string
          weather: string | null
          work_completed: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          equipment?: Json
          id?: string
          issues?: string | null
          manpower?: Json
          materials_used?: Json
          next_day_plan?: string | null
          photos?: Json
          project_id: string
          report_date: string
          status?: Database["public"]["Enums"]["report_status"]
          temperature_c?: number | null
          updated_at?: string
          weather?: string | null
          work_completed?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          equipment?: Json
          id?: string
          issues?: string | null
          manpower?: Json
          materials_used?: Json
          next_day_plan?: string | null
          photos?: Json
          project_id?: string
          report_date?: string
          status?: Database["public"]["Enums"]["report_status"]
          temperature_c?: number | null
          updated_at?: string
          weather?: string | null
          work_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          created_at: string
          delivered_quantity: number
          delivery_date: string
          delivery_note: string | null
          id: string
          notes: string | null
          photos: Json
          project_id: string
          purchase_order_id: string | null
          received_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_quantity?: number
          delivery_date?: string
          delivery_note?: string | null
          id?: string
          notes?: string | null
          photos?: Json
          project_id: string
          purchase_order_id?: string | null
          received_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_quantity?: number
          delivery_date?: string
          delivery_note?: string | null
          id?: string
          notes?: string | null
          photos?: Json
          project_id?: string
          purchase_order_id?: string | null
          received_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string
          expires_at: string | null
          file_size: number | null
          file_url: string | null
          id: string
          name: string
          project_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          name: string
          project_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          name?: string
          project_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          created_at: string
          discipline: string | null
          file_url: string | null
          id: string
          issued_date: string | null
          number: string
          project_id: string
          revision: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          discipline?: string | null
          file_url?: string | null
          id?: string
          issued_date?: string | null
          number: string
          project_id: string
          revision?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          discipline?: string | null
          file_url?: string | null
          id?: string
          issued_date?: string | null
          number?: string
          project_id?: string
          revision?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          code: string | null
          created_at: string
          id: string
          maintenance_due_date: string | null
          name: string
          notes: string | null
          operator: string | null
          project_id: string
          status: string
          updated_at: string
          usage_hours: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          maintenance_due_date?: string | null
          name: string
          notes?: string | null
          operator?: string | null
          project_id: string
          status?: string
          updated_at?: string
          usage_hours?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          maintenance_due_date?: string | null
          name?: string
          notes?: string | null
          operator?: string | null
          project_id?: string
          status?: string
          updated_at?: string
          usage_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          photos: Json
          priority: string
          project_id: string
          resolution: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          photos?: Json
          priority?: string
          project_id: string
          resolution?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          photos?: Json
          priority?: string
          project_id?: string
          resolution?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          created_at: string
          description: string
          due_date: string | null
          id: string
          meeting_id: string
          project_id: string
          responsible_person: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          meeting_id: string
          project_id: string
          responsible_person?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          project_id?: string
          responsible_person?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          attachments: Json
          attendees: Json
          created_at: string
          created_by: string | null
          decisions: string | null
          discussion_points: string | null
          id: string
          meeting_date: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          attachments?: Json
          attendees?: Json
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          discussion_points?: string | null
          id?: string
          meeting_date: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          attachments?: Json
          attendees?: Json
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          discussion_points?: string | null
          id?: string
          meeting_date?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          name: string
          project_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          project_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ncrs: {
        Row: {
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          location: string | null
          ncr_number: string
          photos: Json
          project_id: string
          responsible_person: string | null
          status: string
          updated_at: string
        }
        Insert: {
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          ncr_number: string
          photos?: Json
          project_id: string
          responsible_person?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          ncr_number?: string
          photos?: Json
          project_id?: string
          responsible_person?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ncrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          in_app_enabled: boolean
          reminder_days: number
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          in_app_enabled?: boolean
          reminder_days?: number
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          in_app_enabled?: boolean
          reminder_days?: number
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_claims: {
        Row: {
          advance_recovery: number | null
          approved_at: string | null
          claim_number: string
          created_at: string
          created_by: string | null
          deductions: number | null
          gross_claim: number | null
          id: string
          material_at_site_value: number | null
          net_claim: number | null
          notes: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          project_id: string
          retention: number | null
          status: string
          submitted_at: string | null
          updated_at: string
          variation_value: number | null
          work_done_value: number | null
        }
        Insert: {
          advance_recovery?: number | null
          approved_at?: string | null
          claim_number: string
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          gross_claim?: number | null
          id?: string
          material_at_site_value?: number | null
          net_claim?: number | null
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          project_id: string
          retention?: number | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          variation_value?: number | null
          work_done_value?: number | null
        }
        Update: {
          advance_recovery?: number | null
          approved_at?: string | null
          claim_number?: string
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          gross_claim?: number | null
          id?: string
          material_at_site_value?: number | null
          net_claim?: number | null
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          project_id?: string
          retention?: number | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          variation_value?: number | null
          work_done_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          material_name: string
          notes: string | null
          priority: string
          project_id: string
          quantity: number
          reason: string | null
          request_number: string
          requested_by: string | null
          required_date: string | null
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          material_name: string
          notes?: string | null
          priority?: string
          project_id: string
          quantity?: number
          reason?: string | null
          request_number: string
          requested_by?: string | null
          required_date?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          material_name?: string
          notes?: string | null
          priority?: string
          project_id?: string
          quantity?: number
          reason?: string | null
          request_number?: string
          requested_by?: string | null
          required_date?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_updates: {
        Row: {
          boq_item_id: string
          id: string
          note: string | null
          qty: number
          recorded_at: string
          recorded_by: string | null
        }
        Insert: {
          boq_item_id: string
          id?: string
          note?: string | null
          qty: number
          recorded_at?: string
          recorded_by?: string | null
        }
        Update: {
          boq_item_id?: string
          id?: string
          note?: string | null
          qty?: number
          recorded_at?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_updates_boq_item_id_fkey"
            columns: ["boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          code: string | null
          company_id: string
          contract_value: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          name: string
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client?: string | null
          code?: string | null
          company_id: string
          contract_value?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client?: string | null
          code?: string | null
          company_id?: string
          contract_value?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          delivery_date: string | null
          id: string
          items: Json
          notes: string | null
          po_number: string
          procurement_request_id: string | null
          project_id: string
          status: string
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          po_number: string
          procurement_request_id?: string | null
          project_id: string
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          po_number?: string
          procurement_request_id?: string | null
          project_id?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_procurement_request_id_fkey"
            columns: ["procurement_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
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
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspections: {
        Row: {
          checklist: Json
          comments: string | null
          created_at: string
          id: string
          inspection_date: string | null
          inspection_number: string
          inspector_id: string | null
          location: string | null
          photos: Json
          project_id: string
          requested_by: string | null
          result: string | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          comments?: string | null
          created_at?: string
          id?: string
          inspection_date?: string | null
          inspection_number: string
          inspector_id?: string | null
          location?: string | null
          photos?: Json
          project_id: string
          requested_by?: string | null
          result?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          comments?: string | null
          created_at?: string
          id?: string
          inspection_date?: string | null
          inspection_number?: string
          inspector_id?: string | null
          location?: string | null
          photos?: Json
          project_id?: string
          requested_by?: string | null
          result?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          assigned_date: string | null
          attendance_status: string | null
          created_at: string
          employee_name: string
          id: string
          overtime_hours: number | null
          project_id: string
          remarks: string | null
          trade: string | null
          updated_at: string
        }
        Insert: {
          assigned_date?: string | null
          attendance_status?: string | null
          created_at?: string
          employee_name: string
          id?: string
          overtime_hours?: number | null
          project_id: string
          remarks?: string | null
          trade?: string | null
          updated_at?: string
        }
        Update: {
          assigned_date?: string | null
          attendance_status?: string | null
          created_at?: string
          employee_name?: string
          id?: string
          overtime_hours?: number | null
          project_id?: string
          remarks?: string | null
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          answer: string | null
          assigned_to: string | null
          created_at: string
          due_date: string | null
          id: string
          number: string | null
          project_id: string
          question: string | null
          raised_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          number?: string | null
          project_id: string
          question?: string | null
          raised_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          number?: string | null
          project_id?: string
          question?: string | null
          raised_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          procurement_request_id: string | null
          project_id: string
          rfq_number: string
          status: string
          supplier_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          procurement_request_id?: string | null
          project_id: string
          rfq_number: string
          status?: string
          supplier_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          procurement_request_id?: string | null
          project_id?: string
          rfq_number?: string
          status?: string
          supplier_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_procurement_request_id_fkey"
            columns: ["procurement_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          impact: number | null
          mitigation_action: string | null
          owner_id: string | null
          probability: number | null
          project_id: string
          risk_score: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: number | null
          mitigation_action?: string | null
          owner_id?: string | null
          probability?: number | null
          project_id: string
          risk_score?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: number | null
          mitigation_action?: string | null
          owner_id?: string | null
          probability?: number | null
          project_id?: string
          risk_score?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_inspections: {
        Row: {
          checklist: Json
          corrective_action: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          inspection_number: string
          location: string | null
          photos: Json
          ppe_compliance: string | null
          project_id: string
          responsible_person: string | null
          status: string
          unsafe_acts: string | null
          unsafe_conditions: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          inspection_number: string
          location?: string | null
          photos?: Json
          ppe_compliance?: string | null
          project_id: string
          responsible_person?: string | null
          status?: string
          unsafe_acts?: string | null
          unsafe_conditions?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          inspection_number?: string
          location?: string | null
          photos?: Json
          ppe_compliance?: string | null
          project_id?: string
          responsible_person?: string | null
          status?: string
          unsafe_acts?: string | null
          unsafe_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      snags: {
        Row: {
          after_photo: string | null
          assigned_to: string | null
          before_photo: string | null
          client_approval: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          location: string | null
          photos: Json | null
          project_id: string
          snag_number: string
          status: string
          updated_at: string
        }
        Insert: {
          after_photo?: string | null
          assigned_to?: string | null
          before_photo?: string | null
          client_approval?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          photos?: Json | null
          project_id: string
          snag_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          after_photo?: string | null
          assigned_to?: string | null
          before_photo?: string | null
          client_approval?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          photos?: Json | null
          project_id?: string
          snag_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          number: string | null
          project_id: string
          reviewer_id: string | null
          spec_section: string | null
          status: Database["public"]["Enums"]["approval_status"]
          submitted_at: string | null
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          number?: string | null
          project_id: string
          reviewer_id?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          number?: string | null
          project_id?: string
          reviewer_id?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          category: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          created_at: string
          description: string | null
          hours: number
          id: string
          project_id: string
          task_id: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          project_id: string
          task_id?: string | null
          updated_at?: string
          user_id: string
          work_date?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          project_id?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      variations: {
        Row: {
          approved_amount: number | null
          approved_days: number | null
          attachments: Json
          cost_impact: number | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          reason: string | null
          status: string
          submitted_by: string | null
          time_impact_days: number | null
          title: string
          updated_at: string
          variation_number: string
        }
        Insert: {
          approved_amount?: number | null
          approved_days?: number | null
          attachments?: Json
          cost_impact?: number | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          reason?: string | null
          status?: string
          submitted_by?: string | null
          time_impact_days?: number | null
          title: string
          updated_at?: string
          variation_number: string
        }
        Update: {
          approved_amount?: number | null
          approved_days?: number | null
          attachments?: Json
          cost_impact?: number | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          reason?: string | null
          status?: string
          submitted_by?: string | null
          time_impact_days?: number | null
          title?: string
          updated_at?: string
          variation_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "variations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      project_in_company: { Args: { _project_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "company_admin"
        | "project_director"
        | "project_manager"
        | "site_engineer"
        | "planning_engineer"
        | "quantity_surveyor"
        | "finance_manager"
        | "procurement_officer"
        | "safety_officer"
        | "quality_inspector"
        | "client_representative"
        | "consultant"
        | "subcontractor"
        | "viewer"
      approval_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "revise_resubmit"
        | "closed"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      report_status: "draft" | "submitted" | "approved"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status: "todo" | "in_progress" | "blocked" | "done" | "cancelled"
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
    Enums: {
      app_role: [
        "super_admin",
        "company_admin",
        "project_director",
        "project_manager",
        "site_engineer",
        "planning_engineer",
        "quantity_surveyor",
        "finance_manager",
        "procurement_officer",
        "safety_officer",
        "quality_inspector",
        "client_representative",
        "consultant",
        "subcontractor",
        "viewer",
      ],
      approval_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "revise_resubmit",
        "closed",
      ],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      report_status: ["draft", "submitted", "approved"],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
    },
  },
} as const
