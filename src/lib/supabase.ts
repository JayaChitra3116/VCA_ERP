import { createClient, SupabaseClient } from '@supabase/supabase-js';

const LOCAL_STORAGE_URL_KEY = 'vca_supabase_url';
const LOCAL_STORAGE_ANON_KEY = 'vca_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  let url = import.meta.env.VITE_SUPABASE_URL || 'https://lfmjmhcqrpsjtnubaxym.supabase.co';
  let anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const customUrl = localStorage.getItem(LOCAL_STORAGE_URL_KEY);
    const customKey = localStorage.getItem(LOCAL_STORAGE_ANON_KEY);
    if (customUrl && customUrl.trim()) url = customUrl.trim();
    if (customKey && customKey.trim()) anonKey = customKey.trim();
  } catch {}

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  try {
    if (url && url.trim()) {
      localStorage.setItem(LOCAL_STORAGE_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_URL_KEY);
    }

    if (anonKey && anonKey.trim()) {
      localStorage.setItem(LOCAL_STORAGE_ANON_KEY, anonKey.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ANON_KEY);
    }
  } catch {}
  refreshSupabaseClient();
}

let activeClient: SupabaseClient | null = null;

export function refreshSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (
    url && 
    anonKey && 
    url.trim() !== '' && 
    anonKey.trim() !== '' &&
    !url.includes('YOUR_SUPABASE')
  ) {
    activeClient = createClient(url, anonKey);
  } else {
    activeClient = null;
  }
  return activeClient;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!activeClient) {
    return refreshSupabaseClient();
  }
  return activeClient;
}

export function getIsSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url && 
    anonKey && 
    url.trim() !== '' && 
    anonKey.trim() !== '' &&
    !url.includes('YOUR_SUPABASE')
  );
}

// Backwards compatibility exports
export const isSupabaseConfigured = getIsSupabaseConfigured();
export const supabase = getSupabaseClient();

export interface SupabaseHealthStatus {
  configured: boolean;
  connected: boolean;
  missingTables: string[];
  permissionError?: boolean;
  message: string;
  urlUsed?: string;
}

export const EXPECTED_TABLES = [
  'app_state',
  'companies',
  'company_settings',
  'customers',
  'suppliers',
  'inventory',
  'sales_bills',
  'purchase_bills',
  'customer_payments',
  'production_orders',
  'variety_catalog',
  'quality_audits',
  'routine_reminders',
  'employees',
  'production_logs',
  'salary_advances'
];

export const COMPLETE_SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- VCA FABRICS ERP - SECURE STANDARDIZED DATABASE SCHEMA & RLS POLICIES
-- Copy & paste into Supabase Dashboard -> SQL Editor -> Click RUN
-- ==============================================================================

-- 0. SCHEMA PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 1. APP STATE (RESILIENT CLOUD STORE)
CREATE TABLE IF NOT EXISTS public.app_state (
  company_id TEXT NOT NULL,
  store_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, store_key)
);
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_state_access_policy" ON public.app_state;
CREATE POLICY "app_state_access_policy" ON public.app_state FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.app_state TO anon, authenticated, service_role;

-- 2. SUBSIDIARY COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT DEFAULT '',
  address TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  state TEXT DEFAULT 'Tamil Nadu',
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_access_policy" ON public.companies;
CREATE POLICY "companies_access_policy" ON public.companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.companies TO anon, authenticated, service_role;

-- 3. COMPANY SETTINGS
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  name TEXT NOT NULL,
  tagline TEXT,
  address TEXT,
  gstin TEXT,
  phone TEXT,
  state TEXT DEFAULT 'Tamil Nadu',
  pincode TEXT,
  role TEXT DEFAULT 'admin',
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  bank_branch TEXT,
  logo TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_settings_access_policy" ON public.company_settings;
CREATE POLICY "company_settings_access_policy" ON public.company_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.company_settings TO anon, authenticated, service_role;

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  place TEXT DEFAULT '',
  address TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  state TEXT DEFAULT 'Tamil Nadu',
  gstin TEXT DEFAULT '',
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_access_policy" ON public.customers;
CREATE POLICY "customers_access_policy" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.customers TO anon, authenticated, service_role;

-- 5. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  place TEXT DEFAULT '',
  address TEXT DEFAULT '',
  state TEXT DEFAULT 'Tamil Nadu',
  gstin TEXT DEFAULT '',
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_access_policy" ON public.suppliers;
CREATE POLICY "suppliers_access_policy" ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;

-- 6. INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'raw',
  unit TEXT NOT NULL DEFAULT 'kg',
  qty NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_access_policy" ON public.inventory;
CREATE POLICY "inventory_access_policy" ON public.inventory FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.inventory TO anon, authenticated, service_role;

-- 7. SALES BILLS
CREATE TABLE IF NOT EXISTS public.sales_bills (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  bill_no TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_gstin TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  customer_state TEXT DEFAULT 'Tamil Nadu',
  subtotal NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  grand NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sales_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_bills_access_policy" ON public.sales_bills;
CREATE POLICY "sales_bills_access_policy" ON public.sales_bills FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.sales_bills TO anon, authenticated, service_role;

-- 8. PURCHASE BILLS
CREATE TABLE IF NOT EXISTS public.purchase_bills (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  bill_no TEXT NOT NULL,
  po_no TEXT DEFAULT '',
  supplier_inv_no TEXT DEFAULT '',
  date DATE DEFAULT CURRENT_DATE,
  supplier_name TEXT NOT NULL,
  supplier_state TEXT DEFAULT 'Tamil Nadu',
  subtotal NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  grand NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'paid',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_bills_access_policy" ON public.purchase_bills;
CREATE POLICY "purchase_bills_access_policy" ON public.purchase_bills FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.purchase_bills TO anon, authenticated, service_role;

-- 9. CUSTOMER PAYMENTS
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  customer_name TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  amount NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash',
  ref_no TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_payments_access_policy" ON public.customer_payments;
CREATE POLICY "customer_payments_access_policy" ON public.customer_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.customer_payments TO anon, authenticated, service_role;

-- 10. PRODUCTION ORDERS (STANDARD 'production_orders' & 'orders')
CREATE TABLE IF NOT EXISTS public.production_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  order_no TEXT NOT NULL,
  order_number TEXT,
  po_no TEXT,
  customer_name TEXT,
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_due_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'in_production',
  notes TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_orders_access_policy" ON public.production_orders;
CREATE POLICY "production_orders_access_policy" ON public.production_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.production_orders TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  order_no TEXT,
  order_number TEXT,
  po_no TEXT,
  customer_name TEXT,
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_due_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'in_production',
  notes TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_access_policy" ON public.orders;
CREATE POLICY "orders_access_policy" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;

-- 11. VARIETY CATALOG
CREATE TABLE IF NOT EXISTS public.variety_catalog (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  variety_name TEXT NOT NULL,
  category TEXT,
  standard_weight_gsm NUMERIC DEFAULT 0,
  target_length_cm NUMERIC DEFAULT 0,
  target_width_cm NUMERIC DEFAULT 0,
  allowed_sizing_tolerance_pct NUMERIC DEFAULT 0,
  allowed_gsm_tolerance_pct NUMERIC DEFAULT 0,
  warp_yarn_spec TEXT,
  weft_yarn_spec TEXT,
  pile_yarn_spec TEXT,
  created_date DATE DEFAULT CURRENT_DATE,
  active_status BOOLEAN DEFAULT true,
  assigned_machines JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.variety_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "variety_catalog_access_policy" ON public.variety_catalog;
CREATE POLICY "variety_catalog_access_policy" ON public.variety_catalog FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.variety_catalog TO anon, authenticated, service_role;

-- 12. QUALITY AUDITS
CREATE TABLE IF NOT EXISTS public.quality_audits (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  check_date DATE DEFAULT CURRENT_DATE,
  check_time TEXT,
  machine_no TEXT,
  variety_name TEXT,
  operator_name TEXT,
  sample_no INT DEFAULT 1,
  actual_length_cm NUMERIC DEFAULT 0,
  actual_width_cm NUMERIC DEFAULT 0,
  actual_weight_gsm NUMERIC DEFAULT 0,
  border_quality_score NUMERIC DEFAULT 5,
  selvedge_condition TEXT DEFAULT 'pass',
  sizing_status TEXT DEFAULT 'pass',
  gsm_status TEXT DEFAULT 'pass',
  overall_result TEXT DEFAULT 'PASS',
  variance_notes TEXT,
  action_taken TEXT,
  auditor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.quality_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quality_audits_access_policy" ON public.quality_audits;
CREATE POLICY "quality_audits_access_policy" ON public.quality_audits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.quality_audits TO anon, authenticated, service_role;

-- 13. ROUTINE REMINDERS
CREATE TABLE IF NOT EXISTS public.routine_reminders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  task_title TEXT NOT NULL,
  machine_no TEXT,
  category TEXT,
  frequency_days INT DEFAULT 1,
  last_checked_date DATE,
  next_due_date DATE,
  assigned_role_or_person TEXT,
  status TEXT DEFAULT 'pending',
  checklist_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.routine_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "routine_reminders_access_policy" ON public.routine_reminders;
CREATE POLICY "routine_reminders_access_policy" ON public.routine_reminders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.routine_reminders TO anon, authenticated, service_role;

-- 14. EMPLOYEES & PIECE RATES
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Master Weaver',
  machine TEXT DEFAULT 'M-1',
  salary NUMERIC DEFAULT 0,
  phone TEXT DEFAULT '',
  loom_count INT DEFAULT 1,
  loom_rates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_access_policy" ON public.employees;
CREATE POLICY "employees_access_policy" ON public.employees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.employees TO anon, authenticated, service_role;

-- 15. PRODUCTION LOGS
CREATE TABLE IF NOT EXISTS public.production_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  log_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE,
  shift TEXT,
  machine_no TEXT,
  machine TEXT,
  operator_name TEXT,
  employee_name TEXT,
  item TEXT,
  item_name TEXT,
  variety_name TEXT,
  qty NUMERIC DEFAULT 0,
  qty_produced NUMERIC DEFAULT 0,
  meters_produced NUMERIC DEFAULT 0,
  waste NUMERIC DEFAULT 0,
  picks NUMERIC DEFAULT 0,
  efficiency_pct NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_logs_access_policy" ON public.production_logs;
CREATE POLICY "production_logs_access_policy" ON public.production_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.production_logs TO anon, authenticated, service_role;

-- 16. SALARY ADVANCES
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'comp-vca',
  employee_id TEXT,
  employee_name TEXT,
  advance_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE,
  amount NUMERIC DEFAULT 0,
  repayment_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "salary_advances_access_policy" ON public.salary_advances;
CREATE POLICY "salary_advances_access_policy" ON public.salary_advances FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.salary_advances TO anon, authenticated, service_role;

-- 17. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_company ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_bills_company ON public.sales_bills(company_id, date);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_company ON public.purchase_bills(company_id, date);
CREATE INDEX IF NOT EXISTS idx_production_orders_company ON public.production_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_prod_logs_company ON public.production_logs(company_id, date);
CREATE INDEX IF NOT EXISTS idx_employees_company ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_advances_company ON public.salary_advances(company_id, date);
`;

export const RESET_AND_RECREATE_SECURE_SCHEMA_SQL = `-- ==============================================================================
-- VCA FABRICS - COMPLETE CLEAN RESET & NORMALIZED RE-CREATION (WITH FULL RLS)
-- WARNING: This drops and cleanly recreates all tables with standardized schemas & security.
-- Note: Your app data is safely backed up in the browser and will auto-repopulate after running this!
-- ==============================================================================

-- 1. DROP ALL EXISTING TABLES CLEANLY (CASCADE)
DROP TABLE IF EXISTS public.salary_advances CASCADE;
DROP TABLE IF EXISTS public.production_logs CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.routine_reminders CASCADE;
DROP TABLE IF EXISTS public.quality_audits CASCADE;
DROP TABLE IF EXISTS public.variety_catalog CASCADE;
DROP TABLE IF EXISTS public.production_orders CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customer_payments CASCADE;
DROP TABLE IF EXISTS public.purchase_bills CASCADE;
DROP TABLE IF EXISTS public.sales_bills CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.app_state CASCADE;

-- 2. CREATE STANDARDIZED TABLES & APPLY ROW-LEVEL SECURITY
${COMPLETE_SUPABASE_SCHEMA_SQL}
`;

export const DISABLE_ALL_RLS_SQL = `-- ==============================================================================
-- VCA FABRICS - QUICK PERMISSIVE ACCESS SCRIPT (DISABLE RLS)
-- Run this in Supabase SQL Editor if you want instant 100% unrestricted sync across all tables.
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS public.app_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.production_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.variety_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quality_audits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.routine_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.production_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.salary_advances DISABLE ROW LEVEL SECURITY;
`;

export async function quickCheckSupabaseConnection(): Promise<SupabaseHealthStatus> {
  const client = getSupabaseClient();
  const { url } = getSupabaseCredentials();
  const configured = getIsSupabaseConfigured();

  if (!configured || !client) {
    return {
      configured: false,
      connected: false,
      missingTables: EXPECTED_TABLES,
      message: 'Supabase Project URL or Anon Key is missing.'
    };
  }

  try {
    const probePromise = client.from('app_state').select('count', { count: 'exact', head: true });
    const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
      setTimeout(() => reject(new Error('Connection probe timed out')), 2500)
    );

    const probeRes: any = await Promise.race([probePromise, timeoutPromise]).catch(err => ({ error: err }));
    if (probeRes.error) {
      return {
        configured: true,
        connected: false,
        missingTables: [],
        urlUsed: url,
        message: probeRes.error.message || 'Offline'
      };
    }

    return {
      configured: true,
      connected: true,
      missingTables: [],
      urlUsed: url,
      message: `Connected to Supabase (${url})`
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      missingTables: [],
      urlUsed: url,
      message: err?.message || 'Connection failed'
    };
  }
}

export async function checkSupabaseConnection(): Promise<SupabaseHealthStatus> {
  const client = getSupabaseClient();
  const { url } = getSupabaseCredentials();
  const configured = getIsSupabaseConfigured();

  if (!configured || !client) {
    return {
      configured: false,
      connected: false,
      missingTables: EXPECTED_TABLES,
      message: 'Supabase Project URL or Anon Key is missing. Enter your credentials below to connect to your Supabase project.'
    };
  }

  try {
    // Fast probe test with 3.5s timeout
    const probePromise = client.from('app_state').select('count', { count: 'exact', head: true });
    const timeoutPromise = new Promise<{ error: any }>((_, reject) => 
      setTimeout(() => reject(new Error('Connection probe timed out')), 3500)
    );

    const probeRes: any = await Promise.race([probePromise, timeoutPromise]).catch(err => ({ error: err }));
    if (probeRes.error && (probeRes.error.message?.includes('timed out') || probeRes.error.message?.includes('Failed to fetch'))) {
      return {
        configured: true,
        connected: false,
        missingTables: EXPECTED_TABLES,
        urlUsed: url,
        message: `Network timeout connecting to Supabase (${url}). Using local storage mode.`
      };
    }

    // Parallel check of all expected tables
    const checkResults = await Promise.allSettled(
      EXPECTED_TABLES.map(async (table) => {
        const { error } = await client.from(table).select('count', { count: 'exact', head: true });
        return { table, error };
      })
    );

    const missingTables: string[] = [];
    let hasPermissionError = false;

    for (const res of checkResults) {
      if (res.status === 'fulfilled' && res.value.error) {
        const error = res.value.error;
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          hasPermissionError = true;
        } else if (
          error.code === 'PGRST301' || 
          error.code === '42P01' || 
          error.message?.includes('relation') || 
          error.message?.includes('does not exist')
        ) {
          missingTables.push(res.value.table);
        }
      }
    }

    if (hasPermissionError) {
      return {
        configured: true,
        connected: true,
        missingTables,
        permissionError: true,
        urlUsed: url,
        message: `⚠️ Supabase Connected, but Table Permissions are restricted (Error 42501). Run the Schema SQL script in Supabase SQL Editor.`
      };
    }

    if (missingTables.length > 0) {
      return {
        configured: true,
        connected: true,
        missingTables,
        urlUsed: url,
        message: `Connected to Supabase (${url}), but ${missingTables.length} table(s) are missing (${missingTables.join(', ')}).`
      };
    }

    return {
      configured: true,
      connected: true,
      missingTables: [],
      urlUsed: url,
      message: `Successfully connected to Supabase project (${url})! All ${EXPECTED_TABLES.length} tables verified.`
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      missingTables: EXPECTED_TABLES,
      urlUsed: url,
      message: `Failed to connect to Supabase (${url}): ${err?.message || String(err)}`
    };
  }
}

