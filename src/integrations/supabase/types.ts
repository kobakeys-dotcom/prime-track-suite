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
          certified_qty: number
          completed_qty: number
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          description: string
          discipline: string | null
          id: string
          is_archived: boolean
          item_code: string | null
          item_number: string | null
          location: string | null
          milestone_id: string | null
          project_id: string
          quantity: number
          remarks: string | null
          section: string | null
          status: string
          task_id: string | null
          trade: string | null
          unit: string | null
          unit_rate: number
          updated_at: string
          variation_qty: number
          wbs_id: string | null
        }
        Insert: {
          category?: string | null
          certified_qty?: number
          completed_qty?: number
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          discipline?: string | null
          id?: string
          is_archived?: boolean
          item_code?: string | null
          item_number?: string | null
          location?: string | null
          milestone_id?: string | null
          project_id: string
          quantity?: number
          remarks?: string | null
          section?: string | null
          status?: string
          task_id?: string | null
          trade?: string | null
          unit?: string | null
          unit_rate?: number
          updated_at?: string
          variation_qty?: number
          wbs_id?: string | null
        }
        Update: {
          category?: string | null
          certified_qty?: number
          completed_qty?: number
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          discipline?: string | null
          id?: string
          is_archived?: boolean
          item_code?: string | null
          item_number?: string | null
          location?: string | null
          milestone_id?: string | null
          project_id?: string
          quantity?: number
          remarks?: string | null
          section?: string | null
          status?: string
          task_id?: string | null
          trade?: string | null
          unit?: string | null
          unit_rate?: number
          updated_at?: string
          variation_qty?: number
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boq_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boq_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_items"
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
          approved_at: string | null
          approved_by: string | null
          author_id: string | null
          created_at: string
          equipment: Json
          id: string
          instructions_received: string | null
          is_archived: boolean
          is_client_visible: boolean
          issues: string | null
          location: string | null
          manpower: Json
          materials_used: Json
          next_day_plan: string | null
          photos: Json
          project_id: string
          quality_notes: string | null
          rejection_reason: string | null
          report_date: string
          report_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_notes: string | null
          safety_notes: string | null
          shift: string | null
          site_condition: string | null
          status: Database["public"]["Enums"]["report_status"]
          submitted_at: string | null
          temperature_c: number | null
          updated_at: string
          visitors: string | null
          weather: string | null
          work_completed: string | null
          working_hours: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string | null
          created_at?: string
          equipment?: Json
          id?: string
          instructions_received?: string | null
          is_archived?: boolean
          is_client_visible?: boolean
          issues?: string | null
          location?: string | null
          manpower?: Json
          materials_used?: Json
          next_day_plan?: string | null
          photos?: Json
          project_id: string
          quality_notes?: string | null
          rejection_reason?: string | null
          report_date: string
          report_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          safety_notes?: string | null
          shift?: string | null
          site_condition?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          temperature_c?: number | null
          updated_at?: string
          visitors?: string | null
          weather?: string | null
          work_completed?: string | null
          working_hours?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string | null
          created_at?: string
          equipment?: Json
          id?: string
          instructions_received?: string | null
          is_archived?: boolean
          is_client_visible?: boolean
          issues?: string | null
          location?: string | null
          manpower?: Json
          materials_used?: Json
          next_day_plan?: string | null
          photos?: Json
          project_id?: string
          quality_notes?: string | null
          rejection_reason?: string | null
          report_date?: string
          report_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          safety_notes?: string | null
          shift?: string | null
          site_condition?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          temperature_c?: number | null
          updated_at?: string
          visitors?: string | null
          weather?: string | null
          work_completed?: string | null
          working_hours?: string | null
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
          category: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discipline: string | null
          due_date: string | null
          escalation_level: number
          id: string
          is_archived: boolean
          is_client_visible: boolean
          is_escalated: boolean
          issue_number: string | null
          issue_type: string
          linked_daily_report_id: string | null
          linked_risk_id: string | null
          linked_task_id: string | null
          location: string | null
          photos: Json
          priority: string
          project_id: string
          resolution: string | null
          resolution_notes: string | null
          resolved_date: string | null
          root_cause: string | null
          severity: string
          status: string
          target_resolution_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          escalation_level?: number
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean
          is_escalated?: boolean
          issue_number?: string | null
          issue_type?: string
          linked_daily_report_id?: string | null
          linked_risk_id?: string | null
          linked_task_id?: string | null
          location?: string | null
          photos?: Json
          priority?: string
          project_id: string
          resolution?: string | null
          resolution_notes?: string | null
          resolved_date?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          target_resolution_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          escalation_level?: number
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean
          is_escalated?: boolean
          issue_number?: string | null
          issue_type?: string
          linked_daily_report_id?: string | null
          linked_risk_id?: string | null
          linked_task_id?: string | null
          location?: string | null
          photos?: Json
          priority?: string
          project_id?: string
          resolution?: string | null
          resolution_notes?: string | null
          resolved_date?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          target_resolution_date?: string | null
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
          action_number: string | null
          completed_date: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          is_archived: boolean
          linked_task_id: string | null
          meeting_id: string
          priority: string | null
          progress_percentage: number
          project_id: string
          responsible_person: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          action_number?: string | null
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          is_archived?: boolean
          linked_task_id?: string | null
          meeting_id: string
          priority?: string | null
          progress_percentage?: number
          project_id: string
          responsible_person?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          action_number?: string | null
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          is_archived?: boolean
          linked_task_id?: string | null
          meeting_id?: string
          priority?: string | null
          progress_percentage?: number
          project_id?: string
          responsible_person?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
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
          chairperson_id: string | null
          created_at: string
          created_by: string | null
          decisions: string | null
          discussion_points: string | null
          end_time: string | null
          id: string
          is_archived: boolean
          is_client_visible: boolean
          location: string | null
          meeting_date: string
          meeting_link: string | null
          meeting_mode: string | null
          meeting_number: string | null
          meeting_type: string | null
          next_meeting_date: string | null
          prepared_by: string | null
          project_id: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          attachments?: Json
          attendees?: Json
          chairperson_id?: string | null
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          discussion_points?: string | null
          end_time?: string | null
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean
          location?: string | null
          meeting_date: string
          meeting_link?: string | null
          meeting_mode?: string | null
          meeting_number?: string | null
          meeting_type?: string | null
          next_meeting_date?: string | null
          prepared_by?: string | null
          project_id: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          attachments?: Json
          attendees?: Json
          chairperson_id?: string | null
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          discussion_points?: string | null
          end_time?: string | null
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean
          location?: string | null
          meeting_date?: string
          meeting_link?: string | null
          meeting_mode?: string | null
          meeting_number?: string | null
          meeting_type?: string | null
          next_meeting_date?: string | null
          prepared_by?: string | null
          project_id?: string
          status?: string
          summary?: string | null
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
          description: string | null
          due_date: string | null
          id: string
          is_archived: boolean
          name: string
          progress: number
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean
          name: string
          progress?: number
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          progress?: number
          project_id?: string
          status?: string
          updated_at?: string
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
          budget_amount: number | null
          client: string | null
          code: string | null
          company_id: string
          consultant_name: string | null
          contract_number: string | null
          contract_value: number | null
          contractor_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          end_date: string | null
          id: string
          is_archived: boolean
          location: string | null
          name: string
          planned_end_date: string | null
          priority: string
          progress: number
          project_manager_id: string | null
          project_type: string | null
          revised_end_date: string | null
          risk_level: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget_amount?: number | null
          client?: string | null
          code?: string | null
          company_id: string
          consultant_name?: string | null
          contract_number?: string | null
          contract_value?: number | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          location?: string | null
          name: string
          planned_end_date?: string | null
          priority?: string
          progress?: number
          project_manager_id?: string | null
          project_type?: string | null
          revised_end_date?: string | null
          risk_level?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget_amount?: number | null
          client?: string | null
          code?: string | null
          company_id?: string
          consultant_name?: string | null
          contract_number?: string | null
          contract_value?: number | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          location?: string | null
          name?: string
          planned_end_date?: string | null
          priority?: string
          progress?: number
          project_manager_id?: string | null
          project_type?: string | null
          revised_end_date?: string | null
          risk_level?: string
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
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      rfi_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          is_client_visible: boolean
          project_id: string
          rfi_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          is_client_visible?: boolean
          project_id: string
          rfi_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          is_client_visible?: boolean
          project_id?: string
          rfi_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfi_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          answer: string | null
          assigned_to: string | null
          category: string | null
          closed_at: string | null
          cost_impact: boolean
          cost_impact_description: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discipline: string | null
          due_date: string | null
          id: string
          is_archived: boolean
          is_client_visible: boolean
          linked_document_id: string | null
          linked_drawing_id: string | null
          linked_issue_id: string | null
          linked_submittal_id: string | null
          linked_task_id: string | null
          location: string | null
          number: string | null
          priority: string | null
          project_id: string
          question: string | null
          raised_by: string | null
          reference_drawing: string | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          reviewer_id: string | null
          rfi_number: string | null
          status: Database["public"]["Enums"]["approval_status"]
          subject: string
          submitted_at: string | null
          time_impact: boolean
          time_impact_days: number
          time_impact_description: string | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          cost_impact?: boolean
          cost_impact_description?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean
          linked_document_id?: string | null
          linked_drawing_id?: string | null
          linked_issue_id?: string | null
          linked_submittal_id?: string | null
          linked_task_id?: string | null
          location?: string | null
          number?: string | null
          priority?: string | null
          project_id: string
          question?: string | null
          raised_by?: string | null
          reference_drawing?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          reviewer_id?: string | null
          rfi_number?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject: string
          submitted_at?: string | null
          time_impact?: boolean
          time_impact_days?: number
          time_impact_description?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          cost_impact?: boolean
          cost_impact_description?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean
          linked_document_id?: string | null
          linked_drawing_id?: string | null
          linked_issue_id?: string | null
          linked_submittal_id?: string | null
          linked_task_id?: string | null
          location?: string | null
          number?: string | null
          priority?: string | null
          project_id?: string
          question?: string | null
          raised_by?: string | null
          reference_drawing?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          reviewer_id?: string | null
          rfi_number?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject?: string
          submitted_at?: string | null
          time_impact?: boolean
          time_impact_days?: number
          time_impact_description?: string | null
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
      submittal_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          is_client_visible: boolean
          project_id: string
          submittal_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          is_client_visible?: boolean
          project_id: string
          submittal_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          is_client_visible?: boolean
          project_id?: string
          submittal_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          boq_item_id: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discipline: string | null
          due_date: string | null
          id: string
          is_archived: boolean | null
          is_client_visible: boolean | null
          is_current_revision: boolean | null
          linked_document_id: string | null
          linked_drawing_id: string | null
          linked_issue_id: string | null
          linked_rfi_id: string | null
          linked_task_id: string | null
          material_id: string | null
          number: string | null
          previous_revision_id: string | null
          priority: string | null
          project_id: string
          rejected_at: string | null
          rejection_reason: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          revision: string | null
          revision_notes: string | null
          spec_section: string | null
          status: Database["public"]["Enums"]["approval_status"]
          submittal_type: string | null
          submitted_at: string | null
          submitted_by: string | null
          superseded_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          boq_item_id?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          is_current_revision?: boolean | null
          linked_document_id?: string | null
          linked_drawing_id?: string | null
          linked_issue_id?: string | null
          linked_rfi_id?: string | null
          linked_task_id?: string | null
          material_id?: string | null
          number?: string | null
          previous_revision_id?: string | null
          priority?: string | null
          project_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          revision?: string | null
          revision_notes?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          submittal_type?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          superseded_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          boq_item_id?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          is_current_revision?: boolean | null
          linked_document_id?: string | null
          linked_drawing_id?: string | null
          linked_issue_id?: string | null
          linked_rfi_id?: string | null
          linked_task_id?: string | null
          material_id?: string | null
          number?: string | null
          previous_revision_id?: string | null
          priority?: string | null
          project_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          revision?: string | null
          revision_notes?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          submittal_type?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          superseded_by?: string | null
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
          actual_finish: string | null
          actual_start: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discipline: string | null
          due_date: string | null
          id: string
          is_archived: boolean
          location: string | null
          milestone_id: string | null
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          project_id: string
          remarks: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          wbs_id: string | null
        }
        Insert: {
          actual_finish?: string | null
          actual_start?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean
          location?: string | null
          milestone_id?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          project_id: string
          remarks?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          wbs_id?: string | null
        }
        Update: {
          actual_finish?: string | null
          actual_start?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean
          location?: string | null
          milestone_id?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          project_id?: string
          remarks?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          wbs_id?: string | null
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
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_items"
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
      wbs_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          parent_wbs_id: string | null
          planned_finish: string | null
          planned_start: string | null
          progress: number
          project_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          wbs_code: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          parent_wbs_id?: string | null
          planned_finish?: string | null
          planned_start?: string | null
          progress?: number
          project_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          wbs_code?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          parent_wbs_id?: string | null
          planned_finish?: string | null
          planned_start?: string | null
          progress?: number
          project_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          wbs_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wbs_items_parent_wbs_id_fkey"
            columns: ["parent_wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wbs_items_project_id_fkey"
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
        | "reopened"
        | "cancelled"
        | "approved_with_comments"
        | "superseded"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      report_status:
        | "draft"
        | "submitted"
        | "approved"
        | "under_review"
        | "rejected"
        | "revision_requested"
        | "archived"
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
        "reopened",
        "cancelled",
        "approved_with_comments",
        "superseded",
      ],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      report_status: [
        "draft",
        "submitted",
        "approved",
        "under_review",
        "rejected",
        "revision_requested",
        "archived",
      ],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["todo", "in_progress", "blocked", "done", "cancelled"],
    },
  },
} as const
