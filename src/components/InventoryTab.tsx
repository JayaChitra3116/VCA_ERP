import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { storeSet } from '../lib/storage';
import {
  Package,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Sliders,
  Check,
  Save,
  Layers,
  Sparkles,
  X
} from 'lucide-react';

interface InventoryTabProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  showToast: (msg: string) => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  inventory,
  setInventory,
  showToast
}) => {
  // Filter & Search
  const [activeFilter, setActiveFilter] = useState<'all' | 'raw' | 'finished' | 'low'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Stock Entry Modal Form
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState<{
    itemName: string;
    type: 'raw' | 'finished';
    action: 'add' | 'reduce' | 'set';
    qty: number | '';
    unit: string;
    reorderLevel: number;
    notes: string;
  }>({
    itemName: '',
    type: 'raw',
    action: 'add',
    qty: 50,
    unit: 'kg',
    reorderLevel: 20,
    notes: ''
  });

  // Calculate Stat Cards
  const rawCount = inventory.filter((i) => i.type === 'raw').reduce((sum, i) => sum + i.qty, 0);
  const finishedCount = inventory.filter((i) => i.type === 'finished').reduce((sum, i) => sum + i.qty, 0);
  const lowStockItems = inventory.filter((i) => i.qty <= i.reorderLevel);

  // Filtered Inventory List
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    if (!matchesSearch) return false;

    if (activeFilter === 'raw') return item.type === 'raw';
    if (activeFilter === 'finished') return item.type === 'finished';
    if (activeFilter === 'low') return item.qty <= item.reorderLevel;
    return true;
  });

  // Save Stock Form
  const handleSaveStock = async () => {
    if (!stockForm.itemName.trim()) {
      showToast('Please enter or select an item name');
      return;
    }
    const val = Number(stockForm.qty) || 0;
    if (val < 0 && stockForm.action !== 'set') {
      showToast('Please enter a valid positive quantity');
      return;
    }

    const updated = [...inventory];
    const match = updated.find((i) => i.name.toLowerCase() === stockForm.itemName.trim().toLowerCase());

    if (match) {
      if (stockForm.action === 'add') {
        match.qty += val;
      } else if (stockForm.action === 'reduce') {
        match.qty = Math.max(0, match.qty - val);
      } else {
        match.qty = Math.max(0, val);
      }
      match.type = stockForm.type;
      match.unit = stockForm.unit || match.unit;
      if (stockForm.reorderLevel > 0) match.reorderLevel = stockForm.reorderLevel;
    } else {
      updated.push({
        name: stockForm.itemName.trim(),
        type: stockForm.type,
        unit: stockForm.unit || (stockForm.type === 'raw' ? 'kg' : 'pcs'),
        qty: stockForm.action === 'reduce' ? 0 : val,
        reorderLevel: stockForm.reorderLevel || 20
      });
    }

    setInventory(updated);
    await storeSet('inventory', updated);

    showToast(`Stock updated for "${stockForm.itemName.trim()}"!`);
    setShowStockModal(false);

    // Reset Form
    setStockForm({
      itemName: '',
      type: 'raw',
      action: 'add',
      qty: 50,
      unit: 'kg',
      reorderLevel: 20,
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 m-0 flex items-center gap-2">
            <Package className="w-6 h-6 text-teal-600" />
            <span>Inventory & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Track Cotton Yarn Raw Material stock & Finished Goods (Towels & Handlooms).
          </p>
        </div>

        <button
          onClick={() => setShowStockModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Stock Entry / Adjustment</span>
        </button>
      </div>

      {/* STAT SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Unique Items</div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{inventory.length}</div>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Raw Yarn Stock (Kg)</div>
            <div className="text-2xl font-mono font-bold text-teal-700 mt-1">{rawCount.toLocaleString('en-IN')} kg</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Finished Towels / Goods</div>
            <div className="text-2xl font-mono font-bold text-emerald-700 mt-1">{finishedCount.toLocaleString('en-IN')} pcs</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Low Stock Alerts</div>
            <div className="text-2xl font-mono font-bold text-rose-600 mt-1">{lowStockItems.length}</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="panel bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'all' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({inventory.length})
            </button>
            <button
              onClick={() => setActiveFilter('raw')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'raw' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw Material Yarn
            </button>
            <button
              onClick={() => setActiveFilter('finished')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'finished' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Finished Goods
            </button>
            <button
              onClick={() => setActiveFilter('low')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'low' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              Low Stock ({lowStockItems.length})
            </button>
          </div>

          <div className="relative min-w-[240px] flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stock item..."
              style={{ paddingLeft: '2.5rem' }}
              className="w-full pr-3 py-1.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* INVENTORY TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Item Name</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5 text-right">Available Stock</th>
                <th className="p-2.5 text-center">Unit</th>
                <th className="p-2.5 text-right">Reorder Threshold</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item, idx) => {
                  const isLow = item.qty <= item.reorderLevel;
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.type === 'raw' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {item.type === 'raw' ? 'Raw Material' : 'Finished Good'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                        {item.qty.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{item.unit}</td>
                      <td className="p-2.5 text-right font-mono text-slate-500">{item.reorderLevel}</td>
                      <td className="p-2.5 text-center">
                        <span className={`pill ${isLow ? 'low' : 'ok'}`}>
                          {isLow ? 'Low Stock' : 'Optimal'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => {
                            setStockForm({
                              itemName: item.name,
                              type: item.type,
                              action: 'add',
                              qty: 50,
                              unit: item.unit,
                              reorderLevel: item.reorderLevel,
                              notes: ''
                            });
                            setShowStockModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold border border-teal-200 text-[11px] transition-colors cursor-pointer"
                        >
                          + Add / Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STOCK ENTRY / ADJUSTMENT MODAL */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
            {/* Sticky Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-teal-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold m-0 text-white">Stock Entry / Inventory Adjustment</h3>
                  <p className="text-[11px] text-slate-400 m-0">Record inward receipt, loom consumption, or physical stock audit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center justify-center shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Stock Item Name *</label>
                <input
                  type="text"
                  list="invItemsList"
                  value={stockForm.itemName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matched = inventory.find((i) => i.name.toLowerCase() === name.toLowerCase().trim());
                    setStockForm({
                      ...stockForm,
                      itemName: name,
                      type: matched ? matched.type : stockForm.type,
                      unit: matched ? matched.unit : stockForm.unit,
                      reorderLevel: matched ? matched.reorderLevel : stockForm.reorderLevel
                    });
                  }}
                  placeholder="Select existing item or enter new name"
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
                <datalist id="invItemsList">
                  {inventory.map((i, idx) => (
                    <option key={idx} value={i.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Item Category</label>
                  <select
                    value={stockForm.type}
                    onChange={(e) => setStockForm({ ...stockForm, type: e.target.value as 'raw' | 'finished' })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="raw">Raw Material (Yarn / Spares)</option>
                    <option value="finished">Finished Good (Towels / Fabrics)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Action</label>
                  <select
                    value={stockForm.action}
                    onChange={(e) => setStockForm({ ...stockForm, action: e.target.value as 'add' | 'reduce' | 'set' })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-teal-700"
                  >
                    <option value="add">+ Inward / Add Stock</option>
                    <option value="reduce">- Outward / Reduce Stock</option>
                    <option value="set">= Set Exact Physical Count</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={stockForm.qty}
                    onChange={(e) => setStockForm({ ...stockForm, qty: e.target.value === '' ? '' : parseFloat(e.target.value) || e.target.value })}
                    placeholder="0"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={stockForm.unit}
                    onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="meters">meters</option>
                    <option value="bags">bags</option>
                    <option value="bales">bales</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reorder Limit</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={stockForm.reorderLevel}
                    onChange={(e) => setStockForm({ ...stockForm, reorderLevel: e.target.value === '' ? '' : parseInt(e.target.value) || e.target.value })}
                    placeholder="20"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={stockForm.notes}
                  onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                  placeholder="e.g. Inward from Sree Mills / Shift Production"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStock}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Inventory Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
