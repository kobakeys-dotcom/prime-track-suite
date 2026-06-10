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
      actual_cost_entries: {
        Row: {
          amount: number
          budget_line_id: string | null
          company_id: string
          cost_code_id: string | null
          cost_date: string
          created_at: string
          currency: string | null
          description: string
          entered_by: string | null
          id: string
          invoice_number: string | null
          is_archived: boolean
          project_id: string
          source_module: string | null
          source_record_id: string | null
          status: string
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          budget_line_id?: string | null
          company_id: string
          cost_code_id?: string | null
          cost_date?: string
          created_at?: string
          currency?: string | null
          description: string
          entered_by?: string | null
          id?: string
          invoice_number?: string | null
          is_archived?: boolean
          project_id: string
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_line_id?: string | null
          company_id?: string
          cost_code_id?: string | null
          cost_date?: string
          created_at?: string
          currency?: string | null
          description?: string
          entered_by?: string | null
          id?: string
          invoice_number?: string | null
          is_archived?: boolean
          project_id?: string
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actual_cost_entries_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_cost_entries_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
      budget_change_orders: {
        Row: {
          approved_amount: number
          approved_at: string | null
          approved_by: string | null
          budget_line_id: string | null
          change_amount: number
          change_number: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          project_budget_id: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
          variation_id: string | null
        }
        Insert: {
          approved_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          budget_line_id?: string | null
          change_amount?: number
          change_number?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          project_budget_id?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
          variation_id?: string | null
        }
        Update: {
          approved_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          budget_line_id?: string | null
          change_amount?: number
          change_number?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          project_budget_id?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_change_orders_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_change_orders_project_budget_id_fkey"
            columns: ["project_budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_change_orders_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          actual_cost: number
          approved_changes: number
          boq_item_id: string | null
          budget_utilization_percentage: number
          category: string | null
          committed_cost: number
          company_id: string
          cost_at_completion: number
          cost_code_id: string | null
          cost_to_complete: number
          cost_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discipline: string | null
          forecast_cost: number
          forecast_overrun_amount: number
          id: string
          is_archived: boolean
          line_code: string | null
          line_name: string
          original_budget: number
          project_budget_id: string | null
          project_id: string
          remarks: string | null
          revised_budget: number
          status: string
          trade: string | null
          updated_at: string
          variance_amount: number
          variance_percentage: number
        }
        Insert: {
          actual_cost?: number
          approved_changes?: number
          boq_item_id?: string | null
          budget_utilization_percentage?: number
          category?: string | null
          committed_cost?: number
          company_id: string
          cost_at_completion?: number
          cost_code_id?: string | null
          cost_to_complete?: number
          cost_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          forecast_cost?: number
          forecast_overrun_amount?: number
          id?: string
          is_archived?: boolean
          line_code?: string | null
          line_name: string
          original_budget?: number
          project_budget_id?: string | null
          project_id: string
          remarks?: string | null
          revised_budget?: number
          status?: string
          trade?: string | null
          updated_at?: string
          variance_amount?: number
          variance_percentage?: number
        }
        Update: {
          actual_cost?: number
          approved_changes?: number
          boq_item_id?: string | null
          budget_utilization_percentage?: number
          category?: string | null
          committed_cost?: number
          company_id?: string
          cost_at_completion?: number
          cost_code_id?: string | null
          cost_to_complete?: number
          cost_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          forecast_cost?: number
          forecast_overrun_amount?: number
          id?: string
          is_archived?: boolean
          line_code?: string | null
          line_name?: string
          original_budget?: number
          project_budget_id?: string | null
          project_id?: string
          remarks?: string | null
          revised_budget?: number
          status?: string
          trade?: string | null
          updated_at?: string
          variance_amount?: number
          variance_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_boq_item_id_fkey"
            columns: ["boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_budget_id_fkey"
            columns: ["project_budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_entries: {
        Row: {
          actual_inflow: number
          actual_outflow: number
          cash_flow_plan_id: string | null
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          cumulative_actual: number
          cumulative_forecast: number
          cumulative_planned: number
          description: string | null
          entry_type: string
          forecast_inflow: number
          forecast_outflow: number
          id: string
          is_archived: boolean
          net_actual: number
          net_forecast: number
          net_planned: number
          period_end: string
          period_label: string
          period_start: string
          planned_inflow: number
          planned_outflow: number
          project_id: string
          remarks: string | null
          source_module: string
          source_record_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_inflow?: number
          actual_outflow?: number
          cash_flow_plan_id?: string | null
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          cumulative_actual?: number
          cumulative_forecast?: number
          cumulative_planned?: number
          description?: string | null
          entry_type?: string
          forecast_inflow?: number
          forecast_outflow?: number
          id?: string
          is_archived?: boolean
          net_actual?: number
          net_forecast?: number
          net_planned?: number
          period_end: string
          period_label: string
          period_start: string
          planned_inflow?: number
          planned_outflow?: number
          project_id: string
          remarks?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_inflow?: number
          actual_outflow?: number
          cash_flow_plan_id?: string | null
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          cumulative_actual?: number
          cumulative_forecast?: number
          cumulative_planned?: number
          description?: string | null
          entry_type?: string
          forecast_inflow?: number
          forecast_outflow?: number
          id?: string
          is_archived?: boolean
          net_actual?: number
          net_forecast?: number
          net_planned?: number
          period_end?: string
          period_label?: string
          period_start?: string
          planned_inflow?: number
          planned_outflow?: number
          project_id?: string
          remarks?: string | null
          source_module?: string
          source_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_entries_cash_flow_plan_id_fkey"
            columns: ["cash_flow_plan_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_payables: {
        Row: {
          actual_payment_date: string | null
          cash_flow_plan_id: string | null
          committed_amount: number
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expected_payment_date: string | null
          id: string
          is_archived: boolean
          outstanding_amount: number
          paid_amount: number
          payment_reference: string | null
          project_id: string
          purchase_order_id: string | null
          status: string
          subcontractor_id: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          actual_payment_date?: string | null
          cash_flow_plan_id?: string | null
          committed_amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_payment_date?: string | null
          id?: string
          is_archived?: boolean
          outstanding_amount?: number
          paid_amount?: number
          payment_reference?: string | null
          project_id: string
          purchase_order_id?: string | null
          status?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_payment_date?: string | null
          cash_flow_plan_id?: string | null
          committed_amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_payment_date?: string | null
          id?: string
          is_archived?: boolean
          outstanding_amount?: number
          paid_amount?: number
          payment_reference?: string | null
          project_id?: string
          purchase_order_id?: string | null
          status?: string
          subcontractor_id?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_payables_cash_flow_plan_id_fkey"
            columns: ["cash_flow_plan_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_plans: {
        Row: {
          closing_balance: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          end_date: string
          id: string
          is_archived: boolean
          net_actual_cash_flow: number
          net_forecast_cash_flow: number
          net_planned_cash_flow: number
          opening_balance: number
          plan_name: string
          plan_type: string
          project_id: string
          start_date: string
          status: string
          total_actual_inflow: number
          total_actual_outflow: number
          total_forecast_inflow: number
          total_forecast_outflow: number
          total_planned_inflow: number
          total_planned_outflow: number
          updated_at: string
        }
        Insert: {
          closing_balance?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date: string
          id?: string
          is_archived?: boolean
          net_actual_cash_flow?: number
          net_forecast_cash_flow?: number
          net_planned_cash_flow?: number
          opening_balance?: number
          plan_name?: string
          plan_type?: string
          project_id: string
          start_date: string
          status?: string
          total_actual_inflow?: number
          total_actual_outflow?: number
          total_forecast_inflow?: number
          total_forecast_outflow?: number
          total_planned_inflow?: number
          total_planned_outflow?: number
          updated_at?: string
        }
        Update: {
          closing_balance?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date?: string
          id?: string
          is_archived?: boolean
          net_actual_cash_flow?: number
          net_forecast_cash_flow?: number
          net_planned_cash_flow?: number
          opening_balance?: number
          plan_name?: string
          plan_type?: string
          project_id?: string
          start_date?: string
          status?: string
          total_actual_inflow?: number
          total_actual_outflow?: number
          total_forecast_inflow?: number
          total_forecast_outflow?: number
          total_planned_inflow?: number
          total_planned_outflow?: number
          updated_at?: string
        }
        Relationships: []
      }
      cash_flow_receivables: {
        Row: {
          actual_receipt_date: string | null
          cash_flow_plan_id: string | null
          certified_amount: number
          claim_number: string | null
          claimed_amount: number
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expected_receipt_date: string | null
          id: string
          invoice_number: string | null
          is_archived: boolean
          outstanding_amount: number
          payment_claim_id: string | null
          project_id: string
          received_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          actual_receipt_date?: string | null
          cash_flow_plan_id?: string | null
          certified_amount?: number
          claim_number?: string | null
          claimed_amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_receipt_date?: string | null
          id?: string
          invoice_number?: string | null
          is_archived?: boolean
          outstanding_amount?: number
          payment_claim_id?: string | null
          project_id: string
          received_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          actual_receipt_date?: string | null
          cash_flow_plan_id?: string | null
          certified_amount?: number
          claim_number?: string | null
          claimed_amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_receipt_date?: string | null
          id?: string
          invoice_number?: string | null
          is_archived?: boolean
          outstanding_amount?: number
          payment_claim_id?: string | null
          project_id?: string
          received_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_receivables_cash_flow_plan_id_fkey"
            columns: ["cash_flow_plan_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_snapshots: {
        Row: {
          actual_inflow: number
          actual_outflow: number
          closing_balance: number
          company_id: string
          created_at: string
          created_by: string | null
          cumulative_cash_flow: number
          forecast_inflow: number
          forecast_outflow: number
          id: string
          net_cash_flow: number
          planned_inflow: number
          planned_outflow: number
          project_id: string
          snapshot_date: string
        }
        Insert: {
          actual_inflow?: number
          actual_outflow?: number
          closing_balance?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          cumulative_cash_flow?: number
          forecast_inflow?: number
          forecast_outflow?: number
          id?: string
          net_cash_flow?: number
          planned_inflow?: number
          planned_outflow?: number
          project_id: string
          snapshot_date?: string
        }
        Update: {
          actual_inflow?: number
          actual_outflow?: number
          closing_balance?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          cumulative_cash_flow?: number
          forecast_inflow?: number
          forecast_outflow?: number
          id?: string
          net_cash_flow?: number
          planned_inflow?: number
          planned_outflow?: number
          project_id?: string
          snapshot_date?: string
        }
        Relationships: []
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
      committed_cost_entries: {
        Row: {
          amount: number
          budget_line_id: string | null
          commitment_date: string
          company_id: string
          cost_code_id: string | null
          created_at: string
          currency: string | null
          description: string
          entered_by: string | null
          id: string
          is_archived: boolean
          po_number: string | null
          project_id: string
          source_module: string | null
          source_record_id: string | null
          status: string
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          budget_line_id?: string | null
          commitment_date?: string
          company_id: string
          cost_code_id?: string | null
          created_at?: string
          currency?: string | null
          description: string
          entered_by?: string | null
          id?: string
          is_archived?: boolean
          po_number?: string | null
          project_id: string
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_line_id?: string | null
          commitment_date?: string
          company_id?: string
          cost_code_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          entered_by?: string | null
          id?: string
          is_archived?: boolean
          po_number?: string | null
          project_id?: string
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committed_cost_entries_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committed_cost_entries_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committed_cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          actual_amount: number
          budget_amount: number
          category: string
          code: string
          committed_amount: number
          company_id: string
          cost_type: string
          created_at: string
          created_by: string | null
          description: string | null
          discipline: string | null
          forecast_amount: number
          id: string
          is_archived: boolean
          name: string
          parent_id: string | null
          project_id: string | null
          sort_order: number
          status: string
          trade: string | null
          updated_at: string
        }
        Insert: {
          actual_amount?: number
          budget_amount?: number
          category?: string
          code: string
          committed_amount?: number
          company_id: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          forecast_amount?: number
          id?: string
          is_archived?: boolean
          name: string
          parent_id?: string | null
          project_id?: string | null
          sort_order?: number
          status?: string
          trade?: string | null
          updated_at?: string
        }
        Update: {
          actual_amount?: number
          budget_amount?: number
          category?: string
          code?: string
          committed_amount?: number
          company_id?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: string | null
          forecast_amount?: number
          id?: string
          is_archived?: boolean
          name?: string
          parent_id?: string | null
          project_id?: string | null
          sort_order?: number
          status?: string
          trade?: string | null
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
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          delivered_quantity: number
          delivery_condition: string | null
          delivery_date: string
          delivery_location: string | null
          delivery_note: string | null
          delivery_note_number: string | null
          delivery_number: string | null
          delivery_time: string | null
          delivery_title: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_status: string | null
          invoice_number: string | null
          is_archived: boolean | null
          material_request_id: string | null
          notes: string | null
          photos: Json
          project_id: string
          purchase_order_id: string | null
          received_by: string | null
          rejection_reason: string | null
          remarks: string | null
          rfq_id: string | null
          status: string
          storage_location: string | null
          supplier_contact: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_quantity?: number
          delivery_condition?: string | null
          delivery_date?: string
          delivery_location?: string | null
          delivery_note?: string | null
          delivery_note_number?: string | null
          delivery_number?: string | null
          delivery_time?: string | null
          delivery_title?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_status?: string | null
          invoice_number?: string | null
          is_archived?: boolean | null
          material_request_id?: string | null
          notes?: string | null
          photos?: Json
          project_id: string
          purchase_order_id?: string | null
          received_by?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          rfq_id?: string | null
          status?: string
          storage_location?: string | null
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_quantity?: number
          delivery_condition?: string | null
          delivery_date?: string
          delivery_location?: string | null
          delivery_note?: string | null
          delivery_note_number?: string | null
          delivery_number?: string | null
          delivery_time?: string | null
          delivery_title?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_status?: string | null
          invoice_number?: string | null
          is_archived?: boolean | null
          material_request_id?: string | null
          notes?: string | null
          photos?: Json
          project_id?: string
          purchase_order_id?: string | null
          received_by?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          rfq_id?: string | null
          status?: string
          storage_location?: string | null
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_at?: string
          vehicle_number?: string | null
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
      delivery_attachments: {
        Row: {
          attachment_type: string | null
          company_id: string
          created_at: string
          delivery_id: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          company_id: string
          created_at?: string
          delivery_id: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          company_id?: string
          created_at?: string
          delivery_id?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attachments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_items: {
        Row: {
          accepted_quantity: number | null
          balance_quantity: number | null
          batch_number: string | null
          boq_item_id: string | null
          company_id: string
          condition: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          damaged_quantity: number | null
          delivered_amount: number | null
          delivered_quantity: number | null
          delivery_id: string
          description: string | null
          expiry_date: string | null
          id: string
          inspection_result: string | null
          is_archived: boolean | null
          item_code: string | null
          item_name: string
          material_id: string | null
          material_request_item_id: string | null
          ordered_quantity: number | null
          previously_delivered_quantity: number | null
          project_id: string
          purchase_order_item_id: string | null
          rejected_quantity: number | null
          remarks: string | null
          serial_number: string | null
          specification: string | null
          storage_location: string | null
          task_id: string | null
          unit: string
          unit_rate: number | null
          updated_at: string
          wbs_id: string | null
        }
        Insert: {
          accepted_quantity?: number | null
          balance_quantity?: number | null
          batch_number?: string | null
          boq_item_id?: string | null
          company_id: string
          condition?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          damaged_quantity?: number | null
          delivered_amount?: number | null
          delivered_quantity?: number | null
          delivery_id: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          inspection_result?: string | null
          is_archived?: boolean | null
          item_code?: string | null
          item_name: string
          material_id?: string | null
          material_request_item_id?: string | null
          ordered_quantity?: number | null
          previously_delivered_quantity?: number | null
          project_id: string
          purchase_order_item_id?: string | null
          rejected_quantity?: number | null
          remarks?: string | null
          serial_number?: string | null
          specification?: string | null
          storage_location?: string | null
          task_id?: string | null
          unit?: string
          unit_rate?: number | null
          updated_at?: string
          wbs_id?: string | null
        }
        Update: {
          accepted_quantity?: number | null
          balance_quantity?: number | null
          batch_number?: string | null
          boq_item_id?: string | null
          company_id?: string
          condition?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          damaged_quantity?: number | null
          delivered_amount?: number | null
          delivered_quantity?: number | null
          delivery_id?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          inspection_result?: string | null
          is_archived?: boolean | null
          item_code?: string | null
          item_name?: string
          material_id?: string | null
          material_request_item_id?: string | null
          ordered_quantity?: number | null
          previously_delivered_quantity?: number | null
          project_id?: string
          purchase_order_item_id?: string | null
          rejected_quantity?: number | null
          remarks?: string | null
          serial_number?: string | null
          specification?: string | null
          storage_location?: string | null
          task_id?: string | null
          unit?: string
          unit_rate?: number | null
          updated_at?: string
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          delivery_id: string
          id: string
          new_status: string
          old_status: string | null
          project_id: string
          remarks: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          delivery_id: string
          id?: string
          new_status: string
          old_status?: string | null
          project_id: string
          remarks?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          delivery_id?: string
          id?: string
          new_status?: string
          old_status?: string | null
          project_id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
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
      material_request_attachments: {
        Row: {
          attachment_type: string
          company_id: string | null
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          is_client_visible: boolean
          material_request_id: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          is_client_visible?: boolean
          material_request_id: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          is_client_visible?: boolean
          material_request_id?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_request_attachments_material_request_id_fkey"
            columns: ["material_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_request_items: {
        Row: {
          approved_amount: number
          approved_quantity: number
          approved_rate: number
          balance_quantity: number
          boq_item_id: string | null
          company_id: string
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          delivered_quantity: number
          description: string | null
          estimated_amount: number
          estimated_rate: number
          id: string
          is_archived: boolean
          item_code: string | null
          material_name: string
          material_request_id: string
          ordered_quantity: number
          priority: string
          project_id: string
          remarks: string | null
          requested_quantity: number
          required_date: string | null
          specification: string | null
          status: string
          supplier_suggestion: string | null
          task_id: string | null
          unit: string
          updated_at: string
          wbs_id: string | null
        }
        Insert: {
          approved_amount?: number
          approved_quantity?: number
          approved_rate?: number
          balance_quantity?: number
          boq_item_id?: string | null
          company_id: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_quantity?: number
          description?: string | null
          estimated_amount?: number
          estimated_rate?: number
          id?: string
          is_archived?: boolean
          item_code?: string | null
          material_name: string
          material_request_id: string
          ordered_quantity?: number
          priority?: string
          project_id: string
          remarks?: string | null
          requested_quantity?: number
          required_date?: string | null
          specification?: string | null
          status?: string
          supplier_suggestion?: string | null
          task_id?: string | null
          unit?: string
          updated_at?: string
          wbs_id?: string | null
        }
        Update: {
          approved_amount?: number
          approved_quantity?: number
          approved_rate?: number
          balance_quantity?: number
          boq_item_id?: string | null
          company_id?: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_quantity?: number
          description?: string | null
          estimated_amount?: number
          estimated_rate?: number
          id?: string
          is_archived?: boolean
          item_code?: string | null
          material_name?: string
          material_request_id?: string
          ordered_quantity?: number
          priority?: string
          project_id?: string
          remarks?: string | null
          requested_quantity?: number
          required_date?: string | null
          specification?: string | null
          status?: string
          supplier_suggestion?: string | null
          task_id?: string | null
          unit?: string
          updated_at?: string
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_request_items_boq_item_id_fkey"
            columns: ["boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_material_request_id_fkey"
            columns: ["material_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_items"
            referencedColumns: ["id"]
          },
        ]
      }
      material_request_status_history: {
        Row: {
          changed_by: string | null
          company_id: string | null
          created_at: string
          id: string
          material_request_id: string
          new_status: string | null
          old_status: string | null
          project_id: string
          remarks: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          material_request_id: string
          new_status?: string | null
          old_status?: string | null
          project_id: string
          remarks?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          material_request_id?: string
          new_status?: string | null
          old_status?: string | null
          project_id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_request_status_history_material_request_id_fkey"
            columns: ["material_request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_status_history_project_id_fkey"
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
      ncr_actions: {
        Row: {
          action_description: string | null
          action_title: string
          action_type: string | null
          assigned_to: string | null
          company_id: string
          completed_date: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean | null
          ncr_id: string
          priority: string | null
          project_id: string
          status: string | null
          target_date: string | null
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action_description?: string | null
          action_title: string
          action_type?: string | null
          assigned_to?: string | null
          company_id: string
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          ncr_id: string
          priority?: string | null
          project_id: string
          status?: string | null
          target_date?: string | null
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action_description?: string | null
          action_title?: string
          action_type?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          ncr_id?: string
          priority?: string | null
          project_id?: string
          status?: string | null
          target_date?: string | null
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncr_actions_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: false
            referencedRelation: "ncrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_actions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ncr_attachments: {
        Row: {
          attachment_type: string | null
          company_id: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_client_visible: boolean | null
          ncr_action_id: string | null
          ncr_id: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_client_visible?: boolean | null
          ncr_action_id?: string | null
          ncr_id: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_client_visible?: boolean | null
          ncr_action_id?: string | null
          ncr_id?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncr_attachments_ncr_action_id_fkey"
            columns: ["ncr_action_id"]
            isOneToOne: false
            referencedRelation: "ncr_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_attachments_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: false
            referencedRelation: "ncrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ncr_comments: {
        Row: {
          comment: string
          company_id: string | null
          created_at: string
          id: string
          ncr_id: string
          project_id: string
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          comment: string
          company_id?: string | null
          created_at?: string
          id?: string
          ncr_id: string
          project_id: string
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          comment?: string
          company_id?: string | null
          created_at?: string
          id?: string
          ncr_id?: string
          project_id?: string
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncr_comments_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: false
            referencedRelation: "ncrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ncr_status_history: {
        Row: {
          changed_by: string | null
          company_id: string | null
          created_at: string
          id: string
          ncr_id: string
          new_status: string | null
          old_status: string | null
          project_id: string
          remarks: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          ncr_id: string
          new_status?: string | null
          old_status?: string | null
          project_id: string
          remarks?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          ncr_id?: string
          new_status?: string | null
          old_status?: string | null
          project_id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncr_status_history_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: false
            referencedRelation: "ncrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ncrs: {
        Row: {
          actual_closeout_date: string | null
          approved_at: string | null
          approved_by: string | null
          area: string | null
          assigned_to: string | null
          boq_item_id: string | null
          category: string | null
          closed_at: string | null
          closeout_notes: string | null
          company_id: string | null
          containment_action: string | null
          corrective_action: string | null
          cost_impact: boolean | null
          cost_impact_amount: number | null
          created_at: string
          created_by: string | null
          delivery_id: string | null
          description: string | null
          detected_by: string | null
          drawing_id: string | null
          drawing_reference: string | null
          due_date: string | null
          floor_level: string | null
          id: string
          is_archived: boolean | null
          is_client_visible: boolean | null
          issue_id: string | null
          location: string | null
          material_id: string | null
          ncr_number: string | null
          ncr_source: string | null
          ncr_title: string | null
          ncr_type: string | null
          non_conformance_details: string | null
          photos: Json
          preventive_action: string | null
          priority: string | null
          project_id: string
          quality_inspection_id: string | null
          recurrence_risk: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          responsible_party: string | null
          responsible_person: string | null
          responsible_user_id: string | null
          revision_notes: string | null
          root_cause: string | null
          root_cause_category: string | null
          safety_inspection_id: string | null
          severity: string | null
          snag_id: string | null
          source_record_id: string | null
          specification_reference: string | null
          standard_reference: string | null
          status: string
          subcontractor_id: string | null
          submittal_id: string | null
          submitted_at: string | null
          supplier_id: string | null
          target_closeout_date: string | null
          task_id: string | null
          time_impact: boolean | null
          time_impact_days: number | null
          updated_at: string
          verification_notes: string | null
          verification_required: boolean | null
          verified_at: string | null
          verified_by: string | null
          wbs_id: string | null
        }
        Insert: {
          actual_closeout_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          assigned_to?: string | null
          boq_item_id?: string | null
          category?: string | null
          closed_at?: string | null
          closeout_notes?: string | null
          company_id?: string | null
          containment_action?: string | null
          corrective_action?: string | null
          cost_impact?: boolean | null
          cost_impact_amount?: number | null
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          description?: string | null
          detected_by?: string | null
          drawing_id?: string | null
          drawing_reference?: string | null
          due_date?: string | null
          floor_level?: string | null
          id?: string
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          issue_id?: string | null
          location?: string | null
          material_id?: string | null
          ncr_number?: string | null
          ncr_source?: string | null
          ncr_title?: string | null
          ncr_type?: string | null
          non_conformance_details?: string | null
          photos?: Json
          preventive_action?: string | null
          priority?: string | null
          project_id: string
          quality_inspection_id?: string | null
          recurrence_risk?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          responsible_party?: string | null
          responsible_person?: string | null
          responsible_user_id?: string | null
          revision_notes?: string | null
          root_cause?: string | null
          root_cause_category?: string | null
          safety_inspection_id?: string | null
          severity?: string | null
          snag_id?: string | null
          source_record_id?: string | null
          specification_reference?: string | null
          standard_reference?: string | null
          status?: string
          subcontractor_id?: string | null
          submittal_id?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          target_closeout_date?: string | null
          task_id?: string | null
          time_impact?: boolean | null
          time_impact_days?: number | null
          updated_at?: string
          verification_notes?: string | null
          verification_required?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          wbs_id?: string | null
        }
        Update: {
          actual_closeout_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          assigned_to?: string | null
          boq_item_id?: string | null
          category?: string | null
          closed_at?: string | null
          closeout_notes?: string | null
          company_id?: string | null
          containment_action?: string | null
          corrective_action?: string | null
          cost_impact?: boolean | null
          cost_impact_amount?: number | null
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          description?: string | null
          detected_by?: string | null
          drawing_id?: string | null
          drawing_reference?: string | null
          due_date?: string | null
          floor_level?: string | null
          id?: string
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          issue_id?: string | null
          location?: string | null
          material_id?: string | null
          ncr_number?: string | null
          ncr_source?: string | null
          ncr_title?: string | null
          ncr_type?: string | null
          non_conformance_details?: string | null
          photos?: Json
          preventive_action?: string | null
          priority?: string | null
          project_id?: string
          quality_inspection_id?: string | null
          recurrence_risk?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          responsible_party?: string | null
          responsible_person?: string | null
          responsible_user_id?: string | null
          revision_notes?: string | null
          root_cause?: string | null
          root_cause_category?: string | null
          safety_inspection_id?: string | null
          severity?: string | null
          snag_id?: string | null
          source_record_id?: string | null
          specification_reference?: string | null
          standard_reference?: string | null
          status?: string
          subcontractor_id?: string | null
          submittal_id?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          target_closeout_date?: string | null
          task_id?: string | null
          time_impact?: boolean | null
          time_impact_days?: number | null
          updated_at?: string
          verification_notes?: string | null
          verification_required?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          wbs_id?: string | null
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
      payment_claim_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          is_client_visible: boolean | null
          payment_claim_id: string
          project_id: string
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
          is_client_visible?: boolean | null
          payment_claim_id: string
          project_id: string
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
          is_client_visible?: boolean | null
          payment_claim_id?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_claim_attachments_payment_claim_id_fkey"
            columns: ["payment_claim_id"]
            isOneToOne: false
            referencedRelation: "payment_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_claim_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_claim_items: {
        Row: {
          balance_quantity: number | null
          boq_item_id: string | null
          certified_amount: number | null
          certified_quantity: number | null
          contract_amount: number | null
          contract_quantity: number | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          cumulative_amount: number | null
          cumulative_quantity: number | null
          current_amount: number | null
          current_quantity: number | null
          description: string
          id: string
          is_archived: boolean | null
          item_type: string | null
          payment_claim_id: string
          previous_amount: number | null
          previous_quantity: number | null
          progress_percentage: number | null
          project_id: string
          rate: number | null
          remarks: string | null
          sort_order: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          balance_quantity?: number | null
          boq_item_id?: string | null
          certified_amount?: number | null
          certified_quantity?: number | null
          contract_amount?: number | null
          contract_quantity?: number | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          cumulative_amount?: number | null
          cumulative_quantity?: number | null
          current_amount?: number | null
          current_quantity?: number | null
          description: string
          id?: string
          is_archived?: boolean | null
          item_type?: string | null
          payment_claim_id: string
          previous_amount?: number | null
          previous_quantity?: number | null
          progress_percentage?: number | null
          project_id: string
          rate?: number | null
          remarks?: string | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          balance_quantity?: number | null
          boq_item_id?: string | null
          certified_amount?: number | null
          certified_quantity?: number | null
          contract_amount?: number | null
          contract_quantity?: number | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          cumulative_amount?: number | null
          cumulative_quantity?: number | null
          current_amount?: number | null
          current_quantity?: number | null
          description?: string
          id?: string
          is_archived?: boolean | null
          item_type?: string | null
          payment_claim_id?: string
          previous_amount?: number | null
          previous_quantity?: number | null
          progress_percentage?: number | null
          project_id?: string
          rate?: number | null
          remarks?: string | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_claim_items_boq_item_id_fkey"
            columns: ["boq_item_id"]
            isOneToOne: false
            referencedRelation: "boq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_claim_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_claim_items_payment_claim_id_fkey"
            columns: ["payment_claim_id"]
            isOneToOne: false
            referencedRelation: "payment_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_claim_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_claim_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          payment_claim_id: string
          project_id: string
          remarks: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          payment_claim_id: string
          project_id: string
          remarks?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          payment_claim_id?: string
          project_id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_claim_status_history_payment_claim_id_fkey"
            columns: ["payment_claim_id"]
            isOneToOne: false
            referencedRelation: "payment_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_claim_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_claim_variations: {
        Row: {
          approved_amount: number | null
          certified_amount: number | null
          claimed_amount: number | null
          created_at: string
          description: string | null
          id: string
          payment_claim_id: string
          project_id: string
          remarks: string | null
          variation_id: string
          variation_number: string | null
        }
        Insert: {
          approved_amount?: number | null
          certified_amount?: number | null
          claimed_amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          payment_claim_id: string
          project_id: string
          remarks?: string | null
          variation_id: string
          variation_number?: string | null
        }
        Update: {
          approved_amount?: number | null
          certified_amount?: number | null
          claimed_amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          payment_claim_id?: string
          project_id?: string
          remarks?: string | null
          variation_id?: string
          variation_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_claim_variations_payment_claim_id_fkey"
            columns: ["payment_claim_id"]
            isOneToOne: false
            referencedRelation: "payment_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_claim_variations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_claim_variations_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_claims: {
        Row: {
          advance_recovery: number | null
          approved_at: string | null
          approved_by: string | null
          certification_comments: string | null
          certified_amount: number | null
          certified_at: string | null
          certified_by: string | null
          claim_date: string | null
          claim_number: string
          claim_type: string | null
          client_approved_at: string | null
          client_approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          current_claim_amount: number | null
          deductions: number | null
          due_date: string | null
          gross_claim: number | null
          id: string
          is_archived: boolean | null
          is_client_visible: boolean | null
          material_at_site_value: number | null
          net_claim: number | null
          notes: string | null
          other_claim_value: number | null
          outstanding_amount: number | null
          paid_amount: number | null
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          previous_certified_amount: number | null
          project_id: string
          rejection_reason: string | null
          retention: number | null
          retention_percentage: number | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_notes: string | null
          status: string
          submitted_amount: number | null
          submitted_at: string | null
          tax_amount: number | null
          updated_at: string
          variation_value: number | null
          work_done_value: number | null
        }
        Insert: {
          advance_recovery?: number | null
          approved_at?: string | null
          approved_by?: string | null
          certification_comments?: string | null
          certified_amount?: number | null
          certified_at?: string | null
          certified_by?: string | null
          claim_date?: string | null
          claim_number: string
          claim_type?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_claim_amount?: number | null
          deductions?: number | null
          due_date?: string | null
          gross_claim?: number | null
          id?: string
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          material_at_site_value?: number | null
          net_claim?: number | null
          notes?: string | null
          other_claim_value?: number | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          previous_certified_amount?: number | null
          project_id: string
          rejection_reason?: string | null
          retention?: number | null
          retention_percentage?: number | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          status?: string
          submitted_amount?: number | null
          submitted_at?: string | null
          tax_amount?: number | null
          updated_at?: string
          variation_value?: number | null
          work_done_value?: number | null
        }
        Update: {
          advance_recovery?: number | null
          approved_at?: string | null
          approved_by?: string | null
          certification_comments?: string | null
          certified_amount?: number | null
          certified_at?: string | null
          certified_by?: string | null
          claim_date?: string | null
          claim_number?: string
          claim_type?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_claim_amount?: number | null
          deductions?: number | null
          due_date?: string | null
          gross_claim?: number | null
          id?: string
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          material_at_site_value?: number | null
          net_claim?: number | null
          notes?: string | null
          other_claim_value?: number | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          previous_certified_amount?: number | null
          project_id?: string
          rejection_reason?: string | null
          retention?: number | null
          retention_percentage?: number | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          status?: string
          submitted_amount?: number | null
          submitted_at?: string | null
          tax_amount?: number | null
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
          company_id: string | null
          converted_to_po: boolean
          converted_to_rfq: boolean
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          delivery_status: string
          department: string | null
          id: string
          is_archived: boolean
          is_client_visible: boolean
          material_name: string
          notes: string | null
          priority: string
          procurement_status: string
          project_id: string
          purchase_order_id: string | null
          quantity: number
          reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          remarks: string | null
          request_number: string
          request_title: string | null
          requested_by: string | null
          required_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_notes: string | null
          rfq_id: string | null
          site_location: string | null
          status: string
          submitted_at: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          converted_to_po?: boolean
          converted_to_rfq?: boolean
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_status?: string
          department?: string | null
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean
          material_name: string
          notes?: string | null
          priority?: string
          procurement_status?: string
          project_id: string
          purchase_order_id?: string | null
          quantity?: number
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          request_number: string
          request_title?: string | null
          requested_by?: string | null
          required_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          rfq_id?: string | null
          site_location?: string | null
          status?: string
          submitted_at?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          converted_to_po?: boolean
          converted_to_rfq?: boolean
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_status?: string
          department?: string | null
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean
          material_name?: string
          notes?: string | null
          priority?: string
          procurement_status?: string
          project_id?: string
          purchase_order_id?: string | null
          quantity?: number
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          request_number?: string
          request_title?: string | null
          requested_by?: string | null
          required_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          rfq_id?: string | null
          site_location?: string | null
          status?: string
          submitted_at?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_requests_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requests_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requests_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
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
      project_budgets: {
        Row: {
          actual_cost: number
          approved_at: string | null
          approved_by: string | null
          approved_changes: number
          budget_name: string
          budget_version: string | null
          committed_cost: number
          company_id: string
          cost_at_completion: number
          cost_to_complete: number
          created_at: string
          created_by: string | null
          description: string | null
          forecast_cost: number
          id: string
          is_archived: boolean
          original_budget: number
          project_id: string
          revised_budget: number
          status: string
          updated_at: string
          variance_amount: number
          variance_percentage: number
        }
        Insert: {
          actual_cost?: number
          approved_at?: string | null
          approved_by?: string | null
          approved_changes?: number
          budget_name?: string
          budget_version?: string | null
          committed_cost?: number
          company_id: string
          cost_at_completion?: number
          cost_to_complete?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          forecast_cost?: number
          id?: string
          is_archived?: boolean
          original_budget?: number
          project_id: string
          revised_budget?: number
          status?: string
          updated_at?: string
          variance_amount?: number
          variance_percentage?: number
        }
        Update: {
          actual_cost?: number
          approved_at?: string | null
          approved_by?: string | null
          approved_changes?: number
          budget_name?: string
          budget_version?: string | null
          committed_cost?: number
          company_id?: string
          cost_at_completion?: number
          cost_to_complete?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          forecast_cost?: number
          id?: string
          is_archived?: boolean
          original_budget?: number
          project_id?: string
          revised_budget?: number
          status?: string
          updated_at?: string
          variance_amount?: number
          variance_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      purchase_order_attachments: {
        Row: {
          attachment_type: string | null
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          purchase_order_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          purchase_order_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          purchase_order_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_attachments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          amount: number | null
          balance_quantity: number | null
          boq_item_id: string | null
          budget_line_id: string | null
          company_id: string
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          delivered_quantity: number | null
          delivery_status: string | null
          description: string | null
          discount_amount: number | null
          id: string
          is_archived: boolean | null
          item_code: string | null
          item_name: string
          material_request_item_id: string | null
          ordered_quantity: number | null
          project_id: string
          purchase_order_id: string
          received_quantity: number | null
          remarks: string | null
          rfq_item_id: string | null
          specification: string | null
          supplier_quotation_item_id: string | null
          task_id: string | null
          tax_amount: number | null
          total_amount: number | null
          unit: string
          unit_rate: number | null
          updated_at: string
          wbs_id: string | null
        }
        Insert: {
          amount?: number | null
          balance_quantity?: number | null
          boq_item_id?: string | null
          budget_line_id?: string | null
          company_id: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_quantity?: number | null
          delivery_status?: string | null
          description?: string | null
          discount_amount?: number | null
          id?: string
          is_archived?: boolean | null
          item_code?: string | null
          item_name: string
          material_request_item_id?: string | null
          ordered_quantity?: number | null
          project_id: string
          purchase_order_id: string
          received_quantity?: number | null
          remarks?: string | null
          rfq_item_id?: string | null
          specification?: string | null
          supplier_quotation_item_id?: string | null
          task_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          unit?: string
          unit_rate?: number | null
          updated_at?: string
          wbs_id?: string | null
        }
        Update: {
          amount?: number | null
          balance_quantity?: number | null
          boq_item_id?: string | null
          budget_line_id?: string | null
          company_id?: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_quantity?: number | null
          delivery_status?: string | null
          description?: string | null
          discount_amount?: number | null
          id?: string
          is_archived?: boolean | null
          item_code?: string | null
          item_name?: string
          material_request_item_id?: string | null
          ordered_quantity?: number | null
          project_id?: string
          purchase_order_id?: string
          received_quantity?: number | null
          remarks?: string | null
          rfq_item_id?: string | null
          specification?: string | null
          supplier_quotation_item_id?: string | null
          task_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          unit?: string
          unit_rate?: number | null
          updated_at?: string
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_status_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          project_id: string
          purchase_order_id: string
          remarks: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id: string
          purchase_order_id: string
          remarks?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id?: string
          purchase_order_id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_status_history_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          budget_line_id: string | null
          closed_at: string | null
          company_id: string | null
          contact_person: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          delivery_date: string | null
          delivery_location: string | null
          delivery_status: string | null
          delivery_terms: string | null
          discount_amount: number | null
          expected_delivery_date: string | null
          id: string
          invoiced_amount: number | null
          is_archived: boolean | null
          issued_at: string | null
          issued_by: string | null
          items: Json
          material_request_id: string | null
          notes: string | null
          other_charges: number | null
          outstanding_amount: number | null
          paid_amount: number | null
          payment_reference: string | null
          payment_status: string | null
          payment_terms: string | null
          po_date: string | null
          po_number: string | null
          po_title: string | null
          prepared_by: string | null
          priority: string | null
          procurement_request_id: string | null
          project_id: string
          rejection_reason: string | null
          remarks: string | null
          required_delivery_date: string | null
          reviewed_by: string | null
          revision_notes: string | null
          rfq_id: string | null
          shipping_amount: number | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          subtotal_amount: number | null
          supplier_email: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_phone: string | null
          supplier_quotation_id: string | null
          tax_amount: number | null
          tax_percentage: number | null
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string
          warranty_terms: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budget_line_id?: string | null
          closed_at?: string | null
          company_id?: string | null
          contact_person?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_location?: string | null
          delivery_status?: string | null
          delivery_terms?: string | null
          discount_amount?: number | null
          expected_delivery_date?: string | null
          id?: string
          invoiced_amount?: number | null
          is_archived?: boolean | null
          issued_at?: string | null
          issued_by?: string | null
          items?: Json
          material_request_id?: string | null
          notes?: string | null
          other_charges?: number | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          payment_reference?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          po_date?: string | null
          po_number?: string | null
          po_title?: string | null
          prepared_by?: string | null
          priority?: string | null
          procurement_request_id?: string | null
          project_id: string
          rejection_reason?: string | null
          remarks?: string | null
          required_delivery_date?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          rfq_id?: string | null
          shipping_amount?: number | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          subtotal_amount?: number | null
          supplier_email?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          supplier_quotation_id?: string | null
          tax_amount?: number | null
          tax_percentage?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          warranty_terms?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budget_line_id?: string | null
          closed_at?: string | null
          company_id?: string | null
          contact_person?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          delivery_location?: string | null
          delivery_status?: string | null
          delivery_terms?: string | null
          discount_amount?: number | null
          expected_delivery_date?: string | null
          id?: string
          invoiced_amount?: number | null
          is_archived?: boolean | null
          issued_at?: string | null
          issued_by?: string | null
          items?: Json
          material_request_id?: string | null
          notes?: string | null
          other_charges?: number | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          payment_reference?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          po_date?: string | null
          po_number?: string | null
          po_title?: string | null
          prepared_by?: string | null
          priority?: string | null
          procurement_request_id?: string | null
          project_id?: string
          rejection_reason?: string | null
          remarks?: string | null
          required_delivery_date?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          rfq_id?: string | null
          shipping_amount?: number | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          subtotal_amount?: number | null
          supplier_email?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          supplier_quotation_id?: string | null
          tax_amount?: number | null
          tax_percentage?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
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
      quality_inspection_attachments: {
        Row: {
          attachment_type: string | null
          checklist_item_id: string | null
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          is_client_visible: boolean | null
          project_id: string
          quality_inspection_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          checklist_item_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          is_client_visible?: boolean | null
          project_id: string
          quality_inspection_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          checklist_item_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          is_client_visible?: boolean | null
          project_id?: string
          quality_inspection_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspection_attachments_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "quality_inspection_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspection_attachments_quality_inspection_id_fkey"
            columns: ["quality_inspection_id"]
            isOneToOne: false
            referencedRelation: "quality_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspection_checklist_items: {
        Row: {
          acceptance_criteria: string | null
          checklist_item: string
          company_id: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean | null
          item_number: string | null
          photo_required: boolean | null
          project_id: string
          quality_inspection_id: string
          remarks: string | null
          responsible_user_id: string | null
          result: string | null
          sort_order: number | null
          specification_reference: string | null
          target_date: string | null
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          checklist_item: string
          company_id: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          item_number?: string | null
          photo_required?: boolean | null
          project_id: string
          quality_inspection_id: string
          remarks?: string | null
          responsible_user_id?: string | null
          result?: string | null
          sort_order?: number | null
          specification_reference?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          checklist_item?: string
          company_id?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          item_number?: string | null
          photo_required?: boolean | null
          project_id?: string
          quality_inspection_id?: string
          remarks?: string | null
          responsible_user_id?: string | null
          result?: string | null
          sort_order?: number | null
          specification_reference?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspection_checklist_items_quality_inspection_id_fkey"
            columns: ["quality_inspection_id"]
            isOneToOne: false
            referencedRelation: "quality_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspection_status_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          project_id: string
          quality_inspection_id: string
          remarks: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id: string
          quality_inspection_id: string
          remarks?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id?: string
          quality_inspection_id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspection_status_history_quality_inspection_id_fkey"
            columns: ["quality_inspection_id"]
            isOneToOne: false
            referencedRelation: "quality_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspections: {
        Row: {
          approval_comments: string | null
          approved_at: string | null
          approved_by: string | null
          area: string | null
          assigned_inspector_id: string | null
          boq_item_id: string | null
          category: string | null
          checklist: Json
          checklist_fail_count: number | null
          checklist_na_count: number | null
          checklist_pass_count: number | null
          comments: string | null
          company_id: string | null
          corrective_action: string | null
          created_at: string
          created_by: string | null
          delivery_id: string | null
          discipline: string | null
          drawing_id: string | null
          due_date: string | null
          findings: string | null
          floor_level: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_date: string | null
          inspection_number: string
          inspection_result: string | null
          inspection_time: string | null
          inspection_title: string | null
          inspection_type: string | null
          inspector_id: string | null
          is_archived: boolean | null
          is_client_visible: boolean | null
          issue_created: boolean | null
          issue_id: string | null
          location: string | null
          material_id: string | null
          ncr_created: boolean | null
          ncr_id: string | null
          parent_inspection_id: string | null
          photos: Json
          priority: string | null
          project_id: string
          reinspection_required: boolean | null
          rejected_at: string | null
          rejection_reason: string | null
          requested_by: string | null
          result: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_notes: string | null
          room_zone: string | null
          snag_created: boolean | null
          snag_id: string | null
          status: string
          submittal_id: string | null
          submitted_at: string | null
          task_id: string | null
          total_checklist_items: number | null
          type: string | null
          updated_at: string
          wbs_id: string | null
        }
        Insert: {
          approval_comments?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          assigned_inspector_id?: string | null
          boq_item_id?: string | null
          category?: string | null
          checklist?: Json
          checklist_fail_count?: number | null
          checklist_na_count?: number | null
          checklist_pass_count?: number | null
          comments?: string | null
          company_id?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          discipline?: string | null
          drawing_id?: string | null
          due_date?: string | null
          findings?: string | null
          floor_level?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_number: string
          inspection_result?: string | null
          inspection_time?: string | null
          inspection_title?: string | null
          inspection_type?: string | null
          inspector_id?: string | null
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          issue_created?: boolean | null
          issue_id?: string | null
          location?: string | null
          material_id?: string | null
          ncr_created?: boolean | null
          ncr_id?: string | null
          parent_inspection_id?: string | null
          photos?: Json
          priority?: string | null
          project_id: string
          reinspection_required?: boolean | null
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          result?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          room_zone?: string | null
          snag_created?: boolean | null
          snag_id?: string | null
          status?: string
          submittal_id?: string | null
          submitted_at?: string | null
          task_id?: string | null
          total_checklist_items?: number | null
          type?: string | null
          updated_at?: string
          wbs_id?: string | null
        }
        Update: {
          approval_comments?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          assigned_inspector_id?: string | null
          boq_item_id?: string | null
          category?: string | null
          checklist?: Json
          checklist_fail_count?: number | null
          checklist_na_count?: number | null
          checklist_pass_count?: number | null
          comments?: string | null
          company_id?: string | null
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          discipline?: string | null
          drawing_id?: string | null
          due_date?: string | null
          findings?: string | null
          floor_level?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_number?: string
          inspection_result?: string | null
          inspection_time?: string | null
          inspection_title?: string | null
          inspection_type?: string | null
          inspector_id?: string | null
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          issue_created?: boolean | null
          issue_id?: string | null
          location?: string | null
          material_id?: string | null
          ncr_created?: boolean | null
          ncr_id?: string | null
          parent_inspection_id?: string | null
          photos?: Json
          priority?: string | null
          project_id?: string
          reinspection_required?: boolean | null
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          result?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          room_zone?: string | null
          snag_created?: boolean | null
          snag_id?: string | null
          status?: string
          submittal_id?: string | null
          submitted_at?: string | null
          task_id?: string | null
          total_checklist_items?: number | null
          type?: string | null
          updated_at?: string
          wbs_id?: string | null
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
      rfq_attachments: {
        Row: {
          attachment_type: string | null
          company_id: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          project_id: string
          rfq_id: string
          supplier_quotation_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id: string
          rfq_id: string
          supplier_quotation_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id?: string
          rfq_id?: string
          supplier_quotation_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_attachments_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          boq_item_id: string | null
          company_id: string
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_amount: number
          estimated_rate: number
          id: string
          is_archived: boolean | null
          item_code: string | null
          item_name: string
          material_request_item_id: string | null
          project_id: string
          quantity: number
          remarks: string | null
          required_delivery_date: string | null
          rfq_id: string
          specification: string | null
          task_id: string | null
          unit: string
          updated_at: string
          wbs_id: string | null
        }
        Insert: {
          boq_item_id?: string | null
          company_id: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_amount?: number
          estimated_rate?: number
          id?: string
          is_archived?: boolean | null
          item_code?: string | null
          item_name: string
          material_request_item_id?: string | null
          project_id: string
          quantity?: number
          remarks?: string | null
          required_delivery_date?: string | null
          rfq_id: string
          specification?: string | null
          task_id?: string | null
          unit?: string
          updated_at?: string
          wbs_id?: string | null
        }
        Update: {
          boq_item_id?: string | null
          company_id?: string
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_amount?: number
          estimated_rate?: number
          id?: string
          is_archived?: boolean | null
          item_code?: string | null
          item_name?: string
          material_request_item_id?: string | null
          project_id?: string
          quantity?: number
          remarks?: string | null
          required_delivery_date?: string | null
          rfq_id?: string
          specification?: string | null
          task_id?: string | null
          unit?: string
          updated_at?: string
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_status_history: {
        Row: {
          changed_by: string | null
          company_id: string | null
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          project_id: string
          remarks: string | null
          rfq_id: string
        }
        Insert: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id: string
          remarks?: string | null
          rfq_id: string
        }
        Update: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id?: string
          remarks?: string | null
          rfq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_status_history_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_suppliers: {
        Row: {
          company_id: string
          contact_person: string | null
          created_at: string
          currency: string | null
          delivery_days: number | null
          id: string
          invitation_status: string | null
          invited_at: string | null
          is_recommended: boolean | null
          is_selected: boolean | null
          payment_terms: string | null
          project_id: string
          quotation_status: string | null
          remarks: string | null
          responded_at: string | null
          rfq_id: string
          supplier_email: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_phone: string | null
          total_quoted_amount: number | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          company_id: string
          contact_person?: string | null
          created_at?: string
          currency?: string | null
          delivery_days?: number | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          is_recommended?: boolean | null
          is_selected?: boolean | null
          payment_terms?: string | null
          project_id: string
          quotation_status?: string | null
          remarks?: string | null
          responded_at?: string | null
          rfq_id: string
          supplier_email?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          total_quoted_amount?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          company_id?: string
          contact_person?: string | null
          created_at?: string
          currency?: string | null
          delivery_days?: number | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          is_recommended?: boolean | null
          is_selected?: boolean | null
          payment_terms?: string | null
          project_id?: string
          quotation_status?: string | null
          remarks?: string | null
          responded_at?: string | null
          rfq_id?: string
          supplier_email?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          total_quoted_amount?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_suppliers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          award_status: string | null
          company_id: string | null
          converted_to_po: boolean | null
          created_at: string
          created_by: string | null
          currency: string | null
          delivery_location: string | null
          description: string | null
          due_date: string | null
          id: string
          is_archived: boolean | null
          issued_at: string | null
          issued_by: string | null
          material_request_id: string | null
          notes: string | null
          prepared_by: string | null
          priority: string | null
          procurement_request_id: string | null
          project_id: string
          purchase_order_id: string | null
          quotation_deadline: string | null
          recommended_supplier_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          remarks: string | null
          requested_by: string | null
          required_delivery_date: string | null
          revision_notes: string | null
          rfq_number: string
          rfq_title: string | null
          selected_amount: number | null
          selected_quotation_id: string | null
          selected_supplier_id: string | null
          status: string
          supplier_ids: string[]
          terms_and_conditions: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          award_status?: string | null
          company_id?: string | null
          converted_to_po?: boolean | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_location?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          issued_at?: string | null
          issued_by?: string | null
          material_request_id?: string | null
          notes?: string | null
          prepared_by?: string | null
          priority?: string | null
          procurement_request_id?: string | null
          project_id: string
          purchase_order_id?: string | null
          quotation_deadline?: string | null
          recommended_supplier_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          requested_by?: string | null
          required_delivery_date?: string | null
          revision_notes?: string | null
          rfq_number: string
          rfq_title?: string | null
          selected_amount?: number | null
          selected_quotation_id?: string | null
          selected_supplier_id?: string | null
          status?: string
          supplier_ids?: string[]
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          award_status?: string | null
          company_id?: string | null
          converted_to_po?: boolean | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_location?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          issued_at?: string | null
          issued_by?: string | null
          material_request_id?: string | null
          notes?: string | null
          prepared_by?: string | null
          priority?: string | null
          procurement_request_id?: string | null
          project_id?: string
          purchase_order_id?: string | null
          quotation_deadline?: string | null
          recommended_supplier_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          requested_by?: string | null
          required_delivery_date?: string | null
          revision_notes?: string | null
          rfq_number?: string
          rfq_title?: string | null
          selected_amount?: number | null
          selected_quotation_id?: string | null
          selected_supplier_id?: string | null
          status?: string
          supplier_ids?: string[]
          terms_and_conditions?: string | null
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
      risk_actions: {
        Row: {
          action_description: string | null
          action_title: string
          action_type: string | null
          assigned_to: string | null
          company_id: string
          completed_date: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean | null
          priority: string | null
          progress_percentage: number | null
          project_id: string
          risk_id: string
          status: string | null
          target_date: string | null
          updated_at: string
        }
        Insert: {
          action_description?: string | null
          action_title: string
          action_type?: string | null
          assigned_to?: string | null
          company_id: string
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          priority?: string | null
          progress_percentage?: number | null
          project_id: string
          risk_id: string
          status?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          action_description?: string | null
          action_title?: string
          action_type?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          priority?: string | null
          progress_percentage?: number | null
          project_id?: string
          risk_id?: string
          status?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_actions_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_attachments: {
        Row: {
          attachment_type: string | null
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          is_client_visible: boolean | null
          project_id: string
          risk_action_id: string | null
          risk_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          is_client_visible?: boolean | null
          project_id: string
          risk_action_id?: string | null
          risk_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          is_client_visible?: boolean | null
          project_id?: string
          risk_action_id?: string | null
          risk_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_attachments_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_comments: {
        Row: {
          comment: string
          company_id: string
          created_at: string
          id: string
          project_id: string
          risk_id: string
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          comment: string
          company_id: string
          created_at?: string
          id?: string
          project_id: string
          risk_id: string
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          comment?: string
          company_id?: string
          created_at?: string
          id?: string
          project_id?: string
          risk_id?: string
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_comments_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_reviews: {
        Row: {
          company_id: string
          created_at: string
          id: string
          impact: number | null
          next_review_date: string | null
          probability: number | null
          project_id: string
          review_date: string | null
          review_notes: string | null
          reviewed_by: string | null
          risk_id: string
          risk_level: string | null
          risk_score: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          impact?: number | null
          next_review_date?: string | null
          probability?: number | null
          project_id: string
          review_date?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          risk_id: string
          risk_level?: string | null
          risk_score?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          impact?: number | null
          next_review_date?: string | null
          probability?: number | null
          project_id?: string
          review_date?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          risk_id?: string
          risk_level?: string | null
          risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_reviews_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_status_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          project_id: string
          remarks: string | null
          risk_id: string
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id: string
          remarks?: string | null
          risk_id: string
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id?: string
          remarks?: string | null
          risk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_status_history_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          actual_mitigation_date: string | null
          assigned_to: string | null
          boq_item_id: string | null
          category: string | null
          client_impact: boolean | null
          closed_at: string | null
          company_id: string | null
          contingency_plan: string | null
          converted_issue_id: string | null
          converted_to_issue: boolean | null
          cost_impact: boolean | null
          cost_impact_amount: number | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          early_warning_signs: string | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          escalation_status: string | null
          id: string
          identified_by: string | null
          impact: number | null
          is_archived: boolean | null
          is_client_visible: boolean | null
          issue_id: string | null
          location: string | null
          milestone_id: string | null
          mitigation_action: string | null
          mitigation_plan: string | null
          ncr_id: string | null
          owner_id: string | null
          probability: number | null
          project_id: string
          quality_impact: boolean | null
          quality_inspection_id: string | null
          remarks: string | null
          reopened_at: string | null
          residual_impact: number | null
          residual_probability: number | null
          residual_risk_level: string | null
          residual_risk_score: number | null
          response_strategy: string | null
          review_date: string | null
          risk_category: string | null
          risk_level: string | null
          risk_number: string | null
          risk_owner_id: string | null
          risk_score: number | null
          risk_source: string | null
          risk_type: string | null
          safety_impact: boolean | null
          safety_inspection_id: string | null
          status: string
          target_mitigation_date: string | null
          task_id: string | null
          time_impact: boolean | null
          time_impact_days: number | null
          title: string
          trigger_condition: string | null
          updated_at: string
          variation_id: string | null
          wbs_id: string | null
        }
        Insert: {
          actual_mitigation_date?: string | null
          assigned_to?: string | null
          boq_item_id?: string | null
          category?: string | null
          client_impact?: boolean | null
          closed_at?: string | null
          company_id?: string | null
          contingency_plan?: string | null
          converted_issue_id?: string | null
          converted_to_issue?: boolean | null
          cost_impact?: boolean | null
          cost_impact_amount?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          early_warning_signs?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          escalation_status?: string | null
          id?: string
          identified_by?: string | null
          impact?: number | null
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          issue_id?: string | null
          location?: string | null
          milestone_id?: string | null
          mitigation_action?: string | null
          mitigation_plan?: string | null
          ncr_id?: string | null
          owner_id?: string | null
          probability?: number | null
          project_id: string
          quality_impact?: boolean | null
          quality_inspection_id?: string | null
          remarks?: string | null
          reopened_at?: string | null
          residual_impact?: number | null
          residual_probability?: number | null
          residual_risk_level?: string | null
          residual_risk_score?: number | null
          response_strategy?: string | null
          review_date?: string | null
          risk_category?: string | null
          risk_level?: string | null
          risk_number?: string | null
          risk_owner_id?: string | null
          risk_score?: number | null
          risk_source?: string | null
          risk_type?: string | null
          safety_impact?: boolean | null
          safety_inspection_id?: string | null
          status?: string
          target_mitigation_date?: string | null
          task_id?: string | null
          time_impact?: boolean | null
          time_impact_days?: number | null
          title: string
          trigger_condition?: string | null
          updated_at?: string
          variation_id?: string | null
          wbs_id?: string | null
        }
        Update: {
          actual_mitigation_date?: string | null
          assigned_to?: string | null
          boq_item_id?: string | null
          category?: string | null
          client_impact?: boolean | null
          closed_at?: string | null
          company_id?: string | null
          contingency_plan?: string | null
          converted_issue_id?: string | null
          converted_to_issue?: boolean | null
          cost_impact?: boolean | null
          cost_impact_amount?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          early_warning_signs?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          escalation_status?: string | null
          id?: string
          identified_by?: string | null
          impact?: number | null
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          issue_id?: string | null
          location?: string | null
          milestone_id?: string | null
          mitigation_action?: string | null
          mitigation_plan?: string | null
          ncr_id?: string | null
          owner_id?: string | null
          probability?: number | null
          project_id?: string
          quality_impact?: boolean | null
          quality_inspection_id?: string | null
          remarks?: string | null
          reopened_at?: string | null
          residual_impact?: number | null
          residual_probability?: number | null
          residual_risk_level?: string | null
          residual_risk_score?: number | null
          response_strategy?: string | null
          review_date?: string | null
          risk_category?: string | null
          risk_level?: string | null
          risk_number?: string | null
          risk_owner_id?: string | null
          risk_score?: number | null
          risk_source?: string | null
          risk_type?: string | null
          safety_impact?: boolean | null
          safety_inspection_id?: string | null
          status?: string
          target_mitigation_date?: string | null
          task_id?: string | null
          time_impact?: boolean | null
          time_impact_days?: number | null
          title?: string
          trigger_condition?: string | null
          updated_at?: string
          variation_id?: string | null
          wbs_id?: string | null
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
      safety_hazards: {
        Row: {
          checklist_item_id: string | null
          closed_at: string | null
          closed_by: string | null
          closeout_notes: string | null
          closeout_status: string | null
          company_id: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          hazard_category: string | null
          hazard_description: string | null
          hazard_title: string
          id: string
          is_archived: boolean | null
          likelihood: string | null
          location: string | null
          project_id: string
          responsible_user_id: string | null
          risk_level: string | null
          safety_inspection_id: string
          severity: string | null
          target_closeout_date: string | null
          updated_at: string
        }
        Insert: {
          checklist_item_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closeout_notes?: string | null
          closeout_status?: string | null
          company_id: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          hazard_category?: string | null
          hazard_description?: string | null
          hazard_title: string
          id?: string
          is_archived?: boolean | null
          likelihood?: string | null
          location?: string | null
          project_id: string
          responsible_user_id?: string | null
          risk_level?: string | null
          safety_inspection_id: string
          severity?: string | null
          target_closeout_date?: string | null
          updated_at?: string
        }
        Update: {
          checklist_item_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closeout_notes?: string | null
          closeout_status?: string | null
          company_id?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          hazard_category?: string | null
          hazard_description?: string | null
          hazard_title?: string
          id?: string
          is_archived?: boolean | null
          likelihood?: string | null
          location?: string | null
          project_id?: string
          responsible_user_id?: string | null
          risk_level?: string | null
          safety_inspection_id?: string
          severity?: string | null
          target_closeout_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_hazards_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "safety_inspection_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_hazards_safety_inspection_id_fkey"
            columns: ["safety_inspection_id"]
            isOneToOne: false
            referencedRelation: "safety_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_inspection_attachments: {
        Row: {
          attachment_type: string | null
          checklist_item_id: string | null
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          hazard_id: string | null
          id: string
          is_client_visible: boolean | null
          project_id: string
          safety_inspection_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          checklist_item_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          hazard_id?: string | null
          id?: string
          is_client_visible?: boolean | null
          project_id: string
          safety_inspection_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          checklist_item_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          hazard_id?: string | null
          id?: string
          is_client_visible?: boolean | null
          project_id?: string
          safety_inspection_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_inspection_attachments_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "safety_inspection_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_inspection_attachments_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "safety_hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_inspection_attachments_safety_inspection_id_fkey"
            columns: ["safety_inspection_id"]
            isOneToOne: false
            referencedRelation: "safety_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_inspection_checklist_items: {
        Row: {
          checklist_item: string
          closed_at: string | null
          closed_by: string | null
          closeout_notes: string | null
          closeout_status: string | null
          company_id: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean | null
          item_number: string | null
          photo_required: boolean | null
          project_id: string
          remarks: string | null
          requirement: string | null
          responsible_user_id: string | null
          result: string | null
          risk_level: string | null
          safety_inspection_id: string
          safety_standard_reference: string | null
          sort_order: number | null
          target_closeout_date: string | null
          updated_at: string
        }
        Insert: {
          checklist_item: string
          closed_at?: string | null
          closed_by?: string | null
          closeout_notes?: string | null
          closeout_status?: string | null
          company_id: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          item_number?: string | null
          photo_required?: boolean | null
          project_id: string
          remarks?: string | null
          requirement?: string | null
          responsible_user_id?: string | null
          result?: string | null
          risk_level?: string | null
          safety_inspection_id: string
          safety_standard_reference?: string | null
          sort_order?: number | null
          target_closeout_date?: string | null
          updated_at?: string
        }
        Update: {
          checklist_item?: string
          closed_at?: string | null
          closed_by?: string | null
          closeout_notes?: string | null
          closeout_status?: string | null
          company_id?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean | null
          item_number?: string | null
          photo_required?: boolean | null
          project_id?: string
          remarks?: string | null
          requirement?: string | null
          responsible_user_id?: string | null
          result?: string | null
          risk_level?: string | null
          safety_inspection_id?: string
          safety_standard_reference?: string | null
          sort_order?: number | null
          target_closeout_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_inspection_checklist_items_safety_inspection_id_fkey"
            columns: ["safety_inspection_id"]
            isOneToOne: false
            referencedRelation: "safety_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_inspection_status_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          project_id: string
          remarks: string | null
          safety_inspection_id: string
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id: string
          remarks?: string | null
          safety_inspection_id: string
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          project_id?: string
          remarks?: string | null
          safety_inspection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_inspection_status_history_safety_inspection_id_fkey"
            columns: ["safety_inspection_id"]
            isOneToOne: false
            referencedRelation: "safety_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_inspections: {
        Row: {
          approval_comments: string | null
          approved_at: string | null
          approved_by: string | null
          area: string | null
          assigned_inspector_id: string | null
          category: string | null
          checklist: Json
          checklist_na_count: number | null
          checklist_safe_count: number | null
          checklist_unsafe_count: number | null
          closed_at: string | null
          company_id: string | null
          corrective_action: string | null
          corrective_action_summary: string | null
          corrective_actions_closed: number | null
          corrective_actions_open: number | null
          created_at: string
          created_by: string | null
          due_date: string | null
          findings: string | null
          floor_level: string | null
          hazards_found: number | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_date: string | null
          inspection_number: string
          inspection_result: string | null
          inspection_time: string | null
          inspection_title: string | null
          inspection_type: string | null
          is_archived: boolean | null
          is_client_visible: boolean | null
          issue_created: boolean | null
          issue_id: string | null
          location: string | null
          ncr_created: boolean | null
          ncr_id: string | null
          overall_risk_level: string | null
          photos: Json
          ppe_compliance: string | null
          priority: string | null
          project_id: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_by: string | null
          responsible_person: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_notes: string | null
          status: string
          subcontractor_id: string | null
          submitted_at: string | null
          task_id: string | null
          total_checklist_items: number | null
          unsafe_acts: string | null
          unsafe_conditions: string | null
          updated_at: string
          wbs_id: string | null
          work_activity: string | null
        }
        Insert: {
          approval_comments?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          assigned_inspector_id?: string | null
          category?: string | null
          checklist?: Json
          checklist_na_count?: number | null
          checklist_safe_count?: number | null
          checklist_unsafe_count?: number | null
          closed_at?: string | null
          company_id?: string | null
          corrective_action?: string | null
          corrective_action_summary?: string | null
          corrective_actions_closed?: number | null
          corrective_actions_open?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          findings?: string | null
          floor_level?: string | null
          hazards_found?: number | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_number: string
          inspection_result?: string | null
          inspection_time?: string | null
          inspection_title?: string | null
          inspection_type?: string | null
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          issue_created?: boolean | null
          issue_id?: string | null
          location?: string | null
          ncr_created?: boolean | null
          ncr_id?: string | null
          overall_risk_level?: string | null
          photos?: Json
          ppe_compliance?: string | null
          priority?: string | null
          project_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          responsible_person?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          status?: string
          subcontractor_id?: string | null
          submitted_at?: string | null
          task_id?: string | null
          total_checklist_items?: number | null
          unsafe_acts?: string | null
          unsafe_conditions?: string | null
          updated_at?: string
          wbs_id?: string | null
          work_activity?: string | null
        }
        Update: {
          approval_comments?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          assigned_inspector_id?: string | null
          category?: string | null
          checklist?: Json
          checklist_na_count?: number | null
          checklist_safe_count?: number | null
          checklist_unsafe_count?: number | null
          closed_at?: string | null
          company_id?: string | null
          corrective_action?: string | null
          corrective_action_summary?: string | null
          corrective_actions_closed?: number | null
          corrective_actions_open?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          findings?: string | null
          floor_level?: string | null
          hazards_found?: number | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_number?: string
          inspection_result?: string | null
          inspection_time?: string | null
          inspection_title?: string | null
          inspection_type?: string | null
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          issue_created?: boolean | null
          issue_id?: string | null
          location?: string | null
          ncr_created?: boolean | null
          ncr_id?: string | null
          overall_risk_level?: string | null
          photos?: Json
          ppe_compliance?: string | null
          priority?: string | null
          project_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          responsible_person?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          status?: string
          subcontractor_id?: string | null
          submitted_at?: string | null
          task_id?: string | null
          total_checklist_items?: number | null
          unsafe_acts?: string | null
          unsafe_conditions?: string | null
          updated_at?: string
          wbs_id?: string | null
          work_activity?: string | null
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
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          delivery_id: string | null
          id: string
          material_id: string | null
          movement_date: string | null
          movement_type: string | null
          project_id: string | null
          quantity: number | null
          reference_number: string | null
          remarks: string | null
          unit: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          id?: string
          material_id?: string | null
          movement_date?: string | null
          movement_type?: string | null
          project_id?: string | null
          quantity?: number | null
          reference_number?: string | null
          remarks?: string | null
          unit?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          id?: string
          material_id?: string | null
          movement_date?: string | null
          movement_type?: string | null
          project_id?: string | null
          quantity?: number | null
          reference_number?: string | null
          remarks?: string | null
          unit?: string | null
        }
        Relationships: []
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
      supplier_attachments: {
        Row: {
          attachment_type: string | null
          company_id: string
          created_at: string
          description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          supplier_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          supplier_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          supplier_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_attachments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_comments: {
        Row: {
          comment: string
          company_id: string
          created_at: string
          id: string
          supplier_id: string
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          comment: string
          company_id: string
          created_at?: string
          id?: string
          supplier_id: string
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          comment?: string
          company_id?: string
          created_at?: string
          id?: string
          supplier_id?: string
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_comments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          company_id: string
          contact_name: string
          created_at: string
          created_by: string | null
          department: string | null
          designation: string | null
          email: string | null
          id: string
          is_archived: boolean | null
          is_primary: boolean | null
          mobile: string | null
          phone: string | null
          remarks: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean | null
          is_primary?: boolean | null
          mobile?: string | null
          phone?: string | null
          remarks?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean | null
          is_primary?: boolean | null
          mobile?: string | null
          phone?: string | null
          remarks?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          company_id: string
          created_at: string
          document_name: string
          document_number: string | null
          document_type: string | null
          expiry_date: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_archived: boolean | null
          issue_date: string | null
          remarks: string | null
          status: string | null
          supplier_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_name: string
          document_number?: string | null
          document_type?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_archived?: boolean | null
          issue_date?: string | null
          remarks?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_name?: string
          document_number?: string | null
          document_type?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_archived?: boolean | null
          issue_date?: string | null
          remarks?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_performance_reviews: {
        Row: {
          comments: string | null
          company_id: string
          created_at: string
          delivery_score: number | null
          id: string
          overall_score: number | null
          price_score: number | null
          project_id: string | null
          quality_score: number | null
          recommendation: string | null
          response_score: number | null
          review_date: string | null
          reviewed_by: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          company_id: string
          created_at?: string
          delivery_score?: number | null
          id?: string
          overall_score?: number | null
          price_score?: number | null
          project_id?: string | null
          quality_score?: number | null
          recommendation?: string | null
          response_score?: number | null
          review_date?: string | null
          reviewed_by?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          company_id?: string
          created_at?: string
          delivery_score?: number | null
          id?: string
          overall_score?: number | null
          price_score?: number | null
          project_id?: string | null
          quality_score?: number | null
          recommendation?: string | null
          response_score?: number | null
          review_date?: string | null
          reviewed_by?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_performance_reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotation_items: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          item_name: string
          project_id: string
          quantity: number | null
          quoted_amount: number | null
          quoted_rate: number | null
          remarks: string | null
          rfq_item_id: string | null
          supplier_quotation_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          project_id: string
          quantity?: number | null
          quoted_amount?: number | null
          quoted_rate?: number | null
          remarks?: string | null
          rfq_item_id?: string | null
          supplier_quotation_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          project_id?: string
          quantity?: number | null
          quoted_amount?: number | null
          quoted_rate?: number | null
          remarks?: string | null
          rfq_item_id?: string | null
          supplier_quotation_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotation_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotation_items_supplier_quotation_id_fkey"
            columns: ["supplier_quotation_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          delivery_days: number | null
          discount_amount: number | null
          evaluation_notes: string | null
          evaluation_score: number | null
          id: string
          is_archived: boolean | null
          is_selected: boolean | null
          net_amount: number | null
          payment_terms: string | null
          project_id: string
          quotation_date: string | null
          quotation_number: string | null
          quotation_valid_until: string | null
          rfq_id: string
          rfq_supplier_id: string
          status: string | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
          warranty_terms: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_days?: number | null
          discount_amount?: number | null
          evaluation_notes?: string | null
          evaluation_score?: number | null
          id?: string
          is_archived?: boolean | null
          is_selected?: boolean | null
          net_amount?: number | null
          payment_terms?: string | null
          project_id: string
          quotation_date?: string | null
          quotation_number?: string | null
          quotation_valid_until?: string | null
          rfq_id: string
          rfq_supplier_id: string
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          warranty_terms?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_days?: number | null
          discount_amount?: number | null
          evaluation_notes?: string | null
          evaluation_score?: number | null
          id?: string
          is_archived?: boolean | null
          is_selected?: boolean | null
          net_amount?: number | null
          payment_terms?: string | null
          project_id?: string
          quotation_date?: string | null
          quotation_number?: string | null
          quotation_valid_until?: string | null
          rfq_id?: string
          rfq_supplier_id?: string
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotations_rfq_supplier_id_fkey"
            columns: ["rfq_supplier_id"]
            isOneToOne: false
            referencedRelation: "rfq_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_status_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          remarks: string | null
          supplier_id: string
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          remarks?: string | null
          supplier_id: string
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          remarks?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_status_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          blacklist_reason: string | null
          category: string | null
          city: string | null
          company_id: string
          contact_designation: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          currency: string | null
          delivery_score: number | null
          delivery_terms: string | null
          discipline: string | null
          email: string | null
          id: string
          is_archived: boolean | null
          is_blacklisted: boolean | null
          is_preferred: boolean | null
          is_prequalified: boolean | null
          legal_name: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          performance_score: number | null
          phone: string | null
          price_score: number | null
          quality_score: number | null
          rating: number | null
          registration_number: string | null
          remarks: string | null
          response_score: number | null
          status: string | null
          supplier_code: string | null
          supplier_name: string | null
          supplier_type: string | null
          tax_number: string | null
          trade: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          blacklist_reason?: string | null
          category?: string | null
          city?: string | null
          company_id: string
          contact_designation?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          currency?: string | null
          delivery_score?: number | null
          delivery_terms?: string | null
          discipline?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean | null
          is_blacklisted?: boolean | null
          is_preferred?: boolean | null
          is_prequalified?: boolean | null
          legal_name?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          performance_score?: number | null
          phone?: string | null
          price_score?: number | null
          quality_score?: number | null
          rating?: number | null
          registration_number?: string | null
          remarks?: string | null
          response_score?: number | null
          status?: string | null
          supplier_code?: string | null
          supplier_name?: string | null
          supplier_type?: string | null
          tax_number?: string | null
          trade?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          blacklist_reason?: string | null
          category?: string | null
          city?: string | null
          company_id?: string
          contact_designation?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          currency?: string | null
          delivery_score?: number | null
          delivery_terms?: string | null
          discipline?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean | null
          is_blacklisted?: boolean | null
          is_preferred?: boolean | null
          is_prequalified?: boolean | null
          legal_name?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          performance_score?: number | null
          phone?: string | null
          price_score?: number | null
          quality_score?: number | null
          rating?: number | null
          registration_number?: string | null
          remarks?: string | null
          response_score?: number | null
          status?: string | null
          supplier_code?: string | null
          supplier_name?: string | null
          supplier_type?: string | null
          tax_number?: string | null
          trade?: string | null
          updated_at?: string
          website?: string | null
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
      variation_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          is_client_visible: boolean | null
          project_id: string
          uploaded_by: string | null
          variation_id: string
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          is_client_visible?: boolean | null
          project_id: string
          uploaded_by?: string | null
          variation_id: string
        }
        Update: {
          attachment_type?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          is_client_visible?: boolean | null
          project_id?: string
          uploaded_by?: string | null
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variation_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variation_attachments_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
        ]
      }
      variation_line_items: {
        Row: {
          amount: number | null
          approved_amount: number | null
          approved_quantity: number | null
          approved_rate: number | null
          boq_item_id: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_archived: boolean | null
          item_type: string | null
          project_id: string
          quantity: number | null
          rate: number | null
          remarks: string | null
          sort_order: number | null
          unit: string | null
          updated_at: string
          variation_id: string
        }
        Insert: {
          amount?: number | null
          approved_amount?: number | null
          approved_quantity?: number | null
          approved_rate?: number | null
          boq_item_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_archived?: boolean | null
          item_type?: string | null
          project_id: string
          quantity?: number | null
          rate?: number | null
          remarks?: string | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
          variation_id: string
        }
        Update: {
          amount?: number | null
          approved_amount?: number | null
          approved_quantity?: number | null
          approved_rate?: number | null
          boq_item_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_archived?: boolean | null
          item_type?: string | null
          project_id?: string
          quantity?: number | null
          rate?: number | null
          remarks?: string | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variation_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variation_line_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
        ]
      }
      variations: {
        Row: {
          approval_comments: string | null
          approved_amount: number | null
          approved_at: string | null
          approved_by: string | null
          approved_days: number | null
          assigned_to: string | null
          attachments: Json
          category: string | null
          client_approved_at: string | null
          client_approved_by: string | null
          cost_impact: number | null
          cost_impact_description: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          included_in_payment_claim: boolean | null
          instruction_reference: string | null
          is_archived: boolean | null
          is_client_visible: boolean | null
          linked_boq_item_id: string | null
          linked_document_id: string | null
          linked_drawing_id: string | null
          linked_rfi_id: string | null
          linked_task_id: string | null
          linked_wbs_id: string | null
          payment_claim_id: string | null
          pending_amount: number | null
          priority: string | null
          project_id: string
          reason: string | null
          rejected_amount: number | null
          rejected_at: string | null
          rejection_reason: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_notes: string | null
          status: string
          submitted_amount: number | null
          submitted_at: string | null
          submitted_by: string | null
          submitted_days: number | null
          time_impact_days: number | null
          time_impact_description: string | null
          title: string
          updated_at: string
          variation_number: string | null
          variation_type: string | null
        }
        Insert: {
          approval_comments?: string | null
          approved_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_days?: number | null
          assigned_to?: string | null
          attachments?: Json
          category?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          cost_impact?: number | null
          cost_impact_description?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          included_in_payment_claim?: boolean | null
          instruction_reference?: string | null
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          linked_boq_item_id?: string | null
          linked_document_id?: string | null
          linked_drawing_id?: string | null
          linked_rfi_id?: string | null
          linked_task_id?: string | null
          linked_wbs_id?: string | null
          payment_claim_id?: string | null
          pending_amount?: number | null
          priority?: string | null
          project_id: string
          reason?: string | null
          rejected_amount?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          status?: string
          submitted_amount?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_days?: number | null
          time_impact_days?: number | null
          time_impact_description?: string | null
          title: string
          updated_at?: string
          variation_number?: string | null
          variation_type?: string | null
        }
        Update: {
          approval_comments?: string | null
          approved_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_days?: number | null
          assigned_to?: string | null
          attachments?: Json
          category?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          cost_impact?: number | null
          cost_impact_description?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          included_in_payment_claim?: boolean | null
          instruction_reference?: string | null
          is_archived?: boolean | null
          is_client_visible?: boolean | null
          linked_boq_item_id?: string | null
          linked_document_id?: string | null
          linked_drawing_id?: string | null
          linked_rfi_id?: string | null
          linked_task_id?: string | null
          linked_wbs_id?: string | null
          payment_claim_id?: string | null
          pending_amount?: number | null
          priority?: string | null
          project_id?: string
          reason?: string | null
          rejected_amount?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          status?: string
          submitted_amount?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_days?: number | null
          time_impact_days?: number | null
          time_impact_description?: string | null
          title?: string
          updated_at?: string
          variation_number?: string | null
          variation_type?: string | null
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
