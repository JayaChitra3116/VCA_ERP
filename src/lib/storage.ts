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
  try {
    const value = localStorage.getItem(scopedKey(key));
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
}

export async function storeSet<T>(key: string, val: T): Promise<void> {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(val));
  } catch (e) {}
}

export async function globalGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = localStorage.getItem(GLOBAL_STORE_PREFIX + key);
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
}

export async function globalSet<T>(key: string, val: T): Promise<void> {
  try {
    localStorage.setItem(GLOBAL_STORE_PREFIX + key, JSON.stringify(val));
  } catch (e) {}
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

export const DEFAULT_VARIETIES: VarietyCatalog[] = [];

export const DEFAULT_QUALITY_AUDITS: QualityCheckAudit[] = [];

export const DEFAULT_ROUTINE_REMINDERS: RoutineTaskReminder[] = [];

export const DEFAULT_PRODUCTION_ORDERS: ProductionOrder[] = [];

export const DEFAULT_EMPLOYEES: Employee[] = [];

export const DEFAULT_INVENTORY: InventoryItem[] = [];

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

