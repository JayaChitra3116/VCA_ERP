import React, { useState } from 'react';
import { Supplier } from '../types';
import { storeSet, deleteFromRelationalTable } from '../lib/storage';
import { Truck, Plus, Save, Search, X, Trash2 } from 'lucide-react';

interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  showToast: (msg: string) => void;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers,
  setSuppliers,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<Supplier>({
    name: '',
    phone: '',
    place: '',
    state: 'Tamil Nadu',
    gstin: ''
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Please enter supplier name');
      return;
    }

    const newSup: Supplier = {
      ...form,
      name: form.name.trim()
    };

    const updated = [newSup, ...suppliers];
    setSuppliers(updated);
    await storeSet('suppliers', updated);

    showToast(`Supplier "${newSup.name}" registered!`);
    setShowAddModal(false);
    setForm({
      name: '',
      phone: '',
      place: '',
      state: 'Tamil Nadu',
      gstin: ''
    });
  };

  const handleDeleteSupplier = async (sup: Supplier) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) return;

    const updated = suppliers.filter((s) => s.id !== sup.id && s.name.toLowerCase().trim() !== sup.name.toLowerCase().trim());
    setSuppliers(updated);
    await storeSet('suppliers', updated);
    await deleteFromRelationalTable('suppliers', sup.id, 'name', sup.name);
    showToast(`Supplier "${sup.name}" deleted successfully!`);
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (s.phone && s.phone.includes(searchTerm)) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 m-0 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Yarn & Raw Material Suppliers</span>
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Spinning mills, dye houses, and yarn traders directory.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register New Supplier</span>
        </button>
      </div>

      <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 m-0">All Suppliers ({filtered.length})</h2>
          <div className="relative min-w-[240px] flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search supplier name or GST..."
              style={{ paddingLeft: '2.5rem' }}
              className="w-full pr-3 py-1.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Supplier / Mill Name</th>
                <th className="p-2.5">Phone</th>
                <th className="p-2.5">Place / City</th>
                <th className="p-2.5">State</th>
                <th className="p-2.5 font-mono">GSTIN No.</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    No suppliers found. Click "+ Register New Supplier" above to add one.
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                    <td className="p-2.5 font-mono text-slate-700">{s.phone || '—'}</td>
                    <td className="p-2.5 text-slate-600">{s.place || '—'}</td>
                    <td className="p-2.5 font-semibold text-slate-700">{s.state || 'Tamil Nadu'}</td>
                    <td className="p-2.5 font-mono text-slate-700 font-semibold">{s.gstin || 'Unregistered'}</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => handleDeleteSupplier(s)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
            {/* Sticky Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
              <h3 className="text-sm font-bold m-0 text-white">Register New Supplier</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center justify-center shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sree Cotton Mills"
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 9842012345"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN No.</label>
                  <input
                    type="text"
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Place / City</label>
                  <input
                    type="text"
                    value={form.place}
                    onChange={(e) => setForm({ ...form, place: e.target.value })}
                    placeholder="City or Town"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Supplier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
