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

export async function checkSupabaseConnection(): Promise<SupabaseHealthStatus> {
  const client = getSupabaseClient();
  const { url } = getSupabaseCredentials();
  const configured = getIsSupabaseConfigured();

  if (!configured || !client) {
    return {
      configured: false,
      connected: false,
      missingTables: EXPECTED_TABLES,
      message: 'Supabase Project URL or Anon Key is missing. Enter your credentials below to connect to your Supabase project (lfmjmhcqrpsjtnubaxym).'
    };
  }

  try {
    const missingTables: string[] = [];
    
    // Test table access individually
    for (const table of EXPECTED_TABLES) {
      const { error } = await client.from(table).select('count', { count: 'exact', head: true });
      if (error && (error.code === 'PGRST301' || error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist'))) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        configured: true,
        connected: true,
        missingTables,
        urlUsed: url,
        message: `Connected to Supabase (${url}), but ${missingTables.length} table(s) are missing (${missingTables.join(', ')}). Run the schema SQL script in SQL Editor to enable all features.`
      };
    }

    return {
      configured: true,
      connected: true,
      missingTables: [],
      urlUsed: url,
      message: `Successfully connected to Supabase project (${url})! All ${EXPECTED_TABLES.length} required tables are verified and ready.`
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

