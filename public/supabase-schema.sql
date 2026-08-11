-- ====================================================================
-- Supabase SQL Schema for VCA Fabrics ERP & Handloom Towel Management App
-- Fixes foreign key type mismatch (uses `text` for company_id and id everywhere)
-- ====================================================================

-- 1. App State Key-Value Store (For instant cross-device sync)
CREATE TABLE IF NOT EXISTS public.app_state (
  company_id text NOT NULL,
  store_key text NOT NULL,
  payload jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (company_id, store_key)
);
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on app_state" ON public.app_state;
DROP POLICY IF EXISTS "Allow public write on app_state" ON public.app_state;
CREATE POLICY "Allow public read on app_state" ON public.app_state FOR SELECT USING (true);
CREATE POLICY "Allow public write on app_state" ON public.app_state FOR ALL USING (true);

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
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on companies" ON public.companies;
CREATE POLICY "Allow public access on companies" ON public.companies FOR ALL USING (true);

-- 3. Company Settings (Fixing Type Mismatch: Both `id` and `company_id` are TEXT)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id text PRIMARY KEY,
  company_id text REFERENCES public.companies(id) ON DELETE CASCADE,
  setting_key text,
  setting_value jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on company_settings" ON public.company_settings;
CREATE POLICY "Allow public access on company_settings" ON public.company_settings FOR ALL USING (true);

-- 4. Customers
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
DROP POLICY IF EXISTS "Allow public access on customers" ON public.customers;
CREATE POLICY "Allow public access on customers" ON public.customers FOR ALL USING (true);

-- 5. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  name text NOT NULL,
  phone text,
  gstin text,
  address text,
  balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on suppliers" ON public.suppliers;
CREATE POLICY "Allow public access on suppliers" ON public.suppliers FOR ALL USING (true);

-- 6. Inventory
CREATE TABLE IF NOT EXISTS public.inventory (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  name text NOT NULL,
  type text,
  unit text,
  qty numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on inventory" ON public.inventory;
CREATE POLICY "Allow public access on inventory" ON public.inventory FOR ALL USING (true);

-- 7. Variety Catalog (Towel Specs)
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
DROP POLICY IF EXISTS "Allow public access on variety_catalog" ON public.variety_catalog;
CREATE POLICY "Allow public access on variety_catalog" ON public.variety_catalog FOR ALL USING (true);

-- 8. Sales Bills
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
DROP POLICY IF EXISTS "Allow public access on sales_bills" ON public.sales_bills;
CREATE POLICY "Allow public access on sales_bills" ON public.sales_bills FOR ALL USING (true);

-- 9. Purchase Bills
CREATE TABLE IF NOT EXISTS public.purchase_bills (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  bill_no text NOT NULL,
  date text NOT NULL,
  supplier_name text NOT NULL,
  grand_total numeric DEFAULT 0,
  status text DEFAULT 'paid',
  items jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on purchase_bills" ON public.purchase_bills;
CREATE POLICY "Allow public access on purchase_bills" ON public.purchase_bills FOR ALL USING (true);

-- 10. Customer Payments
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  customer_name text NOT NULL,
  date text NOT NULL,
  amount numeric DEFAULT 0,
  payment_mode text,
  ref_no text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on customer_payments" ON public.customer_payments;
CREATE POLICY "Allow public access on customer_payments" ON public.customer_payments FOR ALL USING (true);

-- 11. Production Orders
CREATE TABLE IF NOT EXISTS public.production_orders (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  order_no text NOT NULL,
  customer_name text,
  order_date text,
  delivery_due_date text,
  status text DEFAULT 'in_production',
  notes text,
  items jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on production_orders" ON public.production_orders;
CREATE POLICY "Allow public access on production_orders" ON public.production_orders FOR ALL USING (true);

-- 12. Quality Audits
CREATE TABLE IF NOT EXISTS public.quality_audits (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
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
ALTER TABLE public.quality_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on quality_audits" ON public.quality_audits;
CREATE POLICY "Allow public access on quality_audits" ON public.quality_audits FOR ALL USING (true);

-- 13. Routine Reminders
CREATE TABLE IF NOT EXISTS public.routine_reminders (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
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
ALTER TABLE public.routine_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on routine_reminders" ON public.routine_reminders;
CREATE POLICY "Allow public access on routine_reminders" ON public.routine_reminders FOR ALL USING (true);

-- 14. Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  name text NOT NULL,
  role text,
  machine text,
  salary numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on employees" ON public.employees;
CREATE POLICY "Allow public access on employees" ON public.employees FOR ALL USING (true);

-- 15. Production Logs
CREATE TABLE IF NOT EXISTS public.production_logs (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
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
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on production_logs" ON public.production_logs;
CREATE POLICY "Allow public access on production_logs" ON public.production_logs FOR ALL USING (true);

-- 16. Salary Advances
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id text PRIMARY KEY,
  company_id text NOT NULL DEFAULT 'vca-fabrics',
  employee_id text,
  employee_name text NOT NULL,
  date text NOT NULL,
  amount numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on salary_advances" ON public.salary_advances;
CREATE POLICY "Allow public access on salary_advances" ON public.salary_advances FOR ALL USING (true);
