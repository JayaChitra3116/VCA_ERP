import React, { useState } from 'react';
import { checkSupabaseConnection, SupabaseHealthStatus, EXPECTED_TABLES } from '../lib/supabase';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Copy, Server } from 'lucide-react';

interface SupabaseStatusModalProps {
  onClose: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SupabaseHealthStatus | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    const result = await checkSupabaseConnection();
    setStatus(result);
    setLoading(false);
  };

  React.useEffect(() => {
    handleTestConnection();
  }, []);

  const copySqlInstruction = () => {
    const sqlUrl = window.location.origin + '/supabase-schema.sql';
    navigator.clipboard.writeText(sqlUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop">
      <section className="modal max-w-2xl" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2 className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-700" />
            <span>Supabase Connection & Table Alignment Diagnostic</span>
          </h2>
          <button className="close-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="space-y-4 text-xs font-sans overflow-y-auto flex-1 p-4">
          {/* Status Box */}
          <div className="p-4 rounded border bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-slate-500 uppercase font-bold text-[10px]">Database Connection Status</span>
              <button
                onClick={handleTestConnection}
                disabled={loading}
                className="btn text-[11px] py-1 px-3 flex items-center gap-1 border-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Re-Test Connection</span>
              </button>
            </div>

            {loading ? (
              <div className="text-slate-600 font-mono animate-pulse py-2">
                Checking Supabase URL, API Key & Table Schemas...
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

          {/* Setup / SQL Script Instructions */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded text-xs space-y-2">
            <span className="font-bold text-indigo-900 block font-mono text-[10px] uppercase">
              Supabase Quick Setup Instructions:
            </span>
            <ol className="list-decimal list-inside text-indigo-800 space-y-1">
              <li>In AI Studio Settings / Secrets, add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong>.</li>
              <li>In your Supabase Dashboard, open <strong>SQL Editor</strong>.</li>
              <li>Run the provided schema script (or copy from <code>/supabase-schema.sql</code> in code explorer) to create all 15 tables automatically.</li>
            </ol>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="btn primary"
            >
              Done
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
