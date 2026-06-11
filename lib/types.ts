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
      leads: {
        Row: Row<{
          business_unit_id: string | null;
          business_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          website: string | null;
          budget: string | null;
          requested_services: string[];
          project_description: string;
          status: string;
        }>;
        Insert: {
          business_unit_id?: string | null;
          business_name: string;
          contact_name: string;
          email: string;
          phone?: string | null;
          website?: string | null;
          budget?: string | null;
          requested_services: string[];
          project_description: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      clients: {
        Row: Row<{
          business_unit_id: string | null;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          notes: string | null;
          stripe_customer_id: string | null;
        }>;
        Insert: {
          business_unit_id?: string | null;
          name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          stripe_customer_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };
      invoices: {
        Row: Row<{
          business_unit_id: string | null;
          client_id: string | null;
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
          client_id?: string | null;
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
  | "business-units"
  | "leads"
  | "clients"
  | "proposals"
  | "projects"
  | "invoices"
  | "expenses"
  | "contractors"
  | "payouts"
  | "reports"
  | "settings";
