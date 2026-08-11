import React, { useState } from 'react';
import { ProductionLog, Employee, VarietyCatalog, InventoryItem } from '../types';
import { storeSet } from '../lib/storage';
import {
  Cpu,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Package,
  Layers,
  Activity,
  Zap,
  TrendingUp
} from 'lucide-react';

interface ProductionTabProps {
  productionLogs: ProductionLog[];
  setProductionLogs: React.Dispatch<React.SetStateAction<ProductionLog[]>>;
  employees: Employee[];
  varieties: VarietyCatalog[];
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  showToast: (msg: string) => void;
}

export const ProductionTab: React.FC<ProductionTabProps> = ({
  productionLogs,
  setProductionLogs,
  employees,
  varieties,
  inventory,
  setInventory,
  showToast
}) => {
  // Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [machine, setMachine] = useState('Loom 01');
  const [operatorName, setOperatorName] = useState('');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState<number | ''>(50);
  const [unit, setUnit] = useState('pcs');
  const [yarnConsumedKg, setYarnConsumedKg] = useState<number | ''>(15);
  const [grade, setGrade] = useState<'A-Grade' | 'B-Grade' | 'Rejection'>('A-Grade');
  const [notes, setNotes] = useState('');

  // Handle Save Production Log
  const handleSaveProduction = async () => {
    if (!item.trim()) {
      showToast('Please select or enter the finished good / fabric item');
      return;
    }
    const valQty = Number(qty) || 0;
    if (valQty <= 0) {
      showToast('Please enter a valid production quantity');
      return;
    }

    const newLog: ProductionLog = {
      id: `prod_${Date.now()}`,
      date: logDate,
      machine,
      employeeName: operatorName || 'Unassigned Operator',
      item: item.trim(),
      qty: valQty,
      unit,
      notes: `${shift} Shift | Grade: ${grade}${yarnConsumedKg ? ` | Yarn: ${yarnConsumedKg}kg` : ''}${notes ? ` | ${notes}` : ''}`
    };

    const updatedLogs = [newLog, ...productionLogs];
    setProductionLogs(updatedLogs);
    await storeSet('productionLogs', updatedLogs);

    // Auto update Finished Goods Inventory!
    const updatedInv = [...inventory];
    const match = updatedInv.find((i) => i.name.toLowerCase() === item.trim().toLowerCase());
    if (match) {
      match.qty += valQty;
    } else {
      updatedInv.push({
        name: item.trim(),
        type: 'finished',
        unit,
        qty: valQty,
        reorderLevel: 50
      });
    }

    // Auto deduct yarn raw material if specified
    if (yarnConsumedKg && Number(yarnConsumedKg) > 0) {
      const yarnMatch = updatedInv.find((i) => i.type === 'raw' && i.name.toLowerCase().includes('yarn'));
      if (yarnMatch) {
        yarnMatch.qty = Math.max(0, yarnMatch.qty - Number(yarnConsumedKg));
      }
    }

    setInventory(updatedInv);
    await storeSet('inventory', updatedInv);

    showToast(`Production shift log saved & ${valQty} ${unit} credited to Inventory!`);

    // Reset Form
    setNotes('');
  };

  const totalOutputPcs = productionLogs.reduce((sum, l) => sum + l.qty, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 m-0 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-violet-600" />
            <span>Machine Ops & Daily Loom Production</span>
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Log shift-wise loom output, weaver efficiency, yarn consumption, and fabric quality grades.
          </p>
        </div>
      </div>

      {/* QUICK LOOM STATUS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Looms / Machines</div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">6 Looms</div>
          </div>
          <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Output Logged</div>
            <div className="text-2xl font-mono font-bold text-violet-700 mt-1">{totalOutputPcs.toLocaleString('en-IN')} pcs</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Shift Logs Total</div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{productionLogs.length} shifts</div>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Loom Efficiency</div>
            <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">94.2%</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* DAILY SHIFT PRODUCTION ENTRY FORM */}
      <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-violet-700 m-0 flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-600" />
            <span>New Loom Shift Production Entry</span>
          </h2>
          <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-lg font-bold">
            Shift: {shift}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Production Date *</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-violet-700"
            >
              <option value="Morning">Morning (6 AM - 2 PM)</option>
              <option value="Evening">Evening (2 PM - 10 PM)</option>
              <option value="Night">Night (10 PM - 6 AM)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Loom / Machine No. *</label>
            <select
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            >
              <option value="Loom 01">Loom 01 - Auto Airjet</option>
              <option value="Loom 02">Loom 02 - Jacquard 550GSM</option>
              <option value="Loom 03">Loom 03 - Handloom Towel</option>
              <option value="Loom 04">Loom 04 - Frame Loom</option>
              <option value="Loom 05">Loom 05 - Rapier Loom</option>
              <option value="Loom 06">Loom 06 - Sizing / Winding</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Weaver / Operator</label>
            <select
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-medium"
            >
              <option value="">Select Operator...</option>
              {employees.map((e, idx) => (
                <option key={idx} value={e.name}>
                  {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Product Variety *</label>
            <input
              type="text"
              list="varietyList"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. Jacquard Border Face Towel 550GSM"
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            />
            <datalist id="varietyList">
              {varieties.map((v, idx) => (
                <option key={idx} value={v.varietyName} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Quantity Produced *</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value) || e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-24 p-2 border border-slate-300 rounded-lg font-mono"
              >
                <option value="pcs">pcs</option>
                <option value="meters">meters</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Yarn Consumed (Kg)</label>
            <input
              type="text"
              inputMode="decimal"
              value={yarnConsumedKg}
              onChange={(e) => setYarnConsumedKg(e.target.value === '' ? '' : parseFloat(e.target.value) || e.target.value)}
              placeholder="0.0"
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Quality Grade</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as any)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            >
              <option value="A-Grade">A-Grade (First Choice)</option>
              <option value="B-Grade">B-Grade (Second Quality)</option>
              <option value="Rejection">Rejection / Damage</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1 text-xs">Operator Remarks / Downtime Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Smooth 8hr run, 10 min beam adjustment"
            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleSaveProduction}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Production Log & Credit Inventory</span>
          </button>
        </div>
      </div>

      {/* PRODUCTION LOGS HISTORY TABLE */}
      <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-600" />
          <span>Loom Production Records</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Machine / Loom</th>
                <th className="p-2.5">Operator</th>
                <th className="p-2.5">Finished Product Item</th>
                <th className="p-2.5 text-right">Qty Produced</th>
                <th className="p-2.5">Shift & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productionLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    No production logs recorded yet. Fill the form above to log your first shift.
                  </td>
                </tr>
              ) : (
                productionLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-600 font-mono">{log.date}</td>
                    <td className="p-2.5 font-bold text-violet-800">{log.machine}</td>
                    <td className="p-2.5 font-semibold text-slate-900">{log.employeeName}</td>
                    <td className="p-2.5 font-bold text-slate-900">{log.item}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                      {log.qty} {log.unit}
                    </td>
                    <td className="p-2.5 text-slate-500 text-[11px]">{log.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
