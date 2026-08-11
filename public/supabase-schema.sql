-- ====================================================================
-- Supabase SQL Schema for VCA Fabrics ERP & Handloom Towel Management App
-- Fixes foreign key type mismatch & enables full Anon/Public read & write permissions
-- ====================================================================

-- Grant full schema permissions to public anon & authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 1. App State Key-Value Store (For instant cross-device sync)
CREATE TABLE IF NOT EXISTS public.app_state (
  company_id text NOT NULL,
  store_key text NOT NULL,
  payload jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (company_id, store_key)
);
ALTER TABLE public.app_state DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.app_state TO anon, authenticated, service_role;

-- 2. Companies Table
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
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.companies TO anon, authenticated, service_role;

-- 3. Company Settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id text PRIMARY KEY,
  company_id text REFERENCES public.companies(id) ON DELETE CASCADE,
  setting_key text,
  setting_value jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.company_settings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.company_settings TO anon, authenticated, service_role;

-- 4. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  name text NOT NULL,
  phone text,
  gstin text,
  address text,
  state text DEFAULT 'Tamil Nadu',
  pincode text,
  balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.customers TO anon, authenticated, service_role;

-- 5. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  name text NOT NULL,
  phone text,
  gstin text,
  address text,
  balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;

-- 6. Inventory
CREATE TABLE IF NOT EXISTS public.inventory (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  name text NOT NULL,
  type text,
  unit text,
  qty numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.inventory TO anon, authenticated, service_role;

-- 7. Variety Catalog (Towel Specs)
CREATE TABLE IF NOT EXISTS public.variety_catalog (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
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
ALTER TABLE public.variety_catalog DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.variety_catalog TO anon, authenticated, service_role;

-- 8. Sales Bills
CREATE TABLE IF NOT EXISTS public.sales_bills (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
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
ALTER TABLE public.sales_bills DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.sales_bills TO anon, authenticated, service_role;

-- 9. Purchase Bills
CREATE TABLE IF NOT EXISTS public.purchase_bills (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  bill_no text NOT NULL,
  date text NOT NULL,
  supplier_name text NOT NULL,
  grand_total numeric DEFAULT 0,
  status text DEFAULT 'paid',
  items jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.purchase_bills DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.purchase_bills TO anon, authenticated, service_role;

-- 10. Customer Payments
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  customer_name text NOT NULL,
  date text NOT NULL,
  amount numeric DEFAULT 0,
  payment_mode text,
  ref_no text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.customer_payments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.customer_payments TO anon, authenticated, service_role;

-- 11. Production Orders
CREATE TABLE IF NOT EXISTS public.production_orders (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  order_no text NOT NULL,
  customer_name text,
  order_date text,
  delivery_due_date text,
  status text DEFAULT 'in_production',
  notes text,
  items jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.production_orders DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.production_orders TO anon, authenticated, service_role;

-- 12. Quality Audits
CREATE TABLE IF NOT EXISTS public.quality_audits (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  check_date text,
  check_time text,
  machine_no text,
  variety_name text,
  operator_name text,
  sample_no numeric,
  actual_length_cm numeric,
  actual_width_cm numeric,
  actual_weight_gsm numeric,
  border_quality_score numeric,
  selvedge_condition text,
  sizing_status text,
  gsm_status text,
  overall_result text,
  variance_notes text,
  action_taken text,
  auditor_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.quality_audits DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.quality_audits TO anon, authenticated, service_role;

-- 13. Routine Reminders
CREATE TABLE IF NOT EXISTS public.routine_reminders (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  task_title text NOT NULL,
  machine_no text,
  category text,
  frequency_days numeric,
  last_checked_date text,
  next_due_date text,
  assigned_role_or_person text,
  status text,
  checklist_items jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.routine_reminders DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.routine_reminders TO anon, authenticated, service_role;

-- 14. Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  name text NOT NULL,
  role text,
  machine text,
  salary numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.employees TO anon, authenticated, service_role;

-- 15. Production Logs
CREATE TABLE IF NOT EXISTS public.production_logs (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  date text NOT NULL,
  machine_no text,
  operator_name text,
  variety text,
  meters numeric DEFAULT 0,
  pieces numeric DEFAULT 0,
  defects numeric DEFAULT 0,
  remarks text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.production_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.production_logs TO anon, authenticated, service_role;

-- 16. Salary Advances
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'comp-vca',
  employee_id text,
  employee_name text NOT NULL,
  date text NOT NULL,
  amount numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.salary_advances DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.salary_advances TO anon, authenticated, service_role;
