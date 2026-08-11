import React, { useState } from 'react';
import { 
  checkSupabaseConnection, 
  SupabaseHealthStatus, 
  EXPECTED_TABLES, 
  getSupabaseCredentials, 
  saveSupabaseCredentials 
} from '../lib/supabase';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Server, Key, Link2, Save } from 'lucide-react';

interface SupabaseStatusModalProps {
  onClose: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SupabaseHealthStatus | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const initialCreds = getSupabaseCredentials();
  const [urlInput, setUrlInput] = useState(initialCreds.url || 'https://lfmjmhcqrpsjtnubaxym.supabase.co');
  const [keyInput, setKeyInput] = useState(initialCreds.anonKey || '');

  const handleTestConnection = async () => {
    setLoading(true);
    const result = await checkSupabaseConnection();
    setStatus(result);
    setLoading(false);
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
              </div>
            ) : null}
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
