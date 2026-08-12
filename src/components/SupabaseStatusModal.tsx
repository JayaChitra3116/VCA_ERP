import React, { useState } from 'react';
import { 
  checkSupabaseConnection, 
  SupabaseHealthStatus, 
  EXPECTED_TABLES, 
  getSupabaseCredentials, 
  saveSupabaseCredentials 
} from '../lib/supabase';
import { forceSyncAllDataToCloud, cleanDatabaseDuplicatesInSupabase } from '../lib/storage';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Server, Key, Save, Link2, Copy, FileText, UploadCloud, Trash2 } from 'lucide-react';

interface SupabaseStatusModalProps {
  onClose: () => void;
  onRefreshData?: () => Promise<void>;
}

const SQL_FIX_SCRIPT = `-- Supabase SQL Permissions & Deduplication Script
-- Copy & paste into Supabase Dashboard -> SQL Editor -> Click RUN

-- 1. Grant Permissions / RLS Policies
CREATE POLICY "Allow public read-write on app_state" ON public.app_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on sales_bills" ON public.sales_bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

-- Or Disable RLS if preferred
ALTER TABLE IF EXISTS public.app_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory DISABLE ROW LEVEL SECURITY;

-- 2. DEDUPLICATE CUSTOMERS (Keeps 1 copy per customer name)
DELETE FROM public.customers a
USING public.customers b
WHERE a.ctid < b.ctid
  AND a.company_id = b.company_id
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name));

-- 3. DEDUPLICATE SALES BILLS (Keeps 1 copy per bill_no)
DELETE FROM public.sales_bills a
USING public.sales_bills b
WHERE a.ctid < b.ctid
  AND a.company_id = b.company_id
  AND LOWER(TRIM(a.bill_no)) = LOWER(TRIM(b.bill_no));

-- 4. Schema Column Fixes
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.customers ADD COLUMN IF NOT EXISTS place TEXT;
ALTER TABLE IF EXISTS public.sales_bills ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE IF EXISTS public.sales_bills ADD COLUMN IF NOT EXISTS customer_phone TEXT;
`;

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({ onClose, onRefreshData }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SupabaseHealthStatus | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const initialCreds = getSupabaseCredentials();
  const [urlInput, setUrlInput] = useState(initialCreds.url || 'https://lfmjmhcqrpsjtnubaxym.supabase.co');
  const [keyInput, setKeyInput] = useState(initialCreds.anonKey || '');

  const handleTestConnection = async () => {
    setLoading(true);
    const result = await checkSupabaseConnection();
    setStatus(result);
    setLoading(false);
  };

  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  const handleForceSyncLocalData = async () => {
    setSyncingLocal(true);
    setSyncMsg('Merging & Uploading Local Storage Data to Supabase...');
    try {
      const res = await forceSyncAllDataToCloud();
      if (res.error) {
        setSyncMsg(`⚠️ Sync Note: ${res.error}`);
      } else {
        setSyncMsg(`✅ Successfully synced local & cloud records! (${res.syncedKeys} items merged)`);
      }
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (e: any) {
      setSyncMsg(`Sync error: ${e?.message || 'Failed'}`);
    } finally {
      setSyncingLocal(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  };

  const handleCleanDuplicates = async () => {
    setCleaningDuplicates(true);
    setSyncMsg('Cleaning duplicate customer & bill records in Supabase...');
    try {
      const res = await cleanDatabaseDuplicatesInSupabase();
      setSyncMsg(`✅ ${res.message}`);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (e: any) {
      setSyncMsg(`Cleanup note: ${e?.message || 'Done'}`);
    } finally {
      setCleaningDuplicates(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_FIX_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(urlInput, keyInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    await handleTestConnection();
  };

  React.useEffect(() => {
    handleTestConnection();
  }, []);

  return (
    <div className="modal-backdrop">
      <section className="modal max-w-2xl" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2 className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-700" />
            <span>Supabase Database Credentials & Connection Setup</span>
          </h2>
          <button className="close-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="space-y-4 text-xs font-sans overflow-y-auto flex-1 p-4">
          {/* Connection Credentials Form */}
          <form onSubmit={handleSaveCredentials} className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-indigo-900 uppercase font-extrabold text-[11px] flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-600" />
                <span>Supabase Project Connection Config</span>
              </span>
              {saveSuccess && (
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved & Configured!
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-mono text-[11px] font-bold mb-1">
                Supabase Project URL:
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://lfmjmhcqrpsjtnubaxym.supabase.co"
                className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white font-mono text-xs focus:border-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-mono text-[11px] font-bold mb-1 flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-600" />
                <span>Supabase Anon / Public Key:</span>
              </label>
              <input
                type="password"
                required
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white font-mono text-xs focus:border-indigo-600 outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Found in your Supabase Dashboard &gt; Project Settings &gt; API &gt; <code>anon</code> <code>public</code> key.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="submit"
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-mono font-bold text-xs px-4 py-2 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Credentials &amp; Test Connection</span>
              </button>
            </div>
          </form>

          {/* Status Box */}
          <div className="p-4 rounded border bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-slate-500 uppercase font-bold text-[10px]">Database Status Check</span>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={loading}
                className="btn text-[11px] py-1 px-3 flex items-center gap-1 border-slate-300 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Re-Test Connection</span>
              </button>
            </div>

            {loading ? (
              <div className="text-slate-600 font-mono animate-pulse py-2">
                Testing Supabase URL, API Key & Table Schemas...
              </div>
            ) : status ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {status.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  )}
                  <span className={`font-bold font-mono text-sm ${status.connected ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {status.connected ? 'SUPABASE CONNECTED' : 'NOT CONNECTED TO SUPABASE'}
                  </span>
                </div>

                <p className="text-slate-700 font-mono bg-white p-2.5 rounded border border-slate-200">
                  {status.message}
                </p>

                {(status.permissionError || status.missingTables.length > 0) && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2 text-amber-900">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[11px] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-700" />
                        <span>Fix Permissions &amp; Schema SQL Script</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="bg-amber-700 hover:bg-amber-800 text-white font-mono font-bold text-[11px] px-3 py-1 rounded flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Fix Script'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] font-sans text-amber-800">
                      Open your <strong>Supabase Dashboard &gt; SQL Editor</strong>, paste this script, and click <strong>RUN</strong> to grant table access permissions and allow instant data insertions.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Manual Local Storage Upload & Cloud Sync Section */}
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-mono text-emerald-950 font-bold text-xs flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-emerald-700" />
                  <span>Sync Local Data (Computer A / Computer B)</span>
                </h4>
                <p className="text-[11px] text-emerald-800 font-sans mt-0.5">
                  If this computer has offline local storage data, click below to merge and upload all local bills, stock, and records into Supabase Cloud!
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleForceSyncLocalData}
                  disabled={syncingLocal || !status?.connected}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-mono font-bold text-xs px-3.5 py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap transition-colors"
                >
                  <UploadCloud className={`w-4 h-4 ${syncingLocal ? 'animate-bounce' : ''}`} />
                  <span>{syncingLocal ? 'Syncing...' : 'Upload & Sync Local Data'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCleanDuplicates}
                  disabled={cleaningDuplicates || !status?.connected}
                  className="bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-mono font-bold text-xs px-3.5 py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap transition-colors"
                >
                  <Trash2 className={`w-4 h-4 ${cleaningDuplicates ? 'animate-spin' : ''}`} />
                  <span>{cleaningDuplicates ? 'Purging Duplicates...' : 'Purge Duplicates in Supabase'}</span>
                </button>
              </div>
            </div>
            {syncMsg && (
              <div className="p-2 bg-white rounded border border-emerald-300 font-mono text-xs font-bold text-emerald-900 animate-fade-in">
                {syncMsg}
              </div>
            )}
          </div>

          {/* Table Alignment Checklist */}
          <div>
            <h3 className="font-mono text-xs font-bold uppercase text-slate-700 mb-2 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Verified Supabase Tables ({EXPECTED_TABLES.length} Required)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPECTED_TABLES.map((table) => {
                const isMissing = status?.missingTables.includes(table);
                return (
                  <div
                    key={table}
                    className={`p-2 rounded border text-xs font-mono flex items-center gap-1.5 ${
                      !status?.connected
                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                        : isMissing
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  >
                    {status?.connected && !isMissing ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="truncate">{table}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="btn primary cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
