import React, { useState, useEffect } from 'react';
import { 
  checkSupabaseConnection, 
  SupabaseHealthStatus, 
  EXPECTED_TABLES, 
  getSupabaseCredentials, 
  saveSupabaseCredentials,
  COMPLETE_SUPABASE_SCHEMA_SQL,
  RESET_AND_RECREATE_SECURE_SCHEMA_SQL,
  DISABLE_ALL_RLS_SQL
} from '../lib/supabase';
import { 
  forceSyncAllDataToCloud, 
  cleanDatabaseDuplicatesInSupabase,
  runDatabaseSanityCheck,
  forceSyncAllDataToRelationalTables,
  DatabaseSanityReport
} from '../lib/storage';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Server, 
  Key, 
  Save, 
  Link2, 
  Copy, 
  FileText, 
  UploadCloud, 
  Trash2,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Sparkles,
  Lock
} from 'lucide-react';

interface SupabaseStatusModalProps {
  onClose: () => void;
  onRefreshData?: () => Promise<void>;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({ onClose, onRefreshData }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SupabaseHealthStatus | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedResetSql, setCopiedResetSql] = useState(false);
  const [copiedDisableRlsSql, setCopiedDisableRlsSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'reset' | 'disable_rls' | 'update'>('reset');
  const [showSqlPreview, setShowSqlPreview] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  // Sanity check state
  const [sanityReport, setSanityReport] = useState<DatabaseSanityReport | null>(null);
  const [runningSanity, setRunningSanity] = useState(false);
  const [pushingRelational, setPushingRelational] = useState(false);
  const [relationalSyncReport, setRelationalSyncReport] = useState<{
    successCount: number;
    totalKeys: number;
    results: { key: string; table: string; count: number; success: boolean; error?: string }[];
  } | null>(null);

  const initialCreds = getSupabaseCredentials();
  const [urlInput, setUrlInput] = useState(initialCreds.url || 'https://lfmjmhcqrpsjtnubaxym.supabase.co');
  const [keyInput, setKeyInput] = useState(initialCreds.anonKey || '');

  const handleTestConnection = async () => {
    setLoading(true);
    const result = await checkSupabaseConnection();
    setStatus(result);
    setLoading(false);
  };

  const handleRunSanityCheck = async () => {
    setRunningSanity(true);
    try {
      const report = await runDatabaseSanityCheck();
      setSanityReport(report);
    } catch (e: any) {
      console.error(e);
    } finally {
      setRunningSanity(false);
    }
  };

  const handlePushAllToRelational = async () => {
    setPushingRelational(true);
    setSyncMsg('Pushing all local & memory data directly to Supabase Relational Tables...');
    try {
      const result = await forceSyncAllDataToRelationalTables();
      setRelationalSyncReport(result);
      setSyncMsg(`✅ Synced ${result.successCount} of ${result.totalKeys} entities to Supabase Relational Tables!`);
      // Re-run sanity check to reflect updated row counts
      const updatedSanity = await runDatabaseSanityCheck();
      setSanityReport(updatedSanity);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (e: any) {
      setSyncMsg(`Sync error: ${e?.message || 'Failed'}`);
    } finally {
      setPushingRelational(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

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
      // Re-run sanity check
      handleRunSanityCheck();
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

  const copyText = async (text: string, setCopied: (val: boolean) => void) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      // Fallback method
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-999999px';
      ta.style.top = '-999999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopySql = () => {
    copyText(COMPLETE_SUPABASE_SCHEMA_SQL, setCopiedSql);
  };

  const handleCopyResetSql = () => {
    copyText(RESET_AND_RECREATE_SECURE_SCHEMA_SQL, setCopiedResetSql);
  };

  const handleCopyDisableRlsSql = () => {
    copyText(DISABLE_ALL_RLS_SQL, setCopiedDisableRlsSql);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(urlInput, keyInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    await handleTestConnection();
    await handleRunSanityCheck();
  };

  useEffect(() => {
    handleTestConnection();
    handleRunSanityCheck();
  }, []);

  return (
    <div className="modal-backdrop">
      <section className="modal max-w-3xl max-h-[90vh] flex flex-col" role="dialog" aria-modal="true">
        <div className="modal-head border-b border-slate-200 pb-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Database className="w-5 h-5 text-indigo-700" />
            <span>Supabase Relational Database &amp; Cloud Sync Center</span>
          </h2>
          <button className="close-btn text-2xl leading-none text-slate-500 hover:text-slate-800 cursor-pointer" aria-label="Close" onClick={onClose}>×</button>
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
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved &amp; Configured!
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

          {/* Database Sanity Check & Relational Tables Report */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-mono font-bold text-xs text-slate-900 uppercase">
                    Relational Tables Sanity Check ({sanityReport ? `${sanityReport.healthyCount}/${sanityReport.totalTables} Healthy` : 'Checking...'})
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Real-time verification of all 16 database tables, permissions, and row counts in Supabase.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunSanityCheck}
                  disabled={runningSanity}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-mono text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${runningSanity ? 'animate-spin' : ''}`} />
                  <span>{runningSanity ? 'Checking...' : 'Run Sanity Check'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePushAllToRelational}
                  disabled={pushingRelational || !status?.connected}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-mono text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <ArrowUpRight className={`w-3.5 h-3.5 ${pushingRelational ? 'animate-bounce' : ''}`} />
                  <span>{pushingRelational ? 'Pushing...' : 'Sync All To Relational Tables'}</span>
                </button>
              </div>
            </div>

            {/* Sanity Report Table List */}
            {sanityReport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {sanityReport.tables.map((t) => {
                  const isOk = t.status === 'healthy';
                  return (
                    <div
                      key={t.tableName}
                      className={`p-2.5 rounded-md border text-xs font-mono flex items-start justify-between gap-2 transition-all ${
                        isOk
                          ? 'bg-white border-emerald-300 text-slate-800'
                          : t.status === 'missing'
                          ? 'bg-rose-50 border-rose-300 text-rose-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          {isOk ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          )}
                          <span className="truncate">{t.tableName}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {t.message}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.rowCount} rows
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actionable Standardized Schema & RLS SQL Scripts */}
            <div className="p-4 bg-slate-900 text-slate-100 rounded-lg space-y-3 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span className="font-mono font-bold text-xs text-white">
                    Database Schema &amp; Security SQL Generator
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 bg-slate-800 p-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => setActiveTab('reset')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      activeTab === 'reset' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1. Clean Reset &amp; Secure RLS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('disable_rls')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      activeTab === 'disable_rls' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2. Quick Fix (Disable RLS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('update')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      activeTab === 'update' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3. Patch Schema
                  </button>
                </div>
              </div>

              {activeTab === 'reset' && (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <strong>Option 1 (Full Security):</strong> Drops old tables cleanly (CASCADE) and creates all 16 standardized tables with normalized data types, indexes, and full <strong>Row-Level Security (RLS)</strong> policies.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyResetSql}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs px-3.5 py-2 rounded flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedResetSql ? 'Copied Reset Script!' : 'Copy Clean Reset Script'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span>Safe to run: your app data is safely preserved in browser and will auto-repopulate after running this!</span>
                  </div>
                </div>
              )}

              {activeTab === 'disable_rls' && (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <strong>Option 2 (Instant Permissive Access):</strong> Disables Row-Level Security on all existing tables so your insertions and queries are never blocked by permissions.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyDisableRlsSql}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs px-3.5 py-2 rounded flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedDisableRlsSql ? 'Copied Permissive Script!' : 'Copy Disable RLS Script'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'update' && (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <strong>Option 3 (In-Place Patch):</strong> Creates missing tables and applies Row-Level Security (RLS) policies without dropping existing tables.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-mono font-bold text-xs px-3.5 py-2 rounded flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy Patch Script'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* View/Hide SQL Script toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSqlPreview(!showSqlPreview)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono underline cursor-pointer"
                >
                  {showSqlPreview ? '▼ Hide SQL Script' : '▶ Click to View / Manually Copy SQL Script Text'}
                </button>
                {showSqlPreview && (
                  <div className="mt-2 space-y-1">
                    <textarea
                      readOnly
                      rows={8}
                      className="w-full bg-black/80 text-emerald-300 font-mono text-[10px] p-2.5 rounded border border-slate-700 select-all"
                      value={
                        activeTab === 'reset' 
                          ? RESET_AND_RECREATE_SECURE_SCHEMA_SQL 
                          : activeTab === 'disable_rls'
                          ? DISABLE_ALL_RLS_SQL
                          : COMPLETE_SUPABASE_SCHEMA_SQL
                      }
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />
                    <p className="text-[10px] text-slate-400 italic">Tip: Click inside the box above to select all text, then press Ctrl+C.</p>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-950/90 p-3 rounded border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>How to Apply in 3 Steps:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                  <li>Click <strong>Copy Script</strong> (or select text in the box above).</li>
                  <li>
                    Open your{' '}
                    <a
                      href={urlInput ? `${urlInput.replace('.supabase.co', '')}.supabase.co` : 'https://supabase.com/dashboard'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-bold underline inline-flex items-center gap-0.5"
                    >
                      Supabase Dashboard &gt; SQL Editor <ArrowUpRight className="w-3 h-3 inline" />
                    </a>
                    , paste the script into a new query, and click <strong>RUN</strong>.
                  </li>
                  <li>Return here and click <strong>"Sync All To Relational Tables"</strong> above.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Sync & Maintenance Tools */}
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-mono text-emerald-950 font-bold text-xs flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-emerald-700" />
                  <span>Cross-Device Cloud Sync &amp; Maintenance</span>
                </h4>
                <p className="text-[11px] text-emerald-800 font-sans mt-0.5">
                  Upload local offline storage to Supabase or clean duplicate rows in relational tables.
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
                  <span>{cleaningDuplicates ? 'Purging...' : 'Purge Duplicates'}</span>
                </button>
              </div>
            </div>
            {syncMsg && (
              <div className="p-2 bg-white rounded border border-emerald-300 font-mono text-xs font-bold text-emerald-900 animate-fade-in">
                {syncMsg}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-900 text-white font-mono text-xs font-bold px-5 py-2 rounded shadow-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
