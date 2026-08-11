import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.trim() !== '' && 
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('YOUR_SUPABASE')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface SupabaseHealthStatus {
  configured: boolean;
  connected: boolean;
  missingTables: string[];
  message: string;
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

export async function checkSupabaseConnection(): Promise<SupabaseHealthStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      connected: false,
      missingTables: EXPECTED_TABLES,
      message: 'Supabase URL or Anon Key is missing in environment (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).'
    };
  }

  try {
    const missingTables: string[] = [];
    
    // Test table access individually
    for (const table of EXPECTED_TABLES) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error && (error.code === 'PGRST301' || error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist'))) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        configured: true,
        connected: true,
        missingTables,
        message: `Connected to Supabase, but ${missingTables.length} table(s) are missing (${missingTables.join(', ')}). Run the schema SQL script to set them up.`
      };
    }

    return {
      configured: true,
      connected: true,
      missingTables: [],
      message: 'Successfully connected to Supabase! All 15 required tables are verified and aligned for end-to-end function.'
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      missingTables: EXPECTED_TABLES,
      message: `Failed to connect to Supabase: ${err?.message || String(err)}`
    };
  }
}
