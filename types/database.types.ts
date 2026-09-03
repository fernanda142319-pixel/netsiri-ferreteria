// Tipos manuales que reflejan supabase/migrations/0001_init_schema.sql.
// Si más adelante usas Supabase CLI, puedes regenerar esto con:
// npx supabase gen types typescript --project-id <id> > types/database.types.ts

export type AppRole = "owner" | "admin" | "cashier" | "warehouse";
export type UnitType = "unit" | "weight";
export type PaymentMethodType = "cash" | "card" | "transfer" | "mixed";
export type PaymentStatusType = "paid" | "pending";
export type SaleStatusType = "completed" | "cancelled";
export type CashSessionStatusType = "open" | "closed";
export type CashMovementTypeDb = "income" | "withdrawal" | "sale";
export type StockMovementTypeDb = "in" | "out" | "sale" | "adjustment";

interface TableDef<Row, Insert, Update> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        {
          id: string;
          full_name: string;
          role: AppRole;
          is_active: boolean;
          created_at: string;
        },
        { id: string; full_name: string; role?: AppRole; is_active?: boolean },
        { full_name?: string; role?: AppRole; is_active?: boolean }
      >;
      categories: TableDef<
        {
          id: string;
          name: string;
          icon: string;
          color: string;
          is_active: boolean;
          created_at: string;
        },
        { id?: string; name: string; icon?: string; color?: string; is_active?: boolean },
        Partial<{ name: string; icon: string; color: string; is_active: boolean }>
      >;
      suppliers: TableDef<
        {
          id: string;
          name: string;
          rut: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          contact_name: string | null;
          is_active: boolean;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          rut?: string;
          phone?: string;
          email?: string;
          address?: string;
          contact_name?: string;
          is_active?: boolean;
        },
        Partial<{
          name: string;
          rut: string;
          phone: string;
          email: string;
          address: string;
          contact_name: string;
          is_active: boolean;
        }>
      >;
      products: TableDef<
        {
          id: string;
          name: string;
          description: string;
          barcode: string | null;
          category_id: string | null;
          image_url: string;
          cost_price: number;
          sale_price: number;
          stock: number;
          min_stock: number;
          supplier_id: string | null;
          expiration_date: string | null;
          unit_type: UnitType;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          description?: string;
          barcode?: string;
          category_id?: string;
          image_url?: string;
          cost_price?: number;
          sale_price?: number;
          stock?: number;
          min_stock?: number;
          supplier_id?: string;
          expiration_date?: string | null;
          unit_type?: UnitType;
          is_active?: boolean;
        },
        Partial<{
          name: string;
          description: string;
          barcode: string;
          category_id: string;
          image_url: string;
          cost_price: number;
          sale_price: number;
          stock: number;
          min_stock: number;
          supplier_id: string | null;
          expiration_date: string | null;
          unit_type: UnitType;
          is_active: boolean;
        }>
      >;
      product_combos: TableDef<
        {
          id: string;
          name: string;
          sale_price: number;
          image_url: string;
          is_active: boolean;
          created_at: string;
        },
        { id?: string; name: string; sale_price?: number; image_url?: string; is_active?: boolean },
        Partial<{ name: string; sale_price: number; image_url: string; is_active: boolean }>
      >;
      combo_items: TableDef<
        { id: string; combo_id: string; product_id: string; quantity: number },
        { id?: string; combo_id: string; product_id: string; quantity?: number },
        Partial<{ combo_id: string; product_id: string; quantity: number }>
      >;
      payment_methods: TableDef<
        { id: string; name: PaymentMethodType; is_active: boolean },
        { id?: string; name: PaymentMethodType; is_active?: boolean },
        Partial<{ name: PaymentMethodType; is_active: boolean }>
      >;
      cash_sessions: TableDef<
        {
          id: string;
          opened_by: string;
          closed_by: string | null;
          opening_amount: number;
          closing_amount: number | null;
          expected_cash: number | null;
          counted_cash: number | null;
          difference: number | null;
          status: CashSessionStatusType;
          opened_at: string;
          closed_at: string | null;
        },
        {
          id?: string;
          opened_by: string;
          opening_amount?: number;
          status?: CashSessionStatusType;
        },
        Partial<{
          closed_by: string;
          closing_amount: number;
          expected_cash: number;
          counted_cash: number;
          difference: number;
          status: CashSessionStatusType;
          closed_at: string;
        }>
      >;
      sales: TableDef<
        {
          id: string;
          user_id: string;
          cash_session_id: string;
          total: number;
          discount: number;
          payment_method: PaymentMethodType;
          payment_status: PaymentStatusType;
          status: SaleStatusType;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          cash_session_id: string;
          total?: number;
          discount?: number;
          payment_method?: PaymentMethodType;
          payment_status?: PaymentStatusType;
          status?: SaleStatusType;
        },
        Partial<{ payment_status: PaymentStatusType; status: SaleStatusType }>
      >;
      sale_items: TableDef<
        {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        },
        {
          id?: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        },
        Partial<{ quantity: number; unit_price: number; subtotal: number }>
      >;
      cash_movements: TableDef<
        {
          id: string;
          cash_session_id: string;
          type: CashMovementTypeDb;
          amount: number;
          description: string;
          created_by: string;
          created_at: string;
        },
        {
          id?: string;
          cash_session_id: string;
          type: CashMovementTypeDb;
          amount: number;
          description?: string;
          created_by: string;
        },
        Partial<{ description: string }>
      >;
      stock_movements: TableDef<
        {
          id: string;
          product_id: string;
          type: StockMovementTypeDb;
          quantity: number;
          previous_stock: number;
          new_stock: number;
          reason: string;
          created_by: string;
          created_at: string;
        },
        {
          id?: string;
          product_id: string;
          type: StockMovementTypeDb;
          quantity: number;
          previous_stock: number;
          new_stock: number;
          reason?: string;
          created_by: string;
        },
        Partial<{ reason: string }>
      >;
      settings: TableDef<
        {
          id: string;
          business_name: string;
          logo_url: string | null;
          currency: string;
          default_min_stock: number;
          address: string;
          phone: string;
          updated_at: string;
        },
        {
          id?: string;
          business_name?: string;
          logo_url?: string;
          currency?: string;
          default_min_stock?: number;
          address?: string;
          phone?: string;
        },
        Partial<{
          business_name: string;
          logo_url: string;
          currency: string;
          default_min_stock: number;
          address: string;
          phone: string;
        }>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      adjust_stock: {
        Args: {
          p_product_id: string;
          p_type: StockMovementTypeDb;
          p_quantity: number;
          p_reason?: string;
        };
        Returns: Database["public"]["Tables"]["products"]["Row"];
      };
      create_sale: {
        Args: {
          p_cash_session_id: string;
          p_items: SaleItemInput[];
          p_discount?: number;
          p_payment_method?: PaymentMethodType;
          p_allow_negative_stock?: boolean;
        };
        Returns: Database["public"]["Tables"]["sales"]["Row"];
      };
    };
  };
}

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}
