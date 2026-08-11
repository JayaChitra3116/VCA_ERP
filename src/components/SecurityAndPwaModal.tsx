import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Download,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Clock,
  RefreshCw,
  X,
  FileText,
  HelpCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

interface SecurityAndPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPinSet: boolean;
  onSetPin: (pin: string, autoLockMinutes: number) => void;
  onDisablePin: () => void;
  autoLockMinutes: number;
  deferredPrompt: any;
  onTriggerInstall: () => void;
  isOnline: boolean;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => void;
}

export const SecurityAndPwaModal: React.FC<SecurityAndPwaModalProps> = ({
  isOpen,
  onClose,
  isPinSet,
  onSetPin,
  onDisablePin,
  autoLockMinutes,
  deferredPrompt,
  onTriggerInstall,
  isOnline,
  onExportBackup,
  onImportBackup
}) => {
  const [activeTab, setActiveTab] = useState<'pwa' | 'security' | 'backup'>('pwa');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [lockTime, setLockTime] = useState<number>(autoLockMinutes);
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [importJson, setImportJson] = useState('');

  useEffect(() => {
    setLockTime(autoLockMinutes);
  }, [autoLockMinutes]);

  if (!isOpen) return null;

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPin.length < 4) {
      setErrorMsg('PIN must be at least 4 digits long');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('PINs do not match');
      return;
    }

    onSetPin(newPin, lockTime);
    setNewPin('');
    setConfirmPin('');
    setSuccessMsg('Security PIN enabled & auto-lock settings saved successfully!');
  };

  const handleDisable = () => {
    if (window.confirm('Are you sure you want to disable PIN lock security?')) {
      onDisablePin();
      setSuccessMsg('Security PIN lock disabled');
    }
  };

  const handleImportSubmit = () => {
    if (!importJson.trim()) return;
    try {
      JSON.parse(importJson);
      onImportBackup(importJson);
      setSuccessMsg('Data restored successfully!');
      setImportJson('');
    } catch (err) {
      setErrorMsg('Invalid JSON backup file or text format');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] sm:max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
        {/* Sticky Header */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-500/30 text-blue-400 shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white m-0">Security & App Settings</h3>
              <p className="text-[11px] sm:text-xs text-slate-300 m-0">PWA App, PIN Lock & Backups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Security Modal"
            className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-4 pt-2 gap-1 sm:gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`px-3 sm:px-4 py-2 rounded-t-lg flex items-center gap-1.5 border-b-2 transition shrink-0 ${
              activeTab === 'pwa'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Install PWA
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 sm:px-4 py-2 rounded-t-lg flex items-center gap-1.5 border-b-2 transition shrink-0 ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            PIN Lock
            {isPinSet && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 sm:px-4 py-2 rounded-t-lg flex items-center gap-1.5 border-b-2 transition shrink-0 ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Backup & Export
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: PWA INSTALLATION */}
          {activeTab === 'pwa' && (
            <div className="space-y-5 text-slate-700">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm mt-0.5">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Install as Standalone App on Any Device</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    VCA Fabrics ERP is built as a Progressive Web App (PWA). You can install it on Android, iPhone, iPad, Windows, and Mac to launch it like a native mobile or desktop app with full offline capabilities!
                  </p>
                </div>
              </div>

              {/* Status Row */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  {isOnline ? (
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Wifi className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                      <WifiOff className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-900">{isOnline ? 'Online Connected' : 'Offline Mode'}</div>
                    <div className="text-slate-500 text-[11px]">{isOnline ? 'All features sync & ready' : 'Works offline seamlessly'}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Offline Service Worker</div>
                    <div className="text-slate-500 text-[11px]">Installed & Active</div>
                  </div>
                </div>
              </div>

              {/* Direct Install Button if Prompt Ready */}
              {deferredPrompt ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <span className="text-xs font-bold text-emerald-800 block">One-Click Installation Ready!</span>
                  <button
                    onClick={onTriggerInstall}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Install VCA Fabrics App Now
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">Device Installation Guide</h5>
                  
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="font-bold text-blue-700 block mb-1">📱 iPhone & iPad (Safari):</span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                        <li>Tap the <span className="font-bold text-slate-800">Share button</span> (square with arrow up) at the bottom of Safari.</li>
                        <li>Scroll down and select <span className="font-bold text-slate-800">"Add to Home Screen"</span>.</li>
                        <li>Tap <span className="font-bold text-blue-600">"Add"</span> in the top right. VCA Fabrics icon will appear on your home screen!</li>
                      </ol>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="font-bold text-emerald-700 block mb-1">🤖 Android (Chrome / Edge / Firefox):</span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                        <li>Tap the <span className="font-bold text-slate-800">3-dots menu</span> in top-right of browser.</li>
                        <li>Select <span className="font-bold text-slate-800">"Add to Home screen"</span> or <span className="font-bold text-slate-800">"Install app"</span>.</li>
                        <li>Confirm installation to create app shortcut.</li>
                      </ol>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="font-bold text-indigo-700 block mb-1">💻 Windows / Mac (Chrome / Edge / Brave):</span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                        <li>Look for the <span className="font-bold text-slate-800">Install icon (computer/arrow)</span> in the browser address bar (URL bar).</li>
                        <li>Or open browser menu &rarr; <span className="font-bold text-slate-800">Save and Share</span> &rarr; <span className="font-bold text-slate-800">Install VCA Fabrics</span>.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECURITY PIN LOCK */}
          {activeTab === 'security' && (
            <div className="space-y-5 text-slate-700">
              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${isPinSet ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {isPinSet ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">App Passcode Protection Status</h4>
                    <p className="text-xs text-slate-300">
                      {isPinSet ? 'PIN Lock is ACTIVE. Unauthorized users cannot open the app.' : 'PIN Lock is currently DISABLED.'}
                    </p>
                  </div>
                </div>
                {isPinSet && (
                  <button
                    onClick={handleDisable}
                    className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition"
                  >
                    Disable PIN
                  </button>
                )}
              </div>

              <form onSubmit={handleSavePin} className="space-y-4 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  {isPinSet ? 'Change Passcode PIN' : 'Set New 4-Digit Security PIN'}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Enter New PIN (min 4 digits)</label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={8}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full p-2.5 pr-10 border border-slate-300 rounded-lg font-mono text-center font-bold tracking-widest text-lg bg-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Confirm PIN</label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={8}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-center font-bold tracking-widest text-lg bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Auto-Lock Timer</label>
                  <select
                    value={lockTime}
                    onChange={(e) => setLockTime(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  >
                    <option value={0}>Immediately when leaving app tab</option>
                    <option value={1}>After 1 Minute of Inactivity</option>
                    <option value={5}>After 5 Minutes of Inactivity</option>
                    <option value={15}>After 15 Minutes of Inactivity</option>
                    <option value={-1}>On App Refresh / Restart Only</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm text-xs transition flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  {isPinSet ? 'Update Security PIN' : 'Enable Security PIN Protection'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: BACKUP & DATA ENCRYPTION */}
          {activeTab === 'backup' && (
            <div className="space-y-4 text-slate-700">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Offline Local Storage Security</h5>
                    <p className="text-slate-500">Your invoices, customer records & stock data are kept locally on this device.</p>
                  </div>
                  <button
                    onClick={onExportBackup}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Full Backup (JSON)
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800">Restore Data from Backup</h5>
                <p className="text-xs text-slate-500">Paste your exported backup JSON string below to restore system state:</p>
                <textarea
                  rows={4}
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder='Paste JSON backup code here (e.g. {"salesBills": [...], ...})'
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                />
                <button
                  onClick={handleImportSubmit}
                  disabled={!importJson.trim()}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restore & Import System Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Close Button */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Close Window</span>
          </button>
        </div>
      </div>
    </div>
  );
};
