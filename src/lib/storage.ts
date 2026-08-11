import { 
  CompanySettings, 
  SubsidiaryCompany, 
  Customer, 
  Supplier, 
  InventoryItem, 
  SalesBill, 
  PurchaseBill, 
  CustomerPayment, 
  ProductionOrder, 
  VarietyCatalog, 
  QualityCheckAudit, 
  RoutineTaskReminder, 
  Employee, 
  ProductionLog, 
  SalaryAdvance 
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { VCA_LOGO_DATA_URL } from '../assets/vcaLogoData';

const STORE_PREFIX = 'vcaPreview:';
const GLOBAL_STORE_PREFIX = STORE_PREFIX + 'global:';

let activeCompanyId = 'vca-fabrics';

export function getActiveCompanyId(): string {
  try {
    return localStorage.getItem(GLOBAL_STORE_PREFIX + 'activeCompanyId') || 'vca-fabrics';
  } catch {
    return 'vca-fabrics';
  }
}

export function setActiveCompanyId(id: string) {
  activeCompanyId = id;
  try {
    localStorage.setItem(GLOBAL_STORE_PREFIX + 'activeCompanyId', id);
  } catch {}
}

function scopedKey(key: string): string {
  return STORE_PREFIX + getActiveCompanyId() + ':' + key;
}

export async function storeGet<T>(key: string, fallback: T): Promise<T> {
  let localVal = fallback;
  try {
    const value = localStorage.getItem(scopedKey(key));
    if (value) localVal = JSON.parse(value);
  } catch (e) {}

  if (isSupabaseConfigured && supabase) {
    try {
      const companyId = getActiveCompanyId();
      const { data, error } = await supabase
        .from('app_state')
        .select('payload')
        .eq('company_id', companyId)
        .eq('store_key', key)
        .maybeSingle();

      if (!error && data && data.payload !== null && data.payload !== undefined) {
        try {
          localStorage.setItem(scopedKey(key), JSON.stringify(data.payload));
        } catch {}
        return data.payload as T;
      }
    } catch (e) {}
  }

  return localVal;
}

export async function storeSet<T>(key: string, val: T): Promise<void> {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(val));
  } catch (e) {}

  if (isSupabaseConfigured && supabase) {
    try {
      const companyId = getActiveCompanyId();
      await supabase.from('app_state').upsert(
        {
          company_id: companyId,
          store_key: key,
          payload: val,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'company_id,store_key' }
      );
    } catch (e) {}
  }
}

export async function globalGet<T>(key: string, fallback: T): Promise<T> {
  let localVal = fallback;
  try {
    const value = localStorage.getItem(GLOBAL_STORE_PREFIX + key);
    if (value) localVal = JSON.parse(value);
  } catch (e) {}

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('payload')
        .eq('company_id', 'global')
        .eq('store_key', key)
        .maybeSingle();

      if (!error && data && data.payload !== null && data.payload !== undefined) {
        try {
          localStorage.setItem(GLOBAL_STORE_PREFIX + key, JSON.stringify(data.payload));
        } catch {}
        return data.payload as T;
      }
    } catch (e) {}
  }

  return localVal;
}

export async function globalSet<T>(key: string, val: T): Promise<void> {
  try {
    localStorage.setItem(GLOBAL_STORE_PREFIX + key, JSON.stringify(val));
  } catch (e) {}

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('app_state').upsert(
        {
          company_id: 'global',
          store_key: key,
          payload: val,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'company_id,store_key' }
      );
    } catch (e) {}
  }
}

// DEFAULT INITIAL SEED DATA FOR NEW INSTALLATIONS

export const DEFAULT_LOGO_DATA_URL = VCA_LOGO_DATA_URL;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'VCA Fabrics',
  tagline: 'Premium Towels & Handloom Cloth Manufacturer',
  address: '124 Weavers Colony, Erode, Tamil Nadu 638001',
  gstin: '33AABCV1234F1Z5',
  phone: '+91 98765 43210',
  state: 'Tamil Nadu',
  role: 'admin',
  bankName: 'State Bank of India',
  bankAccount: '30491823901',
  bankIfsc: 'SBIN0001234',
  logo: DEFAULT_LOGO_DATA_URL
};

export const DEFAULT_SUBSIDIARY_COMPANIES: SubsidiaryCompany[] = [
  {
    id: 'comp-vca',
    name: 'VCA Fabrics',
    prefix: 'VC',
    address: '124 Weavers Colony, Erode, Tamil Nadu 638001',
    gstin: '33AABCV1234F1Z5',
    phone: '+91 98765 43210',
    state: 'Tamil Nadu',
    bankName: 'State Bank of India',
    bankAccount: '30491823901',
    bankIfsc: 'SBIN0001234',
    isDefault: true
  },
  {
    id: 'comp-jt',
    name: 'Jayachitra Textiles',
    prefix: 'JT',
    address: '45 Textile City Road, Karur, Tamil Nadu 639001',
    gstin: '33AJTEX5678G2Z1',
    phone: '+91 94432 10987',
    state: 'Tamil Nadu',
    bankName: 'Canara Bank',
    bankAccount: '50123984102',
    bankIfsc: 'CNRB0002134',
    isDefault: false
  },
  {
    id: 'comp-sl',
    name: 'Sri Lakshmi Fabrics',
    prefix: 'SL',
    address: '88 Loom Works Layout, Tirupur, Tamil Nadu 641602',
    gstin: '33ASLFB9012H3Z8',
    phone: '+91 98421 87654',
    state: 'Tamil Nadu',
    bankName: 'Indian Overseas Bank',
    bankAccount: '11092837465',
    bankIfsc: 'IOBA0001109',
    isDefault: false
  },
  {
    id: 'comp-kh',
    name: 'Karur Handlooms',
    prefix: 'KH',
    address: '12 Handloom Nagar, Karur, Tamil Nadu 639002',
    gstin: '33AKRHL3456K4Z9',
    phone: '+91 97890 12345',
    state: 'Tamil Nadu',
    bankName: 'Union Bank of India',
    bankAccount: '695601010050278',
    bankIfsc: 'UBIN0569569',
    isDefault: false
  },
  {
    id: 'comp-sc',
    name: 'Sona Cottons',
    prefix: 'SC',
    address: '30 Cotton Mill Avenue, Salem, Tamil Nadu 636001',
    gstin: '33ASNC07890L5Z3',
    phone: '+91 99441 55667',
    state: 'Tamil Nadu',
    bankName: 'HDFC Bank',
    bankAccount: '50100239481726',
    bankIfsc: 'HDFC0001234',
    isDefault: false
  }
];

export const DEFAULT_VARIETIES: VarietyCatalog[] = [
  {
    id: 'var_royal_500',
    varietyName: 'Royal Bath Towel 500GSM',
    category: 'Bath Towel',
    standardWeightGsm: 500,
    targetLengthCm: 140, // ~55 inches
    targetWidthCm: 70,  // ~27.5 inches
    allowedSizingTolerancePct: 1.5,
    allowedGsmTolerancePct: 2.0,
    warpYarnSpec: '2/20s Cotton Warp',
    weftYarnSpec: '16s Auto Weft',
    pileYarnSpec: '2/20s Combed Terry Pile',
    createdDate: '2026-05-10',
    activeStatus: true,
    assignedMachines: [
      { machineNo: 'Machine 1', operatorName: 'Ramesh Kumar', allocatedQty: 1000, completedQty: 420, status: 'running' },
      { machineNo: 'Machine 2', operatorName: 'Suresh V', allocatedQty: 1000, completedQty: 390, status: 'running' },
      { machineNo: 'Machine 3', operatorName: 'Murugan P', allocatedQty: 1000, completedQty: 410, status: 'running' }
    ]
  },
  {
    id: 'var_hotel_400',
    varietyName: 'Classic Hotel Hand Towel 400GSM',
    category: 'Hand Towel',
    standardWeightGsm: 400,
    targetLengthCm: 60,
    targetWidthCm: 40,
    allowedSizingTolerancePct: 2.0,
    allowedGsmTolerancePct: 3.0,
    warpYarnSpec: '20s Carded Warp',
    weftYarnSpec: '16s Weft',
    pileYarnSpec: '20s Ring Pile',
    createdDate: '2026-06-01',
    activeStatus: true,
    assignedMachines: [
      { machineNo: 'Machine 4', operatorName: 'Karthik N', allocatedQty: 1500, completedQty: 850, status: 'running' }
    ]
  },
  {
    id: 'var_jacquard_550',
    varietyName: 'Jacquard Border Face Towel 550GSM',
    category: 'Jacquard',
    standardWeightGsm: 550,
    targetLengthCm: 35,
    targetWidthCm: 35,
    allowedSizingTolerancePct: 1.0,
    allowedGsmTolerancePct: 2.5,
    warpYarnSpec: '2/30s Double Warp',
    weftYarnSpec: '20s Weft',
    pileYarnSpec: '2/20s Super Combed',
    createdDate: '2026-07-15',
    activeStatus: true,
    assignedMachines: [
      { machineNo: 'Machine 5', operatorName: 'Anand S', allocatedQty: 2000, completedQty: 1100, status: 'running' }
    ]
  }
];

export const DEFAULT_QUALITY_AUDITS: QualityCheckAudit[] = [
  {
    id: 'qa_001',
    checkDate: '2026-08-07',
    checkTime: '10:30 AM',
    machineNo: 'Machine 1',
    varietyName: 'Royal Bath Towel 500GSM',
    operatorName: 'Ramesh Kumar',
    sampleNo: 1,
    actualLengthCm: 140.2,
    actualWidthCm: 70.1,
    actualWeightGsm: 502,
    borderQualityScore: 5,
    selvedgeCondition: 'pass',
    sizingStatus: 'pass',
    gsmStatus: 'pass',
    overallResult: 'PASS',
    varianceNotes: 'Machine 1 sizing & dimensions perfectly aligned with target specs.',
    actionTaken: 'Standard production continued.',
    auditorName: 'QC Supervisor Selvam'
  },
  {
    id: 'qa_002',
    checkDate: '2026-08-07',
    checkTime: '11:00 AM',
    machineNo: 'Machine 2',
    varietyName: 'Royal Bath Towel 500GSM',
    operatorName: 'Suresh V',
    sampleNo: 1,
    actualLengthCm: 136.5,
    actualWidthCm: 68.2,
    actualWeightGsm: 475,
    borderQualityScore: 3,
    selvedgeCondition: 'defect',
    sizingStatus: 'under_sized',
    gsmStatus: 'low_gsm',
    overallResult: 'FAIL',
    varianceNotes: 'CRITICAL SIZING MISMATCH: Length is 136.5cm vs 140cm spec (Machine 1 produces 140.2cm). Reed tension too tight & warp let-off improper!',
    actionTaken: 'Halted loom to adjust warp beam tension and reed sizing setting to match Machine 1 spec.',
    auditorName: 'QC Supervisor Selvam'
  },
  {
    id: 'qa_003',
    checkDate: '2026-08-07',
    checkTime: '11:30 AM',
    machineNo: 'Machine 3',
    varietyName: 'Royal Bath Towel 500GSM',
    operatorName: 'Murugan P',
    sampleNo: 1,
    actualLengthCm: 139.8,
    actualWidthCm: 69.9,
    actualWeightGsm: 498,
    borderQualityScore: 4,
    selvedgeCondition: 'pass',
    sizingStatus: 'pass',
    gsmStatus: 'pass',
    overallResult: 'PASS',
    varianceNotes: 'Dimensions within 0.2% tolerance.',
    actionTaken: 'Normal run.',
    auditorName: 'QC Supervisor Selvam'
  }
];

export const DEFAULT_ROUTINE_REMINDERS: RoutineTaskReminder[] = [
  {
    id: 'rem_001',
    taskTitle: 'Multi-Machine Towel Sizing & Length Audit (Royal Bath Towel)',
    machineNo: 'Machine 1, Machine 2, Machine 3',
    category: 'quality_audit',
    frequencyDays: 1, // Daily
    lastCheckedDate: '2026-08-06',
    nextDueDate: '2026-08-07',
    assignedRoleOrPerson: 'Quality Supervisor Selvam',
    status: 'due_today',
    checklistItems: [
      { id: 'chk_1', label: 'Measure cut length (cm) on 3 consecutive towels per loom', checked: true },
      { id: 'chk_2', label: 'Measure width (cm) at top, middle and bottom', checked: true },
      { id: 'chk_3', label: 'Weigh 1 sq meter sample on digital balance for GSM check', checked: false },
      { id: 'chk_4', label: 'Compare size across Machine 1, Machine 2 & Machine 3 to ensure ZERO variance', checked: false },
      { id: 'chk_5', label: 'Verify hem stitching and selvedge edge tension', checked: false }
    ],
    notes: 'Mandatory routine check to prevent size discrepancies across different machines running same variety.'
  },
  {
    id: 'rem_002',
    taskTitle: 'Loom Warp Beam & Sizing Liquid Viscosity Check',
    machineNo: 'Machine 1',
    category: 'sizing_check',
    frequencyDays: 3,
    lastCheckedDate: '2026-08-04',
    nextDueDate: '2026-08-07',
    assignedRoleOrPerson: 'Loom Master',
    status: 'due_today',
    checklistItems: [
      { id: 'chk_21', label: 'Check sizing bath temperature & starch concentration', checked: false },
      { id: 'chk_22', label: 'Inspect warp yarn moisture content (% regain)', checked: false }
    ],
    notes: 'Sizing chemical mix check for smooth weaving.'
  },
  {
    id: 'rem_003',
    taskTitle: 'Loom Gearbox Lubrication & Reed Alignment Audit',
    machineNo: 'Machine 4',
    category: 'lubrication',
    frequencyDays: 7,
    lastCheckedDate: '2026-07-28',
    nextDueDate: '2026-08-04',
    assignedRoleOrPerson: 'Maintenance Tech Senthil',
    status: 'overdue',
    checklistItems: [
      { id: 'chk_31', label: 'Oil drop rate on picker assembly', checked: false },
      { id: 'chk_32', label: 'Clean reed dent gaps from yarn lint', checked: false }
    ],
    notes: 'Overdue weekly loom maintenance.'
  }
];

export const DEFAULT_PRODUCTION_ORDERS: ProductionOrder[] = [
  {
    id: 'ord_1001',
    orderNo: 'ORD-2026-089',
    customerName: 'Hotel Gran Hotel & Spa',
    orderDate: '2026-08-01',
    deliveryDueDate: '2026-08-20',
    status: 'in_production',
    notes: 'Hotel logo embroidery on border. Strict 500GSM requirement.',
    items: [
      { varietyName: 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '140 x 70 cm', targetQty: 3000, unit: 'pcs', unitRate: 280, notes: 'White color, double stitched' }
    ]
  },
  {
    id: 'ord_1002',
    orderNo: 'ORD-2026-092',
    customerName: 'Chennai Textile Mart',
    orderDate: '2026-08-03',
    deliveryDueDate: '2026-08-15',
    status: 'in_production',
    notes: 'Pack in bundles of 10 pcs.',
    items: [
      { varietyName: 'Classic Hotel Hand Towel 400GSM', gsm: 400, dimensions: '60 x 40 cm', targetQty: 1500, unit: 'pcs', unitRate: 110, notes: 'Assorted colors' }
    ]
  }
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'emp_1', name: 'Ramesh Kumar', role: 'Senior Loom Weaver', machine: 'Machine 1', salary: 22000 },
  { id: 'emp_2', name: 'Suresh V', role: 'Loom Operator', machine: 'Machine 2', salary: 19500 },
  { id: 'emp_3', name: 'Murugan P', role: 'Loom Operator', machine: 'Machine 3', salary: 19000 },
  { id: 'emp_4', name: 'Karthik N', role: 'Weaving Specialist', machine: 'Machine 4', salary: 21000 },
  { id: 'emp_5', name: 'Anand S', role: 'Jacquard Weaver', machine: 'Machine 5', salary: 24000 },
  { id: 'emp_6', name: 'Selvam K', role: 'Quality & Sizing Inspector', machine: 'All Looms', salary: 26000 }
];

export const DEFAULT_INVENTORY: InventoryItem[] = [
  { name: 'Cotton Yarn 20s Warp', type: 'raw', unit: 'kg', qty: 1250, reorderLevel: 300 },
  { name: 'Autoconer Yarn 16s Weft', type: 'raw', unit: 'kg', qty: 890, reorderLevel: 250 },
  { name: 'Sizing Starch Powder', type: 'raw', unit: 'kg', qty: 420, reorderLevel: 100 },
  { name: 'Royal Bath Towel 500GSM', type: 'finished', unit: 'pcs', qty: 1220, reorderLevel: 200 },
  { name: 'Classic Hotel Hand Towel 400GSM', type: 'finished', unit: 'pcs', qty: 850, reorderLevel: 150 },
  { name: 'Jacquard Border Face Towel 550GSM', type: 'finished', unit: 'pcs', qty: 1100, reorderLevel: 300 }
];

/**
 * Clears all transaction & sample test data for the current company
 * while leaving Company Settings and Subsidiary Companies completely intact.
 */
export async function clearAllTestData(): Promise<void> {
  await storeSet('customers', []);
  await storeSet('suppliers', []);
  await storeSet('inventory', []);
  await storeSet('salesBills', []);
  await storeSet('purchaseBills', []);
  await storeSet('payments', []);
  await storeSet('employees', []);
  await storeSet('productionLogs', []);
  await storeSet('salaryAdvances', []);
  await storeSet('productionOrders', []);
  await storeSet('varietyCatalog', []);
  await storeSet('qualityAudits', []);
  await storeSet('routineReminders', []);
}

