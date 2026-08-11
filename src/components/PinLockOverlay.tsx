import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, Delete, CheckCircle2 } from 'lucide-react';

interface PinLockOverlayProps {
  isLocked: boolean;
  correctPin: string;
  onUnlock: () => void;
  companyName: string;
}

export const PinLockOverlay: React.FC<PinLockOverlayProps> = ({
  isLocked,
  correctPin,
  onUnlock,
  companyName
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [attempts, setAttempts] = useState(0);

  if (!isLocked) return null;

  const handleKeyPress = (num: string) => {
    if (enteredPin.length >= 8) return;
    const nextPin = enteredPin + num;
    setEnteredPin(nextPin);
    setErrorMsg('');

    if (nextPin === correctPin) {
      setErrorMsg('');
      setEnteredPin('');
      setAttempts(0);
      onUnlock();
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setEnteredPin('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === correctPin) {
      setErrorMsg('');
      setEnteredPin('');
      setAttempts(0);
      onUnlock();
    } else {
      setErrorMsg('Incorrect Security PIN');
      setAttempts((prev) => prev + 1);
      setEnteredPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col items-center justify-center p-4 selection:bg-none">
      <div className="w-full max-w-sm flex flex-col items-center space-y-6 text-center">
        {/* Company Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="p-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl shadow-xl shadow-blue-500/10">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{companyName || 'VCA FABRICS'}</h1>
          <p className="text-xs text-slate-400 font-medium">ERP & Billing System Protected by Security PIN</p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="space-y-2 w-full">
          <div className="flex justify-center items-center gap-3 py-3">
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < enteredPin.length;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                    filled
                      ? 'bg-blue-500 border-blue-400 scale-110 shadow-lg shadow-blue-500/50'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl font-medium animate-bounce flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg} ({attempts} failed attempts)</span>
            </div>
          )}
        </div>

        {/* Form for physical keyboard input */}
        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={enteredPin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setEnteredPin(val);
              if (val === correctPin) {
                onUnlock();
              }
            }}
            placeholder="Type PIN or use keypad"
            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center font-mono font-bold tracking-widest text-lg text-white placeholder:text-slate-600 placeholder:text-xs placeholder:font-sans focus:outline-none focus:border-blue-500 transition"
            autoFocus
          />
        </form>

        {/* On-Screen Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 active:bg-blue-600 active:scale-95 border border-slate-800/80 rounded-2xl font-bold text-xl text-white shadow-sm transition-all flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="w-full h-14 bg-slate-900/50 hover:bg-slate-800 active:scale-95 border border-slate-800/50 rounded-2xl text-xs font-bold text-slate-400 transition"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="w-full h-14 bg-slate-900 hover:bg-slate-800 active:bg-blue-600 active:scale-95 border border-slate-800/80 rounded-2xl font-bold text-xl text-white shadow-sm transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-full h-14 bg-slate-900/50 hover:bg-slate-800 active:scale-95 border border-slate-800/50 rounded-2xl text-slate-300 flex items-center justify-center transition"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-medium pt-2">
          Contact system administrator if you have forgotten your master security PIN.
        </p>
      </div>
    </div>
  );
};
