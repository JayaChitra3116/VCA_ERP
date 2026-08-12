import React, { useState, useEffect } from 'react';
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
} from './types';

import {
  storeGet,
  storeSet,
  globalGet,
  globalSet,
  getActiveCompanyId,
  setActiveCompanyId,
  forceSyncAllDataToCloud,
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_SUBSIDIARY_COMPANIES,
  DEFAULT_LOGO_DATA_URL,
  DEFAULT_INVENTORY,
  DEFAULT_VARIETIES,
  DEFAULT_QUALITY_AUDITS,
  DEFAULT_ROUTINE_REMINDERS,
  DEFAULT_PRODUCTION_ORDERS,
  DEFAULT_EMPLOYEES,
  clearAllTestData
} from './lib/storage';
import { VCA_LOGO_DATA_URL } from './assets/vcaLogoData';

import { checkSupabaseConnection, isSupabaseConfigured, SupabaseHealthStatus } from './lib/supabase';
import { OrdersTab } from './components/OrdersTab';
import { VarietyAndQualityTab } from './components/VarietyAndQualityTab';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { PurchaseTab } from './components/PurchaseTab';
import { InventoryTab } from './components/InventoryTab';
import { ProductionTab } from './components/ProductionTab';
import { EmployeesTab } from './components/EmployeesTab';
import { CustomersTab } from './components/CustomersTab';
import { CustomerLedgerTab } from './components/CustomerLedgerTab';
import { SuppliersTab } from './components/SuppliersTab';
// import { VoiceControlAssistant } from './components/VoiceControlAssistant';
import { SecurityAndPwaModal } from './components/SecurityAndPwaModal';
import { PinLockOverlay } from './components/PinLockOverlay';

import {
  LayoutDashboard,
  ShoppingBag,
  Ruler,
  FileText,
  BookOpen,
  ShoppingBag as PurchIcon,
  Package,
  Cpu,
  Users,
  UserCheck,
  Truck,
  Settings as SettingsIcon,
  Database,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Menu,
  X,
  Printer,
  Edit3,
  Eye,
  Trash2,
  RefreshCw,
  Save,
  User,
  UserPlus,
  Building2,
  Phone,
  MapPin,
  Hash,
  ChevronDown,
  Search,
  Shield,
  Lock,
  Smartphone,
  Download,
  Info
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [activePage, setActivePage] = useState<string>('dashboard');

  // Supabase Status State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseHealthStatus | null>(null);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  // Active Company & Registry
  const [companyId, setCompanyIdState] = useState<string>(getActiveCompanyId());
  const [companies, setCompanies] = useState<SubsidiaryCompany[]>(DEFAULT_SUBSIDIARY_COMPANIES);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [sbCompanyId, setSbCompanyId] = useState<string>('comp-vca');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editCompanyData, setEditCompanyData] = useState<SubsidiaryCompany | null>(null);

  // App Data Caches
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>(DEFAULT_INVENTORY);
  const [salesBills, setSalesBills] = useState<SalesBill[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>([]);

  // New Requested Modules State
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(DEFAULT_PRODUCTION_ORDERS);
  const [varieties, setVarieties] = useState<VarietyCatalog[]>(DEFAULT_VARIETIES);
  const [qualityAudits, setQualityAudits] = useState<QualityCheckAudit[]>(DEFAULT_QUALITY_AUDITS);
  const [routineReminders, setRoutineReminders] = useState<RoutineTaskReminder[]>(DEFAULT_ROUTINE_REMINDERS);

  // UI Local Form States
  const [toastMsg, setToastMsg] = useState('');
  const [showQuickContactModal, setShowQuickContactModal] = useState<'customer' | 'supplier' | null>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<string | null>(null);

  // PWA & Security Lock State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [appPin, setAppPin] = useState<string>(() => localStorage.getItem('vca_app_pin') || '');
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('vca_autolock_min');
    return saved !== null ? Number(saved) : 5;
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    const pin = localStorage.getItem('vca_app_pin');
    return !!pin;
  });
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Customer Tab Inter-Tab Navigation Signals
  const [targetCustomerForTab, setTargetCustomerForTab] = useState<string | null>(null);
  const [targetCustomerAction, setTargetCustomerAction] = useState<'payment' | 'ledger' | null>(null);

  // Responsive Mobile Navigation Toggle
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Sales Bill Preview & Live Edit State
  const [previewBill, setPreviewBill] = useState<SalesBill | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [editBillData, setEditBillData] = useState<SalesBill | null>(null);
  const [billCopyType, setBillCopyType] = useState<'original' | 'transport' | 'supplier'>('original');

  // Sales Bill Customer Selection & Registration Modal State
  const [sbCustPhone, setSbCustPhone] = useState('');
  const [sbCustGstin, setSbCustGstin] = useState('');
  const [sbCustAddress, setSbCustAddress] = useState('');
  const [sbCustPincode, setSbCustPincode] = useState('');
  const [isCustDropdownOpen, setIsCustDropdownOpen] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({
    name: '',
    phone: '',
    gstin: '',
    state: 'Tamil Nadu',
    pincode: '',
    address: ''
  });

  // Nav items configuration for senior-friendly display
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-600' },
    { id: 'orders', label: 'Order Noting', icon: ShoppingBag, color: 'text-indigo-600' },
    { id: 'quality', label: 'Quality Control', icon: Ruler, color: 'text-emerald-600' },
    { id: 'salesBills', label: 'Sales Bills', icon: FileText, color: 'text-sky-600' },
    { id: 'ledger', label: 'Customer Ledger', icon: BookOpen, color: 'text-amber-600' },
    { id: 'purchaseBills', label: 'Purchase Bills', icon: PurchIcon, color: 'text-purple-600' },
    { id: 'inventory', label: 'Inventory', icon: Package, color: 'text-teal-600' },
    { id: 'production', label: 'Machine Ops', icon: Cpu, color: 'text-violet-600' },
    { id: 'employees', label: 'Employees & Salary', icon: Users, color: 'text-rose-600' },
    { id: 'customers', label: 'Customers', icon: UserCheck, color: 'text-emerald-600' },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, color: 'text-blue-600' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, color: 'text-slate-600' }
  ];

  // Sales Bill Form State
  const [sbBillType, setSbBillType] = useState<'tax_invoice' | 'sales_bill_2'>('tax_invoice');
  const [sbBillNo, setSbBillNo] = useState('');
  const [sbDate, setSbDate] = useState(new Date().toISOString().slice(0, 10));
  const [sbStatus, setSbStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [sbCustomer, setSbCustomer] = useState('');
  const [sbCustState, setSbCustState] = useState('Tamil Nadu');
  const [sbDispatchThrough, setSbDispatchThrough] = useState('');
  const [sbArticleNo, setSbArticleNo] = useState('');
  const [sbItems, setSbItems] = useState<any[]>([{ name: '', hsn: '6304', qty: 0, rate: 0, taxRate: 5, discPct: 0 }]);

  // Purchase Bill Form State
  const [pbPoNo, setPbPoNo] = useState('');
  const [pbSupInv, setPbSupInv] = useState('');
  const [pbDate, setPbDate] = useState(new Date().toISOString().slice(0, 10));
  const [pbStatus, setPbStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [pbSupplier, setPbSupplier] = useState('');
  const [pbSupState, setPbSupState] = useState('Tamil Nadu');
  const [pbItems, setPbItems] = useState<any[]>([{ name: '', hsn: '5205', qty: 0, unit: 'kg', rate: 0, taxRate: 5, discPct: 0 }]);

  // Production Form State
  const [prodDate, setProdDate] = useState(new Date().toISOString().slice(0, 10));
  const [prodMachine, setProdMachine] = useState('');
  const [prodEmployee, setProdEmployee] = useState('');
  const [prodItem, setProdItem] = useState('');
  const [prodQty, setProdQty] = useState<number | ''>('');
  const [prodUnit, setProdUnit] = useState('pcs');
  const [prodNotes, setProdNotes] = useState('');

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Helper for escaping HTML
  const escHtml = (s: any) => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Bill Number Generator per Subsidiary Company Prefix
  const generateNextBillNoForCompany = (companyIdOrPrefix: string, prefix: string, allSalesBills: SalesBill[]) => {
    const pfx = (prefix || 'VC').toUpperCase().trim();
    const matchingBills = allSalesBills.filter((b) => {
      if (b.companyId && b.companyId === companyIdOrPrefix) return true;
      if (b.companyPrefix && b.companyPrefix.toUpperCase() === pfx) return true;
      if (b.billNo && b.billNo.toUpperCase().startsWith(pfx)) return true;
      return false;
    });

    let maxNum = 0;
    for (const bill of matchingBills) {
      const rawNo = bill.billNo || '';
      const numMatch = rawNo.match(/(\d+)(?=[^\d]*$)/);
      if (numMatch) {
        const val = parseInt(numMatch[1], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    }

    const nextNum = maxNum + 1;
    const numPadded = String(nextNum).padStart(3, '0');
    return `${pfx}-${numPadded}`;
  };

  const handleSelectBillingCompany = (cId: string) => {
    setSbCompanyId(cId);
    const targetComp = companies.find((c) => c.id === cId);
    if (targetComp) {
      const nextNo = generateNextBillNoForCompany(targetComp.id, targetComp.prefix, salesBills);
      setSbBillNo(nextNo);
    }
  };

  // Manual Refresh & Cloud Sync State
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshData = async (silent: boolean = false) => {
    if (!silent) {
      setIsRefreshing(true);
      showToast('🔄 Syncing latest data with Supabase Cloud...');
    }
    try {
      const supCheck = await checkSupabaseConnection();
      setSupabaseStatus(supCheck);

      const comps = await globalGet<SubsidiaryCompany[]>('companies', DEFAULT_SUBSIDIARY_COMPANIES);
      setCompanies(comps);

      const activeId = getActiveCompanyId();
      setCompanyIdState(activeId);

      const setts = await storeGet<CompanySettings>('companySettings', DEFAULT_COMPANY_SETTINGS);
      setSettings(setts);

      setCustomers(await storeGet<Customer[]>('customers', []));
      setSuppliers(await storeGet<Supplier[]>('suppliers', []));

      const loadedInv = await storeGet<InventoryItem[]>('inventory', DEFAULT_INVENTORY);
      setInventory(loadedInv);

      const sBills = await storeGet<SalesBill[]>('salesBills', []);
      setSalesBills(sBills);

      const pBills = await storeGet<PurchaseBill[]>('purchaseBills', []);
      setPurchaseBills(pBills);

      setPayments(await storeGet<CustomerPayment[]>('payments', []));

      const loadedEmp = await storeGet<Employee[]>('employees', DEFAULT_EMPLOYEES);
      setEmployees(loadedEmp);

      setProductionLogs(await storeGet<ProductionLog[]>('productionLogs', []));
      setSalaryAdvances(await storeGet<SalaryAdvance[]>('salaryAdvances', []));

      const loadedOrders = await storeGet<ProductionOrder[]>('productionOrders', DEFAULT_PRODUCTION_ORDERS);
      setProductionOrders(loadedOrders);

      const loadedVars = await storeGet<VarietyCatalog[]>('varietyCatalog', DEFAULT_VARIETIES);
      setVarieties(loadedVars);

      const loadedAudits = await storeGet<QualityCheckAudit[]>('qualityAudits', DEFAULT_QUALITY_AUDITS);
      setQualityAudits(loadedAudits);

      const loadedRems = await storeGet<RoutineTaskReminder[]>('routineReminders', DEFAULT_ROUTINE_REMINDERS);
      setRoutineReminders(loadedRems);

      // Upload local modifications if any
      const syncRes = await forceSyncAllDataToCloud();

      if (!silent) {
        if (!supCheck.connected) {
          showToast(`⚠️ Supabase disconnected: ${supCheck.message}`);
        } else if (syncRes.error) {
          showToast(`⚠️ Refreshed, but sync warning: ${syncRes.error}`);
        } else if (syncRes.syncedKeys > 0) {
          showToast(`✅ Synced & Updated ${syncRes.syncedKeys} tables with Supabase Cloud!`);
        } else {
          showToast('✅ All data synced with Supabase Cloud!');
        }
      }
    } catch (err: any) {
      if (!silent) showToast(`Sync warning: ${err?.message || 'Data refresh completed'}`);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Load Data on Startup & Company Change
  useEffect(() => {
    async function initData() {
      // 1. Check Supabase connection
      const supCheck = await checkSupabaseConnection();
      setSupabaseStatus(supCheck);

      // 2. Load global subsidiary companies
      const comps = await globalGet<SubsidiaryCompany[]>('companies', DEFAULT_SUBSIDIARY_COMPANIES);
      setCompanies(comps);

      const activeId = getActiveCompanyId();
      setCompanyIdState(activeId);

      // 3. Load company scoped data (fetches from Cloud first)
      const setts = await storeGet<CompanySettings>('companySettings', DEFAULT_COMPANY_SETTINGS);
      setSettings(setts);

      setCustomers(await storeGet<Customer[]>('customers', []));
      setSuppliers(await storeGet<Supplier[]>('suppliers', []));

      const loadedInv = await storeGet<InventoryItem[]>('inventory', DEFAULT_INVENTORY);
      setInventory(loadedInv);

      const sBills = await storeGet<SalesBill[]>('salesBills', []);
      setSalesBills(sBills);

      const defComp = comps.find((c) => c.isDefault) || comps[0] || DEFAULT_SUBSIDIARY_COMPANIES[0];
      if (defComp) {
        setSbCompanyId(defComp.id);
        const initialBillNo = generateNextBillNoForCompany(defComp.id, defComp.prefix, sBills);
        setSbBillNo(initialBillNo);
      } else {
        setSbBillNo(`VC-${String(sBills.length + 1).padStart(3, '0')}`);
      }

      const pBills = await storeGet<PurchaseBill[]>('purchaseBills', []);
      setPurchaseBills(pBills);
      setPbPoNo(`PO-${String(pBills.length + 1).padStart(4, '0')}`);

      setPayments(await storeGet<CustomerPayment[]>('payments', []));

      const loadedEmp = await storeGet<Employee[]>('employees', DEFAULT_EMPLOYEES);
      setEmployees(loadedEmp);

      setProductionLogs(await storeGet<ProductionLog[]>('productionLogs', []));
      setSalaryAdvances(await storeGet<SalaryAdvance[]>('salaryAdvances', []));

      const loadedOrders = await storeGet<ProductionOrder[]>('productionOrders', DEFAULT_PRODUCTION_ORDERS);
      setProductionOrders(loadedOrders);

      const loadedVars = await storeGet<VarietyCatalog[]>('varietyCatalog', DEFAULT_VARIETIES);
      setVarieties(loadedVars);

      const loadedAudits = await storeGet<QualityCheckAudit[]>('qualityAudits', DEFAULT_QUALITY_AUDITS);
      setQualityAudits(loadedAudits);

      const loadedRems = await storeGet<RoutineTaskReminder[]>('routineReminders', DEFAULT_ROUTINE_REMINDERS);
      setRoutineReminders(loadedRems);

      // 4. Safely push local changes to Cloud if any
      await forceSyncAllDataToCloud();
    }
    initData();

    // Auto-sync on window focus and every 20 seconds
    const handleFocus = () => {
      handleRefreshData(true);
    };
    window.addEventListener('focus', handleFocus);

    const intervalId = setInterval(() => {
      handleRefreshData(true);
    }, 20000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [companyId]);

  // PWA Event Listener & Online/Offline Status
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Security Inactivity & Auto-lock listener
  useEffect(() => {
    if (!appPin || isAppLocked) return;

    const resetActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', resetActivity, { passive: true });
    window.addEventListener('keydown', resetActivity, { passive: true });
    window.addEventListener('touchstart', resetActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
    };
  }, [appPin, isAppLocked]);

  useEffect(() => {
    if (!appPin || isAppLocked || autoLockMinutes <= 0) return;

    const interval = setInterval(() => {
      const inactiveMs = Date.now() - lastActivity;
      if (inactiveMs >= autoLockMinutes * 60 * 1000) {
        setIsAppLocked(true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [appPin, isAppLocked, autoLockMinutes, lastActivity]);

  useEffect(() => {
    if (!appPin || isAppLocked) return;
    const handleVisibility = () => {
      if (document.hidden && autoLockMinutes === 0) {
        setIsAppLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [appPin, isAppLocked, autoLockMinutes]);

  const handleSetPin = (pin: string, lockMins: number) => {
    setAppPin(pin);
    setAutoLockMinutes(lockMins);
    localStorage.setItem('vca_app_pin', pin);
    localStorage.setItem('vca_autolock_min', String(lockMins));
  };

  const handleDisablePin = () => {
    setAppPin('');
    setIsAppLocked(false);
    localStorage.removeItem('vca_app_pin');
  };

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setToastMsg('App installed successfully!');
      }
      setDeferredPrompt(null);
    }
  };

  const handleExportFullBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      companyId,
      settings,
      customers,
      suppliers,
      inventory,
      salesBills,
      purchaseBills,
      payments,
      employees,
      productionOrders,
      varieties,
      qualityAudits,
      routineReminders
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VCA_Fabrics_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.customers) setCustomers(data.customers);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.inventory) setInventory(data.inventory);
      if (data.salesBills) setSalesBills(data.salesBills);
      if (data.purchaseBills) setPurchaseBills(data.purchaseBills);
      if (data.payments) setPayments(data.payments);
      if (data.employees) setEmployees(data.employees);
      if (data.productionOrders) setProductionOrders(data.productionOrders);
      if (data.varieties) setVarieties(data.varieties);
      if (data.qualityAudits) setQualityAudits(data.qualityAudits);
      if (data.routineReminders) setRoutineReminders(data.routineReminders);
      setToastMsg('System backup restored successfully!');
    } catch (e) {
      alert('Failed to import backup file. Please check JSON formatting.');
    }
  };

  // Handle Company Switch
  const handleCompanyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setActiveCompanyId(newId);
    setCompanyIdState(newId);
    window.location.reload();
  };

  // GST Split Calculator
  const splitTax = (taxable: number, taxRatePct: number, buyerState: string, homeState: string) => {
    const same = (buyerState || '').trim().toLowerCase() === (homeState || '').trim().toLowerCase();
    const taxAmt = (taxable * taxRatePct) / 100;
    if (same) return { cgst: taxAmt / 2, sgst: taxAmt / 2, igst: 0, taxAmt };
    return { cgst: 0, sgst: 0, igst: taxAmt, taxAmt };
  };

  // Weight & Quantity Helper calculated from Variety Catalog
  const getItemWeightKg = (itemName: string): number => {
    if (!itemName) return 0;
    const nameNorm = itemName.toLowerCase().trim();
    const match = varieties.find(
      (v) =>
        v.varietyName.toLowerCase().trim() === nameNorm ||
        nameNorm.includes(v.varietyName.toLowerCase().trim()) ||
        v.varietyName.toLowerCase().trim().includes(nameNorm)
    );

    if (match) {
      const lenM = match.targetLengthCm > 0 ? match.targetLengthCm / 100 : 1.4;
      const widthM = match.targetWidthCm > 0 ? match.targetWidthCm / 100 : 0.7;
      const gsm = match.standardWeightGsm > 0 ? match.standardWeightGsm : 400;
      return (gsm * lenM * widthM) / 1000;
    }

    const gsmMatch = itemName.match(/(\d+)\s*gsm/i);
    if (gsmMatch) {
      const gsm = parseFloat(gsmMatch[1]);
      return (gsm * 1.4 * 0.7) / 1000;
    }

    return 0.35;
  };

  const calculateBillWeightAndQty = (items: any[]) => {
    let totalQty = 0;
    let totalWeightKg = 0;

    if (Array.isArray(items)) {
      for (const item of items) {
        const qty = Number(item.qty) || 0;
        totalQty += qty;
        const unitWeight = getItemWeightKg(item.name || '');
        totalWeightKg += unitWeight * qty;
      }
    }

    return { totalQty, totalWeightKg };
  };

  // Inventory Change Helper
const changeStockByName = async (name: string, type: 'raw' | 'finished', delta: number, unit = 'pcs') => {
    const updated = [...inventory];
    const match = updated.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (match) {
      match.qty = (match.qty || 0) + delta;
    } else {
      updated.push({
        id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        type,
        unit,
        qty: Math.max(delta, 0),
        reorderLevel: 0
      });
    }
    setInventory(updated);
    await storeSet('inventory', updated);
  };

  // Handlers for Save Operations
  const handleSaveProductionOrder = async (newOrder: ProductionOrder) => {
    const updated = [newOrder, ...productionOrders];
    setProductionOrders(updated);
    await storeSet('productionOrders', updated);
    showToast(`Production Order ${newOrder.orderNo} created!`);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: ProductionOrder['status']) => {
    const updated = productionOrders.map((o) => (o.id === orderId ? { ...o, status } : o));
    setProductionOrders(updated);
    await storeSet('productionOrders', updated);
    showToast('Order status updated!');
  };

  const handleSaveVariety = async (newVariety: VarietyCatalog) => {
    const updated = [newVariety, ...varieties];
    setVarieties(updated);
    await storeSet('varietyCatalog', updated);
    showToast(`Variety ${newVariety.varietyName} added to catalog!`);
  };

  const handleSaveAudit = async (newAudit: QualityCheckAudit) => {
    const updated = [newAudit, ...qualityAudits];
    setQualityAudits(updated);
    await storeSet('qualityAudits', updated);
    showToast(`Quality audit saved for ${newAudit.machineNo}! Result: ${newAudit.overallResult}`);
  };

  const handleSaveReminder = async (newReminder: RoutineTaskReminder) => {
    const updated = [newReminder, ...routineReminders];
    setRoutineReminders(updated);
    await storeSet('routineReminders', updated);
    showToast('Routine task scheduled!');
  };

  const handleUpdateReminderStatus = async (id: string, status: RoutineTaskReminder['status']) => {
    const updated = routineReminders.map((r) => (r.id === id ? { ...r, status } : r));
    setRoutineReminders(updated);
    await storeSet('routineReminders', updated);
    showToast('Task status updated!');
  };

  // Indian Numbering to Words Helper
  const numToWordsIndian = (n: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function threeDigit(num: number) {
      let s = '';
      if (num > 99) {
        s += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num > 19) {
        s += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      }
      if (num > 0) {
        s += ones[num] + ' ';
      }
      return s;
    }
    if (n === 0) return 'Zero';
    let str = '';
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = n;
    if (crore) str += threeDigit(crore) + 'Crore ';
    if (lakh) str += threeDigit(lakh) + 'Lakh ';
    if (thousand) str += threeDigit(thousand) + 'Thousand ';
    if (hundred) str += threeDigit(hundred);
    return str.trim();
  };

  const amountInWords = (amount: number) => {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = 'Rupees ' + numToWordsIndian(rupees) + ' Only';
    if (paise > 0) words = 'Rupees ' + numToWordsIndian(rupees) + ' and ' + numToWordsIndian(paise) + ' Paise Only';
    return words;
  };

  // Helper to get State GST code
  const getStateCode = (stateName: string, gstin?: string): string => {
    if (gstin && gstin.trim().length >= 2) {
      const codeStr = gstin.trim().slice(0, 2);
      const codeNum = Number(codeStr);
      if (!isNaN(codeNum) && codeNum >= 1 && codeNum <= 38) {
        return codeStr.padStart(2, '0');
      }
    }
    const s = (stateName || '').toLowerCase().trim();
    if (s.includes('tamil nadu') || s === 'tn') return '33';
    if (s.includes('andhra') || s === 'ap') return '37';
    if (s.includes('kerala') || s === 'kl') return '32';
    if (s.includes('karnataka') || s === 'ka') return '29';
    if (s.includes('telangana') || s === 'ts' || s === 'tg') return '36';
    if (s.includes('maharashtra') || s === 'mh') return '27';
    if (s.includes('gujarat') || s === 'gj') return '24';
    if (s.includes('delhi') || s === 'dl') return '07';
    if (s.includes('west bengal') || s === 'wb') return '19';
    if (s.includes('punjab') || s === 'pb') return '03';
    return '33';
  };

  // Invoice Print Preview Generator
  const openInvoice = (number: string, type: 'sale' | 'purchase', overrideCopyType?: 'original' | 'transport' | 'supplier') => {
    const bill = (type === 'sale' ? salesBills : purchaseBills).find((b: any) => (type === 'sale' ? b.billNo : b.poNo) === number);
    if (!bill) return;
    const isSale = type === 'sale';
    const isSalesBill2 = isSale && bill.billType === 'sales_bill_2';
    const party = isSale ? bill.customerName : bill.supplierName;
    const partyState = isSale ? bill.customerState : bill.supplierState;
    const partyRecord = isSale
      ? customers.find((c) => c.name.toLowerCase() === party.toLowerCase())
      : suppliers.find((s) => s.name.toLowerCase() === party.toLowerCase());

    const cAddress = isSale
      ? (bill.customerAddress || (partyRecord ? partyRecord.address || partyRecord.place : ''))
      : (partyRecord ? partyRecord.place : '');
    const cGstin = isSale
      ? (isSalesBill2 ? '' : (bill.customerGstin || (partyRecord ? partyRecord.gstin : '')))
      : (partyRecord ? partyRecord.gstin : '');
    const cPhone = isSale
      ? (bill.customerPhone || (partyRecord ? partyRecord.phone : ''))
      : (partyRecord ? partyRecord.phone : '');

    const selectedCopy = overrideCopyType || bill.copyType || billCopyType || 'original';
    const isOriginalCopy = selectedCopy === 'original';

    const copyTag = selectedCopy === 'transport'
      ? 'DUPLICATE FOR TRANSPORTER'
      : selectedCopy === 'supplier'
      ? 'TRIPLICATE FOR SUPPLIER'
      : (isSale ? (isSalesBill2 ? 'NON-GST INVOICE — ORIGINAL' : 'ORIGINAL FOR RECIPIENT') : 'ORIGINAL FOR BUYER');

    const ref = isSale ? bill.billNo : bill.poNo;
    const { totalQty, totalWeightKg } = calculateBillWeightAndQty(bill.items);

    const roundedGrand = Math.round(bill.grand);
    const roundOff = roundedGrand - bill.grand;

    // Maximum 15 items enforced for single page layout
    const displayItems = bill.items.slice(0, 15);

    const itemRows = displayItems
      .map(
        (i: any, idx: number) => `<tr>
      <td style="border:1px solid #0f172a; padding:3px 3px; text-align:center; font-family:monospace; font-size:11.5px;">${idx + 1}</td>
      <td style="border:1px solid #0f172a; padding:3px 6px; font-weight:bold; font-size:12.5px; color:#0f172a;">${escHtml(i.name)}</td>
      <td style="border:1px solid #0f172a; padding:3px 3px; text-align:center; font-family:monospace; font-size:11.5px;">${escHtml(i.hsn || '6304')}</td>
      <td style="border:1px solid #0f172a; padding:3px 3px; text-align:center; font-family:monospace; font-size:11.5px;">${isSalesBill2 ? '0%' : i.taxRate + '%'}</td>
      <td style="border:1px solid #0f172a; padding:3px 5px; text-align:right; font-family:monospace; font-weight:bold; font-size:12.5px;">${Number(i.qty).toFixed(i.qty % 1 ? 2 : 0)}</td>
      <td style="border:1px solid #0f172a; padding:3px 3px; text-align:center; font-size:11.5px;">${escHtml(i.unit || 'Pcs')}</td>
      <td style="border:1px solid #0f172a; padding:3px 5px; text-align:right; font-family:monospace; font-size:12.5px;">${Number(i.rate).toFixed(2)}</td>
      <td style="border:1px solid #0f172a; padding:3px 3px; text-align:center; font-family:monospace; font-size:11.5px;">${i.discPct ? Number(i.discPct).toFixed(1) + '%' : '—'}</td>
      <td style="border:1px solid #0f172a; padding:3px 6px; text-align:right; font-family:monospace; font-weight:bold; font-size:12.5px;">${Number(i.taxable).toFixed(2)}</td>
    </tr>`
      )
      .join('');

    // Blank space filler row: fills empty space for short bills, omitted for 10-15 items to guarantee single A4 page fit
    const fillerHeight = displayItems.length >= 10 ? 0 : Math.max(15, 150 - displayItems.length * 16);
    const fillerRow = fillerHeight > 0 ? `<tr>
      <td style="border-right:1px solid #0f172a; border-left:1px solid #0f172a; height:${fillerHeight}px;"></td>
      <td style="border-right:1px solid #0f172a; height:${fillerHeight}px;"></td>
      <td style="border-right:1px solid #0f172a; height:${fillerHeight}px;"></td>
      <td style="border-right:1px solid #0f172a; height:${fillerHeight}px;"></td>
      <td style="border-right:1px solid #0f172a; height:${fillerHeight}px;"></td>
      <td style="border-right:1px solid #0f172a; height:${fillerHeight}px;"></td>
      <td style="border-right:1px solid #0f172a; height:${fillerHeight}px;"></td>
      <td style="border-right:1px solid #0f172a; height:${fillerHeight}px;"></td>
      <td style="border-right:1px solid #0f172a; height:${fillerHeight}px;"></td>
    </tr>` : '';

    const rows = itemRows + fillerRow;

    const hsnMap: any = {};
    displayItems.forEach((i: any) => {
      const key = i.hsn || '6304';
      if (!hsnMap[key]) hsnMap[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cgstRate: i.taxRate / 2, sgstRate: i.taxRate / 2, igstRate: i.taxRate };
      hsnMap[key].taxable += i.taxable;
      hsnMap[key].cgst += i.cgst;
      hsnMap[key].sgst += i.sgst;
      hsnMap[key].igst += i.igst;
    });
    const hsnRows = Object.entries(hsnMap)
      .map(
        ([hsn, v]: [string, any]) => `<tr>
      <td style="border:1px solid #0f172a; padding:3px 5px; text-align:center; font-family:monospace; font-size:11px;">${escHtml(hsn)}</td>
      <td style="border:1px solid #0f172a; padding:3px 6px; text-align:right; font-family:monospace; font-size:11px;">${v.taxable.toFixed(2)}</td>
      <td style="border:1px solid #0f172a; padding:3px 5px; text-align:center; font-family:monospace; font-size:11px;">${v.cgst ? v.cgstRate.toFixed(1) + '%' : '—'}</td>
      <td style="border:1px solid #0f172a; padding:3px 6px; text-align:right; font-family:monospace; font-size:11px;">${v.cgst.toFixed(2)}</td>
      <td style="border:1px solid #0f172a; padding:3px 5px; text-align:center; font-family:monospace; font-size:11px;">${v.sgst ? v.sgstRate.toFixed(1) + '%' : '—'}</td>
      <td style="border:1px solid #0f172a; padding:3px 6px; text-align:right; font-family:monospace; font-size:11px;">${v.sgst.toFixed(2)}</td>
      <td style="border:1px solid #0f172a; padding:3px 5px; text-align:center; font-family:monospace; font-size:11px;">${v.igst ? v.igstRate.toFixed(1) + '%' : '—'}</td>
      <td style="border:1px solid #0f172a; padding:3px 6px; text-align:right; font-family:monospace; font-size:11px;">${v.igst.toFixed(2)}</td>
    </tr>`
      )
      .join('');

    const rawLogo = settings.logo ? settings.logo.trim() : '';
    let logoHtml = `<img class="inv-logo" src="${VCA_LOGO_DATA_URL}" alt="Company Logo" style="max-height:60px; max-width:130px; object-fit:contain; display:block;" />`;

    if (rawLogo && rawLogo !== DEFAULT_LOGO_DATA_URL) {
      if (rawLogo.startsWith('<svg')) {
        logoHtml = rawLogo;
      } else if (rawLogo.startsWith('data:image/') || rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('blob:')) {
        const safeSrc = rawLogo.replace(/"/g, '&quot;');
        logoHtml = `<img class="inv-logo" src="${safeSrc}" alt="Company Logo" style="max-height:60px; max-width:130px; object-fit:contain; display:block;" />`;
      }
    }

    const companyName = bill.companyName || settings.name || 'VCA FABRICS';
    const companyAddress = bill.companyAddress || settings.address || 'Quality Towel & Fabric Manufacturers, Tamil Nadu';
    const companyGstin = bill.companyGstin || settings.gstin || '';
    const companyPhone = bill.companyPhone || settings.phone || '';
    const companyBankName = bill.companyBankName || settings.bankName || 'UNION BANK OF INDIA';
    const companyBankAccount = bill.companyBankAccount || settings.bankAccount || '';
    const companyBankIfsc = bill.companyBankIfsc || settings.bankIfsc || '';

    const printContainer = document.getElementById('printInvoice');
    if (printContainer) {
      printContainer.innerHTML = `
      <div class="inv-box"><div class="inv-box-inner" style="border:1.5px solid #0f172a; padding:12px 15px; background:#fff; color:#0f172a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing:border-box;">
        <div>
          <div class="inv-head" style="border-bottom:1.5px solid #0f172a; padding-bottom:8px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:bold; margin-bottom:6px;">
              <span style="text-transform:uppercase; letter-spacing:1px; color:#0f172a; font-size:13.5px; font-weight:900;">${isSale ? (isSalesBill2 ? 'NON-GST INVOICE' : 'TAX INVOICE') : 'PURCHASE BILL'}</span>
              <span style="border:1.5px solid #0f172a; padding:2px 8px; border-radius:3px; font-family:monospace; background:#f8fafc; font-size:11px; font-weight:bold; color:#0f172a;">${copyTag}</span>
            </div>
            <div class="inv-headrow" style="display:flex; justify-content:space-between; align-items:center;">
              <div style="width:130px; display:flex; justify-content:flex-start; align-items:center;">
                ${logoHtml}
              </div>
              <div class="inv-headtext" style="text-align:center; flex:1; padding:0 10px;">
                <div class="inv-company" style="font-size:30px; font-weight:900; color:#0f172a; letter-spacing:-0.5px; line-height:1.1; margin:0; text-transform:uppercase;">${escHtml(companyName)}</div>
                <div style="font-size:12px; color:#334155; font-weight:600; margin-top:2px;">${escHtml(companyAddress)}</div>
                <div class="inv-gstline" style="font-size:12.5px; font-weight:800; margin-top:2px;">${companyGstin ? 'GSTIN: ' + escHtml(companyGstin) : ''}${companyPhone ? (companyGstin ? ' &nbsp;|&nbsp; ' : '') + 'Ph: ' + escHtml(companyPhone) : ''}</div>
              </div>
              <div style="width:130px; text-align:right; font-size:12px; font-family:monospace; font-weight:bold;">
                <div>Inv #: ${escHtml(ref)}</div>
                <div>Date: ${escHtml(bill.date)}</div>
              </div>
            </div>
          </div>

          <div class="inv-parties" style="display:grid; grid-template-columns:1fr 1fr; border:1.5px solid #0f172a; margin-bottom:8px; font-size:13px; padding:6px 10px; gap:10px;">
            <div style="padding-right:8px; border-right:1.5px solid #0f172a;">
              <div class="inv-sub-hd" style="font-weight:900; text-transform:uppercase; margin-bottom:4px; color:#0f172a; font-size:12px; letter-spacing:0.5px;">DETAILS OF RECEIVER (BILLED TO)</div>
              <table style="width:100%; border:none; border-collapse:collapse; line-height:1.35; font-size:13px;">
                <tr><td style="width:70px; font-weight:bold; color:#334155; padding:1.5px 0;">Name</td><td style="font-weight:bold; color:#0f172a; padding:1.5px 0;">: ${escHtml(party)}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">Address</td><td style="padding:1.5px 0;">: ${escHtml(cAddress || '—')}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">State</td><td style="padding:1.5px 0;">: ${escHtml(partyState || 'Tamil Nadu')}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">GSTIN</td><td style="font-family:monospace; font-weight:bold; padding:1.5px 0;">: ${isSalesBill2 || !cGstin ? '-' : escHtml(cGstin)}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">Phone</td><td style="padding:1.5px 0;">: ${escHtml(cPhone || '—')}</td></tr>
              </table>
            </div>
            <div style="padding-left:8px;">
              <div class="inv-sub-hd" style="font-weight:900; text-transform:uppercase; margin-bottom:4px; color:#0f172a; font-size:12px; letter-spacing:0.5px;">INVOICE & DISPATCH DETAILS</div>
              <table style="width:100%; border:none; border-collapse:collapse; line-height:1.35; font-size:13px;">
                <tr><td style="width:110px; font-weight:bold; color:#334155; padding:1.5px 0;">Invoice No.</td><td style="font-family:monospace; font-weight:bold; color:#0f172a; padding:1.5px 0;">: ${escHtml(ref)}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">Invoice Date</td><td style="font-family:monospace; padding:1.5px 0;">: ${escHtml(bill.date)}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">Article</td><td style="font-weight:bold; color:#0f172a; padding:1.5px 0;">: ${escHtml(bill.articleNo || '—')}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">Dispatched Via</td><td style="font-weight:bold; color:#0f172a; padding:1.5px 0;">: ${escHtml(bill.dispatchThrough || '—')}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">Total Qty</td><td style="font-family:monospace; font-weight:bold; color:#0f172a; padding:1.5px 0;">: ${totalQty} ${bill.items[0]?.unit || 'Pcs'}</td></tr>
                <tr><td style="font-weight:bold; color:#334155; padding:1.5px 0;">Total Weight</td><td style="font-family:monospace; font-weight:bold; color:#0f172a; padding:1.5px 0;">: ${totalWeightKg > 0 ? totalWeightKg.toFixed(2) + ' Kg' : '—'}</td></tr>
              </table>
            </div>
          </div>

          <table class="inv-items" style="width:100%; border-collapse:collapse; margin-bottom:8px; border:1.5px solid #0f172a; table-layout:fixed;">
            <thead>
              <tr style="background:#f1f5f9; font-size:11px; text-transform:uppercase; font-weight:800;">
                <th style="border:1px solid #0f172a; padding:5px 3px; width:5%;">S.NO</th>
                <th style="border:1px solid #0f172a; padding:5px 6px; width:33%; text-align:left;">DESCRIPTION OF GOODS</th>
                <th style="border:1px solid #0f172a; padding:5px 3px; width:10%;">HSN</th>
                <th style="border:1px solid #0f172a; padding:5px 3px; width:7%;">GST%</th>
                <th style="border:1px solid #0f172a; padding:5px 4px; width:8%; text-align:right;">QTY</th>
                <th style="border:1px solid #0f172a; padding:5px 3px; width:7%;">UNIT</th>
                <th style="border:1px solid #0f172a; padding:5px 4px; width:10%; text-align:right;">RATE</th>
                <th style="border:1px solid #0f172a; padding:5px 3px; width:7%;">DISC%</th>
                <th style="border:1px solid #0f172a; padding:5px 6px; width:13%; text-align:right;">TAXABLE VALUE</th>
              </tr>
            </thead>
            <tbody style="font-size:12px;">${rows}</tbody>
          </table>

          <div class="inv-bottom" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:12px;">
            <div style="flex:1;">
              <div class="inv-words" style="background:#f8fafc; border:1.5px solid #0f172a; padding:6px 10px; font-size:12.5px;">
                <b style="text-transform:uppercase; font-size:10.5px; color:#475569; display:block;">TOTAL INVOICE VALUE IN WORDS:</b>
                <span style="font-weight:bold; color:#0f172a;">${amountInWords(roundedGrand)}</span>
              </div>
            </div>
            <div class="inv-totals" style="width:260px;">
              <table style="width:100%; border:1.5px solid #0f172a; border-collapse:collapse; font-size:12px;">
                <tr><td style="padding:3.5px 8px; font-weight:bold; border-bottom:1px solid #e2e8f0;">Taxable Amount</td><td style="padding:3.5px 8px; text-align:right; font-family:monospace; border-bottom:1px solid #e2e8f0;">₹${bill.subtotal.toFixed(2)}</td></tr>
                ${bill.cgst > 0 ? `<tr><td style="padding:3.5px 8px; border-bottom:1px solid #e2e8f0;">CGST</td><td style="padding:3.5px 8px; text-align:right; font-family:monospace; border-bottom:1px solid #e2e8f0;">₹${bill.cgst.toFixed(2)}</td></tr>` : ''}
                ${bill.sgst > 0 ? `<tr><td style="padding:3.5px 8px; border-bottom:1px solid #e2e8f0;">SGST</td><td style="padding:3.5px 8px; text-align:right; font-family:monospace; border-bottom:1px solid #e2e8f0;">₹${bill.sgst.toFixed(2)}</td></tr>` : ''}
                ${bill.igst > 0 ? `<tr><td style="padding:3.5px 8px; border-bottom:1px solid #e2e8f0;">IGST</td><td style="padding:3.5px 8px; text-align:right; font-family:monospace; border-bottom:1px solid #e2e8f0;">₹${bill.igst.toFixed(2)}</td></tr>` : ''}
                <tr><td style="padding:3.5px 8px; border-bottom:1px solid #e2e8f0;">Round Off</td><td style="padding:3.5px 8px; text-align:right; font-family:monospace; border-bottom:1px solid #e2e8f0;">${roundOff >= 0 ? '+' : '−'}₹${Math.abs(roundOff).toFixed(2)}</td></tr>
                <tr style="font-weight:bold; font-size:14px; background:#f8fafc;"><td style="padding:4.5px 8px; font-weight:900; border-top:1.5px solid #0f172a;">Grand Total</td><td style="padding:4.5px 8px; text-align:right; font-weight:900; font-family:monospace; border-top:1.5px solid #0f172a;">₹${roundedGrand.toFixed(2)}</td></tr>
              </table>
            </div>
          </div>

          <div class="inv-taxsummary" style="margin-bottom:8px;">
            ${
              isSalesBill2
                ? `<div style="border:1.5px solid #0f172a; padding:5px 12px; font-size:11.5px; font-weight:bold; color:#334155; text-align:center; background:#f8fafc; letter-spacing:0.5px;">
                SALES BILL 2 (NON-GST ESTIMATE) — NO TAX CHARGED
              </div>`
                : `<table style="width:100%; border-collapse:collapse; border:1.5px solid #0f172a; font-size:11px; text-align:center;">
              <thead>
                <tr style="background:#f1f5f9; text-transform:uppercase; font-weight:800;">
                  <th style="border:1px solid #0f172a; padding:3px 5px;">HSN/SAC</th>
                  <th style="border:1px solid #0f172a; padding:3px 5px; text-align:right;">TAXABLE VALUE</th>
                  <th style="border:1px solid #0f172a; padding:3px 5px;">CGST RATE</th>
                  <th style="border:1px solid #0f172a; padding:3px 5px; text-align:right;">CGST AMT</th>
                  <th style="border:1px solid #0f172a; padding:3px 5px;">SGST RATE</th>
                  <th style="border:1px solid #0f172a; padding:3px 5px; text-align:right;">SGST AMT</th>
                  <th style="border:1px solid #0f172a; padding:3px 5px;">IGST RATE</th>
                  <th style="border:1px solid #0f172a; padding:3px 5px; text-align:right;">IGST AMT</th>
                </tr>
              </thead>
              <tbody>
                ${hsnRows}
                <tr style="font-weight:700; background:#f8fafc;">
                  <td style="border:1px solid #0f172a; padding:3px 5px; text-align:left;">Total Tax</td>
                  <td style="border:1px solid #0f172a; padding:3px 5px; text-align:right; font-family:monospace;">${bill.subtotal.toFixed(2)}</td>
                  <td style="border:1px solid #0f172a; padding:3px 5px;"></td>
                  <td style="border:1px solid #0f172a; padding:3px 5px; text-align:right; font-family:monospace;">${bill.cgst.toFixed(2)}</td>
                  <td style="border:1px solid #0f172a; padding:3px 5px;"></td>
                  <td style="border:1px solid #0f172a; padding:3px 5px; text-align:right; font-family:monospace;">${bill.sgst.toFixed(2)}</td>
                  <td style="border:1px solid #0f172a; padding:3px 5px;"></td>
                  <td style="border:1px solid #0f172a; padding:3px 5px; text-align:right; font-family:monospace;">${bill.igst.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>`
            }
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:12px; margin-top:6px; padding-top:4px;">
          <div>
            ${
              isOriginalCopy
                ? `<div style="color:#0f172a; font-size:11px; line-height:1.4; border:1px solid #cbd5e1; padding:5px 8px; background:#fafafa;">
                    <span style="color:#1d4ed8; font-weight:bold; font-size:10.5px; text-transform:uppercase;">Bank Account Payment Info:</span><br>
                    <b>Bank:</b> ${escHtml(companyBankName)}<br>
                    <b>A/C No:</b> <span style="font-family:monospace; font-weight:bold;">${escHtml(companyBankAccount || '—')}</span> &nbsp;|&nbsp; <b>IFSC:</b> <span style="font-family:monospace; font-weight:bold;">${escHtml(companyBankIfsc || '—')}</span>
                   </div>`
                : `<div style="color:#64748b; font-style:italic; font-size:10.5px;">[ Bank details omitted for transport copy ]</div>`
            }
          </div>

          <div class="inv-sign" style="text-align:right;">
            <div style="font-weight:bold; color:#0f172a; font-size:12px;">For, ${escHtml(companyName)}</div>
            <div style="margin-top:22px; border-top:1px solid #0f172a; padding-top:3px; font-weight:bold; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#1e293b;">
              AUTHORISED SIGNATURE
            </div>
          </div>
        </div>
      </div></div>`;
      setTimeout(() => {
        window.print();
      }, 200);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#182228] font-sans">
      {/* LIVE CLOUD & PWA TOP BANNER */}
      <div id="previewBanner" className="bg-[#1e293b] text-white font-mono text-[11.5px] px-4 py-2 flex justify-between items-center flex-wrap gap-2 shadow-xs border-b border-slate-700">
        <span className="tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
          <span className="font-bold text-emerald-300">LIVE CLOUD APP</span>
          <span className="text-slate-300">| Accessible globally on Phone, Tablet & PC. Tap "Install App" to add to home screen!</span>
        </span>
        <div className="flex items-center gap-2">
          {deferredPrompt ? (
            <button
              onClick={() => handleTriggerInstall()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded-md font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install Mobile / Desktop App</span>
            </button>
          ) : (
            <button
              onClick={() => setShowSecurityModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install App & Security</span>
            </button>
          )}

          {appPin && (
            <button
              onClick={() => setIsAppLocked(true)}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs px-2.5 py-1 rounded-md border border-slate-600 flex items-center gap-1.5 cursor-pointer font-mono font-bold transition-colors"
              title="Lock App Screen Immediately"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lock Screen</span>
            </button>
          )}

          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs px-2.5 py-1 rounded-md border border-emerald-600 flex items-center gap-1.5 cursor-pointer font-mono font-bold transition-colors disabled:opacity-50"
            title="Refresh & Sync Data from Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
          </button>

          <button
            onClick={() => setShowSupabaseModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-md border border-slate-600 flex items-center gap-1.5 cursor-pointer font-mono transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>{supabaseStatus?.connected ? 'Cloud Storage' : 'Local Storage'}</span>
          </button>
        </div>
      </div>

      {/* MOBILE & TABLET TOP HEADER BAR */}
      <div className="md:hidden bg-[#EAE4D6] text-[#182228] border-b border-[#D8D2C2] px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="px-3 py-2 rounded bg-[#FAF8F3] hover:bg-[#FAF6EC] text-[#182228] border border-[#D0C8B8] flex items-center gap-2 font-mono text-sm font-bold cursor-pointer"
        >
          {isMobileNavOpen ? <X className="w-5 h-5 text-[#8B5E1E]" /> : <Menu className="w-5 h-5 text-[#8B5E1E]" />}
          <span>MENU</span>
        </button>

        <div className="flex items-center gap-2">
          <img src={settings.logo || VCA_LOGO_DATA_URL} alt="Logo" className="w-7 h-7 object-contain shrink-0" />
          <span className="font-serif font-bold text-[#182228] text-lg tracking-tight">{settings.name || 'VCA Fabrics'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-[#FAF8F3] text-[#8B5E1E] border border-[#D0C8B8] flex items-center justify-center cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {appPin && (
            <button
              onClick={() => setIsAppLocked(true)}
              className="p-1.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-700"
              title="Lock Screen"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
            </button>
          )}
          <button
            onClick={() => setShowSecurityModal(true)}
            className="p-1.5 rounded bg-[#FAF8F3] text-[#8B5E1E] border border-[#D0C8B8]"
            title="PWA & Security Settings"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div id="app" className="flex flex-col md:flex-row min-h-screen">
        {/* LIGHT VINTAGE PARCHMENT SIDEBAR NAVIGATION (SENIOR FRIENDLY & READABLE) */}
        <nav
          className={`side w-full md:w-64 bg-[#EAE4D6] text-[#182228] border-r border-[#D8D2C2] p-4 flex-shrink-0 flex flex-col justify-between ${
            isMobileNavOpen ? 'block' : 'hidden md:flex'
          }`}
        >
          <div>
            <div className="p-3 mb-4 border-b border-[#D0C8B8] bg-[#FAF8F3] rounded-lg border border-[#E2DCD0] flex items-center gap-3 shadow-2xs">
              <img src={settings.logo || VCA_LOGO_DATA_URL} alt="Logo" className="w-10 h-10 object-contain shrink-0" />
              <div className="overflow-hidden">
                <span className="text-xl font-serif font-bold tracking-tight text-[#182228] block truncate">
                  {settings.name || 'VCA Fabrics'}
                </span>
                <span className="text-[10px] font-mono font-extrabold text-[#8B5E1E] tracking-wider uppercase block truncate mt-0.5">
                  ERP MANAGEMENT
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {navItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePage(item.id);
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-3 rounded-md transition-all flex items-center gap-3.5 text-sm sm:text-base font-sans cursor-pointer ${
                      isActive
                        ? 'bg-[#FAF8F3] text-[#182228] font-extrabold border-l-4 border-[#8B5E1E] shadow-2xs'
                        : 'text-[#384A59] hover:bg-[#DFD8C8] hover:text-[#182228] font-bold border-l-4 border-transparent'
                    }`}
                  >
                    <IconComp className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#8B5E1E]' : 'text-[#506272]'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* PWA Direct Install Button in Sidebar */}
            <div className="mt-4 pt-3 border-t border-[#D0C8B8]">
              <button
                onClick={() => {
                  if (deferredPrompt) {
                    handleTriggerInstall();
                  } else {
                    setShowSecurityModal(true);
                  }
                }}
                className="w-full bg-[#8B5E1E] hover:bg-[#724c16] text-white p-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Smartphone className="w-4 h-4 text-amber-200" />
                <span>📲 Install Mobile App (PWA)</span>
              </button>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-[#D0C8B8] text-xs font-bold text-[#4A5C6C] flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSupabaseModal(true)}
                className="flex items-center gap-2 hover:text-[#182228] cursor-pointer"
                title="Click to view Supabase Connection & Diagnostics Popup"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus?.connected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`}></div>
                <span>{supabaseStatus?.connected ? 'Supabase Sync' : 'Local Storage'}</span>
              </button>
              <button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="p-1 hover:text-[#182228] cursor-pointer"
                title="Sync & Refresh Data from Cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#8B5E1E] ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <button
              onClick={() => setShowSecurityModal(true)}
              className="p-1 hover:text-[#182228] transition-colors cursor-pointer"
              title="Security & Lock Settings"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-5 md:p-7 min-w-0 bg-[#F5F2EA]">
          {/* Cloud Disconnected Notice for Computer B */}
          {!supabaseStatus?.connected && (
            <div className="mb-5 p-3.5 bg-amber-100/90 border border-amber-300 text-amber-900 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-sans shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Cloud Sync Inactive:</strong> This computer/browser is currently on local storage. Enter your Supabase Anon Key to load live Inventory, Bills &amp; Employee data from Computer A!
                </span>
              </div>
              <button
                onClick={() => setShowSupabaseModal(true)}
                className="bg-amber-800 hover:bg-amber-900 text-white px-3 py-1.5 rounded font-mono font-bold text-[11px] whitespace-nowrap cursor-pointer transition-colors shadow-xs"
              >
                Connect Supabase Credentials →
              </button>
            </div>
          )}
          {/* Active Company Switcher Bar */}
          <div className="company-bar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-[#EFECE4] border border-[#DDD7C9] rounded-none">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
              <div>
                <label className="block text-xs font-mono font-extrabold text-[#405262] mb-1">Active Company / Subsidiary</label>
                <select
                  value={companyId}
                  onChange={handleCompanyChange}
                  className="w-full sm:w-80 p-2.5 border border-[#D0C8B8] bg-[#FAF8F3] text-base text-[#182228] font-bold font-serif outline-none focus:border-[#8B5E1E]"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="mt-2 sm:mt-5 px-3.5 py-2 bg-[#8B5E1E] hover:bg-[#724c16] text-white font-mono font-bold text-xs rounded border border-[#724c16] flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                title="Refresh and sync data from Cloud database"
              >
                <RefreshCw className={`w-4 h-4 text-amber-200 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh / Sync Data'}</span>
              </button>
            </div>

            <div className="text-xs font-mono font-bold text-[#506272] text-right max-w-sm">
              All bills, stock, production and employee records belong only to the active company selected above.
            </div>
          </div>

          {/* 1. DASHBOARD */}
          {activePage === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="page-title text-2xl font-bold tracking-tight text-slate-900 m-0">Factory Dashboard</h1>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={handleRefreshData}
                    disabled={isRefreshing}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                  </button>
                  <div className="bg-amber-50 text-amber-700 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-amber-200 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                    Alert: Sizing Mismatch Monitoring
                  </div>
                  <button onClick={() => setActivePage('orders')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs">
                    + New Entry
                  </button>
                </div>
              </div>

              {/* Quality Alert Banner */}
              {qualityAudits.some((a) => a.overallResult === 'FAIL') && (
                <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded text-xs text-rose-900 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold font-mono text-sm block">QUALITY AUDIT ALERT: Towel Sizing Discrepancy Detected!</span>
                      <p className="mt-0.5">
                        Machine 2 towel size / GSM differs from Machine 1 and master specifications. Tap below to review the multi-machine sizing matrix and calibration steps.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePage('quality')}
                    className="btn primary text-xs whitespace-nowrap"
                  >
                    Inspect Sizing
                  </button>
                </div>
              )}

              <div className="dash-grid">
                <div className="stat">
                  <div className="lbl">Sales Bills</div>
                  <div className="val">{salesBills.length}</div>
                </div>
                <div className="stat">
                  <div className="lbl">Purchase Bills</div>
                  <div className="val">{purchaseBills.length}</div>
                </div>
                <div className="stat">
                  <div className="lbl">Active Production Orders</div>
                  <div className="val text-amber-700">{productionOrders.filter((o) => o.status === 'in_production' || o.status === 'pending').length}</div>
                </div>
                <div className="stat">
                  <div className="lbl">Low Stock Items</div>
                  <div className="val text-rose-700">{inventory.filter((i) => (i.qty || 0) <= (i.reorderLevel || 0)).length}</div>
                </div>
              </div>

              {/* Routine Tasks Summary Box */}
              <div className="panel">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-serif text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-amber-700" />
                    <span>Routine Maintenance & Sizing Tasks</span>
                  </h2>
                  <button onClick={() => setActivePage('quality')} className="link-btn text-xs">View All Tasks &rarr;</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {routineReminders.slice(0, 4).map((r) => (
                    <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{r.taskTitle}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Assigned: {r.assignedRoleOrPerson} ({r.machineNo})</div>
                      </div>
                      <span className={`pill ${r.status === 'overdue' ? 'unpaid' : 'low'}`}>{r.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock Table */}
              <div className="panel">
                <h2>Low Stock Alerts</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th className="num">On Hand</th>
                      <th className="num">Reorder Level</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.filter((i) => (i.qty || 0) <= (i.reorderLevel || 0)).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-note">All stock levels are optimal.</td>
                      </tr>
                    ) : (
                      inventory
                        .filter((i) => (i.qty || 0) <= (i.reorderLevel || 0))
                        .map((i, idx) => (
                          <tr key={idx}>
                            <td className="font-medium">{i.name}</td>
                            <td>{i.type === 'raw' ? 'Raw Material' : 'Finished Good'}</td>
                            <td className="num font-mono">{i.qty} {i.unit}</td>
                            <td className="num font-mono">{i.reorderLevel} {i.unit}</td>
                            <td><span className="pill low">Low</span></td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. ORDERS TAB */}
          {activePage === 'orders' && (
            <OrdersTab
              orders={productionOrders}
              onSaveOrder={handleSaveProductionOrder}
              onUpdateStatus={handleUpdateOrderStatus}
              customerNames={customers.map((c) => c.name)}
              varietyNames={varieties.map((v) => v.varietyName)}
            />
          )}

          {/* 3. SIZING & QUALITY TAB */}
          {activePage === 'quality' && (
            <VarietyAndQualityTab
              varieties={varieties}
              audits={qualityAudits}
              reminders={routineReminders}
              onSaveVariety={handleSaveVariety}
              onSaveAudit={handleSaveAudit}
              onSaveReminder={handleSaveReminder}
              onUpdateReminderStatus={handleUpdateReminderStatus}
              operatorNames={employees.map((e) => e.name)}
            />
          )}

          {/* 4. SALES BILLS TAB */}
          {activePage === 'salesBills' && (
            <div className="space-y-6">
              <h1 className="page-title text-2xl font-serif font-bold text-slate-900 m-0">Sales Bills</h1>

              <div className="panel">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <h2 className="m-0">New Sales Bill</h2>
                </div>

                {/* Bill Type Selector */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSbBillType('tax_invoice')}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      sbBillType === 'tax_invoice'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Tax Invoice (GST)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSbBillType('sales_bill_2')}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      sbBillType === 'sales_bill_2'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Non-GST Bill (Without GST & No Stock Deduction)</span>
                  </button>
                </div>

                {sbBillType === 'sales_bill_2' && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-950">Non-GST Billing Mode Active</span>
                      <span>Follows standard bill sequence (<strong>{sbBillNo}</strong>). Stock will <strong>NOT</strong> be deducted from inventory. GSTIN displays as <strong>-</strong>. Total amount will be posted to Customer Ledger.</span>
                    </div>
                  </div>
                )}

                {/* Billing Subsidiary Company Selector */}
                <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 w-full sm:w-auto">
                      <label className="block text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>Billing Subsidiary Company *</span>
                      </label>
                      <select
                        value={sbCompanyId}
                        onChange={(e) => handleSelectBillingCompany(e.target.value)}
                        className="w-full p-2.5 border border-indigo-300 rounded-lg text-xs font-bold text-indigo-950 bg-white shadow-2xs cursor-pointer"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Prefix: {c.prefix} → Next Invoice: {generateNextBillNoForCompany(c.id, c.prefix, salesBills)})
                          </option>
                        ))}
                      </select>
                    </div>
                    {(() => {
                      const activeComp = companies.find((c) => c.id === sbCompanyId) || companies[0];
                      return activeComp ? (
                        <div className="text-xs bg-white px-3 py-2 rounded-lg border border-indigo-200 text-indigo-900 shrink-0 w-full sm:w-auto font-medium shadow-2xs">
                          <span className="font-bold text-indigo-950">{activeComp.name}</span>
                          <div className="text-[11px] text-slate-600">
                            GSTIN: {activeComp.gstin || 'Non-GST'} {activeComp.phone ? `| Ph: ${activeComp.phone}` : ''}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4 text-xs">
                  <div><label className="block font-semibold text-slate-800 mb-1">Bill No.</label><input type="text" value={sbBillNo} readOnly className="w-full p-2 border border-slate-300 rounded-lg bg-slate-100 font-mono font-bold" /></div>
                  <div><label className="block font-semibold text-slate-800 mb-1">Date</label><input type="date" value={sbDate} onChange={(e) => setSbDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" /></div>
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">Article / Desig No.</label>
                    <input
                      type="text"
                      value={sbArticleNo}
                      onChange={(e) => setSbArticleNo(e.target.value)}
                      placeholder="e.g. ART-101 / D-5"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">Payment Status</label>
                    <select value={sbStatus} onChange={(e) => setSbStatus(e.target.value as any)} className="w-full p-2 border border-slate-300 rounded-lg font-bold">
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">Dispatched Through</label>
                    <input
                      type="text"
                      value={sbDispatchThrough}
                      onChange={(e) => setSbDispatchThrough(e.target.value)}
                      placeholder="e.g. VRL Logistics / Vehicle No."
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="row2 relative">
                  <div className="relative">
                    <label className="block font-semibold text-slate-800 text-xs mb-1">Customer Name *</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={sbCustomer}
                        onFocus={() => setIsCustDropdownOpen(true)}
                        onChange={(e) => {
                          setSbCustomer(e.target.value);
                          setIsCustDropdownOpen(true);
                          const matched = customers.find((c) => c.name.toLowerCase() === e.target.value.toLowerCase().trim());
                          if (matched) {
                            setSbCustState(matched.state || 'Tamil Nadu');
                            setSbCustPhone(matched.phone || '');
                            setSbCustGstin(matched.gstin || '');
                            setSbCustAddress(matched.address || matched.place || '');
                            setSbCustPincode(matched.pincode || '');
                          }
                        }}
                        placeholder="Search existing or type customer name"
                        style={{ paddingLeft: '2.5rem', paddingRight: '5.5rem' }}
                        className="w-full py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewCustForm({
                            name: sbCustomer,
                            phone: sbCustPhone,
                            gstin: sbCustGstin,
                            state: sbCustState,
                            pincode: sbCustPincode,
                            address: sbCustAddress
                          });
                          setShowAddCustModal(true);
                        }}
                        className="absolute right-1 top-1 bottom-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded flex items-center gap-1 transition-colors border border-indigo-200 cursor-pointer"
                        title="Register New Customer"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                        <span>+ New</span>
                      </button>
                    </div>

                    {/* Customer Autocomplete Dropdown List */}
                    {isCustDropdownOpen && (
                      <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {customers
                          .filter((c) => c.name.toLowerCase().includes(sbCustomer.toLowerCase().trim()))
                          .map((c, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                setSbCustomer(c.name);
                                setSbCustState(c.state || 'Tamil Nadu');
                                setSbCustPhone(c.phone || '');
                                setSbCustGstin(c.gstin || '');
                                setSbCustAddress(c.address || c.place || '');
                                setSbCustPincode(c.pincode || '');
                                setIsCustDropdownOpen(false);
                              }}
                              className="p-2.5 hover:bg-indigo-50/80 cursor-pointer transition-colors flex items-center justify-between"
                            >
                              <div>
                                <div className="font-bold text-slate-900">{c.name}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  {c.phone && <span>Ph: {c.phone}</span>}
                                  {(c.address || c.place) && <span>Loc: {c.address || c.place}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                {c.gstin && <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 block">GST: {c.gstin}</span>}
                                <span className="text-[10px] text-slate-400 block mt-0.5">{c.state}</span>
                              </div>
                            </div>
                          ))}

                        {/* If typed name not found in exact list, present option to add */}
                        {sbCustomer.trim() && !customers.some((c) => c.name.toLowerCase() === sbCustomer.toLowerCase().trim()) && (
                          <div
                            onClick={() => {
                              setNewCustForm({
                                name: sbCustomer,
                                phone: sbCustPhone,
                                gstin: sbCustGstin,
                                state: sbCustState,
                                pincode: sbCustPincode,
                                address: sbCustAddress
                              });
                              setIsCustDropdownOpen(false);
                              setShowAddCustModal(true);
                            }}
                            className="p-3 bg-indigo-50 hover:bg-indigo-100 cursor-pointer text-indigo-700 font-bold flex items-center justify-between transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <UserPlus className="w-4 h-4 text-indigo-600" />
                              <span>Customer not found. Register "{sbCustomer}"?</span>
                            </span>
                            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-sans uppercase">Fill Info</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 text-xs mb-1">Customer State (GST)</label>
                    <input
                      type="text"
                      value={sbCustState}
                      onChange={(e) => setSbCustState(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Additional Customer Info Bar if available */}
                {(sbCustPhone || sbCustGstin || sbCustAddress) && (
                  <div className="mt-2.5 p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg flex flex-wrap items-center gap-4 text-xs text-slate-700">
                    {sbCustPhone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-500" /> {sbCustPhone}</span>}
                    {sbCustGstin && <span className="flex items-center gap-1 font-mono"><Hash className="w-3.5 h-3.5 text-indigo-500" /> GST: {sbCustGstin}</span>}
                    {sbCustAddress && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> {sbCustAddress} {sbCustPincode ? `(${sbCustPincode})` : ''}</span>}
                  </div>
                )}

                <h2 className="mt-4">Line Items (Finished Goods)</h2>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Item Name</th>
                      <th style={{ width: '10%' }}>HSN</th>
                      <th style={{ width: '10%' }}>Qty</th>
                      <th style={{ width: '15%' }}>Rate (₹)</th>
                      <th style={{ width: '12%' }}>Tax %</th>
                      <th style={{ width: '10%' }}>Disc %</th>
                      <th style={{ width: '15%' }} className="num">Taxable Amt</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sbItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            list="finishedGoodsList"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...sbItems];
                              updated[idx].name = e.target.value;
                              setSbItems(updated);
                            }}
                            placeholder="Select finished towel"
                          />
                          <datalist id="finishedGoodsList">
                            {inventory.filter((i) => i.type === 'finished').map((i, k) => (
                              <option key={k} value={i.name} />
                            ))}
                          </datalist>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.hsn}
                            onChange={(e) => {
                              const updated = [...sbItems];
                              updated[idx].hsn = e.target.value;
                              setSbItems(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.qty === 0 ? '' : item.qty}
                            onChange={(e) => {
                              const updated = [...sbItems];
                              const val = e.target.value;
                              updated[idx].qty = val === '' ? 0 : (parseFloat(val) || 0);
                              setSbItems(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.rate === 0 ? '' : item.rate}
                            onChange={(e) => {
                              const updated = [...sbItems];
                              const val = e.target.value;
                              updated[idx].rate = val === '' ? 0 : (parseFloat(val) || 0);
                              setSbItems(updated);
                            }}
                          />
                        </td>
                        <td>
                          <select
                            value={item.taxRate}
                            onChange={(e) => {
                              const updated = [...sbItems];
                              updated[idx].taxRate = parseFloat(e.target.value) || 0;
                              setSbItems(updated);
                            }}
                          >
                            <option value={2.5}>2.5%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.discPct === 0 ? '' : item.discPct}
                            onChange={(e) => {
                              const updated = [...sbItems];
                              const val = e.target.value;
                              updated[idx].discPct = val === '' ? 0 : (parseFloat(val) || 0);
                              setSbItems(updated);
                            }}
                          />
                        </td>
                        <td className="num font-mono">
                          ₹{((item.qty * item.rate) * (1 - item.discPct / 100)).toFixed(2)}
                        </td>
                        <td>
                          {sbItems.length > 1 && (
                            <button
                              onClick={() => setSbItems(sbItems.filter((_, i) => i !== idx))}
                              className="rm-btn"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  onClick={() => setSbItems([...sbItems, { name: '', hsn: '6304', qty: 0, rate: 0, taxRate: 5, discPct: 0 }])}
                  className="add-item"
                >
                  + Add Item
                </button>

                <button
                  onClick={async () => {
                    if (!sbCustomer) {
                      showToast('Please enter customer name');
                      return;
                    }
                    const isSalesBill2 = sbBillType === 'sales_bill_2';
                    const processedItems = sbItems
                      .filter((i) => i.name && i.qty > 0)
                      .map((i) => {
                        const effectiveTaxRate = isSalesBill2 ? 0 : i.taxRate;
                        const taxable = i.qty * i.rate * (1 - i.discPct / 100);
                        const tax = isSalesBill2
                          ? { cgst: 0, sgst: 0, igst: 0, taxAmt: 0 }
                          : splitTax(taxable, effectiveTaxRate, sbCustState, settings.state || 'Tamil Nadu');
                        return { ...i, taxRate: effectiveTaxRate, taxable, cgst: tax.cgst, sgst: tax.sgst, igst: tax.igst, amt: taxable + tax.taxAmt };
                      });

                    if (processedItems.length === 0) {
                      showToast('Add at least one valid item');
                      return;
                    }

                    const subtotal = processedItems.reduce((s, i) => s + i.taxable, 0);
                    const cgst = processedItems.reduce((s, i) => s + i.cgst, 0);
                    const sgst = processedItems.reduce((s, i) => s + i.sgst, 0);
                    const igst = processedItems.reduce((s, i) => s + i.igst, 0);
                    const grand = subtotal + cgst + sgst + igst;

                    const selectedComp = companies.find((c) => c.id === sbCompanyId) || companies[0];

                    const newBill: SalesBill = {
                      id: 'sb_' + Date.now(),
                      billNo: sbBillNo,
                      date: sbDate,
                      billType: sbBillType,
                      articleNo: sbArticleNo.trim(),
                      companyId: selectedComp?.id || 'comp-vca',
                      companyName: selectedComp?.name || settings.name || 'VCA Fabrics',
                      companyPrefix: selectedComp?.prefix || 'VC',
                      companyGstin: selectedComp?.gstin || settings.gstin || '',
                      companyAddress: selectedComp?.address || settings.address || '',
                      companyPhone: selectedComp?.phone || settings.phone || '',
                      companyState: selectedComp?.state || settings.state || 'Tamil Nadu',
                      companyBankName: selectedComp?.bankName || settings.bankName || '',
                      companyBankAccount: selectedComp?.bankAccount || settings.bankAccount || '',
                      companyBankIfsc: selectedComp?.bankIfsc || settings.bankIfsc || '',
                      customerName: sbCustomer,
                      customerState: sbCustState,
                      customerPhone: sbCustPhone,
                      customerGstin: isSalesBill2 ? '' : sbCustGstin,
                      customerAddress: sbCustAddress,
                      customerPincode: sbCustPincode,
                      dispatchThrough: sbDispatchThrough.trim(),
                      copyType: billCopyType,
                      items: processedItems,
                      subtotal,
                      cgst,
                      sgst,
                      igst,
                      grand,
                      status: sbStatus,
                      createdAt: new Date().toISOString()
                    };

                    const updatedBills = [newBill, ...salesBills];
                    setSalesBills(updatedBills);
                    await storeSet('salesBills', updatedBills);

                    // Reduce finished goods inventory ONLY if NOT Sales Bill 2
                    if (!isSalesBill2) {
                      for (const item of processedItems) {
                        await changeStockByName(item.name, 'finished', -item.qty);
                      }
                    }

                    // Auto add customer if new
                    if (!customers.some((c) => c.name.toLowerCase() === sbCustomer.toLowerCase().trim())) {
                      const updatedCusts = [
                        ...customers,
                        {
                          name: sbCustomer.trim(),
                          phone: sbCustPhone,
                          place: sbCustAddress,
                          address: sbCustAddress,
                          pincode: sbCustPincode,
                          state: sbCustState,
                          gstin: isSalesBill2 ? '' : sbCustGstin
                        }
                      ];
                      setCustomers(updatedCusts);
                      await storeSet('customers', updatedCusts);
                    }

                    showToast(`${isSalesBill2 ? 'Non-GST Bill' : 'Tax Invoice'} ${sbBillNo} saved! Opening Preview...`);
                    setPreviewBill(newBill);
                    setEditBillData(JSON.parse(JSON.stringify(newBill)));
                    setIsEditingPreview(false);
                    setSbCustomer('');
                    setSbCustPhone('');
                    setSbCustGstin('');
                    setSbCustAddress('');
                    setSbCustPincode('');
                    setSbDispatchThrough('');
                    setSbArticleNo('');
                    setSbItems([{ name: '', hsn: '6304', qty: 0, rate: 0, taxRate: 5, discPct: 0 }]);
                    const activeComp = companies.find((c) => c.id === sbCompanyId) || companies[0];
                    setSbBillNo(generateNextBillNoForCompany(activeComp?.id || '', activeComp?.prefix || 'VC', updatedBills));
                  }}
                  className="btn primary full flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Sales Bill & Preview</span>
                </button>
              </div>

              {/* All Sales Bills Table */}
              <div className="panel">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="m-0">All Sales Bills ({salesBills.length})</h2>
                  <span className="text-xs text-slate-500 font-medium">Top 10 visible — scroll to view all</span>
                </div>
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
                      <tr>
                        <th>Bill No.</th>
                        <th>Billing Co.</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Article</th>
                        <th>Dispatched Via</th>
                        <th className="num">Total (₹)</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesBills.map((b, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold text-indigo-950">{b.billNo}</td>
                          <td>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {b.companyName || 'VCA Fabrics'} ({b.companyPrefix || 'VC'})
                            </span>
                          </td>
                          <td>
                            {b.billType === 'sales_bill_2' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                Non-GST
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Tax Invoice
                              </span>
                            )}
                          </td>
                          <td>{b.date}</td>
                          <td>{b.customerName}</td>
                          <td className="font-bold text-slate-800 text-xs">{b.articleNo || '—'}</td>
                          <td className="text-slate-600 text-xs">{b.dispatchThrough || '—'}</td>
                          <td className="num font-mono font-bold">₹{b.grand.toFixed(2)}</td>
                          <td><span className={`pill ${b.status}`}>{b.status}</span></td>
                          <td>
                            <button
                              onClick={() => {
                                setPreviewBill(b);
                                setEditBillData(JSON.parse(JSON.stringify(b)));
                                setIsEditingPreview(false);
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-indigo-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview / Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. CUSTOMER LEDGER TAB */}
          {activePage === 'ledger' && (
            <CustomerLedgerTab
              customers={customers}
              salesBills={salesBills}
              payments={payments}
              setPayments={setPayments}
              openInvoice={openInvoice}
              settings={settings}
              showToast={showToast}
              onGoToCustomerPayment={(custName) => {
                setTargetCustomerForTab(custName);
                setTargetCustomerAction('payment');
                setActivePage('customers');
              }}
              onGoToCustomerLedger={(custName) => {
                setTargetCustomerForTab(custName);
                setTargetCustomerAction('ledger');
                setActivePage('customers');
              }}
            />
          )}

          {/* 6. PURCHASE BILLS TAB */}
          {activePage === 'purchaseBills' && (
            <PurchaseTab
              purchaseBills={purchaseBills}
              setPurchaseBills={setPurchaseBills}
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              inventory={inventory}
              setInventory={setInventory}
              openInvoice={openInvoice}
              showToast={showToast}
              pbPoNo={pbPoNo}
              setPbPoNo={setPbPoNo}
            />
          )}

          {/* 7. INVENTORY TAB */}
          {activePage === 'inventory' && (
            <InventoryTab
              inventory={inventory}
              setInventory={setInventory}
              showToast={showToast}
            />
          )}

          {/* 8. PRODUCTION LOGS / MACHINE OPS */}
          {activePage === 'production' && (
            <ProductionTab
              productionLogs={productionLogs}
              setProductionLogs={setProductionLogs}
              employees={employees}
              varieties={varieties}
              inventory={inventory}
              setInventory={setInventory}
              showToast={showToast}
            />
          )}

          {/* 9. EMPLOYEES & SALARY */}
          {activePage === 'employees' && (
            <EmployeesTab
              employees={employees}
              setEmployees={setEmployees}
              salaryAdvances={salaryAdvances}
              setSalaryAdvances={setSalaryAdvances}
              showToast={showToast}
            />
          )}

          {/* 10. CUSTOMERS */}
          {activePage === 'customers' && (
            <CustomersTab
              customers={customers}
              setCustomers={setCustomers}
              salesBills={salesBills}
              setSalesBills={setSalesBills}
              payments={payments}
              setPayments={setPayments}
              openInvoice={openInvoice}
              settings={settings}
              showToast={showToast}
              initialCustomerName={targetCustomerForTab}
              initialAction={targetCustomerAction}
              onClearInitial={() => {
                setTargetCustomerForTab(null);
                setTargetCustomerAction(null);
              }}
            />
          )}

          {/* 11. SUPPLIERS */}
          {activePage === 'suppliers' && (
            <SuppliersTab
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              showToast={showToast}
            />
          )}

          {/* 12. SETTINGS */}
          {activePage === 'settings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h1 className="page-title text-2xl font-serif font-bold text-slate-900 m-0">Company & Billing Settings</h1>
                  <p className="text-xs text-slate-600 m-0 mt-0.5">Manage default company profile and subsidiary billing companies with custom invoice prefixes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Company Settings */}
                <div className="panel lg:col-span-1">
                  <h2 className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Main Business Profile</span>
                  </h2>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Brand Logo Emblem</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <img 
                          src={settings.logo || VCA_LOGO_DATA_URL} 
                          alt="Logo" 
                          className="w-12 h-12 object-contain bg-white rounded border border-slate-200 p-1 shrink-0" 
                        />
                        <div className="flex-1 space-y-1">
                          <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded text-[11px] cursor-pointer inline-block border border-indigo-200 transition-colors">
                            <span>Upload Logo Image</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result) {
                                      setSettings({ ...settings, logo: ev.target.result as string });
                                      showToast('Custom logo uploaded!');
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                          {settings.logo && settings.logo !== VCA_LOGO_DATA_URL && (
                            <button
                              type="button"
                              onClick={() => {
                                setSettings({ ...settings, logo: VCA_LOGO_DATA_URL });
                                showToast('Reset to default Cotton Emblem Logo');
                              }}
                              className="text-[11px] text-rose-600 hover:underline font-semibold block cursor-pointer"
                            >
                              Reset to Default Cotton Symbol Logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={settings.name}
                        onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tagline / Subtitle</label>
                      <input
                        type="text"
                        value={settings.tagline || ''}
                        onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                        placeholder="e.g. Quality Towel & Fabric Manufacturers"
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={settings.address}
                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
                        <input
                          type="text"
                          value={settings.gstin}
                          onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Home State</label>
                        <input
                          type="text"
                          value={settings.state}
                          onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Contact</label>
                      <input
                        type="text"
                        value={settings.phone || ''}
                        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>

                    <button
                      onClick={async () => {
                        await storeSet('companySettings', settings);
                        showToast('Main business profile saved!');
                      }}
                      className="btn primary w-full mt-2"
                    >
                      Save Main Profile
                    </button>
                  </div>
                </div>

                {/* Subsidiary Billing Companies */}
                <div className="panel lg:col-span-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-slate-200 pb-3">
                    <div>
                      <h2 className="m-0 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        <span>Subsidiary Billing Companies ({companies.length})</span>
                      </h2>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        Shared inventory & stocks across all companies. Selectable per bill with unique prefixes.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditCompanyData({
                          id: 'comp_' + Date.now(),
                          name: '',
                          prefix: '',
                          address: '',
                          gstin: '',
                          phone: '',
                          state: 'Tamil Nadu',
                          bankName: '',
                          bankAccount: '',
                          bankIfsc: '',
                          isDefault: false
                        });
                        setShowCompanyModal(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Subsidiary Company</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {companies.map((c) => (
                      <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 hover:border-indigo-300 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{c.name}</span>
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-indigo-100 text-indigo-800 border border-indigo-200">
                                Prefix: {c.prefix || 'VC'}
                              </span>
                            </div>
                            {c.isDefault && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1 inline-block">
                                ✓ Default Billing Company
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditCompanyData({ ...c });
                                setShowCompanyModal(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Subsidiary Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {companies.length > 1 && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Delete ${c.name}?`)) {
                                    const updated = companies.filter((comp) => comp.id !== c.id);
                                    setCompanies(updated);
                                    await globalSet('companies', updated);
                                    showToast(`Deleted ${c.name}`);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Subsidiary Company"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1 font-medium border-t border-slate-200 pt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700">GSTIN:</span>
                            <span className="font-mono text-slate-900">{c.gstin || 'Non-GST'}</span>
                          </div>
                          {c.phone && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-700">Phone:</span>
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {c.address && (
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {c.address}
                            </div>
                          )}
                          {c.bankAccount && (
                            <div className="text-[11px] text-indigo-900 bg-indigo-50/60 p-1.5 rounded border border-indigo-100/80 font-mono">
                              Bank: {c.bankName} | A/C: {c.bankAccount} | IFSC: {c.bankIfsc}
                            </div>
                          )}
                        </div>

                        {!c.isDefault && (
                          <button
                            onClick={async () => {
                              const updated = companies.map((comp) => ({
                                ...comp,
                                isDefault: comp.id === c.id
                              }));
                              setCompanies(updated);
                              await globalSet('companies', updated);
                              showToast(`${c.name} set as default billing company!`);
                            }}
                            className="w-full py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer text-center transition-colors mt-1"
                          >
                            Set as Default Billing Company
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* RESET & DATA PURGE FOR LIVE PRODUCTION USE */}
                  <div className="mt-6 pt-5 border-t border-slate-200 bg-rose-50/50 p-4 rounded-xl border border-rose-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-rose-900 m-0 flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span>Production Readiness & Sample Data Controls</span>
                        </h3>
                        <p className="text-xs text-rose-700 m-0 mt-1">
                          Manage your live database. Purge test data for a clean slate or reload the default towel catalog, employee list, and quality checks at any time. Your Company Name & Profile will be <strong>100% preserved</strong>.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            if (confirm('Load default towel varieties catalog, employees, orders, and quality check samples?')) {
                              setInventory(DEFAULT_INVENTORY);
                              await storeSet('inventory', DEFAULT_INVENTORY);
                              setEmployees(DEFAULT_EMPLOYEES);
                              await storeSet('employees', DEFAULT_EMPLOYEES);
                              setProductionOrders(DEFAULT_PRODUCTION_ORDERS);
                              await storeSet('productionOrders', DEFAULT_PRODUCTION_ORDERS);
                              setVarieties(DEFAULT_VARIETIES);
                              await storeSet('varietyCatalog', DEFAULT_VARIETIES);
                              setQualityAudits(DEFAULT_QUALITY_AUDITS);
                              await storeSet('qualityAudits', DEFAULT_QUALITY_AUDITS);
                              setRoutineReminders(DEFAULT_ROUTINE_REMINDERS);
                              await storeSet('routineReminders', DEFAULT_ROUTINE_REMINDERS);
                              showToast('Default catalog & sample data loaded successfully!');
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reload Default Catalog</span>
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete ALL test bills, orders, inventory, customers, suppliers & logs? Company profile settings will be kept intact.')) {
                              await clearAllTestData();
                              setCustomers([]);
                              setSuppliers([]);
                              setInventory([]);
                              setSalesBills([]);
                              setPurchaseBills([]);
                              setPayments([]);
                              setEmployees([]);
                              setProductionLogs([]);
                              setSalaryAdvances([]);
                              setProductionOrders([]);
                              setVarieties([]);
                              setQualityAudits([]);
                              setRoutineReminders([]);
                              showToast('All test data cleared! App is ready for live production use.');
                            }
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Purge Test Data</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SALES BILL PREVIEW & LIVE EDIT MODAL */}
      {previewBill && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] sm:max-h-[88vh] overflow-hidden flex flex-col my-auto">
            {/* Modal Sticky Header */}
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="truncate">
                  <h3 className="text-sm sm:text-base font-bold text-white m-0 flex items-center gap-2 truncate">
                    <span>Tax Invoice — {previewBill.billNo}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded ${previewBill.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                      {previewBill.status}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 m-0 font-mono truncate">
                    Dated: {previewBill.date} • {previewBill.customerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setIsEditingPreview(!isEditingPreview);
                    if (!isEditingPreview) {
                      setEditBillData(JSON.parse(JSON.stringify(previewBill)));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isEditingPreview
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">{isEditingPreview ? 'Show Preview' : 'Edit Bill'}</span>
                </button>

                <button
                  onClick={() => openInvoice(previewBill.billNo, 'sale', billCopyType)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>

                <button
                  onClick={() => {
                    setPreviewBill(null);
                    setIsEditingPreview(false);
                  }}
                  aria-label="Close invoice preview"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Copy Type Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <span>Print Copy Format:</span>
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                <button
                  onClick={() => setBillCopyType('original')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    billCopyType === 'original'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Original (Recipient)
                </button>
                <button
                  onClick={() => setBillCopyType('transport')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    billCopyType === 'transport'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Duplicate (Transporter)
                </button>
                <button
                  onClick={() => setBillCopyType('supplier')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    billCopyType === 'supplier'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Triplicate (Supplier)
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {!isEditingPreview ? (
                /* PREVIEW MODE VIEW */
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 text-slate-800 font-sans text-xs">
                  {/* Company Header */}
                  <div className="border-b-2 border-slate-900 pb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        {previewBill.billType === 'sales_bill_2' ? 'NON-GST INVOICE' : (previewBill.billType === 'purchase' ? 'PURCHASE BILL' : 'TAX INVOICE')}
                      </span>
                      <span className="text-[11px] font-mono font-bold bg-slate-100 border-1.5 border-slate-900 px-2.5 py-1 rounded text-slate-900">
                        {billCopyType === 'transport' ? 'DUPLICATE FOR TRANSPORTER' : billCopyType === 'supplier' ? 'TRIPLICATE FOR SUPPLIER' : (previewBill.billType === 'sales_bill_2' ? 'NON-GST INVOICE — ORIGINAL' : 'ORIGINAL FOR RECIPIENT')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-4">
                      <div className="w-28 shrink-0 flex items-center justify-start">
                        <img 
                          src={settings.logo || VCA_LOGO_DATA_URL} 
                          alt="Company Logo" 
                          className="max-h-16 max-w-28 object-contain block" 
                        />
                      </div>
                      <div className="text-center flex-1 px-2">
                        <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 m-0 leading-tight uppercase tracking-tight">{previewBill.companyName || settings.name || 'VCA Fabrics'}</h2>
                        {settings.tagline && <p className="text-xs text-slate-600 italic mt-0.5">{settings.tagline}</p>}
                        <p className="text-xs text-slate-700 font-medium mt-1">{previewBill.companyAddress || settings.address}</p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                          {previewBill.companyGstin ? `GSTIN: ${previewBill.companyGstin}` : 'Non-GST'} {previewBill.companyPhone ? `| Ph: ${previewBill.companyPhone}` : (settings.phone ? `| Ph: ${settings.phone}` : '')}
                        </p>
                      </div>
                      <div className="w-28 text-right font-mono text-xs font-bold text-slate-900">
                        <div>Inv #: {previewBill.billNo}</div>
                        <div>Date: {previewBill.date}</div>
                      </div>
                    </div>
                  </div>

                  {/* Customer / Dispatch Details */}
                  {(() => {
                    const { totalQty: modalTotalQty, totalWeightKg: modalTotalWeight } = calculateBillWeightAndQty(previewBill.items);
                    return (
                      <div className="border-1.5 border-slate-900 grid grid-cols-1 sm:grid-cols-2 text-xs">
                        <div className="p-2.5 sm:border-r-1.5 border-slate-900">
                          <span className="text-xs uppercase font-black text-slate-900 block mb-1.5 tracking-wider">
                            DETAILS OF RECEIVER (BILLED TO)
                          </span>
                          <table className="w-full text-[13px]">
                            <tbody>
                              <tr><td className="w-16 font-bold text-slate-600 py-0.5">Name</td><td className="font-bold text-slate-900 py-0.5">: {previewBill.customerName}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">Address</td><td className="text-slate-800 py-0.5">: {previewBill.customerAddress || '—'} {previewBill.customerPincode ? `(${previewBill.customerPincode})` : ''}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">State</td><td className="text-slate-800 py-0.5">: {previewBill.customerState}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">GSTIN</td><td className="font-mono font-bold text-slate-900 py-0.5">: {previewBill.billType === 'sales_bill_2' || !previewBill.customerGstin ? '-' : previewBill.customerGstin}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">Phone</td><td className="text-slate-800 py-0.5">: {previewBill.customerPhone || '—'}</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="p-2.5 border-t sm:border-t-0 border-slate-900">
                          <span className="text-xs uppercase font-black text-slate-900 block mb-1.5 tracking-wider">
                            INVOICE & DISPATCH DETAILS
                          </span>
                          <table className="w-full text-[13px]">
                            <tbody>
                              <tr><td className="w-28 font-bold text-slate-600 py-0.5">Invoice No.</td><td className="font-mono font-bold text-slate-900 py-0.5">: {previewBill.billNo}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">Invoice Date</td><td className="font-mono text-slate-800 py-0.5">: {previewBill.date}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">Article</td><td className="font-bold text-slate-900 py-0.5">: {previewBill.articleNo || '—'}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">Dispatched Via</td><td className="font-bold text-slate-900 py-0.5">: {previewBill.dispatchThrough || '—'}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">Total Qty</td><td className="font-mono font-bold text-slate-900 py-0.5">: {modalTotalQty} {previewBill.items[0]?.unit || 'Pcs'}</td></tr>
                              <tr><td className="font-bold text-slate-600 py-0.5">Total Weight</td><td className="font-mono font-bold text-slate-900 py-0.5">: {modalTotalWeight > 0 ? modalTotalWeight.toFixed(2) + ' Kg' : '—'}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Items Table with Item Lines */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border-1.5 border-slate-900 text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 font-extrabold uppercase text-[11px] border-b-1.5 border-slate-900">
                          <th className="p-1.5 border-r border-slate-900 w-8 text-center">#</th>
                          <th className="p-1.5 border-r border-slate-900">DESCRIPTION OF GOODS</th>
                          <th className="p-1.5 border-r border-slate-900 text-center w-16">HSN</th>
                          <th className="p-1.5 border-r border-slate-900 text-center w-14">GST%</th>
                          <th className="p-1.5 border-r border-slate-900 text-right w-16">QTY</th>
                          <th className="p-1.5 border-r border-slate-900 text-center w-12">UNIT</th>
                          <th className="p-1.5 border-r border-slate-900 text-right w-20">RATE (₹)</th>
                          <th className="p-1.5 border-r border-slate-900 text-center w-14">DISC%</th>
                          <th className="p-1.5 text-right w-28">TAXABLE VALUE</th>
                        </tr>
                      </thead>
                      <tbody className="text-[12.5px]">
                        {previewBill.items.slice(0, 15).map((it, idx) => (
                          <tr key={idx} className="border-b border-slate-900">
                            <td className="p-1.5 border-r border-slate-900 font-mono text-center text-slate-600">{idx + 1}</td>
                            <td className="p-1.5 border-r border-slate-900 font-bold text-slate-900">{it.name}</td>
                            <td className="p-1.5 border-r border-slate-900 font-mono text-center text-slate-700">{it.hsn || '6304'}</td>
                            <td className="p-1.5 border-r border-slate-900 font-mono text-center">{it.taxRate}%</td>
                            <td className="p-1.5 border-r border-slate-900 text-right font-mono font-bold text-slate-900">{it.qty}</td>
                            <td className="p-1.5 border-r border-slate-900 text-center">{it.unit || 'Pcs'}</td>
                            <td className="p-1.5 border-r border-slate-900 text-right font-mono">₹{it.rate.toFixed(2)}</td>
                            <td className="p-1.5 border-r border-slate-900 text-center font-mono">{it.discPct ? `${it.discPct}%` : '—'}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{it.taxable.toFixed(2)}</td>
                          </tr>
                        ))}
                        {/* Blank Space Filler Row if less than 8 items */}
                        {previewBill.items.length < 8 && (
                          <tr>
                            <td style={{ height: `${Math.max(25, 140 - previewBill.items.length * 20)}px` }} className="border-r border-slate-900"></td>
                            <td className="border-r border-slate-900"></td>
                            <td className="border-r border-slate-900"></td>
                            <td className="border-r border-slate-900"></td>
                            <td className="border-r border-slate-900"></td>
                            <td className="border-r border-slate-900"></td>
                            <td className="border-r border-slate-900"></td>
                            <td className="border-r border-slate-900"></td>
                            <td></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Summary */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                    <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Amount in Words</span>
                      <p className="font-semibold text-slate-800 text-xs">{amountInWords(Math.round(previewBill.grand))}</p>
                    </div>

                    <div className="w-full sm:w-72 bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>₹{previewBill.subtotal.toFixed(2)}</span>
                      </div>
                      {previewBill.cgst > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>CGST:</span>
                          <span>₹{previewBill.cgst.toFixed(2)}</span>
                        </div>
                      )}
                      {previewBill.sgst > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>SGST:</span>
                          <span>₹{previewBill.sgst.toFixed(2)}</span>
                        </div>
                      )}
                      {previewBill.igst > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>IGST:</span>
                          <span>₹{previewBill.igst.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-300">
                        <span>Grand Total:</span>
                        <span className="text-indigo-700">₹{Math.round(previewBill.grand).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* EDIT MODE VIEW */
                editBillData && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
                      <span>Edit Bill Details — {editBillData.billNo}</span>
                      <span className="text-xs text-amber-600 font-normal">Modify values below and click Save</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Billing Company</label>
                        <select
                          value={editBillData.companyId || 'comp-vca'}
                          onChange={(e) => {
                            const selected = companies.find((c) => c.id === e.target.value);
                            if (selected) {
                              setEditBillData({
                                ...editBillData,
                                companyId: selected.id,
                                companyName: selected.name,
                                companyPrefix: selected.prefix,
                                companyGstin: selected.gstin,
                                companyAddress: selected.address,
                                companyPhone: selected.phone,
                                companyState: selected.state,
                                companyBankName: selected.bankName,
                                companyBankAccount: selected.bankAccount,
                                companyBankIfsc: selected.bankIfsc
                              });
                            }
                          }}
                          className="w-full p-2 border border-slate-300 rounded font-bold bg-amber-50/50"
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.prefix})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Invoice Date</label>
                        <input
                          type="date"
                          value={editBillData.date}
                          onChange={(e) => setEditBillData({ ...editBillData, date: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={editBillData.customerName}
                          onChange={(e) => setEditBillData({ ...editBillData, customerName: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Article / Desig No.</label>
                        <input
                          type="text"
                          value={editBillData.articleNo || ''}
                          onChange={(e) => setEditBillData({ ...editBillData, articleNo: e.target.value })}
                          placeholder="e.g. ART-101 / D-5"
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Payment Status</label>
                        <select
                          value={editBillData.status}
                          onChange={(e) => setEditBillData({ ...editBillData, status: e.target.value as any })}
                          className="w-full p-2 border border-slate-300 rounded"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Dispatched Through</label>
                        <input
                          type="text"
                          value={editBillData.dispatchThrough || ''}
                          onChange={(e) => setEditBillData({ ...editBillData, dispatchThrough: e.target.value })}
                          placeholder="e.g. VRL Logistics"
                          className="w-full p-2 border border-slate-300 rounded"
                        />
                      </div>
                    </div>

                    <h5 className="font-bold text-slate-700 text-xs mt-3 mb-1">Line Items</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-600 uppercase border-y border-slate-200">
                            <th className="p-2">Item Name</th>
                            <th className="p-2">HSN</th>
                            <th className="p-2 w-20">Qty</th>
                            <th className="p-2 w-24">Rate (₹)</th>
                            <th className="p-2 w-20">Tax %</th>
                            <th className="p-2 w-20">Disc %</th>
                            <th className="p-2 w-24 text-right">Taxable</th>
                            <th className="p-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editBillData.items.map((it, idx) => (
                            <tr key={idx} className="border-b border-slate-200">
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={it.name}
                                  onChange={(e) => {
                                    const updated = [...editBillData.items];
                                    updated[idx].name = e.target.value;
                                    setEditBillData({ ...editBillData, items: updated });
                                  }}
                                  className="w-full p-1.5 border border-slate-300 rounded"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={it.hsn}
                                  onChange={(e) => {
                                    const updated = [...editBillData.items];
                                    updated[idx].hsn = e.target.value;
                                    setEditBillData({ ...editBillData, items: updated });
                                  }}
                                  className="w-full p-1.5 border border-slate-300 rounded font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={it.qty}
                                  onChange={(e) => {
                                    const updated = [...editBillData.items];
                                    const val = e.target.value;
                                    updated[idx].qty = val === '' ? 0 : (parseFloat(val) || 0);
                                    setEditBillData({ ...editBillData, items: updated });
                                  }}
                                  className="w-full p-1.5 border border-slate-300 rounded font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={it.rate}
                                  onChange={(e) => {
                                    const updated = [...editBillData.items];
                                    const val = e.target.value;
                                    updated[idx].rate = val === '' ? 0 : (parseFloat(val) || 0);
                                    setEditBillData({ ...editBillData, items: updated });
                                  }}
                                  className="w-full p-1.5 border border-slate-300 rounded font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={it.taxRate}
                                  onChange={(e) => {
                                    const updated = [...editBillData.items];
                                    const val = e.target.value;
                                    updated[idx].taxRate = val === '' ? 0 : (parseFloat(val) || 0);
                                    setEditBillData({ ...editBillData, items: updated });
                                  }}
                                  className="w-full p-1.5 border border-slate-300 rounded font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={it.discPct}
                                  onChange={(e) => {
                                    const updated = [...editBillData.items];
                                    const val = e.target.value;
                                    updated[idx].discPct = val === '' ? 0 : (parseFloat(val) || 0);
                                    setEditBillData({ ...editBillData, items: updated });
                                  }}
                                  className="w-full p-1.5 border border-slate-300 rounded font-mono"
                                />
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-800">
                                ₹{(it.qty * it.rate * (1 - (it.discPct || 0) / 100)).toFixed(2)}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => {
                                    const updated = editBillData.items.filter((_, i) => i !== idx);
                                    setEditBillData({ ...editBillData, items: updated });
                                  }}
                                  className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={() => {
                        setEditBillData({
                          ...editBillData,
                          items: [...editBillData.items, { name: 'New Towel Item', hsn: '6304', qty: 1, rate: 100, taxRate: 5, discPct: 0, taxable: 100, cgst: 2.5, sgst: 2.5, igst: 0, amt: 105 }]
                        });
                      }}
                      className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => setIsEditingPreview(false)}
                        className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={async () => {
                          const recomputedItems = editBillData.items.map((i) => {
                            const taxable = i.qty * i.rate * (1 - (i.discPct || 0) / 100);
                            const tax = splitTax(taxable, i.taxRate, editBillData.customerState, settings.state || 'Tamil Nadu');
                            return { ...i, taxable, cgst: tax.cgst, sgst: tax.sgst, igst: tax.igst, amt: taxable + tax.taxAmt };
                          });

                          const subtotal = recomputedItems.reduce((s, i) => s + i.taxable, 0);
                          const cgst = recomputedItems.reduce((s, i) => s + i.cgst, 0);
                          const sgst = recomputedItems.reduce((s, i) => s + i.sgst, 0);
                          const igst = recomputedItems.reduce((s, i) => s + i.igst, 0);
                          const grand = subtotal + cgst + sgst + igst;

                          const updatedBill: SalesBill = {
                            ...editBillData,
                            items: recomputedItems,
                            subtotal,
                            cgst,
                            sgst,
                            igst,
                            grand
                          };

                          const updatedList = salesBills.map((b) => (b.billNo === updatedBill.billNo ? updatedBill : b));
                          setSalesBills(updatedList);
                          await storeSet('salesBills', updatedList);
                          setPreviewBill(updatedBill);
                          setIsEditingPreview(false);
                          showToast(`Bill ${updatedBill.billNo} updated successfully!`);
                        }}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save & Update Invoice</span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Sticky Bottom Footer */}
            <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPreviewBill(null);
                  setIsEditingPreview(false);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Close Preview</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW CUSTOMER MODAL */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col my-auto">
            {/* Sticky Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold m-0 text-white">Register New Customer</h3>
                  <p className="text-[11px] text-slate-400 m-0">Customer details will be saved & auto-filled in bill</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCustModal(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={newCustForm.name}
                    onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                    placeholder="Enter full customer name"
                    style={{ paddingLeft: '2.5rem' }}
                    className="w-full pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <input
                      type="tel"
                      value={newCustForm.phone}
                      onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                      placeholder="Mobile / WhatsApp"
                      style={{ paddingLeft: '2.5rem' }}
                      className="w-full pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN No.</label>
                  <div className="relative flex items-center">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <input
                      type="text"
                      value={newCustForm.gstin}
                      onChange={(e) => setNewCustForm({ ...newCustForm, gstin: e.target.value })}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      style={{ paddingLeft: '2.5rem' }}
                      className="w-full pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-[11px] uppercase text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State (GST)</label>
                  <select
                    value={newCustForm.state}
                    onChange={(e) => setNewCustForm({ ...newCustForm, state: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  >
                    <option value="Tamil Nadu">Tamil Nadu (33)</option>
                    <option value="Andhra Pradesh">Andhra Pradesh (37)</option>
                    <option value="Kerala">Kerala (32)</option>
                    <option value="Karnataka">Karnataka (29)</option>
                    <option value="Telangana">Telangana (36)</option>
                    <option value="Maharashtra">Maharashtra (27)</option>
                    <option value="Gujarat">Gujarat (24)</option>
                    <option value="Delhi">Delhi (07)</option>
                    <option value="West Bengal">West Bengal (19)</option>
                    <option value="Punjab">Punjab (03)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={newCustForm.pincode}
                    onChange={(e) => setNewCustForm({ ...newCustForm, pincode: e.target.value })}
                    placeholder="e.g. 638001"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address / City</label>
                <textarea
                  rows={2}
                  value={newCustForm.address}
                  onChange={(e) => setNewCustForm({ ...newCustForm, address: e.target.value })}
                  placeholder="Street address, door no, town or district"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newCustForm.name.trim()) {
                      showToast('Please enter customer name');
                      return;
                    }
                    const newEntry: Customer = {
                      name: newCustForm.name.trim(),
                      phone: newCustForm.phone.trim(),
                      gstin: newCustForm.gstin.trim(),
                      state: newCustForm.state,
                      place: newCustForm.address.trim(),
                      address: newCustForm.address.trim(),
                      pincode: newCustForm.pincode.trim()
                    };

                    const updatedCusts = [...customers, newEntry];
                    setCustomers(updatedCusts);
                    await storeSet('customers', updatedCusts);

                    // Auto select into current sales bill
                    setSbCustomer(newEntry.name);
                    setSbCustPhone(newEntry.phone || '');
                    setSbCustGstin(newEntry.gstin || '');
                    setSbCustState(newEntry.state || 'Tamil Nadu');
                    setSbCustAddress(newEntry.address || '');
                    setSbCustPincode(newEntry.pincode || '');

                    setShowAddCustModal(false);
                    showToast(`Customer "${newEntry.name}" registered & selected!`);
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Auto-Fill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBSIDIARY COMPANY ADD / EDIT MODAL */}
      {showCompanyModal && editCompanyData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white m-0">
                  {companies.some((c) => c.id === editCompanyData.id) ? 'Edit Subsidiary Billing Company' : 'Add Subsidiary Billing Company'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCompanyModal(false);
                  setEditCompanyData(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-800 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={editCompanyData.name}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, name: e.target.value })}
                    placeholder="e.g. Jayachitra Textiles"
                    className="w-full p-2 border border-slate-300 rounded font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Invoice Prefix * <span className="text-[10px] text-indigo-600 font-normal">(e.g. JT, VC)</span>
                  </label>
                  <input
                    type="text"
                    value={editCompanyData.prefix}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                    placeholder="e.g. JT"
                    className="w-full p-2 border border-indigo-300 bg-indigo-50/50 rounded font-mono font-bold text-indigo-900 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={editCompanyData.gstin}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 33AJTEX5678G2Z1"
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editCompanyData.phone}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, phone: e.target.value })}
                    placeholder="e.g. +91 94432 10987"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">Address</label>
                  <input
                    type="text"
                    value={editCompanyData.address}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, address: e.target.value })}
                    placeholder="e.g. 45 Textile City Road, Karur"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">State</label>
                  <input
                    type="text"
                    value={editCompanyData.state}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, state: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <span className="block font-bold text-slate-900 text-xs mb-2">Bank Details (Printed on Invoice)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editCompanyData.bankName || ''}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, bankName: e.target.value })}
                      placeholder="Canara Bank"
                      className="w-full p-1.5 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account No.</label>
                    <input
                      type="text"
                      value={editCompanyData.bankAccount || ''}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, bankAccount: e.target.value })}
                      placeholder="50123984102"
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={editCompanyData.bankIfsc || ''}
                      onChange={(e) => setEditCompanyData({ ...editCompanyData, bankIfsc: e.target.value.toUpperCase() })}
                      placeholder="CNRB0002134"
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyModal(false);
                    setEditCompanyData(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editCompanyData.name.trim()) {
                      showToast('Company Name is required');
                      return;
                    }
                    const pfx = editCompanyData.prefix.trim().toUpperCase() || editCompanyData.name.slice(0, 2).toUpperCase();
                    const updatedCompany: SubsidiaryCompany = {
                      ...editCompanyData,
                      name: editCompanyData.name.trim(),
                      prefix: pfx
                    };

                    let updated: SubsidiaryCompany[];
                    if (companies.some((c) => c.id === editCompanyData.id)) {
                      updated = companies.map((c) => (c.id === editCompanyData.id ? updatedCompany : c));
                    } else {
                      updated = [...companies, updatedCompany];
                    }

                    setCompanies(updated);
                    await globalSet('companies', updated);
                    setShowCompanyModal(false);
                    setEditCompanyData(null);
                    showToast(`Subsidiary company "${updatedCompany.name}" saved! Prefix: ${pfx}`);
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Company</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VOICE CONTROL ASSISTANT (Disabled as requested to avoid UI overshadowing) */}
      {/* <VoiceControlAssistant activePage={activePage} setActivePage={setActivePage} /> */}

      {/* SUPABASE STATUS DIAGNOSTIC MODAL */}
      {showSupabaseModal && (
        <SupabaseStatusModal onClose={() => setShowSupabaseModal(false)} />
      )}

      {/* SECURITY & PWA INSTALLATION MODAL */}
      <SecurityAndPwaModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        isPinSet={!!appPin}
        onSetPin={handleSetPin}
        onDisablePin={handleDisablePin}
        autoLockMinutes={autoLockMinutes}
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
        isOnline={isOnline}
        onExportBackup={handleExportFullBackup}
        onImportBackup={handleImportBackup}
      />

      {/* FULLSCREEN PIN LOCK OVERLAY */}
      <PinLockOverlay
        isLocked={isAppLocked}
        correctPin={appPin}
        onUnlock={() => setIsAppLocked(false)}
        companyName={settings.name || 'VCA FABRICS'}
      />

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div id="toast" className="toast show">
          {toastMsg}
        </div>
      )}

      {/* PRINT CONTAINER */}
      <article id="printInvoice"></article>
    </div>
  );
}
