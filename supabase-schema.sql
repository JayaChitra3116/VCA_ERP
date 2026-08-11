-- VCA Fabrics ERP & Loom Quality Control - Supabase Database Schema
-- Run this script in your Supabase SQL Editor to provision all tables for end-to-end multi-user cloud synchronization.

-- 1. Companies & Subsidiaries
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  gstin TEXT,
  phone TEXT,
  state TEXT DEFAULT 'Tamil Nadu',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Company Settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id TEXT PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  address TEXT,
  gstin TEXT,
  phone TEXT,
  state TEXT DEFAULT 'Tamil Nadu',
  role TEXT DEFAULT 'admin',
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  logo TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  place TEXT,
  state TEXT DEFAULT 'Tamil Nadu',
  gstin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  place TEXT,
  state TEXT DEFAULT 'Tamil Nadu',
  gstin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inventory Items
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('raw', 'finished')),
  unit TEXT DEFAULT 'pcs',
  qty NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sales Bills
CREATE TABLE IF NOT EXISTS public.sales_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  date DATE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_state TEXT DEFAULT 'Tamil Nadu',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  grand NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Purchase Bills
CREATE TABLE IF NOT EXISTS public.purchase_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_no TEXT NOT NULL,
  supplier_inv_no TEXT,
  date DATE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_state TEXT DEFAULT 'Tamil Nadu',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  grand NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Customer Payments
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Production Orders (Orders Tab)
CREATE TABLE IF NOT EXISTS public.production_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_no TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  order_date DATE NOT NULL,
  delivery_due_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Variety Catalog & Machine Allocation
CREATE TABLE IF NOT EXISTS public.variety_catalog (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  variety_name TEXT NOT NULL,
  category TEXT DEFAULT 'Bath Towel',
  standard_weight_gsm NUMERIC DEFAULT 450,
  target_length_cm NUMERIC DEFAULT 140,
  target_width_cm NUMERIC DEFAULT 70,
  allowed_sizing_tolerance_pct NUMERIC DEFAULT 2,
  allowed_gsm_tolerance_pct NUMERIC DEFAULT 3,
  warp_yarn_spec TEXT,
  weft_yarn_spec TEXT,
  pile_yarn_spec TEXT,
  created_date DATE NOT NULL,
  assigned_machines JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Quality Check Audits (Sizing & Dimension Inspections across machines)
CREATE TABLE IF NOT EXISTS public.quality_audits (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  check_time TEXT,
  machine_no TEXT NOT NULL,
  variety_name TEXT NOT NULL,
  operator_name TEXT,
  sample_no INT DEFAULT 1,
  actual_length_cm NUMERIC NOT NULL,
  actual_width_cm NUMERIC NOT NULL,
  actual_weight_gsm NUMERIC NOT NULL,
  border_quality_score INT DEFAULT 5,
  selvedge_condition TEXT DEFAULT 'pass',
  sizing_status TEXT DEFAULT 'pass',
  gsm_status TEXT DEFAULT 'pass',
  overall_result TEXT NOT NULL DEFAULT 'PASS',
  variance_notes TEXT,
  action_taken TEXT,
  auditor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Routine Task Reminders
CREATE TABLE IF NOT EXISTS public.routine_reminders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  machine_no TEXT,
  category TEXT DEFAULT 'quality_audit',
  frequency_days INT DEFAULT 1,
  last_checked_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  assigned_role_or_person TEXT,
  status TEXT DEFAULT 'pending',
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  machine TEXT,
  salary NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Production Logs
CREATE TABLE IF NOT EXISTS public.production_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  machine TEXT NOT NULL,
  employee_name TEXT,
  item TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Salary Advances
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) and public access policy if desired:
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variety_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select and write on companies" ON public.companies FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on company_settings" ON public.company_settings FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on suppliers" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on inventory" ON public.inventory FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on sales_bills" ON public.sales_bills FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on purchase_bills" ON public.purchase_bills FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on customer_payments" ON public.customer_payments FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on production_orders" ON public.production_orders FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on variety_catalog" ON public.variety_catalog FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on quality_audits" ON public.quality_audits FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on routine_reminders" ON public.routine_reminders FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on employees" ON public.employees FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on production_logs" ON public.production_logs FOR ALL USING (true);
CREATE POLICY "Allow anon select and write on salary_advances" ON public.salary_advances FOR ALL USING (true);
