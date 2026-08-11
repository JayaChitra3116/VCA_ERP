import React, { useState } from 'react';
import { Customer, SalesBill, CustomerPayment, CompanySettings } from '../types';
import { storeSet } from '../lib/storage';
import {
  BookOpen,
  User,
  Search,
  FileText,
  CreditCard,
  ArrowDownLeft,
  DollarSign,
  Printer,
  Trash2,
  X,
  Plus,
  Save,
  CheckCircle2,
  ExternalLink,
  Receipt,
  AlertCircle
} from 'lucide-react';

interface CustomerLedgerTabProps {
  customers: Customer[];
  salesBills: SalesBill[];
  payments: CustomerPayment[];
  setPayments: React.Dispatch<React.SetStateAction<CustomerPayment[]>>;
  openInvoice?: (billNo: string) => void;
  settings?: CompanySettings;
  showToast: (msg: string) => void;
  onGoToCustomerPayment: (customerName: string) => void;
  onGoToCustomerLedger: (customerName: string) => void;
}

export const CustomerLedgerTab: React.FC<CustomerLedgerTabProps> = ({
  customers,
  salesBills,
  payments,
  setPayments,
  openInvoice,
  settings,
  showToast,
  onGoToCustomerPayment,
  onGoToCustomerLedger
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'due'>('all');

  // Modal state for viewing transaction ledger directly inside Ledger tab
  const [activeLedgerCustomer, setActiveLedgerCustomer] = useState<Customer | null>(null);

  // Quick Payment Recording within Ledger modal
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState('Cash Payment');

  // Combine customers from customer directory + sales bills + payments to ensure no entity is lost
  const allCustomerMap = new Map<string, Customer>();
  customers.forEach((c) => allCustomerMap.set(c.name.toLowerCase().trim(), c));

  salesBills.forEach((b) => {
    const name = b.customerName ? b.customerName.trim() : '';
    if (name && !allCustomerMap.has(name.toLowerCase())) {
      allCustomerMap.set(name.toLowerCase(), {
        name,
        phone: b.customerPhone || '',
        place: b.customerAddress || '',
        address: b.customerAddress || '',
        state: b.customerState || 'Tamil Nadu',
        gstin: b.customerGstin || ''
      });
    }
  });

  payments.forEach((p) => {
    const name = p.customerName ? p.customerName.trim() : '';
    if (name && !allCustomerMap.has(name.toLowerCase())) {
      allCustomerMap.set(name.toLowerCase(), {
        name,
        phone: '',
        place: '',
        address: '',
        state: 'Tamil Nadu',
        gstin: ''
      });
    }
  });

  const fullCustomersList = Array.from(allCustomerMap.values());

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

  // Filtered List
  const filteredList = fullCustomersList.filter((c) => {
    const norm = c.name.toLowerCase().trim();
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      (c.gstin && c.gstin.toLowerCase().includes(term)) ||
      (c.place && c.place.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (filterMode === 'due') {
      const stats = getCustomerStats(c.name);
      return stats.outstanding > 0.01;
    }

    return true;
  });

  // Calculate Overall Financial Totals
  const totalBilledOverall = salesBills.reduce((acc, b) => acc + (b.grand || 0), 0);
  const totalReceivedOverall = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalOutstandingOverall = totalBilledOverall - totalReceivedOverall;

  const dueAccountsCount = fullCustomersList.filter((c) => getCustomerStats(c.name).outstanding > 0.01).length;

  // Handle Recording Payment in Ledger Modal
  const handleRecordPayment = async (customerName: string) => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid payment amount (> 0)');
      return;
    }

    const newPayment: CustomerPayment = {
      id: `PAY-${Date.now()}`,
      customerName: customerName.trim(),
      date: payDate || new Date().toISOString().slice(0, 10),
      amount: amt,
      note: payNote.trim() || 'Payment Received',
      createdAt: new Date().toISOString()
    };

    const updated = [newPayment, ...payments];
    setPayments(updated);
    await storeSet('payments', updated);

    showToast(`Payment of ₹${amt.toLocaleString('en-IN')} recorded for ${customerName}!`);
    setPayAmount('');
    setPayNote('Cash Payment');
  };

  // Delete Payment
  const handleDeletePayment = async (payId: string, custName: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;

    const updated = payments.filter((p) => p.id !== payId);
    setPayments(updated);
    await storeSet('payments', updated);
    showToast(`Payment deleted for ${custName}`);
  };

  // Print Statement Generator
  const handlePrintStatement = (cust: Customer) => {
    const stats = getCustomerStats(cust.name);
    const norm = cust.name.toLowerCase().trim();
    const cBills = salesBills.filter((b) => b.customerName.toLowerCase().trim() === norm);
    const cPays = payments.filter((p) => p.customerName.toLowerCase().trim() === norm);

    const timeline: any[] = [
      ...cBills.map((b) => ({
        date: b.date,
        type: 'INVOICE',
        ref: b.billNo,
        desc: `Sales Bill (${b.items.map((i) => i.name).slice(0, 2).join(', ')})`,
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
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Customer Account</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${cust.name}</div>
            <div style="color: #475569;">${cust.address || cust.place || '—'}, ${cust.state}</div>
            <div style="color: #475569;">Ph: ${cust.phone || '—'} | GSTIN: ${cust.gstin || 'Unregistered'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Summary Balance</div>
            <div style="font-size: 11px;">Total Billed: <strong>₹${stats.billed.toFixed(2)}</strong></div>
            <div style="font-size: 11px; color: #047857;">Total Received: <strong>₹${stats.paid.toFixed(2)}</strong></div>
            <div style="font-size: 14px; font-weight: 900; color: ${stats.outstanding > 0 ? '#b91c1c' : '#047857'}; margin-top: 4px;">
              Outstanding Balance: ₹${stats.outstanding.toFixed(2)}
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
          Closing Outstanding Balance: <span style="color: ${stats.outstanding > 0 ? '#b91c1c' : '#047857'};">₹${stats.outstanding.toFixed(2)}</span>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 10px; color: #64748b;">
            Computer generated statement • ${settings?.name || 'VCA Fabrics'}
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
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DDD7C9] pb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#182228] m-0 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#9A6B29]" />
            <span>Customer Ledger</span>
          </h1>
          <p className="text-xs font-mono text-[#607080] m-0 mt-1">
            Click any customer name to view complete transactions or record payments directly in the ledger statement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (fullCustomersList.length > 0) {
                onGoToCustomerPayment(fullCustomersList[0].name);
              }
            }}
            className="px-4 py-2 bg-[#182228] hover:bg-[#0F171C] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>+ Record Customer Payment</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FAF8F3] p-4 border border-[#E2DCD0] shadow-2xs">
          <div className="flex justify-between items-center text-[#708090] text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <span>Customer Accounts</span>
            <User className="w-4 h-4 text-[#9A6B29]" />
          </div>
          <div className="text-3xl font-bold text-[#182228] font-serif">
            {fullCustomersList.length} <span className="text-xs font-mono font-normal text-[#607080]">accounts</span>
          </div>
        </div>

        <div className="bg-[#FAF8F3] p-4 border border-[#E2DCD0] shadow-2xs">
          <div className="flex justify-between items-center text-[#708090] text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <span>Total Sales Billed</span>
            <FileText className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-3xl font-bold text-[#182228] font-serif">
            ₹{totalBilledOverall.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-[#FAF8F3] p-4 border border-[#E2DCD0] shadow-2xs">
          <div className="flex justify-between items-center text-[#708090] text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <span>Total Received</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-bold text-emerald-900 font-serif">
            ₹{totalReceivedOverall.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div
          className={`p-4 border shadow-2xs ${
            totalOutstandingOverall > 0 ? 'bg-[#FAF8F3] border-[#9A6B29]' : 'bg-[#FAF8F3] border-emerald-500'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-mono font-bold uppercase tracking-wider mb-1 text-[#708090]">
            <span>Outstanding Balance</span>
            <DollarSign className={`w-4 h-4 ${totalOutstandingOverall > 0 ? 'text-[#9A6B29]' : 'text-emerald-700'}`} />
          </div>
          <div
            className={`text-3xl font-bold font-serif ${
              totalOutstandingOverall > 0 ? 'text-[#9A6B29]' : 'text-emerald-900'
            }`}
          >
            ₹{totalOutstandingOverall.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          {dueAccountsCount > 0 && (
            <div className="text-[11px] font-mono text-[#9A6B29] font-semibold mt-1">
              ⚠️ {dueAccountsCount} {dueAccountsCount === 1 ? 'account has' : 'accounts have'} pending balance
            </div>
          )}
        </div>
      </div>

      {/* Main Ledger Table Panel */}
      <div className="panel bg-[#FAF8F3] border border-[#E2DCD0] p-5 shadow-2xs">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h2 className="text-sm font-serif font-bold text-[#182228] m-0 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#9A6B29] inline-block"></span>
              <span>Customer Account Balances ({filteredList.length})</span>
            </h2>
            <p className="text-xs font-mono text-[#607080] m-0 mt-0.5">
              Click customer name to open full transaction history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-[#EFECE6] p-0.5 border border-[#D8D3C8] text-xs font-mono">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 font-bold transition-colors cursor-pointer ${
                  filterMode === 'all' ? 'bg-[#182228] text-white' : 'text-[#607080] hover:text-[#182228]'
                }`}
              >
                All Accounts
              </button>
              <button
                onClick={() => setFilterMode('due')}
                className={`px-3 py-1 font-bold transition-colors cursor-pointer ${
                  filterMode === 'due' ? 'bg-[#9A6B29] text-white' : 'text-[#607080] hover:text-[#182228]'
                }`}
              >
                Pending Due Only ({dueAccountsCount})
              </button>
            </div>

            <div className="relative min-w-[240px] flex items-center">
              <Search className="w-4 h-4 text-[#708090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer name, phone, GST..."
                style={{ paddingLeft: '2.5rem' }}
                className="w-full pr-3 py-1.5 border border-[#D8D3C8] bg-[#EFECE6] text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#EFECE4] text-[#607080] font-mono uppercase font-bold border-b border-[#DDD7C9]">
              <tr>
                <th className="p-3">Customer Name</th>
                <th className="p-3 text-right">Total Billed (₹)</th>
                <th className="p-3 text-right">Total Received (₹)</th>
                <th className="p-3 text-right">Outstanding Balance (₹)</th>
                <th className="p-3 text-center">Ledger & Payment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DCD0]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#708090] font-mono italic">
                    No customer accounts found matching current search/filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((c, idx) => {
                  const stats = getCustomerStats(c.name);
                  const isDue = stats.outstanding > 0.01;

                  return (
                    <tr key={idx} className="hover:bg-[#EFECE6]/60 transition-colors">
                      {/* Clickable Customer Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveLedgerCustomer(c)}
                            className="font-bold font-serif text-[#182228] hover:text-[#9A6B29] hover:underline flex items-center gap-1.5 cursor-pointer text-left group"
                            title="Click to view full transaction ledger statement"
                          >
                            <User className="w-4 h-4 text-[#9A6B29] shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="text-base">{c.name}</span>
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-[#607080] pl-5">
                          {c.place || c.address || 'TN'} {c.phone ? `• Ph: ${c.phone}` : ''}
                        </div>
                      </td>

                      {/* Total Billed */}
                      <td className="p-3 text-right font-mono font-bold text-[#182228]">
                        <button
                          onClick={() => setActiveLedgerCustomer(c)}
                          className="hover:underline hover:text-[#9A6B29] cursor-pointer"
                          title="Click to view sales bills"
                        >
                          ₹{stats.billed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </button>
                        <div className="text-[10px] text-[#708090] font-mono">{stats.billCount} bills</div>
                      </td>

                      {/* Clickable Total Received -> Jumps to Customer Tab Payment */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-800">
                        <button
                          onClick={() => onGoToCustomerPayment(c.name)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 hover:underline flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                          title="Click to go to Customer Tab & record payment"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                          <span>₹{stats.paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </button>
                        <div className="text-[10px] text-emerald-700 font-mono">{stats.payCount} payments</div>
                      </td>

                      {/* Outstanding Balance */}
                      <td className="p-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold border ${
                            isDue
                              ? 'bg-[#EFECE6] text-[#9A6B29] border-[#9A6B29]'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {isDue ? (
                            <>
                              <span>₹{stats.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              <span className="text-[10px] font-mono uppercase text-[#9A6B29]">Due</span>
                            </>
                          ) : (
                            <>
                              <span>₹0.00</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setActiveLedgerCustomer(c)}
                            className="px-3 py-1.5 bg-[#EFECE6] hover:bg-[#E5E0D5] text-[#182228] font-mono font-bold text-xs border border-[#D8D3C8] flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Show all transactions in ledger modal"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#9A6B29]" />
                            <span>Statement</span>
                          </button>

                          <button
                            onClick={() => onGoToCustomerPayment(c.name)}
                            className="px-3 py-1.5 bg-[#182228] hover:bg-[#0F171C] text-white font-mono font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Go to Customer Tab to record payment"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                            <span>+ Payment</span>
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

      {/* TRANSACTION LEDGER MODAL inside Ledger Tab */}
      {activeLedgerCustomer && (() => {
        const cust = activeLedgerCustomer;
        const stats = getCustomerStats(cust.name);
        const norm = cust.name.toLowerCase().trim();
        const cBills = salesBills.filter((b) => b.customerName.toLowerCase().trim() === norm);
        const cPays = payments.filter((p) => p.customerName.toLowerCase().trim() === norm);

        const ledgerEntries: any[] = [
          ...cBills.map((b) => ({
            id: b.id || `BILL-${b.billNo}`,
            date: b.date,
            type: 'INVOICE',
            refNo: b.billNo,
            details: `${b.billType === 'sales_bill_2' ? 'Sales Bill 2 (Non-GST)' : 'Sales Bill'} — ${b.items.map((i) => `${i.qty} ${i.unit || 'pcs'} ${i.name}`).join(', ')}`,
            debit: b.grand,
            credit: 0,
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
            origPay: p
          }))
        ];

        ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let accum = 0;
        const ledgerWithBalance = ledgerEntries.map((e) => {
          accum += e.debit - e.credit;
          return { ...e, runningBalance: accum };
        });

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-[#FAF8F3] border border-[#E2DCD0] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="bg-[#22303C] text-white px-6 py-4 flex items-center justify-between border-b border-[#1A2630]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-[#9A6B29]/30 border border-[#9A6B29] flex items-center justify-center text-amber-300">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-white m-0 flex items-center gap-2">
                      <span>{cust.name}</span>
                      <span className="text-xs font-mono font-normal text-[#8C9DAA]">
                        ({cust.gstin || 'Unregistered'})
                      </span>
                    </h3>
                    <p className="text-xs font-mono text-[#8C9DAA] m-0">
                      {cust.phone ? `Ph: ${cust.phone} • ` : ''}{cust.address || cust.place || 'Tamil Nadu'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveLedgerCustomer(null);
                      onGoToCustomerLedger(cust.name);
                    }}
                    className="px-3 py-1.5 bg-[#2C3E4C] hover:bg-[#384E5E] text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Open in Customer Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                    <span>Open in Customer Tab</span>
                  </button>

                  <button
                    onClick={() => handlePrintStatement(cust)}
                    className="px-3 py-1.5 bg-[#9A6B29] hover:bg-[#855A20] text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Statement</span>
                  </button>

                  <button
                    onClick={() => setActiveLedgerCustomer(null)}
                    className="p-1.5 text-[#8C9DAA] hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Financial Stats Bar */}
              <div className="bg-[#EFECE4] border-b border-[#DDD7C9] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 border border-[#E2DCD0]">
                  <div className="text-[#708090] font-mono font-bold uppercase text-[10px] mb-0.5">Total Sales Billed</div>
                  <div className="text-xl font-bold font-serif text-[#182228]">
                    ₹{stats.billed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-mono text-[#708090] mt-0.5">{stats.billCount} Invoices</div>
                </div>

                <div className="bg-white p-3 border border-[#E2DCD0]">
                  <div className="text-emerald-800 font-mono font-bold uppercase text-[10px] mb-0.5">Total Received</div>
                  <div className="text-xl font-bold font-serif text-emerald-900">
                    ₹{stats.paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-700 mt-0.5">{stats.payCount} Receipts</div>
                </div>

                <div
                  className={`p-3 border ${
                    stats.outstanding > 0 ? 'bg-white border-[#9A6B29]' : 'bg-white border-emerald-500'
                  }`}
                >
                  <div className="text-[#708090] font-mono font-bold uppercase text-[10px] mb-0.5">Outstanding Balance</div>
                  <div
                    className={`text-xl font-bold font-serif ${
                      stats.outstanding > 0 ? 'text-[#9A6B29]' : 'text-emerald-900'
                    }`}
                  >
                    ₹{stats.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-mono font-bold mt-0.5">
                    {stats.outstanding > 0 ? '⚠️ Pending Due' : '✅ Account Clear'}
                  </div>
                </div>
              </div>

              {/* In-Ledger Quick Payment Entry Form */}
              <div className="p-4 bg-[#EFECE6] border-b border-[#DDD7C9] flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-mono font-bold text-[#182228] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#9A6B29] inline-block"></span>
                  <span>Record Payment From {cust.name}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveLedgerCustomer(null);
                    onGoToCustomerPayment(cust.name);
                  }}
                  className="px-3 py-1 bg-[#2C3E4C] hover:bg-[#384E5E] text-white font-mono font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Go to Customer Tab Payment</span>
                  <ExternalLink className="w-3 h-3 text-amber-300" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs w-full mt-1">
                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold text-[#607080] mb-1">Date</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full p-2 bg-white border border-[#D8D3C8] font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold text-[#607080] mb-1">Amount Paid (₹) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value === '' ? '' : e.target.value)}
                      placeholder={stats.outstanding > 0 ? `e.g. ${stats.outstanding}` : '0.00'}
                      className="w-full p-2 bg-white border border-[#D8D3C8] font-bold font-mono text-xs text-[#182228]"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold text-[#607080] mb-1">Payment Mode / Note</label>
                    <input
                      type="text"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="e.g. GPay / Cash / UPI"
                      className="w-full p-2 bg-white border border-[#D8D3C8] font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRecordPayment(cust.name)}
                      className="w-full py-2 px-3 bg-[#182228] hover:bg-[#0F171C] text-white font-mono uppercase font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Save className="w-4 h-4 text-amber-400" />
                      <span>Save Payment</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="p-5 overflow-y-auto flex-1 bg-[#FAF8F3]">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#607080] mb-3 m-0">
                  Full Statement & Transactions History ({ledgerWithBalance.length})
                </h4>

                <div className="border border-[#DDD7C9] overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#EFECE4] text-[#607080] font-mono font-bold uppercase border-b border-[#DDD7C9]">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Type & Ref</th>
                        <th className="p-2.5">Particulars / Details</th>
                        <th className="p-2.5 text-right">Debit (+₹)</th>
                        <th className="p-2.5 text-right">Credit (-₹)</th>
                        <th className="p-2.5 text-right">Running Balance (₹)</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DCD0]">
                      {ledgerWithBalance.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-[#708090] font-mono italic">
                            No sales bills or payment transactions recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        ledgerWithBalance.map((item, i) => (
                          <tr key={i} className="hover:bg-[#EFECE6]/60 transition-colors">
                            <td className="p-2.5 font-mono text-[#182228]">{item.date}</td>

                            <td className="p-2.5">
                              {item.type === 'INVOICE' ? (
                                <span className="inline-flex items-center gap-1 font-bold text-[#182228] bg-[#EFECE6] border border-[#D8D3C8] px-2 py-0.5 font-mono text-[11px]">
                                  <FileText className="w-3 h-3 text-indigo-700" />
                                  <span>{item.refNo}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[11px]">
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>{item.refNo}</span>
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 text-[#182228] font-mono max-w-xs truncate" title={item.details}>
                              {item.details}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-[#182228]">
                              {item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                              {item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-[#182228]">
                              <span className={item.runningBalance > 0 ? 'text-[#9A6B29]' : 'text-emerald-800'}>
                                ₹{item.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            <td className="p-2.5 text-center">
                              {item.type === 'INVOICE' && openInvoice ? (
                                <button
                                  onClick={() => openInvoice(item.refNo)}
                                  className="px-2 py-0.5 bg-[#182228] hover:bg-[#0F171C] text-white font-mono font-bold text-[10px] uppercase transition-colors cursor-pointer"
                                >
                                  View Bill
                                </button>
                              ) : item.type === 'PAYMENT' ? (
                                <button
                                  onClick={() => handleDeletePayment(item.id, cust.name)}
                                  className="p-1 text-[#708090] hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
          </div>
        );
      })()}
    </div>
  );
};
