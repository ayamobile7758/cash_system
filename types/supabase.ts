export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── ENUMs ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "pos_staff";
export type ProductCategory = "device" | "accessory" | "sim" | "service_repair" | "service_general";
export type AccountType = "cash" | "visa" | "wallet" | "bank";
export type AccountScope = "core" | "maintenance";
export type LedgerEntryType = "income" | "expense" | "adjustment";
export type AdjustmentDirectionType = "increase" | "decrease";
export type InvoiceStatus = "active" | "returned" | "partially_returned" | "cancelled";
export type ReturnType = "full" | "partial";
export type DebtEntryType = "from_invoice" | "manual";
export type MaintenanceStatus = "new" | "in_progress" | "ready" | "delivered" | "cancelled";
export type InventoryCountType = "daily" | "weekly" | "monthly";
export type InventoryCountStatus = "in_progress" | "completed";
export type ExpenseCategoryType = "fixed" | "variable";
export type SettingValueType = "string" | "number" | "boolean";

// ── Database Interface ────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          phone?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          name: string;
          type: AccountType;
          module_scope: AccountScope;
          fee_percentage: number;
          opening_balance: number;
          current_balance: number;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: AccountType;
          module_scope?: AccountScope;
          fee_percentage?: number;
          opening_balance?: number;
          current_balance?: number;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: AccountType;
          module_scope?: AccountScope;
          fee_percentage?: number;
          opening_balance?: number;
          current_balance?: number;
          is_active?: boolean;
          display_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: ProductCategory;
          sku: string | null;
          description: string | null;
          sale_price: number;
          cost_price: number | null;
          avg_cost_price: number | null;
          stock_quantity: number;
          min_stock_level: number;
          track_stock: boolean;
          is_quick_add: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: ProductCategory;
          sku?: string | null;
          description?: string | null;
          sale_price: number;
          cost_price?: number | null;
          avg_cost_price?: number | null;
          stock_quantity?: number;
          min_stock_level?: number;
          track_stock?: boolean;
          is_quick_add?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          name?: string;
          category?: ProductCategory;
          sku?: string | null;
          description?: string | null;
          sale_price?: number;
          cost_price?: number | null;
          avg_cost_price?: number | null;
          stock_quantity?: number;
          min_stock_level?: number;
          track_stock?: boolean;
          is_quick_add?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "products_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          current_balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          current_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          phone?: string | null;
          address?: string | null;
          current_balance?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      debt_customers: {
        Row: {
          id: string;
          name: string;
          phone: string;
          national_id: string | null;
          address: string | null;
          credit_limit: number;
          current_balance: number;
          due_date_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          national_id?: string | null;
          address?: string | null;
          credit_limit?: number;
          current_balance?: number;
          due_date_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          name?: string;
          phone?: string;
          national_id?: string | null;
          address?: string | null;
          credit_limit?: number;
          current_balance?: number;
          due_date_days?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "debt_customers_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      expense_categories: {
        Row: {
          id: string;
          name: string;
          type: ExpenseCategoryType;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: ExpenseCategoryType;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          type?: ExpenseCategoryType;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          value_type: SettingValueType;
          description: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          value_type?: SettingValueType;
          description: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: string;
          value_type?: SettingValueType;
          description?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [{ foreignKeyName: "system_settings_updated_by_fkey"; columns: ["updated_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          customer_name: string | null;
          customer_phone: string | null;
          subtotal: number;
          discount_amount: number;
          discount_by: string | null;
          total_amount: number;
          debt_amount: number;
          debt_customer_id: string | null;
          status: InvoiceStatus;
          cancel_reason: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          pos_terminal_code: string | null;
          notes: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          subtotal: number;
          discount_amount?: number;
          discount_by?: string | null;
          total_amount: number;
          debt_amount?: number;
          debt_customer_id?: string | null;
          status?: InvoiceStatus;
          cancel_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          pos_terminal_code?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          status?: InvoiceStatus;
          cancel_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "invoices_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          product_id: string;
          product_name_at_time: string;
          quantity: number;
          unit_price: number;
          cost_price_at_time: number;
          discount_percentage: number;
          discount_amount: number;
          total_price: number;
          returned_quantity: number;
          is_returned: boolean;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          product_id: string;
          product_name_at_time: string;
          quantity: number;
          unit_price: number;
          cost_price_at_time?: number;
          discount_percentage?: number;
          discount_amount?: number;
          total_price: number;
          returned_quantity?: number;
          is_returned?: boolean;
        };
        Update: {
          returned_quantity?: number;
          is_returned?: boolean;
        };
        Relationships: [{ foreignKeyName: "invoice_items_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"] }];
      };
      payments: {
        Row: {
          id: string;
          invoice_id: string;
          account_id: string;
          amount: number;
          fee_amount: number;
          net_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          account_id: string;
          amount: number;
          fee_amount?: number;
          net_amount: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "payments_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"] }];
      };
      returns: {
        Row: {
          id: string;
          return_number: string;
          original_invoice_id: string;
          total_amount: number;
          refund_account_id: string | null;
          reason: string;
          idempotency_key: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          return_number: string;
          original_invoice_id: string;
          total_amount: number;
          refund_account_id?: string | null;
          reason: string;
          idempotency_key?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "returns_original_invoice_id_fkey"; columns: ["original_invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"] }];
      };
      return_items: {
        Row: {
          id: string;
          return_id: string;
          invoice_item_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          return_id: string;
          invoice_item_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "return_items_return_id_fkey"; columns: ["return_id"]; referencedRelation: "returns"; referencedColumns: ["id"] }];
      };
      purchase_orders: {
        Row: {
          id: string;
          purchase_number: string;
          supplier_id: string;
          total_amount: number;
          is_paid: boolean;
          payment_account_id: string | null;
          notes: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          purchase_number: string;
          supplier_id: string;
          total_amount: number;
          is_paid?: boolean;
          payment_account_id?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          is_paid?: boolean;
          payment_account_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "purchase_orders_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] }];
      };
      purchase_items: {
        Row: {
          id: string;
          purchase_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
          total_cost: number;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
          total_cost: number;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "purchase_items_purchase_id_fkey"; columns: ["purchase_id"]; referencedRelation: "purchase_orders"; referencedColumns: ["id"] }];
      };
      supplier_payments: {
        Row: {
          id: string;
          payment_number: string;
          supplier_id: string | null;
          notes: string | null;
          idempotency_key: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          payment_number: string;
          supplier_id?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "supplier_payments_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] }];
      };
      topups: {
        Row: {
          id: string;
          topup_number: string;
          topup_date: string;
          amount: number;
          profit_amount: number;
          account_id: string;
          supplier_id: string | null;
          notes: string | null;
          idempotency_key: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          topup_number: string;
          topup_date?: string;
          amount: number;
          profit_amount?: number;
          account_id: string;
          supplier_id?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "topups_account_id_fkey"; columns: ["account_id"]; referencedRelation: "accounts"; referencedColumns: ["id"] }];
      };
      transfers: {
        Row: {
          id: string;
          transfer_number: string;
          transfer_type: string;
          amount: number;
          profit_amount: number;
          from_account_id: string | null;
          to_account_id: string | null;
          account_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          notes: string | null;
          idempotency_key: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          transfer_number: string;
          transfer_type?: string;
          amount: number;
          profit_amount?: number;
          from_account_id?: string | null;
          to_account_id?: string | null;
          account_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          account_id: string;
          category_id: string;
          amount: number;
          description: string;
          notes: string | null;
          idempotency_key: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          category_id: string;
          amount: number;
          description: string;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "expenses_account_id_fkey"; columns: ["account_id"]; referencedRelation: "accounts"; referencedColumns: ["id"] }];
      };
      maintenance_jobs: {
        Row: {
          id: string;
          job_number: string;
          customer_name: string;
          customer_phone: string | null;
          device_type: string;
          issue_description: string;
          status: MaintenanceStatus;
          estimated_cost: number | null;
          final_amount: number | null;
          payment_account_id: string | null;
          notes: string | null;
          idempotency_key: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          job_number: string;
          customer_name: string;
          customer_phone?: string | null;
          device_type: string;
          issue_description: string;
          status?: MaintenanceStatus;
          estimated_cost?: number | null;
          final_amount?: number | null;
          payment_account_id?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          status?: MaintenanceStatus;
          estimated_cost?: number | null;
          final_amount?: number | null;
          payment_account_id?: string | null;
          notes?: string | null;
          delivered_at?: string | null;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "maintenance_jobs_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      inventory_counts: {
        Row: {
          id: string;
          type: InventoryCountType;
          status: InventoryCountStatus;
          notes: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          type: InventoryCountType;
          status?: InventoryCountStatus;
          notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: {
          status?: InventoryCountStatus;
          notes?: string | null;
          completed_at?: string | null;
        };
        Relationships: [{ foreignKeyName: "inventory_counts_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      inventory_count_items: {
        Row: {
          id: string;
          inventory_count_id: string;
          product_id: string;
          system_quantity: number;
          actual_quantity: number;
          difference: number;
          reason: string | null;
        };
        Insert: {
          id?: string;
          inventory_count_id: string;
          product_id: string;
          system_quantity: number;
          actual_quantity: number;
          difference: number;
          reason?: string | null;
        };
        Update: {
          actual_quantity?: number;
          difference?: number;
          reason?: string | null;
        };
        Relationships: [{ foreignKeyName: "inventory_count_items_inventory_count_id_fkey"; columns: ["inventory_count_id"]; referencedRelation: "inventory_counts"; referencedColumns: ["id"] }];
      };
      ledger_entries: {
        Row: {
          id: string;
          account_id: string;
          amount: number;
          adjustment_direction: AdjustmentDirectionType | null;
          entry_type: LedgerEntryType;
          reference_type: string | null;
          reference_id: string | null;
          description: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          amount: number;
          adjustment_direction?: AdjustmentDirectionType | null;
          entry_type: LedgerEntryType;
          reference_type?: string | null;
          reference_id?: string | null;
          description: string;
          created_at?: string;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "ledger_entries_account_id_fkey"; columns: ["account_id"]; referencedRelation: "accounts"; referencedColumns: ["id"] }];
      };
      debt_entries: {
        Row: {
          id: string;
          debt_customer_id: string;
          invoice_id: string | null;
          amount: number;
          entry_type: DebtEntryType;
          description: string | null;
          is_paid: boolean;
          paid_amount: number;
          remaining_amount: number;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          debt_customer_id: string;
          invoice_id?: string | null;
          amount: number;
          entry_type: DebtEntryType;
          description?: string | null;
          is_paid?: boolean;
          paid_amount?: number;
          remaining_amount: number;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          is_paid?: boolean;
          paid_amount?: number;
          remaining_amount?: number;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "debt_entries_debt_customer_id_fkey"; columns: ["debt_customer_id"]; referencedRelation: "debt_customers"; referencedColumns: ["id"] }];
      };
      debt_payments: {
        Row: {
          id: string;
          debt_customer_id: string;
          amount: number;
          account_id: string;
          receipt_number: string;
          notes: string | null;
          whatsapp_sent: boolean;
          receipt_url: string | null;
          idempotency_key: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          debt_customer_id: string;
          amount: number;
          account_id: string;
          receipt_number: string;
          notes?: string | null;
          whatsapp_sent?: boolean;
          receipt_url?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: {
          whatsapp_sent?: boolean;
          receipt_url?: string | null;
        };
        Relationships: [{ foreignKeyName: "debt_payments_debt_customer_id_fkey"; columns: ["debt_customer_id"]; referencedRelation: "debt_customers"; referencedColumns: ["id"] }];
      };
      debt_payment_allocations: {
        Row: {
          id: string;
          payment_id: string;
          debt_entry_id: string;
          allocated_amount: number;
        };
        Insert: {
          id?: string;
          payment_id: string;
          debt_entry_id: string;
          allocated_amount: number;
        };
        Update: Record<string, never>;
        Relationships: [{ foreignKeyName: "debt_payment_allocations_payment_id_fkey"; columns: ["payment_id"]; referencedRelation: "debt_payments"; referencedColumns: ["id"] }];
      };
      reconciliation_entries: {
        Row: {
          id: string;
          account_id: string;
          expected_balance: number;
          actual_balance: number;
          difference: number;
          difference_reason: string;
          is_resolved: boolean;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          expected_balance: number;
          actual_balance: number;
          difference: number;
          difference_reason: string;
          is_resolved?: boolean;
          created_at?: string;
          created_by: string;
        };
        Update: {
          is_resolved?: boolean;
          difference_reason?: string;
        };
        Relationships: [{ foreignKeyName: "reconciliation_entries_account_id_fkey"; columns: ["account_id"]; referencedRelation: "accounts"; referencedColumns: ["id"] }];
      };
      daily_snapshots: {
        Row: {
          id: string;
          idempotency_key: string | null;
          total_sales: number;
          total_returns: number;
          total_cost: number;
          gross_profit: number;
          net_sales: number;
          invoice_count: number;
          return_count: number;
          total_debt_added: number;
          total_debt_collected: number;
          total_expenses: number;
          total_purchases: number;
          net_profit: number;
          accounts_snapshot: Json | null;
          notes: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          idempotency_key?: string | null;
          total_sales?: number;
          total_returns?: number;
          total_cost?: number;
          gross_profit?: number;
          net_sales?: number;
          invoice_count?: number;
          return_count?: number;
          total_debt_added?: number;
          total_debt_collected?: number;
          total_expenses?: number;
          total_purchases?: number;
          net_profit?: number;
          accounts_snapshot?: Json | null;
          notes?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: {
          notes?: string | null;
        };
        Relationships: [{ foreignKeyName: "daily_snapshots_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      audit_logs: {
        Row: {
          id: string;
          action_timestamp: string;
          user_id: string | null;
          action_type: string;
          table_name: string;
          record_id: string;
          old_values: Json | null;
          new_values: Json | null;
          description: string;
          ip_address: string | null;
          user_agent: string | null;
          session_id: string | null;
        };
        Insert: {
          id?: string;
          action_timestamp?: string;
          user_id?: string | null;
          action_type: string;
          table_name: string;
          record_id: string;
          old_values?: Json | null;
          new_values?: Json | null;
          description: string;
          ip_address?: string | null;
          user_agent?: string | null;
          session_id?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          is_read: boolean;
          reference_type: string | null;
          reference_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          is_read?: boolean;
          reference_type?: string | null;
          reference_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          is_read?: boolean;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      receipt_link_tokens: {
        Row: {
          id: string;
          invoice_id: string;
          token_value: string;
          channel: "share" | "whatsapp";
          expires_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          token_value: string;
          channel?: "share" | "whatsapp";
          expires_at: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: {
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Relationships: [{ foreignKeyName: "receipt_link_tokens_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"] }];
      };
      whatsapp_delivery_logs: {
        Row: {
          id: string;
          template_key: string;
          target_phone_masked: string;
          delivery_mode: "wa_me";
          status: "queued" | "sent" | "failed";
          provider_message_id: string | null;
          reference_type: "invoice" | "debt_entry" | "maintenance_job" | "debt_customer";
          reference_id: string;
          idempotency_key: string;
          last_error: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          template_key: string;
          target_phone_masked: string;
          delivery_mode?: "wa_me";
          status?: "queued" | "sent" | "failed";
          provider_message_id?: string | null;
          reference_type: "invoice" | "debt_entry" | "maintenance_job" | "debt_customer";
          reference_id: string;
          idempotency_key: string;
          last_error?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: {
          status?: "queued" | "sent" | "failed";
          provider_message_id?: string | null;
          last_error?: string | null;
        };
        Relationships: [];
      };
      permission_bundles: {
        Row: {
          id: string;
          key: string;
          label: string;
          description: string | null;
          base_role: UserRole;
          permissions: string[];
          max_discount_percentage: number | null;
          discount_requires_approval: boolean;
          is_system: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          description?: string | null;
          base_role: UserRole;
          permissions?: string[];
          max_discount_percentage?: number | null;
          discount_requires_approval?: boolean;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          description?: string | null;
          permissions?: string[];
          max_discount_percentage?: number | null;
          discount_requires_approval?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_assignments: {
        Row: {
          id: string;
          user_id: string;
          bundle_id: string;
          notes: string | null;
          assigned_by: string;
          assigned_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bundle_id: string;
          notes?: string | null;
          assigned_by: string;
          assigned_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          revoked_at?: string | null;
          revoked_by?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "role_assignments_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      export_packages: {
        Row: {
          id: string;
          package_type: "json" | "csv";
          scope: "products" | "reports" | "customers" | "backup";
          status: "ready" | "revoked" | "expired";
          filters: Json;
          file_name: string;
          row_count: number;
          content_json: Json | null;
          content_text: string;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          package_type: "json" | "csv";
          scope: "products" | "reports" | "customers" | "backup";
          status?: "ready" | "revoked" | "expired";
          filters?: Json;
          file_name: string;
          row_count?: number;
          content_json?: Json | null;
          content_text: string;
          expires_at: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          status?: "ready" | "revoked" | "expired";
          revoked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "export_packages_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      import_jobs: {
        Row: {
          id: string;
          file_name: string;
          source_format: "json" | "csv";
          status: string;
          rows_total: number;
          rows_valid: number;
          rows_invalid: number;
          rows_committed: number;
          source_rows: Json;
          validation_errors: Json;
          committed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          source_format: "json" | "csv";
          status: string;
          rows_total?: number;
          rows_valid?: number;
          rows_invalid?: number;
          rows_committed?: number;
          source_rows?: Json;
          validation_errors?: Json;
          committed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          status?: string;
          rows_committed?: number;
          committed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "import_jobs_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      restore_drills: {
        Row: {
          id: string;
          export_package_id: string;
          target_env: "isolated-drill";
          status: "started" | "completed" | "failed";
          idempotency_key: string;
          drift_count: number | null;
          rto_seconds: number | null;
          result_summary: Json | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          export_package_id: string;
          target_env?: "isolated-drill";
          status?: "started" | "completed" | "failed";
          idempotency_key: string;
          drift_count?: number | null;
          rto_seconds?: number | null;
          result_summary?: Json | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          status?: "started" | "completed" | "failed";
          drift_count?: number | null;
          rto_seconds?: number | null;
          result_summary?: Json | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "restore_drills_export_package_id_fkey"; columns: ["export_package_id"]; referencedRelation: "export_packages"; referencedColumns: ["id"] }];
      };
    };
    Views: {
      v_pos_accounts: {
        Row: {
          id: string;
          name: string;
          type: AccountType;
          module_scope: AccountScope;
          fee_percentage: number;
          current_balance: number;
          is_active: boolean;
          display_order: number;
        };
        Relationships: [];
      };
      v_pos_products: {
        Row: {
          id: string;
          name: string;
          category: ProductCategory;
          sale_price: number;
          cost_price: number | null;
          stock_quantity: number;
          min_stock_level: number;
          track_stock: boolean;
          is_quick_add: boolean;
          is_active: boolean;
        };
        Relationships: [];
      };
      v_pos_debt_customers: {
        Row: {
          id: string;
          name: string;
          phone: string;
          credit_limit: number;
          current_balance: number;
          due_date_days: number;
          is_active: boolean;
        };
        Relationships: [];
      };
      admin_suppliers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          current_balance: number;
          is_active: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      product_category: ProductCategory;
      account_type: AccountType;
      account_scope: AccountScope;
      ledger_entry_type: LedgerEntryType;
      adjustment_direction_type: AdjustmentDirectionType;
      invoice_status: InvoiceStatus;
      return_type: ReturnType;
      debt_entry_type: DebtEntryType;
      maintenance_status: MaintenanceStatus;
      inventory_count_type: InventoryCountType;
      inventory_count_status: InventoryCountStatus;
      expense_category_type: ExpenseCategoryType;
      setting_value_type: SettingValueType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
