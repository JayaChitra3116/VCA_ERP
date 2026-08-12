import React, { useState, useEffect } from 'react';
import { Customer, SalesBill, CustomerPayment, CompanySettings } from '../types';
import { storeSet } from '../lib/storage';
import {
  UserCheck,
  Plus,
  Save,
  Phone,
  MapPin,
  Hash,
  Search,
  FileText,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Trash2,
  Calendar,
  CheckCircle2,
  X,
  Building,
  User,
  DollarSign,
  ChevronRight,
  Receipt
} from 'lucide-react';

interface CustomersTabProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  salesBills?: SalesBill[];
  setSalesBills?: React.Dispatch<React.SetStateAction<SalesBill[]>>;
  payments?: CustomerPayment[];
  setPayments?: React.Dispatch<React.SetStateAction<CustomerPayment[]>>;
  openInvoice?: (billNo: string) => void;
  settings?: CompanySettings;
  showToast: (msg: string) => void;
  initialCustomerName?: string | null;
  initialAction?: 'ledger' | 'payment' | null;
  onClearInitial?: () => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  setCustomers,
  salesBills = [],
  setSalesBills,
  payments = [],
  setPayments,
  openInvoice,
  settings,
  showToast,
  initialCustomerName,
  initialAction,
  onClearInitial
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Modal State for Customer Ledger / Statement View
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);

  // Modal State for Record Payment
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Record Payment Form Inputs
  const [payCustName, setPayCustName] = useState('');
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState('Cash Payment');

  // Customer Form
  const [form, setForm] = useState<Customer>({
    name: '',
    phone: '',
    place: '',
    address: '',
    pincode: '',
    state: 'Tamil Nadu',
    gstin: ''
  });

  // Handle Save New Customer
  const handleSaveCustomer = async () => {
    if (!form.name.trim()) {
      showToast('Please enter customer name');
      return;
    }

    const newCustomer: Customer = {
      ...form,
      id: crypto.randomUUID(),
      name: form.name.trim(),
      address: form.address || form.place
    };

    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    await storeSet('customers', updated);

    showToast(`Customer "${newCustomer.name}" registered successfully!`);
    setShowAddModal(false);
    setForm({
      name: '',
      phone: '',
      place: '',
      address: '',
      pincode: '',
      state: 'Tamil Nadu',
      gstin: ''
    });
  };

  // Open Record Payment Modal for specific or general customer
  const openPaymentModalFor = (cust?: Customer) => {
    if (cust) {
      setPaymentModalCustomer(cust);
      setPayCustName(cust.name);
    } else if (customers.length > 0) {
      setPaymentModalCustomer(customers[0]);
      setPayCustName(customers[0].name);
    } else {
      setPaymentModalCustomer(null);
      setPayCustName('');
    }
    setPayAmount('');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNote('Bank Transfer / UPI');
    setShowPaymentModal(true);
  };

  // Handle Submit Payment
  const handleRecordPayment = async (customerNameOverride?: string) => {
    const targetCustomer = (customerNameOverride || payCustName).trim();
    if (!targetCustomer) {
      showToast('Please select or enter customer name');
      return;
    }

    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid payment amount (> 0)');
      return;
    }

    const newPayment: CustomerPayment = {
      id: `PAY-${Date.now()}`,
      customerName: targetCustomer,
      date: payDate || new Date().toISOString().slice(0, 10),
      amount: amt,
      note: payNote.trim() || 'Payment Received',
      createdAt: new Date().toISOString()
    };

    const updatedPayments = [newPayment, ...payments];
    if (setPayments) {
      setPayments(updatedPayments);
    }
    await storeSet('payments', updatedPayments);

    showToast(`Payment of ₹${amt.toLocaleString('en-IN')} recorded for ${targetCustomer}!`);
    setPayAmount('');
    setPayNote('Cash / GPay');
    setShowPaymentModal(false);
  };

  // Handle Delete Payment
  const handleDeletePayment = async (payId: string, custName: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;

    const updatedPayments = payments.filter((p) => p.id !== payId);
    if (setPayments) {
      setPayments(updatedPayments);
    }
    await storeSet('payments', updatedPayments);
    showToast(`Payment deleted for ${custName}`);
  };

  // Helper: Get financial stats for a given customer name
  const getCustomerStats = (custName: string) => {
    const norm = custName.toLowerCase().trim();
    const cBills = salesBills.filter((b) => b.customerName.toLowerCase().trim() === norm);
    const cPays = payments.filter((p) => p.customerName.toLowerCase().trim() === norm);

    const billed = cBills.reduce((acc, b) => acc + (b.grand || 0), 0);
    const paid = cPays.reduce((acc, p) => acc + (p.amount || 0), 0);
    const outstanding = billed - paid;

    return { billed, paid, outstanding, billCount: cBills.length, payCount: cPays.length };
  };

  // Ensure all unique customer names from salesBills & payments are present
  const allCustomerNamesMap = new Map<string, Customer>();
  customers.forEach((c) => allCustomerNamesMap.set(c.name.toLowerCase().trim(), c));

  // Add virtual customer entries for any bill/payment customer not yet in directory
  salesBills.forEach((b) => {
    const name = b.customerName ? b.customerName.trim() : '';
    if (name && !allCustomerNamesMap.has(name.toLowerCase())) {
      allCustomerNamesMap.set(name.toLowerCase(), {
        name: name,
        phone: b.customerPhone || '',
        place: b.customerAddress || '',
        address: b.customerAddress || '',
        state: b.customerState || 'Tamil Nadu',
        gstin: b.customerGstin || ''
      });
    }
  });

  const displayCustomersList = Array.from(allCustomerNamesMap.values());

  // Handle external navigation requests (from Ledger tab or elsewhere)
  useEffect(() => {
    if (initialCustomerName) {
      const norm = initialCustomerName.toLowerCase().trim();
      const found = displayCustomersList.find((c) => c.name.toLowerCase().trim() === norm) || {
        name: initialCustomerName,
        phone: '',
        place: '',
        address: '',
        state: 'Tamil Nadu',
        gstin: ''
      };

      if (initialAction === 'payment') {
        openPaymentModalFor(found);
      } else {
        setSelectedLedgerCustomer(found);
      }

      if (onClearInitial) {
        onClearInitial();
      }
    }
  }, [initialCustomerName, initialAction]);

  // Search Filter
  const filteredCustomers = displayCustomersList.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      (c.gstin && c.gstin.toLowerCase().includes(term)) ||
      (c.place && c.place.toLowerCase().includes(term))
    );
  });

  // Aggregated Overall Metrics
  const totalInvoicedOverall = salesBills.reduce((acc, b) => acc + (b.grand || 0), 0);
  const totalPaidOverall = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalOutstandingOverall = totalInvoicedOverall - totalPaidOverall;

  // Print Statement HTML Generator
  const handlePrintCustomerStatement = (cust: Customer) => {
    const stats = getCustomerStats(cust.name);
    const norm = cust.name.toLowerCase().trim();
    const cBills = salesBills.filter((b) => b.customerName.toLowerCase().trim() === norm);
    const cPays = payments.filter((p) => p.customerName.toLowerCase().trim() === norm);

    // Build combined timeline
    const timeline: any[] = [
      ...cBills.map((b) => ({
        date: b.date,
        type: 'INVOICE',
        ref: b.billNo,
        desc: `Sales Bill / Tax Invoice (${b.items.map((i) => i.name).slice(0, 2).join(', ')})`,
        debit: b.grand,
        credit: 0
      })),
      ...cPays.map((p) => ({
        date: p.date,
        type: 'PAYMENT',
        ref: `REC-${p.id.slice(-6)}`,
        desc: p.note || 'Payment Received',
        debit: 0,
        credit: p.amount
      }))
    ];

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const rowsHtml = timeline
      .map((item) => {
        running += item.debit - item.credit;
        return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${item.date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${item.type === 'INVOICE' ? '#1e1b4b' : '#047857'};">
            ${item.type === 'INVOICE' ? 'TAX INVOICE' : 'PAYMENT REC'} (${item.ref})
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.desc}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">
            ${item.debit > 0 ? '₹' + item.debit.toFixed(2) : '—'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; color: #047857; font-weight: bold;">
            ${item.credit > 0 ? '₹' + item.credit.toFixed(2) : '—'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold;">
            ₹${running.toFixed(2)}
          </td>
        </tr>
      `;
      })
      .join('');

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Statement — ${cust.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; font-size: 12px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .title { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background: #0f172a; color: #ffffff; padding: 8px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          .total-box { margin-top: 16px; text-align: right; font-size: 14px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${settings?.name || 'VCA FABRICS'}</div>
            <div class="subtitle">${settings?.address || 'Erode, Tamil Nadu'} • GSTIN: ${settings?.gstin || '33AAAAA0000A1Z5'}</div>
            <div class="subtitle">Ph: ${settings?.phone || '98427 12345'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">CUSTOMER ACCOUNT STATEMENT</div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px;">As on ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div class="box">
          <div>
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Customer Details</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${cust.name}</div>
            <div style="color: #475569;">${cust.address || cust.place || '—'}, ${cust.state}</div>
            <div style="color: #475569;">Ph: ${cust.phone || '—'} | GSTIN: ${cust.gstin || 'Unregistered'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Summary Balance</div>
            <div style="font-size: 11px;">Total Billed: <strong>₹${stats.billed.toFixed(2)}</strong></div>
            <div style="font-size: 11px; color: #047857;">Total Paid: <strong>₹${stats.paid.toFixed(2)}</strong></div>
            <div style="font-size: 14px; font-weight: 900; color: ${stats.outstanding > 0 ? '#b91c1c' : '#047857'}; margin-top: 4px;">
              Outstanding Due: ₹${stats.outstanding.toFixed(2)}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction / Ref</th>
              <th>Particulars</th>
              <th style="text-align: right;">Debit (₹)</th>
              <th style="text-align: right;">Credit (₹)</th>
              <th style="text-align: right;">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colSpan="6" style="padding:16px; text-align:center;">No transaction records found for this customer.</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          Closing Outstanding Balance Due: <span style="color: ${stats.outstanding > 0 ? '#b91c1c' : '#047857'};">₹${stats.outstanding.toFixed(2)}</span>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 10px; color: #64748b;">
            Computer generated customer statement • ${settings?.name || 'VCA Fabrics'}
          </div>
          <div style="text-align: center; border-top: 1px solid #0f172a; width: 180px; padding-top: 4px; font-weight: bold;">
            Authorized Signatory
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 m-0 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            <span>Customer Directory & Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Registered buyers, wholesale towel dealers, outstanding balances & payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openPaymentModalFor()}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>+ Record Customer Payment</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Register New Customer</span>
          </button>
        </div>
      </div>

      {/* Top Financial Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>Total Buyers</span>
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {displayCustomersList.length} <span className="text-xs font-normal text-slate-500">accounts</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-indigo-700 text-xs font-semibold mb-1">
            <span>Total Sales Billed</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-950 font-mono">
            ₹{totalInvoicedOverall.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-emerald-700 text-xs font-semibold mb-1">
            <span>Total Payments Received</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-mono">
            ₹{totalPaidOverall.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-2xs ${totalOutstandingOverall > 0 ? 'bg-amber-50/50 border-amber-300' : 'bg-emerald-50/50 border-emerald-300'}`}>
          <div className="flex justify-between items-center text-xs font-semibold mb-1 text-slate-700">
            <span>Net Outstanding Due</span>
            <DollarSign className={`w-4 h-4 ${totalOutstandingOverall > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${totalOutstandingOverall > 0 ? 'text-amber-900' : 'text-emerald-800'}`}>
            ₹{totalOutstandingOverall.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Main Customers List Panel */}
      <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 m-0">
              Customer Accounts & Balances ({filteredCustomers.length})
            </h2>
            <p className="text-[11px] text-slate-500 m-0">
              Click any customer name to view complete statement, invoice history & payment ledger.
            </p>
          </div>

          <div className="relative min-w-[260px] flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, city or GST..."
              style={{ paddingLeft: '2.5rem' }}
              className="w-full pr-3 py-1.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Phone / Contact</th>
                <th className="p-3">Place / GSTIN</th>
                <th className="p-3 text-right">Total Billed (₹)</th>
                <th className="p-3 text-right">Total Paid (₹)</th>
                <th className="p-3 text-right">Outstanding (₹)</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    No customers found matching "{searchTerm}". Click "+ Register New Customer" above to add one.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => {
                  const stats = getCustomerStats(c.name);
                  const isDue = stats.outstanding > 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedLedgerCustomer(c)}
                          className="font-bold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                          title="Click to open Customer Transaction Ledger"
                        >
                          <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{c.name}</span>
                        </button>
                      </td>

                      <td className="p-3 font-mono text-slate-700">
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="hover:underline flex items-center gap-1 text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="p-3 text-slate-600">
                        <div>{c.address || c.place || '—'}</div>
                        {c.gstin && <div className="text-[10px] font-mono text-slate-400">GST: {c.gstin}</div>}
                      </td>

                      <td className="p-3 text-right font-mono font-semibold text-slate-900">
                        ₹{stats.billed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 text-right font-mono font-semibold text-emerald-700">
                        ₹{stats.paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold border ${
                            isDue
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {isDue ? (
                            <>
                              <span>₹{stats.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              <span className="text-[10px] font-sans font-normal uppercase text-amber-700">Due</span>
                            </>
                          ) : (
                            <>
                              <span>₹0.00</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedLedgerCustomer(c)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="View Transaction Ledger & Statement"
                          >
                            <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Ledger</span>
                          </button>

                          <button
                            onClick={() => openPaymentModalFor(c)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Record Payment from this customer"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Payment</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER LEDGER & STATEMENT MODAL */}
      {selectedLedgerCustomer && (() => {
        const cust = selectedLedgerCustomer;
        const stats = getCustomerStats(cust.name);
        const norm = cust.name.toLowerCase().trim();
        const cBills = salesBills.filter((b) => b.customerName.toLowerCase().trim() === norm);
        const cPays = payments.filter((p) => p.customerName.toLowerCase().trim() === norm);

        // Combine Sales Bills (Debits) and Customer Payments (Credits)
        const ledgerEntries: any[] = [
          ...cBills.map((b) => ({
            id: b.id || `BILL-${b.billNo}`,
            date: b.date,
            type: 'INVOICE',
            refNo: b.billNo,
            details: `${b.billType === 'sales_bill_2' ? 'Sales Bill 2 (Non-GST)' : 'Sales Bill'} — ${b.items.map((i) => `${i.qty} ${i.unit || 'pcs'} ${i.name}`).join(', ')}`,
            debit: b.grand,
            credit: 0,
            status: b.status,
            origBill: b
          })),
          ...cPays.map((p) => ({
            id: p.id,
            date: p.date,
            type: 'PAYMENT',
            refNo: `REC-${p.id.slice(-6)}`,
            details: p.note || 'Customer Payment Received',
            debit: 0,
            credit: p.amount,
            status: 'paid',
            origPay: p
          }))
        ];

        // Sort by Date ascending for calculation
        ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate running balance
        let accum = 0;
        const ledgerWithBalance = ledgerEntries.map((e) => {
          accum += e.debit - e.credit;
          return { ...e, runningBalance: accum };
        });

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] sm:max-h-[88vh] overflow-hidden flex flex-col my-auto">
              {/* Sticky Header */}
              <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white m-0 flex items-center gap-2">
                      <span>{cust.name}</span>
                      <span className="text-xs font-normal text-slate-400 font-mono">
                        ({cust.gstin || 'Unregistered'})
                      </span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 m-0">
                      {cust.phone ? `Ph: ${cust.phone} • ` : ''}{cust.address || cust.place || 'Tamil Nadu'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePrintCustomerStatement(cust)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Print Statement</span>
                  </button>

                  <button
                    onClick={() => setSelectedLedgerCustomer(null)}
                    aria-label="Close customer ledger"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center justify-center shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div className="overflow-y-auto flex-1">

              {/* Financial Stats Summary Bar */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold mb-0.5">Total Sales Invoiced</div>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    ₹{stats.billed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stats.billCount} Tax Invoices</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-emerald-700 font-semibold mb-0.5">Total Payments Collected</div>
                  <div className="text-lg font-bold font-mono text-emerald-800">
                    ₹{stats.paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">{stats.payCount} Payment Receipts</div>
                </div>

                <div className={`p-3 rounded-xl border ${stats.outstanding > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
                  <div className="text-slate-700 font-semibold mb-0.5">Current Outstanding Balance</div>
                  <div className={`text-lg font-extrabold font-mono ${stats.outstanding > 0 ? 'text-amber-900' : 'text-emerald-800'}`}>
                    ₹{stats.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-bold mt-0.5">
                    {stats.outstanding > 0 ? '⚠️ Payment Due' : '✅ Account Clear'}
                  </div>
                </div>
              </div>

              {/* In-Ledger Quick Payment Entry Form */}
              <div className="p-4 bg-indigo-50/50 border-b border-indigo-100">
                <div className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Record New Payment Received From {cust.name}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount Paid (₹) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={stats.outstanding > 0 ? `e.g. ${stats.outstanding}` : '0.00'}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Mode / Note</label>
                    <input
                      type="text"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="e.g. GPay / Bank Transfer / Cash"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRecordPayment(cust.name)}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Payment</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="p-5 overflow-y-auto flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 m-0">
                  Full Statement & Transaction History ({ledgerWithBalance.length})
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Type & Ref</th>
                        <th className="p-2.5">Particulars / Details</th>
                        <th className="p-2.5 text-right">Debit (+₹)</th>
                        <th className="p-2.5 text-right">Credit (-₹)</th>
                        <th className="p-2.5 text-right">Balance (₹)</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerWithBalance.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                            No sales bills or payment transactions recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        ledgerWithBalance.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 font-mono text-slate-700">{item.date}</td>

                            <td className="p-2.5">
                              {item.type === 'INVOICE' ? (
                                <span className="inline-flex items-center gap-1 font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono text-[11px]">
                                  <FileText className="w-3 h-3 text-indigo-600" />
                                  <span>{item.refNo}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono text-[11px]">
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                  <span>{item.refNo}</span>
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 text-slate-700 max-w-xs truncate" title={item.details}>
                              {item.details}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                              {item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              <span className={item.runningBalance > 0 ? 'text-amber-900' : 'text-slate-700'}>
                                ₹{item.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            <td className="p-2.5 text-center">
                              {item.type === 'INVOICE' && openInvoice ? (
                                <button
                                  onClick={() => openInvoice(item.refNo)}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] rounded border border-slate-300 transition-colors cursor-pointer"
                                >
                                  View Bill
                                </button>
                              ) : item.type === 'PAYMENT' ? (
                                <button
                                  onClick={() => handleDeletePayment(item.id, cust.name)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete payment entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>

              {/* Sticky Footer */}
              <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedLedgerCustomer(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Close Statement</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* STANDALONE RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
            {/* Sticky Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="text-sm font-bold m-0 text-white">Record Customer Payment</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Account *</label>
                <select
                  value={payCustName}
                  onChange={(e) => setPayCustName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                >
                  <option value="">-- Select Customer --</option>
                  {displayCustomersList.map((c, i) => (
                    <option key={i} value={c.name}>
                      {c.name} ({c.place || 'TN'})
                    </option>
                  ))}
                </select>
              </div>

              {payCustName && (() => {
                const stats = getCustomerStats(payCustName);
                return (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                    <span className="text-slate-600">Current Outstanding Due:</span>
                    <span className={`font-mono font-bold ${stats.outstanding > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                      ₹{stats.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid (₹) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode / Remarks</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Cash / GPay / Cheque #5201"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRecordPayment()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Record Payment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
            {/* Sticky Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
              <h3 className="text-sm font-bold m-0 text-white">Register New Customer</h3>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sai Sri Fabrics"
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
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
                  <label className="block font-bold text-slate-700 mb-1">Address / Place</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value, place: e.target.value })}
                    placeholder="City or Town"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomer}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Customer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
