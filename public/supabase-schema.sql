-- Supabase SQL Schema for VCA Fabrics ERP & Handloom Towel Management App

-- 1. App State Key-Value Store (For instant cross-laptop & real-time sync)
CREATE TABLE IF NOT EXISTS public.app_state (
  company_id text NOT NULL,
  store_key text NOT NULL,
  payload jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (company_id, store_key)
);

-- Row Level Security (RLS) Policies for app_state
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on app_state" ON public.app_state FOR SELECT USING (true);
CREATE POLICY "Allow public insert on app_state" ON public.app_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on app_state" ON public.app_state FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on app_state" ON public.app_state FOR DELETE USING (true);

-- 2. Companies
CREATE TABLE IF NOT EXISTS public.companies (
  id text PRIMARY KEY,
  name text NOT NULL,
  prefix text,
  address text,
  gstin text,
  phone text,
  state text,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on companies" ON public.companies FOR ALL USING (true);

-- 3. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  name text NOT NULL,
  phone text,
  gstin text,
  address text,
  state text DEFAULT 'Tamil Nadu',
  pincode text,
  balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access on customers" ON public.customers FOR ALL USING (true);

-- 4. Variety Catalog (Towel Specs)
CREATE TABLE IF NOT EXISTS public.variety_catalog (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  variety_name text NOT NULL,
  category text,
  standard_weight_gsm numeric,
  target_length_cm numeric,
  target_width_cm numeric,
  allowed_sizing_tolerance_pct numeric,
  allowed_gsm_tolerance_pct numeric,
  warp_yarn_spec text,
  weft_yarn_spec text,
  pile_yarn_spec text,
  created_date text,
  active_status boolean DEFAULT true,
  assigned_machines jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.variety_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access on variety_catalog" ON public.variety_catalog FOR ALL USING (true);

-- 5. Sales Bills
CREATE TABLE IF NOT EXISTS public.sales_bills (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  bill_no text NOT NULL,
  date text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_gstin text,
  customer_address text,
  customer_state text,
  customer_pincode text,
  subtotal numeric DEFAULT 0,
  cgst numeric DEFAULT 0,
  sgst numeric DEFAULT 0,
  igst numeric DEFAULT 0,
  grand_total numeric DEFAULT 0,
  status text DEFAULT 'pending',
  items jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.sales_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access on sales_bills" ON public.sales_bills FOR ALL USING (true);
