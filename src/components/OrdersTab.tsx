import React, { useState } from 'react';
import { ProductionOrder, OrderItem, SalesBill } from '../types';
import { storeSet, deleteFromRelationalTable } from '../lib/storage';
import { 
  Plus, Search, Eye, ShoppingBag, CheckCircle, Clock, AlertCircle, 
  Trash2, Edit3, FileText, ArrowRight, History, Receipt, 
  TrendingUp, CheckSquare, Layers, AlertTriangle, Printer
} from 'lucide-react';

export interface OrderBillingSummary {
  totalOrderedQty: number;
  totalBilledQty: number;
  totalPendingQty: number;
  originalTotalValue: number;
  billedValue: number;
  pendingBalanceValue: number;
  percentBilled: number;
  itemBreakdown: Array<{
    varietyName: string;
    dimensions?: string;
    unit: string;
    unitRate: number;
    orderedQty: number;
    billedQty: number;
    pendingQty: number;
    orderedValue: number;
    billedValue: number;
    pendingValue: number;
  }>;
  linkedBills: SalesBill[];
}

export function computeOrderBillingSummary(order: ProductionOrder, salesBills: SalesBill[] = []): OrderBillingSummary {
  const orderNoNorm = (order.orderNo || '').toLowerCase().trim();
  
  // Find all sales bills that reference this order number
  const linkedBills = salesBills.filter(b => {
    const bOrderNo = (b.orderNo || '').toLowerCase().trim();
    const bArticleNo = (b.articleNo || '').toLowerCase().trim();
    return (
      (bOrderNo && bOrderNo === orderNoNorm) ||
      (bArticleNo && (bArticleNo === orderNoNorm || bArticleNo.includes(orderNoNorm)))
    );
  });

  const itemBreakdown = order.items.map(it => {
    const itNameNorm = it.varietyName.toLowerCase().trim();
    
    // Calculate total quantity billed for this specific variety across all linked bills
    let billedQty = 0;
    linkedBills.forEach(b => {
      if (b.items && Array.isArray(b.items)) {
        b.items.forEach(bi => {
          const biNameNorm = (bi.name || '').toLowerCase().trim();
          if (biNameNorm === itNameNorm || (order.items.length === 1 && b.items.length === 1)) {
            billedQty += Number(bi.qty) || 0;
          }
        });
      }
    });

    const orderedQty = Number(it.targetQty) || 0;
    const pendingQty = Math.max(0, orderedQty - billedQty);
    const unitRate = Number(it.unitRate) || 0;

    return {
      varietyName: it.varietyName,
      dimensions: it.dimensions,
      unit: it.unit || 'pcs',
      unitRate,
      orderedQty,
      billedQty,
      pendingQty,
      orderedValue: orderedQty * unitRate,
      billedValue: billedQty * unitRate,
      pendingValue: pendingQty * unitRate
    };
  });

  const totalOrderedQty = itemBreakdown.reduce((sum, i) => sum + i.orderedQty, 0);
  const totalBilledQty = itemBreakdown.reduce((sum, i) => sum + i.billedQty, 0);
  const totalPendingQty = itemBreakdown.reduce((sum, i) => sum + i.pendingQty, 0);
  const originalTotalValue = itemBreakdown.reduce((sum, i) => sum + i.orderedValue, 0);
  const billedValue = itemBreakdown.reduce((sum, i) => sum + i.billedValue, 0);
  const pendingBalanceValue = itemBreakdown.reduce((sum, i) => sum + i.pendingValue, 0);
  const percentBilled = totalOrderedQty > 0 ? Math.min(100, Math.round((totalBilledQty / totalOrderedQty) * 100)) : 0;

  return {
    totalOrderedQty,
    totalBilledQty,
    totalPendingQty,
    originalTotalValue,
    billedValue,
    pendingBalanceValue,
    percentBilled,
    itemBreakdown,
    linkedBills
  };
}

interface OrdersTabProps {
  orders: ProductionOrder[];
  onSaveOrder: (order: ProductionOrder) => void;
  onUpdateStatus: (orderId: string, status: ProductionOrder['status']) => void;
  customerNames: string[];
  varietyNames: string[];
  onConvertToBill?: (order: ProductionOrder, partialItems?: Array<{ varietyName: string; qty: number; unitRate: number; dimensions?: string; unit?: string }>) => void;
  salesBills?: SalesBill[];
  openInvoice?: (number: string, type: 'sale' | 'purchase') => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  onSaveOrder,
  onUpdateStatus,
  customerNames,
  varietyNames,
  onConvertToBill,
  salesBills = [],
  openInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);
  
  // Partial Billing Modal State
  const [partialBillOrder, setPartialBillOrder] = useState<ProductionOrder | null>(null);
  const [partialBillingQuantities, setPartialBillingQuantities] = useState<Record<number, number>>({});
  
  // History Modal State
  const [historyOrder, setHistoryOrder] = useState<ProductionOrder | null>(null);

  // New Order Form state
  const [customerName, setCustomerName] = useState('');
  const [deliveryDueDate, setDeliveryDueDate] = useState('');
  const [orderNotes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { varietyName: varietyNames[0] || 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '55 x 28 inches', targetQty: 500, unit: 'pcs', unitRate: 250.00, notes: '' }
  ]);

  // Pre-calculate summaries for all orders
  const ordersWithSummaries = orders.map(order => ({
    order,
    summary: computeOrderBillingSummary(order, salesBills)
  }));

  const filteredOrders = ordersWithSummaries.filter(({ order, summary }) => {
    const matchesSearch = order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'partially_billed') {
        matchesStatus = summary.totalBilledQty > 0 && summary.totalPendingQty > 0;
      } else if (statusFilter === 'completed') {
        matchesStatus = order.status === 'completed' || summary.percentBilled >= 100;
      } else if (statusFilter === 'pending') {
        matchesStatus = summary.totalBilledQty === 0 && order.status !== 'completed' && order.status !== 'cancelled';
      } else {
        matchesStatus = order.status === statusFilter;
      }
    }
    return matchesSearch && matchesStatus;
  });

  // Overall statistics
  const totalOrdersCount = orders.length;
  const totalInitialOrderValue = ordersWithSummaries.reduce((s, { summary }) => s + summary.originalTotalValue, 0);
  const totalBilledValue = ordersWithSummaries.reduce((s, { summary }) => s + summary.billedValue, 0);
  const totalPendingBalanceValue = ordersWithSummaries.reduce((s, { summary }) => s + summary.pendingBalanceValue, 0);
  const partiallyBilledCount = ordersWithSummaries.filter(({ summary }) => summary.totalBilledQty > 0 && summary.totalPendingQty > 0).length;

  const handleAddItem = () => {
    setItems([
      ...items,
      { varietyName: varietyNames[0] || 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '55 x 28 inches', targetQty: 500, unit: 'pcs', unitRate: 250.00, notes: '' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleOpenAddModal = () => {
    setEditingOrder(null);
    setCustomerName(customerNames[0] || '');
    setDeliveryDueDate('');
    setNotes('');
    setItems([
      { varietyName: varietyNames[0] || 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '55 x 28 inches', targetQty: 500, unit: 'pcs', unitRate: 250.00, notes: '' }
    ]);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (order: ProductionOrder) => {
    setEditingOrder(order);
    setCustomerName(order.customerName);
    setDeliveryDueDate(order.deliveryDueDate || '');
    setNotes(order.notes || '');
    setItems(order.items && order.items.length > 0 ? order.items.map(it => ({ ...it, unitRate: Number(it.unitRate) || 0 })) : [
      { varietyName: varietyNames[0] || 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '55 x 28 inches', targetQty: 500, unit: 'pcs', unitRate: 250.00, notes: '' }
    ]);
    setShowAddModal(true);
  };

  const handleCreateOrUpdateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      alert('Please select or enter a customer name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one order item');
      return;
    }

    if (editingOrder) {
      const updatedOrder: ProductionOrder = {
        ...editingOrder,
        customerName,
        deliveryDueDate: deliveryDueDate || editingOrder.deliveryDueDate,
        items,
        notes: orderNotes
      };
      onSaveOrder(updatedOrder);
    } else {
      const orderNo = `ORD-${new Date().getFullYear()}-${String(orders.length + 101).padStart(3, '0')}`;
      const newOrder: ProductionOrder = {
        id: `ord_${Date.now().toString(36)}`,
        orderNo,
        customerName,
        orderDate: new Date().toISOString().slice(0, 10),
        deliveryDueDate: deliveryDueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        items,
        status: 'pending',
        notes: orderNotes
      };
      onSaveOrder(newOrder);
    }

    setShowAddModal(false);
    setEditingOrder(null);
    setCustomerName('');
    setNotes('');
    setItems([{ varietyName: varietyNames[0] || 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '55 x 28 inches', targetQty: 500, unit: 'pcs', unitRate: 250.00, notes: '' }]);
  };

  // Open Partial Billing Modal with prefilled pending quantities
  const handleOpenPartialBillModal = (order: ProductionOrder) => {
    const summary = computeOrderBillingSummary(order, salesBills);
    const initialQtyMap: Record<number, number> = {};
    
    summary.itemBreakdown.forEach((item, idx) => {
      // Default to remaining pending quantity, or 0 if already full
      initialQtyMap[idx] = item.pendingQty;
    });

    setPartialBillingQuantities(initialQtyMap);
    setPartialBillOrder(order);
  };

  // Proceed from Partial Bill Modal to create sales bill
  const handleConfirmPartialBill = () => {
    if (!partialBillOrder || !onConvertToBill) return;

    const summary = computeOrderBillingSummary(partialBillOrder, salesBills);
    const partialItems = summary.itemBreakdown
      .map((item, idx) => ({
        varietyName: item.varietyName,
        dimensions: item.dimensions,
        unit: item.unit,
        unitRate: item.unitRate,
        qty: Number(partialBillingQuantities[idx]) || 0
      }))
      .filter(it => it.qty > 0);

    if (partialItems.length === 0) {
      alert('Please enter a billing quantity greater than 0 for at least one item.');
      return;
    }

    const orderToBill = partialBillOrder;
    setPartialBillOrder(null);
    onConvertToBill(orderToBill, partialItems);
  };

  const getStatusBadge = (order: ProductionOrder, summary: OrderBillingSummary) => {
    if (order.status === 'cancelled') {
      return <span className="pill unpaid font-bold">Cancelled</span>;
    }
    if (order.status === 'completed' || summary.percentBilled >= 100) {
      return (
        <span className="pill paid flex items-center gap-1 font-bold">
          <CheckCircle className="w-3 h-3" />
          <span>Fully Billed (100%)</span>
        </span>
      );
    }
    if (summary.totalBilledQty > 0 && summary.totalPendingQty > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <Layers className="w-3 h-3 text-amber-600" />
          <span>Partially Billed ({summary.percentBilled}%)</span>
        </span>
      );
    }
    if (order.status === 'in_production') {
      return (
        <span className="pill purchase flex items-center gap-1 font-bold">
          <Clock className="w-3 h-3" />
          <span>In Production</span>
        </span>
      );
    }
    return (
      <span className="pill due flex items-center gap-1 font-bold">
        <AlertCircle className="w-3 h-3" />
        <span>Pending (0%)</span>
      </span>
    );
  };

  const handleDeleteOrder = async (order: ProductionOrder) => {
    if (!window.confirm(`Are you sure you want to delete production order "${order.orderNo}"?`)) return;

    const updated = orders.filter((o) => o.id !== order.id && o.orderNo.toLowerCase().trim() !== order.orderNo.toLowerCase().trim());
    await storeSet('productionOrders', updated);
    await deleteFromRelationalTable('production_orders', order.id, 'order_no', order.orderNo);
    await deleteFromRelationalTable('orders', order.id, 'order_no', order.orderNo);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-serif font-bold text-slate-800 m-0">Production Orders & Partial Billing</h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Track customer orders, partial lot billings, current pending balances & linked invoice history.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn primary flex items-center justify-center gap-2"
          id="btn-new-order"
        >
          <Plus className="w-4 h-4" />
          <span>New Order Note</span>
        </button>
      </div>

      {/* Orders Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-[11px] font-mono font-bold uppercase text-slate-500 flex items-center justify-between">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{totalOrdersCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Initial Value: <strong className="text-slate-800">₹{totalInitialOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/30 rounded-xl p-4 shadow-2xs">
          <div className="text-[11px] font-mono font-bold uppercase text-amber-800 flex items-center justify-between">
            <span>Partially Billed</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-700 mt-1">{partiallyBilledCount}</div>
          <div className="text-[11px] text-amber-800/80 mt-1 font-mono">
            Active in multiple lot dispatches
          </div>
        </div>

        <div className="bg-white border border-sky-200 bg-sky-50/30 rounded-xl p-4 shadow-2xs">
          <div className="text-[11px] font-mono font-bold uppercase text-sky-800 flex items-center justify-between">
            <span>Billed / Dispatched</span>
            <Receipt className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black font-mono text-sky-700 mt-1">₹{totalBilledValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="text-[11px] text-sky-700/80 mt-1 font-mono">
            Generated into Tax Invoices
          </div>
        </div>

        <div className="bg-white border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 shadow-2xs">
          <div className="text-[11px] font-mono font-bold uppercase text-indigo-900 flex items-center justify-between">
            <span>Active Pending Balance</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-900 mt-1">₹{totalPendingBalanceValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="text-[11px] text-indigo-700 font-mono">
            Remaining unbilled order value
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="panel">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
          <div className="relative w-full sm:w-80 flex items-center">
            <input
              type="text"
              placeholder="Search order #, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              className="w-full mb-0 text-xs py-2 border border-slate-300 rounded-lg"
              id="search-orders"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="mb-0 text-xs font-mono text-slate-500 whitespace-nowrap">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mb-0 w-auto text-xs font-medium"
              id="filter-order-status"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending (0% Billed)</option>
              <option value="partially_billed">Partially Billed</option>
              <option value="completed">Completed / Fully Billed</option>
              <option value="in_production">In Production</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table with Dual Value Display (Initial Value & Current Active Balance) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-xs uppercase font-mono font-bold">
                <th>Order No</th>
                <th>Date / Due</th>
                <th>Customer</th>
                <th>Variety & Ordered</th>
                <th className="text-right">Original Order</th>
                <th className="text-right">Dispatched / Billed</th>
                <th className="text-right">Active Remaining Balance</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-note text-center py-8 text-slate-500 font-mono">
                    No production orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(({ order, summary }) => {
                  const isFullyBilled = summary.percentBilled >= 100 || order.status === 'completed';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 border-b border-slate-200">
                      <td className="font-mono font-bold text-slate-900">
                        <div>{order.orderNo}</div>
                        {summary.linkedBills.length > 0 && (
                          <button
                            onClick={() => setHistoryOrder(order)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded mt-1 cursor-pointer transition-colors"
                            title="View Linked Bills"
                          >
                            <History className="w-3 h-3" />
                            <span>{summary.linkedBills.length} Bill{summary.linkedBills.length > 1 ? 's' : ''} Linked</span>
                          </button>
                        )}
                      </td>

                      <td className="font-mono text-slate-600">
                        <div>{order.orderDate}</div>
                        <div className="text-[10px] text-amber-800 font-semibold">Due: {order.deliveryDueDate}</div>
                      </td>

                      <td className="font-bold text-slate-900">{order.customerName}</td>

                      <td>
                        <div className="space-y-0.5 max-w-xs">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="truncate text-slate-700">
                              • <strong>{it.varietyName}</strong> ({it.targetQty} {it.unit})
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Original Commitment */}
                      <td className="text-right font-mono">
                        <div className="font-bold text-slate-900">
                          ₹{summary.originalTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {summary.totalOrderedQty} {order.items[0]?.unit || 'pcs'} total
                        </div>
                      </td>

                      {/* Billed so far */}
                      <td className="text-right font-mono">
                        <div className={summary.totalBilledQty > 0 ? 'font-bold text-sky-700' : 'text-slate-400'}>
                          ₹{summary.billedValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {summary.totalBilledQty} pcs ({summary.percentBilled}%)
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${summary.percentBilled >= 100 ? 'bg-emerald-600' : 'bg-sky-500'}`}
                            style={{ width: `${summary.percentBilled}%` }}
                          />
                        </div>
                      </td>

                      {/* Current Active Remaining Balance */}
                      <td className="text-right font-mono">
                        {summary.totalPendingQty > 0 ? (
                          <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded inline-block text-right">
                            <div className="font-black text-amber-900 text-xs">
                              ₹{summary.pendingBalanceValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-bold text-amber-800">
                              {summary.totalPendingQty} pcs pending
                            </div>
                          </div>
                        ) : (
                          <div className="text-emerald-700 font-bold flex items-center justify-end gap-1 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>0 Pending</span>
                          </div>
                        )}
                      </td>

                      <td>{getStatusBadge(order, summary)}</td>

                      <td>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {/* Bill / Partial Bill Action */}
                          {onConvertToBill && (
                            <button
                              type="button"
                              onClick={() => handleOpenPartialBillModal(order)}
                              disabled={isFullyBilled}
                              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 text-xs shadow-2xs ${
                                isFullyBilled
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                  : summary.totalBilledQty > 0
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700'
                              }`}
                              title={
                                isFullyBilled
                                  ? 'Order is fully billed'
                                  : summary.totalBilledQty > 0
                                  ? 'Bill Remaining or next lot'
                                  : 'Generate Sales Bill / Partial Lot'
                              }
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{summary.totalBilledQty > 0 ? 'Bill Balance' : 'Bill'}</span>
                            </button>
                          )}

                          {/* Billing History button */}
                          <button
                            type="button"
                            onClick={() => setHistoryOrder(order)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded border border-slate-300 transition-colors cursor-pointer"
                            title="View Invoice History & Audit Trail"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* View Order Specs button */}
                          <button
                            type="button"
                            onClick={() => setViewingOrder(order)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors cursor-pointer"
                            title="View Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Order button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(order)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200 transition-colors cursor-pointer"
                            title="Edit Order"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Order button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors cursor-pointer"
                            title="Delete Production Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* 1. PARTIAL BILLING MODAL (Select Lot Quantities to Bill Now)             */}
      {/* ========================================================================= */}
      {partialBillOrder && (() => {
        const summary = computeOrderBillingSummary(partialBillOrder, salesBills);
        const thisBillTotalEstimated = summary.itemBreakdown.reduce((sum, item, idx) => {
          const qtyToBill = Number(partialBillingQuantities[idx]) || 0;
          return sum + (qtyToBill * item.unitRate);
        }, 0);

        const totalQtyToBillNow = Object.values(partialBillingQuantities).reduce((a, b) => a + (Number(b) || 0), 0);

        return (
          <div className="modal-backdrop">
            <section className="modal max-w-3xl" role="dialog" aria-modal="true">
              <div className="modal-head bg-indigo-900 text-white p-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-300" />
                  <div>
                    <h2 className="text-white text-base font-bold m-0">
                      Partial Billing &amp; Lot Dispatch — {partialBillOrder.orderNo}
                    </h2>
                    <p className="text-xs text-indigo-200 m-0 font-mono">
                      Customer: <strong>{partialBillOrder.customerName}</strong> • Date: {partialBillOrder.orderDate}
                    </p>
                  </div>
                </div>
                <button className="close-btn text-white" aria-label="Close" onClick={() => setPartialBillOrder(null)}>×</button>
              </div>

              <div className="p-4 sm:p-6 space-y-5 text-xs">
                {/* Info Alert Box */}
                <div className="bg-indigo-50/80 border border-indigo-200 p-3 rounded-lg text-indigo-950 flex items-start gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block">Partial Dispatch Workflow:</strong>
                    <span>
                      Enter the quantities being dispatched in this lot. The original order value will be preserved in history, and the remaining pending balance will update automatically.
                    </span>
                  </div>
                </div>

                {/* Items Lot Selection Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-800 uppercase font-mono font-bold text-[11px]">
                      <tr>
                        <th className="p-2.5">Item &amp; Variety</th>
                        <th className="p-2.5 text-center">Ordered</th>
                        <th className="p-2.5 text-center">Billed So Far</th>
                        <th className="p-2.5 text-center bg-amber-50 text-amber-900">Pending Bal.</th>
                        <th className="p-2.5 text-right">Rate (₹)</th>
                        <th className="p-2.5 text-center w-32 bg-indigo-50 text-indigo-900">Qty to Bill Now</th>
                        <th className="p-2.5 text-right">Lot Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {summary.itemBreakdown.map((item, idx) => {
                        const curQty = partialBillingQuantities[idx] ?? item.pendingQty;
                        const itemLotVal = (Number(curQty) || 0) * item.unitRate;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 block">{item.varietyName}</span>
                              <span className="text-slate-500 text-[11px]">{item.dimensions || 'Std Size'}</span>
                            </td>

                            <td className="p-2.5 text-center font-mono font-semibold text-slate-700">
                              {item.orderedQty} {item.unit}
                            </td>

                            <td className="p-2.5 text-center font-mono text-slate-600">
                              {item.billedQty} {item.unit}
                            </td>

                            <td className="p-2.5 text-center font-mono font-bold bg-amber-50/60 text-amber-900">
                              {item.pendingQty} {item.unit}
                            </td>

                            <td className="p-2.5 text-right font-mono text-slate-700">
                              ₹{item.unitRate.toFixed(2)}
                            </td>

                            <td className="p-2.5 bg-indigo-50/40">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.orderedQty}
                                  value={curQty === 0 ? '0' : (curQty || '')}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    setPartialBillingQuantities({
                                      ...partialBillingQuantities,
                                      [idx]: isNaN(val) ? 0 : Math.max(0, val)
                                    });
                                  }}
                                  className="w-full text-center font-mono font-bold text-indigo-900 border border-indigo-300 rounded p-1.5 bg-white text-xs"
                                />
                              </div>
                              {curQty > item.pendingQty && (
                                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                                  Exceeds pending ({item.pendingQty})
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-indigo-950">
                              ₹{itemLotVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary Footer Box */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                  <div>
                    <span className="text-slate-500 text-[11px] block uppercase">Initial Order Value:</span>
                    <strong className="text-slate-800 text-sm">
                      ₹{summary.originalTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div className="text-[10px] text-slate-500 mt-0.5">{summary.totalOrderedQty} pcs original commitment</div>
                  </div>

                  <div>
                    <span className="text-indigo-600 text-[11px] block uppercase font-bold">This Invoice Lot Total:</span>
                    <strong className="text-indigo-900 text-base font-black">
                      ₹{thisBillTotalEstimated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div className="text-[10px] text-indigo-700 mt-0.5">{totalQtyToBillNow} pcs being billed in this lot</div>
                  </div>

                  <div>
                    <span className="text-amber-800 text-[11px] block uppercase font-bold">Estimated Remaining Balance:</span>
                    <strong className="text-amber-900 text-sm">
                      ₹{Math.max(0, summary.pendingBalanceValue - thisBillTotalEstimated).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <div className="text-[10px] text-amber-800 mt-0.5">
                      {Math.max(0, summary.totalPendingQty - totalQtyToBillNow)} pcs remaining after this lot
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      // Fast button to fill 100% remaining
                      const map: Record<number, number> = {};
                      summary.itemBreakdown.forEach((it, i) => { map[i] = it.pendingQty; });
                      setPartialBillingQuantities(map);
                    }}
                    className="text-xs text-indigo-700 hover:underline font-bold cursor-pointer"
                  >
                    ⚡ Fill Remaining Unbilled Quantities
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setPartialBillOrder(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmPartialBill}
                      disabled={totalQtyToBillNow <= 0}
                      className={`px-5 py-2 rounded-lg font-bold text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        totalQtyToBillNow <= 0
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Proceed to Create Sales Bill ({totalQtyToBillNow} Pcs)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 2. BILLING HISTORY & AUDIT TRAIL MODAL                                    */}
      {/* ========================================================================= */}
      {historyOrder && (() => {
        const summary = computeOrderBillingSummary(historyOrder, salesBills);
        return (
          <div className="modal-backdrop">
            <section className="modal max-w-3xl" role="dialog" aria-modal="true">
              <div className="modal-head bg-slate-900 text-white p-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h2 className="text-white text-base font-bold m-0">
                      Invoice History &amp; Audit Trail — {historyOrder.orderNo}
                    </h2>
                    <p className="text-xs text-slate-300 m-0 font-mono">
                      Customer: <strong>{historyOrder.customerName}</strong> • Date: {historyOrder.orderDate}
                    </p>
                  </div>
                </div>
                <button className="close-btn text-white" aria-label="Close" onClick={() => setHistoryOrder(null)}>×</button>
              </div>

              <div className="p-4 sm:p-6 space-y-5 text-xs">
                {/* 3-Card Summary Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 uppercase text-[10px] font-bold block">1. Original Order Commitment</span>
                    <strong className="text-slate-900 text-base font-black">
                      ₹{summary.originalTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                    <div className="text-slate-600 text-[11px] mt-0.5">{summary.totalOrderedQty} Pcs ordered</div>
                  </div>

                  <div className="bg-sky-50 p-3 rounded-lg border border-sky-200">
                    <span className="text-sky-800 uppercase text-[10px] font-bold block">2. Invoiced / Dispatched</span>
                    <strong className="text-sky-900 text-base font-black">
                      ₹{summary.billedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                    <div className="text-sky-800 text-[11px] mt-0.5">
                      {summary.totalBilledQty} Pcs billed ({summary.percentBilled}%)
                    </div>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <span className="text-amber-800 uppercase text-[10px] font-bold block">3. Current Active Pending Balance</span>
                    <strong className="text-amber-950 text-base font-black">
                      ₹{summary.pendingBalanceValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                    <div className="text-amber-800 text-[11px] mt-0.5">{summary.totalPendingQty} Pcs remaining</div>
                  </div>
                </div>

                {/* Linked Invoices Table */}
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-slate-800 mb-2 flex items-center justify-between">
                    <span>Generated Sales Bills ({summary.linkedBills.length})</span>
                    {summary.totalPendingQty > 0 && onConvertToBill && (
                      <button
                        onClick={() => {
                          const ord = historyOrder;
                          setHistoryOrder(null);
                          handleOpenPartialBillModal(ord);
                        }}
                        className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded font-bold hover:bg-indigo-100 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Bill Next Lot</span>
                      </button>
                    )}
                  </h3>

                  {summary.linkedBills.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 font-mono">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                      <div>No invoices generated yet for this order note.</div>
                      {onConvertToBill && (
                        <button
                          onClick={() => {
                            const ord = historyOrder;
                            setHistoryOrder(null);
                            handleOpenPartialBillModal(ord);
                          }}
                          className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs inline-flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Generate First Partial Bill</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-800 text-[11px] uppercase font-mono font-bold">
                          <tr>
                            <th className="p-2.5">Invoice No</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Billing Company</th>
                            <th className="p-2.5">Items &amp; Quantities In Lot</th>
                            <th className="p-2.5 text-right">Taxable</th>
                            <th className="p-2.5 text-right">Grand Total (₹)</th>
                            <th className="p-2.5 text-center">Status</th>
                            <th className="p-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {summary.linkedBills.map((b, bIdx) => (
                            <tr key={bIdx} className="hover:bg-slate-50 font-sans">
                              <td className="p-2.5 font-mono font-bold text-indigo-950">
                                {b.billNo}
                              </td>

                              <td className="p-2.5 font-mono text-slate-700">
                                {b.date}
                              </td>

                              <td className="p-2.5">
                                <span className="font-semibold text-slate-800">
                                  {b.companyName || 'Main Company'}
                                </span>
                              </td>

                              <td className="p-2.5">
                                <div className="space-y-0.5">
                                  {b.items.map((it, idx) => (
                                    <div key={idx} className="text-slate-700 font-mono text-[11px]">
                                      • {it.name}: <strong>{it.qty} {it.unit || 'pcs'}</strong> @ ₹{it.rate}
                                    </div>
                                  ))}
                                </div>
                              </td>

                              <td className="p-2.5 text-right font-mono text-slate-700">
                                ₹{b.subtotal.toFixed(2)}
                              </td>

                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                ₹{b.grand.toFixed(2)}
                              </td>

                              <td className="p-2.5 text-center">
                                <span className={`pill ${b.status}`}>{b.status}</span>
                              </td>

                              <td className="p-2.5 text-center">
                                {openInvoice && (
                                  <button
                                    onClick={() => openInvoice(b.billNo, 'sale')}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-200 transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-[11px]"
                                    title="View / Print Tax Invoice"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setHistoryOrder(null)}
                    className="btn primary"
                  >
                    Close History
                  </button>
                </div>
              </div>
            </section>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3. NEW/EDIT ORDER MODAL                                                   */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="modal-backdrop">
          <section className="modal max-w-3xl" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h2 className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
                <span>{editingOrder ? 'Edit Production Order' : 'Create New Production Order'}</span>
              </h2>
              <button className="close-btn" aria-label="Close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateOrUpdateOrder} className="space-y-4">
              <div className="row2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Customer Name *</label>
                  <select
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs bg-white outline-none"
                    required
                  >
                    <option value="">-- Select Customer --</option>
                    {customerNames.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Due Date *</label>
                  <input
                    type="date"
                    value={deliveryDueDate}
                    onChange={(e) => setDeliveryDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Order Items Section */}
              <div className="border border-slate-200 p-4 bg-slate-50/50 rounded-sm">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-mono text-xs font-bold uppercase text-slate-700">Order Items &amp; Towel Variety</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="add-item text-xs mb-0 py-1 px-3 cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-3 bg-white border border-slate-200 mb-2 items-end">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] block font-medium text-slate-700">Towel Variety *</label>
                      <select
                        value={item.varietyName}
                        onChange={(e) => handleItemChange(index, 'varietyName', e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white outline-none mb-0"
                        required
                      >
                        <option value="">-- Select Variety --</option>
                        {varietyNames.map((v, i) => (
                          <option key={i} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] block font-medium text-slate-700">Size / Dimensions</label>
                      <input
                        type="text"
                        value={item.dimensions || ''}
                        onChange={(e) => handleItemChange(index, 'dimensions', e.target.value)}
                        className="mb-0 text-xs w-full p-1.5 border border-slate-300 rounded"
                        placeholder="55 x 28 inches"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] block font-medium text-slate-700">Target Qty (Pcs)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.targetQty || ''}
                        onChange={(e) => handleItemChange(index, 'targetQty', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                        className="mb-0 text-xs w-full p-1.5 border border-slate-300 rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] block font-medium text-slate-700">Rate / Pc (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitRate || ''}
                        onChange={(e) => handleItemChange(index, 'unitRate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className="mb-0 text-xs w-full p-1.5 border border-slate-300 rounded"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        ₹{(item.targetQty * item.unitRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="rm-btn text-rose-600 font-bold ml-2 cursor-pointer"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="text-right font-mono text-xs font-bold text-slate-800 mt-2">
                  Total Initial Order Value: ₹{items.reduce((s, i) => s + (i.targetQty * i.unitRate), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Production Notes &amp; Special Instructions</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Logo embroidery required on border, 500GSM strict tolerance, pack in 10-piece poly bundles..."
                  className="w-full p-2 text-xs border border-slate-300 rounded outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 bg-white sticky bottom-0 z-20">
                <button type="submit" className="btn primary full font-bold">
                  Save Production Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn text-slate-600 border-slate-300 font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW ORDER DETAILS MODAL                                              */}
      {/* ========================================================================= */}
      {viewingOrder && (() => {
        const summary = computeOrderBillingSummary(viewingOrder, salesBills);
        return (
          <div className="modal-backdrop">
            <section className="modal max-w-2xl" role="dialog" aria-modal="true">
              <div className="modal-head">
                <h2>Order Sheet: {viewingOrder.orderNo}</h2>
                <button className="close-btn" aria-label="Close" onClick={() => setViewingOrder(null)}>×</button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-100 rounded">
                  <div>
                    <span className="text-slate-500 font-mono block uppercase text-[10px]">Customer</span>
                    <span className="font-bold text-slate-900">{viewingOrder.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono block uppercase text-[10px]">Status</span>
                    <span>{getStatusBadge(viewingOrder, summary)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono block uppercase text-[10px]">Order Date</span>
                    <span className="font-mono text-slate-800">{viewingOrder.orderDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono block uppercase text-[10px]">Delivery Due</span>
                    <span className="font-mono text-amber-800 font-bold">{viewingOrder.deliveryDueDate}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-slate-700 mb-2">Item Breakdown &amp; Balance Status</h3>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] font-mono uppercase">
                        <th>Variety</th>
                        <th className="num">Ordered</th>
                        <th className="num">Billed</th>
                        <th className="num bg-amber-50 text-amber-900">Pending Bal.</th>
                        <th className="num">Rate / Pc</th>
                        <th className="num">Pending Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.itemBreakdown.map((it, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="font-bold text-slate-900">{it.varietyName}</td>
                          <td className="num font-mono">{it.orderedQty} {it.unit}</td>
                          <td className="num font-mono text-sky-700">{it.billedQty} {it.unit}</td>
                          <td className="num font-mono font-bold bg-amber-50/50 text-amber-900">{it.pendingQty} {it.unit}</td>
                          <td className="num font-mono">₹{it.unitRate}</td>
                          <td className="num font-mono font-bold text-indigo-950">₹{it.pendingValue.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Progress bar */}
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>Dispatch Progress: <strong>{summary.totalBilledQty} / {summary.totalOrderedQty} Pcs</strong></span>
                    <strong className="text-indigo-700">{summary.percentBilled}% Dispatched</strong>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: `${summary.percentBilled}%` }} />
                  </div>
                </div>

                {viewingOrder.notes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <span className="font-bold text-amber-900 block font-mono text-[10px] uppercase">Special Instructions / Notes:</span>
                    <p className="text-amber-800 mt-1">{viewingOrder.notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    {onConvertToBill && summary.totalPendingQty > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const ord = viewingOrder;
                          setViewingOrder(null);
                          handleOpenPartialBillModal(ord);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Bill / Dispatch Next Lot</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    )}

                    {summary.linkedBills.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const ord = viewingOrder;
                          setViewingOrder(null);
                          setHistoryOrder(ord);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded flex items-center gap-1 text-xs border border-slate-300 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>View {summary.linkedBills.length} Linked Bills</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingOrder(null)}
                    className="btn primary ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </section>
          </div>
        );
      })()}
    </div>
  );
};
