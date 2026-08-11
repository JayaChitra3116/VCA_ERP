import React, { useState } from 'react';
import { PurchaseBill, Supplier, BillItem, InventoryItem } from '../types';
import { storeSet } from '../lib/storage';
import {
  Plus,
  Trash2,
  Save,
  Truck,
  Eye,
  FileText,
  Search,
  UserPlus,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  Hash,
  MapPin,
  Phone,
  X
} from 'lucide-react';

interface PurchaseTabProps {
  purchaseBills: PurchaseBill[];
  setPurchaseBills: React.Dispatch<React.SetStateAction<PurchaseBill[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  openInvoice: (number: string, type: 'sale' | 'purchase', overrideCopyType?: 'original' | 'transport' | 'supplier') => void;
  showToast: (msg: string) => void;
  pbPoNo: string;
  setPbPoNo: React.Dispatch<React.SetStateAction<string>>;
}

export const PurchaseTab: React.FC<PurchaseTabProps> = ({
  purchaseBills,
  setPurchaseBills,
  suppliers,
  setSuppliers,
  inventory,
  setInventory,
  openInvoice,
  showToast,
  pbPoNo,
  setPbPoNo
}) => {
  // Form State
  const [supplierInvNo, setSupplierInvNo] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [supplierName, setSupplierName] = useState('');
  const [supplierState, setSupplierState] = useState('Tamil Nadu');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierPlace, setSupplierPlace] = useState('');

  // Dropdown & Modal State
  const [isSupDropdownOpen, setIsSupDropdownOpen] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupForm, setNewSupForm] = useState({
    name: '',
    phone: '',
    place: '',
    state: 'Tamil Nadu',
    gstin: ''
  });

  // Items State
  const [items, setItems] = useState<
    { name: string; hsn: string; qty: number; unit: string; rate: number; taxRate: number; discPct: number }[]
  >([{ name: '2/20s Cotton Yarn Warp', hsn: '5205', qty: 100, unit: 'kg', rate: 260, taxRate: 5, discPct: 0 }]);

  // Add Item Line
  const handleAddItem = () => {
    setItems([
      ...items,
      { name: '', hsn: '5205', qty: 0, unit: 'kg', rate: 0, taxRate: 5, discPct: 0 }
    ]);
  };

  // Remove Item Line
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast('At least one line item is required');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Update Item Line
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  // Calculations
  const processedItems: BillItem[] = items.map((i) => {
    const rawVal = i.qty * i.rate;
    const discAmt = (rawVal * (i.discPct || 0)) / 100;
    const taxable = rawVal - discAmt;

    const isSameState = (supplierState || '').trim().toLowerCase() === 'tamil nadu';
    const taxAmt = (taxable * (i.taxRate || 0)) / 100;
    const cgst = isSameState ? taxAmt / 2 : 0;
    const sgst = isSameState ? taxAmt / 2 : 0;
    const igst = !isSameState ? taxAmt : 0;
    const amt = taxable + taxAmt;

    return {
      name: i.name || 'Raw Material Item',
      hsn: i.hsn || '5205',
      qty: Number(i.qty) || 0,
      unit: i.unit || 'kg',
      rate: Number(i.rate) || 0,
      taxRate: Number(i.taxRate) || 0,
      discPct: Number(i.discPct) || 0,
      taxable,
      cgst,
      sgst,
      igst,
      amt
    };
  });

  const subtotal = processedItems.reduce((acc, i) => acc + i.taxable, 0);
  const totalCgst = processedItems.reduce((acc, i) => acc + i.cgst, 0);
  const totalSgst = processedItems.reduce((acc, i) => acc + i.sgst, 0);
  const totalIgst = processedItems.reduce((acc, i) => acc + i.igst, 0);
  const rawGrand = subtotal + totalCgst + totalSgst + totalIgst;
  const grand = Math.round(rawGrand);
  const roundOff = grand - rawGrand;

  // Handle Save Purchase Bill
  const handleSavePurchaseBill = async () => {
    if (!supplierName.trim()) {
      showToast('Please select or enter supplier name');
      return;
    }
    if (processedItems.some((i) => !i.name.trim() || i.qty <= 0 || i.rate <= 0)) {
      showToast('Please fill valid item names, quantities, and rates');
      return;
    }

    const newBill: PurchaseBill = {
      poNo: pbPoNo || `PO-${String(purchaseBills.length + 1).padStart(4, '0')}`,
      supplierInvNo: supplierInvNo.trim() || `SUP-INV-${Date.now().toString().slice(-4)}`,
      date: poDate,
      supplierName: supplierName.trim(),
      supplierState,
      items: processedItems,
      subtotal,
      cgst: totalCgst,
      sgst: totalSgst,
      igst: totalIgst,
      grand,
      status
    };

    const updatedBills = [newBill, ...purchaseBills];
    setPurchaseBills(updatedBills);
    await storeSet('purchaseBills', updatedBills);

    // Auto add supplier if new
    if (!suppliers.some((s) => s.name.toLowerCase() === supplierName.toLowerCase().trim())) {
      const updatedSups = [
        ...suppliers,
        {
          name: supplierName.trim(),
          phone: supplierPhone,
          place: supplierPlace,
          state: supplierState,
          gstin: supplierGstin
        }
      ];
      setSuppliers(updatedSups);
      await storeSet('suppliers', updatedSups);
    }

    // Auto Inward into Inventory Stock!
    const updatedInv = [...inventory];
    processedItems.forEach((p) => {
      const match = updatedInv.find((i) => i.name.toLowerCase() === p.name.toLowerCase());
      if (match) {
        match.qty += p.qty;
      } else {
        updatedInv.push({
          name: p.name,
          type: 'raw',
          unit: p.unit || 'kg',
          qty: p.qty,
          reorderLevel: 50
        });
      }
    });
    setInventory(updatedInv);
    await storeSet('inventory', updatedInv);

    showToast(`Purchase Bill ${newBill.poNo} saved & Inventory updated!`);

    // Reset Form
    setSupplierName('');
    setSupplierInvNo('');
    setSupplierPhone('');
    setSupplierGstin('');
    setSupplierPlace('');
    setItems([{ name: '2/20s Cotton Yarn Warp', hsn: '5205', qty: 100, unit: 'kg', rate: 260, taxRate: 5, discPct: 0 }]);
    setPbPoNo(`PO-${String(updatedBills.length + 1).padStart(4, '0')}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 m-0 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-purple-600" />
            <span>Purchase Bills & Inward Yarn</span>
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Record raw material, cotton yarn, and store purchase invoices. Stock is automatically credited to Inventory.
          </p>
        </div>
      </div>

      {/* NEW PURCHASE BILL ENTRY FORM PANEL */}
      <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-purple-700 m-0 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            <span>New Purchase Bill Entry</span>
          </h2>
          <span className="text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg">
            PO Ref: {pbPoNo || `PO-${String(purchaseBills.length + 1).padStart(4, '0')}`}
          </span>
        </div>

        {/* PO Basic Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">PO / Inward Ref No *</label>
            <input
              type="text"
              value={pbPoNo}
              onChange={(e) => setPbPoNo(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-purple-700"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Supplier Inv / Challan No</label>
            <input
              type="text"
              value={supplierInvNo}
              onChange={(e) => setSupplierInvNo(e.target.value)}
              placeholder="e.g. INV/26-27/089"
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Inward Date *</label>
            <input
              type="date"
              value={poDate}
              onChange={(e) => setPoDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'paid' | 'unpaid')}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            >
              <option value="unpaid">Credit (Unpaid)</option>
              <option value="paid">Cash / Bank (Paid)</option>
            </select>
          </div>
        </div>

        {/* Supplier Auto-complete Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 relative text-xs">
          <div className="relative">
            <label className="block font-bold text-slate-700 mb-1">Supplier Name *</label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={supplierName}
                onFocus={() => setIsSupDropdownOpen(true)}
                onChange={(e) => {
                  setSupplierName(e.target.value);
                  setIsSupDropdownOpen(true);
                  const matched = suppliers.find((s) => s.name.toLowerCase() === e.target.value.toLowerCase().trim());
                  if (matched) {
                    setSupplierState(matched.state || 'Tamil Nadu');
                    setSupplierPhone(matched.phone || '');
                    setSupplierGstin(matched.gstin || '');
                    setSupplierPlace(matched.place || '');
                  }
                }}
                placeholder="Search existing yarn supplier or type name"
                style={{ paddingLeft: '2.5rem', paddingRight: '5.5rem' }}
                className="w-full py-2 border border-slate-300 rounded-lg text-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <button
                type="button"
                onClick={() => {
                  setNewSupForm({
                    name: supplierName,
                    phone: supplierPhone,
                    place: supplierPlace,
                    state: supplierState,
                    gstin: supplierGstin
                  });
                  setShowAddSupplierModal(true);
                }}
                className="absolute right-1 top-1 bottom-1 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] rounded flex items-center gap-1 border border-purple-200 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                <span>+ New</span>
              </button>
            </div>

            {/* Supplier Autocomplete Dropdown */}
            {isSupDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                {suppliers
                  .filter((s) => s.name.toLowerCase().includes(supplierName.toLowerCase().trim()))
                  .map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSupplierName(s.name);
                        setSupplierState(s.state || 'Tamil Nadu');
                        setSupplierPhone(s.phone || '');
                        setSupplierGstin(s.gstin || '');
                        setSupplierPlace(s.place || '');
                        setIsSupDropdownOpen(false);
                      }}
                      className="p-2.5 hover:bg-purple-50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {s.phone && <span>Ph: {s.phone}</span>} {s.place && <span>• {s.place}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        {s.gstin && <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">GST: {s.gstin}</span>}
                        <span className="text-[10px] text-slate-400 block mt-0.5">{s.state}</span>
                      </div>
                    </div>
                  ))}

                {supplierName.trim() && !suppliers.some((s) => s.name.toLowerCase() === supplierName.toLowerCase().trim()) && (
                  <div
                    onClick={() => {
                      setNewSupForm({
                        name: supplierName,
                        phone: supplierPhone,
                        place: supplierPlace,
                        state: supplierState,
                        gstin: supplierGstin
                      });
                      setIsSupDropdownOpen(false);
                      setShowAddSupplierModal(true);
                    }}
                    className="p-3 bg-purple-50 hover:bg-purple-100 cursor-pointer text-purple-700 font-bold flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-purple-600" />
                      <span>Register "{supplierName}" as new Supplier?</span>
                    </span>
                    <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded font-sans uppercase">Fill Info</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Supplier State (GST)</label>
            <input
              type="text"
              value={supplierState}
              onChange={(e) => setSupplierState(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* LINE ITEMS TABLE */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 mt-4">Inward Raw Materials / Yarn Lines</h3>
        <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2 min-w-[180px]">Material / Yarn Item Description</th>
                <th className="p-2 w-20 text-center">HSN</th>
                <th className="p-2 w-20 text-right">Qty</th>
                <th className="p-2 w-20 text-center">Unit</th>
                <th className="p-2 w-24 text-right">Rate (₹)</th>
                <th className="p-2 w-20 text-center">GST %</th>
                <th className="p-2 w-20 text-center">Disc %</th>
                <th className="p-2 w-28 text-right">Taxable (₹)</th>
                <th className="p-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const rawVal = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                const discAmt = (rawVal * (Number(item.discPct) || 0)) / 100;
                const lineTaxable = rawVal - discAmt;

                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="e.g. 2/20s Cotton Yarn Warp"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.hsn}
                        onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-center text-xs font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.qty === 0 ? '' : item.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full p-1.5 border border-slate-300 rounded text-right text-xs font-bold font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      >
                        <option value="kg">kg</option>
                        <option value="bags">bags</option>
                        <option value="bales">bales</option>
                        <option value="pcs">pcs</option>
                        <option value="meters">meters</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.rate === 0 ? '' : item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full p-1.5 border border-slate-300 rounded text-right text-xs font-bold font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs text-center"
                      >
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.discPct === 0 ? '' : item.discPct}
                        onChange={(e) => handleItemChange(idx, 'discPct', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full p-1.5 border border-slate-300 rounded text-center text-xs font-mono"
                      />
                    </td>
                    <td className="p-2 text-right font-bold font-mono text-slate-900">
                      ₹{lineTaxable.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Remove Line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3">
          <button
            onClick={handleAddItem}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
          >
            <Plus className="w-4 h-4 text-purple-600" />
            <span>+ Add Material Line</span>
          </button>

          {/* Grand Total Summary Box */}
          <div className="bg-purple-50/70 border border-purple-100 rounded-lg p-3 text-xs min-w-[260px] space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (Taxable):</span>
              <span className="font-mono font-bold">₹{subtotal.toFixed(2)}</span>
            </div>

            {(supplierState || '').trim().toLowerCase() === 'tamil nadu' ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST:</span>
                  <span className="font-mono">₹{totalCgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST:</span>
                  <span className="font-mono">₹{totalSgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-600">
                <span>IGST:</span>
                <span className="font-mono">₹{totalIgst.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Round Off:</span>
              <span className="font-mono">{roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
            </div>

            <div className="flex justify-between font-bold text-slate-900 text-sm pt-1.5 border-t border-purple-200">
              <span>Grand Total Amount:</span>
              <span className="font-mono text-purple-700">₹{grand.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleSavePurchaseBill}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Purchase Bill & Add to Inventory</span>
          </button>
        </div>
      </div>

      {/* ALL PURCHASE BILLS TABLE */}
      <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          <span>All Purchase Bills Directory</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">PO Ref</th>
                <th className="p-2.5">Sup Inv No</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Supplier Name</th>
                <th className="p-2.5 text-right">Grand Total (₹)</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                    No purchase bills recorded yet. Fill the form above to add your first inward purchase bill.
                  </td>
                </tr>
              ) : (
                purchaseBills.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-purple-700">{b.poNo}</td>
                    <td className="p-2.5 font-mono text-slate-600">{b.supplierInvNo || '—'}</td>
                    <td className="p-2.5 text-slate-600">{b.date}</td>
                    <td className="p-2.5 font-bold text-slate-900">{b.supplierName}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹{b.grand.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-center">
                      <span className={`pill ${b.status}`}>{b.status}</span>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => openInvoice(b.poNo, 'purchase')}
                        className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Print / Preview</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER SUPPLIER MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
            {/* Sticky Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold m-0 text-white">Register New Supplier</h3>
                  <p className="text-[11px] text-slate-400 m-0">Supplier info will be stored and selected in purchase bill</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center justify-center shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier / Mill Name *</label>
                <input
                  type="text"
                  value={newSupForm.name}
                  onChange={(e) => setNewSupForm({ ...newSupForm, name: e.target.value })}
                  placeholder="e.g. Sree Cotton Mills Ltd"
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newSupForm.phone}
                    onChange={(e) => setNewSupForm({ ...newSupForm, phone: e.target.value })}
                    placeholder="e.g. +91 98420 12345"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN No.</label>
                  <input
                    type="text"
                    value={newSupForm.gstin}
                    onChange={(e) => setNewSupForm({ ...newSupForm, gstin: e.target.value })}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State (GST)</label>
                  <input
                    type="text"
                    value={newSupForm.state}
                    onChange={(e) => setNewSupForm({ ...newSupForm, state: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Town / Place</label>
                  <input
                    type="text"
                    value={newSupForm.place}
                    onChange={(e) => setNewSupForm({ ...newSupForm, place: e.target.value })}
                    placeholder="e.g. Erode / Coimbatore"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newSupForm.name.trim()) {
                      showToast('Please enter supplier name');
                      return;
                    }
                    const newEntry: Supplier = {
                      name: newSupForm.name.trim(),
                      phone: newSupForm.phone.trim(),
                      gstin: newSupForm.gstin.trim(),
                      state: newSupForm.state || 'Tamil Nadu',
                      place: newSupForm.place.trim()
                    };

                    const updatedSups = [...suppliers, newEntry];
                    setSuppliers(updatedSups);
                    await storeSet('suppliers', updatedSups);

                    setSupplierName(newEntry.name);
                    setSupplierPhone(newEntry.phone);
                    setSupplierGstin(newEntry.gstin);
                    setSupplierState(newEntry.state);
                    setSupplierPlace(newEntry.place);

                    setShowAddSupplierModal(false);
                    showToast(`Supplier "${newEntry.name}" saved & selected!`);
                  }}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Select</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
