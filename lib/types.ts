export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Row<T> = T & {
  id: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      business_units: {
        Row: Row<{ name: string; slug: string; description: string | null }>;
        Insert: { name: string; slug: string; description?: string | null };
        Update: Partial<{ name: string; slug: string; description: string | null }>;
      };
      businesses: {
        Row: Row<{
          name: string | null;
          phone: string;
          category: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          source_url: string | null;
          notes: string | null;
          website_found: boolean | null;
          website_url: string | null;
          business_unit_id: string | null;
          contact_name: string | null;
          email: string | null;
          lead_status: string;
          requested_services: string[];
          project_summary: string | null;
          estimated_value_cents: number;
          next_action: string | null;
          next_follow_up_at: string | null;
          stripe_customer_id: string | null;
        }>;
        Insert: {
          name?: string | null;
          phone: string;
          category?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          source_url?: string | null;
          notes?: string | null;
          website_found?: boolean | null;
          website_url?: string | null;
          business_unit_id?: string | null;
          contact_name?: string | null;
          email?: string | null;
          lead_status?: string;
          requested_services?: string[];
          project_summary?: string | null;
          estimated_value_cents?: number;
          next_action?: string | null;
          next_follow_up_at?: string | null;
          stripe_customer_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
      };
      invoices: {
        Row: Row<{
          business_unit_id: string | null;
          business_id: string | null;
          stripe_invoice_id: string | null;
          hosted_invoice_url: string | null;
          status: string;
          subtotal_cents: number;
          discount_cents: number;
          deposit_cents: number;
          retainer_cents: number;
          total_cents: number;
          due_date: string | null;
          memo: string | null;
        }>;
        Insert: {
          business_unit_id?: string | null;
          business_id?: string | null;
          stripe_invoice_id?: string | null;
          hosted_invoice_url?: string | null;
          status?: string;
          subtotal_cents: number;
          discount_cents?: number;
          deposit_cents?: number;
          retainer_cents?: number;
          total_cents: number;
          due_date?: string | null;
          memo?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      stripe_events: {
        Row: Row<{ stripe_event_id: string; event_type: string; payload: Json; processed_at: string | null }>;
        Insert: { stripe_event_id: string; event_type: string; payload: Json; processed_at?: string | null };
        Update: Partial<{ stripe_event_id: string; event_type: string; payload: Json; processed_at: string | null }>;
      };
    };
  };
};

export type AdminSection =
  | "dashboard"
  | "crm"
  | "finances"
  | "expenses"
  | "contractors"
  | "payouts"
  | "settings";
