import React, { useState } from 'react';
import { ProductionOrder, OrderItem } from '../types';
import { Plus, Search, Eye, Calendar, User, ShoppingBag, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface OrdersTabProps {
  orders: ProductionOrder[];
  onSaveOrder: (order: ProductionOrder) => void;
  onUpdateStatus: (orderId: string, status: ProductionOrder['status']) => void;
  customerNames: string[];
  varietyNames: string[];
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  onSaveOrder,
  onUpdateStatus,
  customerNames,
  varietyNames
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);

  // New Order Form state
  const [customerName, setCustomerName] = useState('');
  const [deliveryDueDate, setDeliveryDueDate] = useState('');
  const [orderNotes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { varietyName: varietyNames[0] || 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '140 x 70 cm', targetQty: 500, unit: 'pcs', unitRate: 250, notes: '' }
  ]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddItem = () => {
    setItems([
      ...items,
      { varietyName: varietyNames[0] || 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '140 x 70 cm', targetQty: 500, unit: 'pcs', unitRate: 250, notes: '' }
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

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      alert('Please enter or select a customer name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one order item');
      return;
    }

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
    setShowAddModal(false);
    // reset form
    setCustomerName('');
    setNotes('');
    setItems([{ varietyName: varietyNames[0] || 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '140 x 70 cm', targetQty: 500, unit: 'pcs', unitRate: 250, notes: '' }]);
  };

  const calculateOrderTotal = (order: ProductionOrder) => {
    return order.items.reduce((sum, item) => sum + (item.targetQty * item.unitRate), 0);
  };

  const getStatusBadge = (status: ProductionOrder['status']) => {
    switch (status) {
      case 'completed':
        return <span className="pill paid"><CheckCircle className="w-3 h-3 inline mr-1" />Completed</span>;
      case 'in_production':
        return <span className="pill purchase"><Clock className="w-3 h-3 inline mr-1" />In Production</span>;
      case 'pending':
        return <span className="pill due"><AlertCircle className="w-3 h-3 inline mr-1" />Pending</span>;
      case 'cancelled':
        return <span className="pill unpaid">Cancelled</span>;
      default:
        return <span className="pill">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-serif font-bold text-slate-800 m-0">Production Orders</h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Track customer towel orders, delivery deadlines, variety specifications & order status.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn primary flex items-center justify-center gap-2"
          id="btn-new-order"
        >
          <Plus className="w-4 h-4" />
          <span>New Order</span>
        </button>
      </div>

      {/* Orders Summary Cards */}
      <div className="dash-grid">
        <div className="stat">
          <div className="lbl">Total Orders</div>
          <div className="val">{orders.length}</div>
        </div>
        <div className="stat">
          <div className="lbl">In Production</div>
          <div className="val text-indigo-700">{orders.filter(o => o.status === 'in_production').length}</div>
        </div>
        <div className="stat">
          <div className="lbl">Pending Delivery</div>
          <div className="val text-amber-700">{orders.filter(o => o.status === 'pending').length}</div>
        </div>
        <div className="stat">
          <div className="lbl">Completed Orders</div>
          <div className="val text-emerald-700">{orders.filter(o => o.status === 'completed').length}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="panel">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
          <div className="relative w-full sm:w-80 flex items-center">
            <input
              type="text"
              placeholder="Search by order # or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              className="w-full mb-0 text-xs py-2 border border-slate-300 rounded-lg"
              id="search-orders"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="mb-0 text-xs font-mono text-slate-500">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mb-0 w-auto"
              id="filter-order-status"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_production">In Production</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Order No</th>
                <th>Order Date</th>
                <th>Customer</th>
                <th>Variety & Items</th>
                <th className="num">Target Qty</th>
                <th className="num">Est. Value (₹)</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-note text-center py-8">
                    No production orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const totalQty = order.items.reduce((s, i) => s + i.targetQty, 0);
                  const totalValue = calculateOrderTotal(order);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="font-mono font-semibold text-slate-900">{order.orderNo}</td>
                      <td>{order.orderDate}</td>
                      <td className="font-medium">{order.customerName}</td>
                      <td>
                        <div className="text-xs">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="truncate max-w-xs">
                              • <strong>{it.varietyName}</strong> ({it.dimensions || 'Std Size'}) - {it.targetQty} {it.unit}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="num font-mono">{totalQty} pcs</td>
                      <td className="num font-mono">₹{totalValue.toLocaleString('en-IN')}</td>
                      <td className="font-mono">{order.deliveryDueDate}</td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="link-btn flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5 inline" /> View
                          </button>
                          
                          <select
                            value={order.status}
                            onChange={(e) => onUpdateStatus(order.id, e.target.value as any)}
                            className="text-xs p-1 mb-0 border border-slate-300 rounded bg-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_production">In Production</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
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

      {/* NEW ORDER MODAL */}
      {showAddModal && (
        <div className="modal-backdrop">
          <section className="modal max-w-3xl" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h2 className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
                <span>Create New Production Order</span>
              </h2>
              <button className="close-btn" aria-label="Close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="row2">
                <div>
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    list="customerNameList"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Type or select customer"
                    required
                  />
                  <datalist id="customerNameList">
                    {customerNames.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label>Delivery Due Date *</label>
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
                  <h3 className="font-mono text-xs font-bold uppercase text-slate-700">Order Items & Towel Variety</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="add-item text-xs mb-0 py-1 px-3"
                  >
                    + Add Item
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-3 bg-white border border-slate-200 mb-2 items-end">
                    <div className="sm:col-span-2">
                      <label className="text-[10px]">Towel Variety</label>
                      <input
                        type="text"
                        list="varietyCatalogList"
                        value={item.varietyName}
                        onChange={(e) => handleItemChange(index, 'varietyName', e.target.value)}
                        className="mb-0 text-xs"
                        placeholder="e.g. Royal Bath Towel 500GSM"
                        required
                      />
                      <datalist id="varietyCatalogList">
                        {varietyNames.map((v, i) => (
                          <option key={i} value={v} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[10px]">Size / Dimensions</label>
                      <input
                        type="text"
                        value={item.dimensions || ''}
                        onChange={(e) => handleItemChange(index, 'dimensions', e.target.value)}
                        className="mb-0 text-xs"
                        placeholder="140 x 70 cm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px]">Target Qty</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.targetQty || ''}
                        onChange={(e) => handleItemChange(index, 'targetQty', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className="mb-0 text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px]">Rate / Pc (₹)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.unitRate || ''}
                        onChange={(e) => handleItemChange(index, 'unitRate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className="mb-0 text-xs"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        ₹{(item.targetQty * item.unitRate).toLocaleString('en-IN')}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="rm-btn text-rose-600 font-bold ml-2"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="text-right font-mono text-xs font-bold text-slate-800 mt-2">
                  Total Order Value: ₹{items.reduce((s, i) => s + (i.targetQty * i.unitRate), 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label>Production Notes & Instructions</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Logo embroidery required on border, 500GSM strict tolerance, pack in 10-piece poly bundles..."
                  className="w-full p-2 text-xs border border-slate-300 rounded outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn primary full">
                  Save Production Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn text-slate-600 border-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {viewingOrder && (
        <div className="modal-backdrop">
          <section className="modal max-w-2xl" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h2>Order Details: {viewingOrder.orderNo}</h2>
              <button className="close-btn" aria-label="Close" onClick={() => setViewingOrder(null)}>×</button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-100 rounded">
                <div>
                  <span className="text-slate-500 font-mono block uppercase">Customer</span>
                  <span className="font-bold text-sm text-slate-800">{viewingOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono block uppercase">Status</span>
                  <span>{getStatusBadge(viewingOrder.status)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono block uppercase">Order Date</span>
                  <span className="font-mono">{viewingOrder.orderDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono block uppercase">Delivery Due Date</span>
                  <span className="font-mono text-amber-800 font-semibold">{viewingOrder.deliveryDueDate}</span>
                </div>
              </div>

              <div>
                <h3 className="font-mono text-xs font-bold uppercase text-slate-700 mb-2">Order Line Items</h3>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Variety</th>
                      <th>Dimensions</th>
                      <th className="num">Target Qty</th>
                      <th className="num">Rate / Pc</th>
                      <th className="num">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="font-medium">{it.varietyName}</td>
                        <td>{it.dimensions || 'Standard'}</td>
                        <td className="num font-mono">{it.targetQty} {it.unit}</td>
                        <td className="num font-mono">₹{it.unitRate}</td>
                        <td className="num font-mono font-semibold">₹{(it.targetQty * it.unitRate).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingOrder.notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                  <span className="font-bold text-amber-900 block font-mono text-[10px] uppercase">Special Instructions / Notes:</span>
                  <p className="text-amber-800 mt-1">{viewingOrder.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingOrder(null)}
                  className="btn primary"
                >
                  Close
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
