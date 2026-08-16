export interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  gstin: string;
  phone: string;
  state: string;
  role: 'admin' | 'stock_salary';
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  logo: string;
}

export interface SubsidiaryCompany {
  id: string;
  name: string;
  prefix: string;
  address: string;
  gstin: string;
  phone: string;
  state: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  isDefault?: boolean;
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  place: string;
  address?: string;
  pincode?: string;
  state: string;
  gstin: string;
}

export interface Supplier {
  id?: string;
  name: string;
  phone: string;
  place: string;
  address?: string;
  pincode?: string;
  state: string;
  gstin: string;
}

export interface InventoryItem {
  id?: string;
  name: string;
  type: 'raw' | 'finished';
  unit: string;
  qty: number;
  reorderLevel: number;
}

export interface BillItem {
  name: string;
  hsn: string;
  qty: number;
  unit?: string;
  rate: number;
  taxRate: number;
  discPct: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  amt: number;
}

export interface SalesBill {
  id?: string;
  billNo: string;
  orderNo?: string;
  date: string;
  billType?: 'tax_invoice' | 'sales_bill_2';
  articleNo?: string;
  companyId?: string;
  companyName?: string;
  companyPrefix?: string;
  companyGstin?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyState?: string;
  companyBankName?: string;
  companyBankAccount?: string;
  companyBankIfsc?: string;
  customerName: string;
  customerState: string;
  customerAddress?: string;
  customerGstin?: string;
  customerPhone?: string;
  customerPincode?: string;
  dispatchThrough?: string;
  copyType?: 'original' | 'transport' | 'supplier';
  items: BillItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grand: number;
  status: 'paid' | 'unpaid';
  createdAt?: string;
}

export interface PurchaseBill {
  id?: string;
  poNo: string;
  supplierInvNo: string;
  date: string;
  supplierName: string;
  supplierState: string;
  items: BillItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grand: number;
  status: 'paid' | 'unpaid';
  createdAt?: string;
}

export interface CustomerPayment {
  id: string;
  customerName: string;
  date: string;
  amount: number;
  note: string;
  createdAt?: string;
}

export interface OrderItem {
  varietyName: string;
  gsm?: number;
  dimensions?: string; // e.g. 30x60 inches
  targetQty: number;
  unit: string;
  unitRate: number;
  notes?: string;
}

export interface ProductionOrder {
  id: string;
  orderNo: string;
  customerName: string;
  orderDate: string;
  deliveryDueDate: string;
  items: OrderItem[];
  status: 'pending' | 'partially_billed' | 'in_production' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
}

export interface VarietyAssignedMachine {
  machineNo: string;
  operatorId?: string;
  operatorName?: string;
  allocatedQty: number;
  completedQty: number;
  status: 'assigned' | 'running' | 'paused' | 'completed';
}

export interface VarietyCatalog {
  id: string;
  varietyName: string;
  category: string; // e.g., Bath Towel, Hand Towel, Face Towel, Jacquard, Terry
  standardWeightGsm: number;
  targetLengthCm: number;
  targetWidthCm: number;
  allowedSizingTolerancePct: number; // e.g. 2%
  allowedGsmTolerancePct: number; // e.g. 3%
  warpYarnSpec: string;
  weftYarnSpec: string;
  pileYarnSpec: string;
  createdDate: string;
  assignedMachines: VarietyAssignedMachine[];
  activeStatus: boolean;
}

export interface QualityCheckAudit {
  id: string;
  checkDate: string;
  checkTime: string;
  machineNo: string;
  varietyName: string;
  operatorName: string;
  sampleNo: number;
  actualLengthCm: number;
  actualWidthCm: number;
  actualWeightGsm: number;
  borderQualityScore: number; // 1-5
  selvedgeCondition: 'pass' | 'defect';
  sizingStatus: 'pass' | 'under_sized' | 'over_sized';
  gsmStatus: 'pass' | 'low_gsm' | 'high_gsm';
  overallResult: 'PASS' | 'WARNING' | 'FAIL';
  varianceNotes: string;
  actionTaken: string;
  auditorName: string;
  createdAt?: string;
}

export interface RoutineTaskReminder {
  id: string;
  taskTitle: string;
  machineNo?: string;
  category: 'sizing_check' | 'machine_calibration' | 'lubrication' | 'loom_setting' | 'quality_audit' | 'general';
  frequencyDays: number; // 1 = daily, 7 = weekly, 30 = monthly, 90 = quarterly
  lastCheckedDate: string;
  nextDueDate: string;
  assignedRoleOrPerson: string;
  status: 'pending' | 'due_today' | 'overdue' | 'completed';
  checklistItems: { id: string; label: string; checked: boolean }[];
  notes?: string;
}

export interface LoomRateSetting {
  loomNo: string;
  varietyName: string;
  rate: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  machine?: string;
  salary: number;
  phone?: string;
  loomCount?: number;
  loomRates?: LoomRateSetting[];
}

export interface ProductionLog {
  id: string;
  date: string;
  machine: string;
  employeeName: string;
  item: string;
  qty: number;
  unit: string;
  notes: string;
  waste?: number;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName?: string;
  amount: number;
  date: string;
  notes?: string;
}
