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
import { getSupabaseClient, getIsSupabaseConfigured } from './supabase';
import { VCA_LOGO_DATA_URL } from '../assets/vcaLogoData';

const STORE_PREFIX = 'vcaPreview:';
const GLOBAL_STORE_PREFIX = STORE_PREFIX + 'global:';

let activeCompanyId = 'comp-vca';

export function getActiveCompanyId(): string {
  try {
    const saved = localStorage.getItem(GLOBAL_STORE_PREFIX + 'activeCompanyId');
    if (saved && saved !== 'vca-fabrics') return saved;
    return 'comp-vca';
  } catch {
    return 'comp-vca';
  }
}

export function setActiveCompanyId(id: string) {
  activeCompanyId = id;
  try {
    localStorage.setItem(GLOBAL_STORE_PREFIX + 'activeCompanyId', id);
  } catch {}
}

export function ensureUuid(idStr?: string): string {
  if (!idStr) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idStr)) return idStr;
  
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
    hash |= 0;
  }
  const h = Math.abs(hash).toString(16).padStart(8, '0');
  const full = (h + '1234567890abcdef1234567890abcdef').substring(0, 32);
  return `${full.substring(0, 8)}-${full.substring(8, 12)}-4${full.substring(13, 16)}-a${full.substring(17, 20)}-${full.substring(20, 32)}`;
}

function scopedKey(key: string): string {
  if (key === 'customers') {
    return GLOBAL_STORE_PREFIX + 'customers';
  }
  return STORE_PREFIX + getActiveCompanyId() + ':' + key;
}

export function mergePayloads<T>(key: string, localVal: T, cloudVal: T): T {
  if (!localVal) return cloudVal;
  if (!cloudVal) return localVal;

  if (Array.isArray(localVal) && Array.isArray(cloudVal)) {
    const combinedMap = new Map<string, any>();

    const getItemKey = (item: any) => {
      if (!item || typeof item !== 'object') return String(item);
      if (key === 'customers' || key === 'suppliers' || key === 'inventory' || key === 'employees') {
        if (item.name) return key + ':' + item.name.toLowerCase().trim();
      }
      if (key === 'salesBills') {
        if (item.billNo) return 'sb:' + item.billNo.toLowerCase().trim();
      }
      if (key === 'purchaseBills') {
        if (item.poNo || item.billNo) return 'pb:' + (item.poNo || item.billNo).toLowerCase().trim();
      }
      if (key === 'varietyCatalog') {
        if (item.varietyName) return 'vc:' + item.varietyName.toLowerCase().trim();
      }
      return item.id || JSON.stringify(item);
    };

    for (const item of cloudVal) {
      if (item && typeof item === 'object') {
        const k = getItemKey(item);
        combinedMap.set(k, item);
      } else {
        combinedMap.set(String(item), item);
      }
    }

    for (const item of localVal) {
      if (item && typeof item === 'object') {
        const k = getItemKey(item);
        const existing = combinedMap.get(k);
        combinedMap.set(k, existing ? { ...existing, ...item } : item);
      } else {
        combinedMap.set(String(item), item);
      }
    }

    return Array.from(combinedMap.values()) as unknown as T;
  }

  if (typeof localVal === 'object' && typeof cloudVal === 'object') {
    return { ...cloudVal, ...localVal };
  }

  return localVal || cloudVal;
}

export async function storeGet<T>(key: string, fallback: T): Promise<T> {
  let hasLocalData = false;
  let localVal: T = fallback;
  try {
    const value = localStorage.getItem(scopedKey(key));
    if (value) {
      localVal = JSON.parse(value);
      hasLocalData = true;
    }
  } catch (e) {}

  const client = getSupabaseClient();
  if (getIsSupabaseConfigured() && client) {
    try {
      const companyId = getActiveCompanyId();
      const { data, error } = await client
        .from('app_state')
        .select('payload')
        .eq('company_id', companyId)
        .eq('store_key', key)
        .maybeSingle();

      if (key === 'customers') {
        const { data: allCustState } = await client
          .from('app_state')
          .select('payload')
          .eq('store_key', 'customers');

        let combinedCustList: any[] = [];
        if (allCustState && allCustState.length > 0) {
          allCustState.forEach(row => {
            if (Array.isArray(row.payload)) {
              combinedCustList.push(...row.payload);
            }
          });
        }

        if (data && Array.isArray(data.payload)) {
          combinedCustList.push(...data.payload);
        }

        if (combinedCustList.length > 0) {
          const mergedCusts = mergePayloads('customers', localVal, combinedCustList) as unknown as T;
          try { localStorage.setItem(scopedKey('customers'), JSON.stringify(mergedCusts)); } catch {}
          syncPayloadToRelationalTable(companyId, 'customers', mergedCusts);
          return mergedCusts;
        }
      }

      if (!error && data && data.payload !== null && data.payload !== undefined) {
        const cloudVal = data.payload as T;
        const merged = hasLocalData ? mergePayloads(key, localVal, cloudVal) : cloudVal;
        try {
          localStorage.setItem(scopedKey(key), JSON.stringify(merged));
        } catch {}
        // Mirror to relational table
        syncPayloadToRelationalTable(companyId, key, merged);
        return merged;
      }

      // Upload local storage data to Cloud if Cloud doesn't have it yet
      if (hasLocalData && localVal !== null && localVal !== undefined) {
        try {
          await client.from('app_state').upsert({
            company_id: companyId,
            store_key: key,
            payload: localVal,
            updated_at: new Date().toISOString()
          }, { onConflict: 'company_id,store_key' });
        } catch (e) {}
      }

      // Relational Fallbacks for all entity keys if app_state row was empty or not populated yet
      if (key === 'inventory') {
        const { data: invRows } = await client.from('inventory').select('*').eq('company_id', companyId);
        if (invRows && invRows.length > 0) {
          const mapped: InventoryItem[] = invRows.map((r: any) => ({
            id: r.id,
            name: r.name,
            type: r.type,
            unit: r.unit,
            qty: Number(r.qty) || 0,
            reorderLevel: Number(r.reorder_level) || 0
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'salesBills') {
        const uuidCompId = ensureUuid(companyId);
        const { data: billRows } = await client.from('sales_bills').select('*').or(`company_id.eq.${companyId},company_id.eq.${uuidCompId}`);
        if (billRows && billRows.length > 0) {
          const mapped: SalesBill[] = billRows.map((b: any) => ({
            id: b.id,
            billNo: b.bill_no,
            date: b.date,
            customerName: b.customer_name,
            customerPhone: b.customer_phone || '',
            customerGstin: b.customer_gstin || '',
            customerAddress: b.customer_address || '',
            customerState: b.customer_state || 'Tamil Nadu',
            subtotal: Number(b.subtotal) || 0,
            cgst: Number(b.cgst) || 0,
            sgst: Number(b.sgst) || 0,
            igst: Number(b.igst) || 0,
            grand: Number(b.grand) || Number(b.grand_total) || 0,
            status: (b.status === 'paid' || b.status === 'unpaid') ? b.status : 'unpaid',
            items: b.items || []
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'purchaseBills') {
        const { data: pRows } = await client.from('purchase_bills').select('*').eq('company_id', companyId);
        if (pRows && pRows.length > 0) {
          const mapped: PurchaseBill[] = pRows.map((b: any) => ({
            id: b.id,
            poNo: b.po_no || b.bill_no || 'PO-000',
            supplierInvNo: b.supplier_inv_no || 'INV-000',
            date: b.date || new Date().toISOString().split('T')[0],
            supplierName: b.supplier_name || 'Supplier',
            supplierState: b.supplier_state || 'Tamil Nadu',
            subtotal: Number(b.subtotal) || 0,
            cgst: Number(b.cgst) || 0,
            sgst: Number(b.sgst) || 0,
            igst: Number(b.igst) || 0,
            grand: Number(b.grand) || Number(b.grand_total) || 0,
            status: b.status === 'unpaid' ? 'unpaid' : 'paid',
            items: b.items || []
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'customers') {
        const { data: custRows } = await client.from('customers').select('*');
        if (custRows && custRows.length > 0) {
          const mapped: Customer[] = custRows.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            place: c.place || c.address || '',
            gstin: c.gstin || '',
            address: c.address || '',
            state: c.state || 'Tamil Nadu',
            pincode: c.pincode || '',
            balance: Number(c.balance) || 0
          }));
          const uniqueMap = new Map<string, Customer>();
          mapped.forEach(c => {
            const k = (c.name || '').toLowerCase().trim();
            if (k) {
              const existing = uniqueMap.get(k);
              uniqueMap.set(k, existing ? { ...existing, ...c } : c);
            }
          });
          const cleanList = Array.from(uniqueMap.values());
          try { localStorage.setItem(scopedKey(key), JSON.stringify(cleanList)); } catch {}
          return cleanList as unknown as T;
        }
      } else if (key === 'suppliers') {
        const { data: suppRows } = await client.from('suppliers').select('*').eq('company_id', companyId);
        if (suppRows && suppRows.length > 0) {
          const mapped: Supplier[] = suppRows.map((s: any) => ({
            id: s.id,
            name: s.name,
            phone: s.phone || '',
            place: s.place || s.address || '',
            gstin: s.gstin || '',
            address: s.address || '',
            state: s.state || 'Tamil Nadu',
            balance: Number(s.balance) || 0
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'employees') {
        const { data: empRows } = await client.from('employees').select('*').eq('company_id', companyId);
        if (empRows && empRows.length > 0) {
          const mapped: Employee[] = empRows.map((e: any) => ({
            id: e.id,
            name: e.name,
            role: e.role,
            machine: e.machine || '',
            salary: Number(e.salary) || 0
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'payments') {
        const { data: payRows } = await client.from('customer_payments').select('*').eq('company_id', companyId);
        if (payRows && payRows.length > 0) {
          const mapped: CustomerPayment[] = payRows.map((p: any) => ({
            id: p.id,
            customerName: p.customer_name,
            date: p.date,
            amount: Number(p.amount) || 0,
            note: p.note || p.ref_no || ''
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'productionOrders') {
        const { data: poRows } = await client.from('production_orders').select('*').eq('company_id', companyId);
        if (poRows && poRows.length > 0) {
          const mapped: ProductionOrder[] = poRows.map((o: any) => ({
            id: o.id,
            orderNo: o.order_no,
            customerName: o.customer_name,
            orderDate: o.order_date,
            deliveryDueDate: o.delivery_due_date,
            status: o.status,
            notes: o.notes,
            items: o.items || []
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'varietyCatalog') {
        const { data: varRows } = await client.from('variety_catalog').select('*').eq('company_id', companyId);
        if (varRows && varRows.length > 0) {
          const mapped: VarietyCatalog[] = varRows.map((v: any) => ({
            id: v.id,
            varietyName: v.variety_name,
            category: v.category,
            standardWeightGsm: Number(v.standard_weight_gsm) || 0,
            targetLengthCm: Number(v.target_length_cm) || 0,
            targetWidthCm: Number(v.target_width_cm) || 0,
            allowedSizingTolerancePct: Number(v.allowed_sizing_tolerance_pct) || 0,
            allowedGsmTolerancePct: Number(v.allowed_gsm_tolerance_pct) || 0,
            warpYarnSpec: v.warp_yarn_spec,
            weftYarnSpec: v.weft_yarn_spec,
            pileYarnSpec: v.pile_yarn_spec,
            createdDate: v.created_date,
            activeStatus: v.active_status ?? true,
            assignedMachines: v.assigned_machines || []
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'qualityAudits') {
        const { data: qaRows } = await client.from('quality_audits').select('*').eq('company_id', companyId);
        if (qaRows && qaRows.length > 0) {
          const mapped: QualityCheckAudit[] = qaRows.map((q: any) => ({
            id: q.id,
            checkDate: q.check_date,
            checkTime: q.check_time,
            machineNo: q.machine_no,
            varietyName: q.variety_name,
            operatorName: q.operator_name,
            sampleNo: Number(q.sample_no) || 1,
            actualLengthCm: Number(q.actual_length_cm) || 0,
            actualWidthCm: Number(q.actual_width_cm) || 0,
            actualWeightGsm: Number(q.actual_weight_gsm) || 0,
            borderQualityScore: Number(q.border_quality_score) || 0,
            selvedgeCondition: q.selvedge_condition,
            sizingStatus: q.sizing_status,
            gsmStatus: q.gsm_status,
            overallResult: q.overall_result,
            varianceNotes: q.variance_notes,
            actionTaken: q.action_taken,
            auditorName: q.auditor_name
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'routineReminders') {
        const { data: remRows } = await client.from('routine_reminders').select('*').eq('company_id', companyId);
        if (remRows && remRows.length > 0) {
          const mapped: RoutineTaskReminder[] = remRows.map((r: any) => ({
            id: r.id,
            taskTitle: r.task_title,
            machineNo: r.machine_no,
            category: r.category,
            frequencyDays: Number(r.frequency_days) || 1,
            lastCheckedDate: r.last_checked_date,
            nextDueDate: r.next_due_date,
            assignedRoleOrPerson: r.assigned_role_or_person,
            status: r.status,
            checklistItems: r.checklist_items || [],
            notes: r.notes
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      }
    } catch (e) {}
  }

  return localVal;
}

export async function safeUpsertRelationalTable(tableName: string, initialRows: any[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!getIsSupabaseConfigured() || !client || !initialRows || initialRows.length === 0) return false;

  let currentRows = initialRows.map(r => ({ ...r }));
  let maxAttempts = 12;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    let error: any = null;
    try {
      const res = await client.from(tableName).upsert(currentRows, { onConflict: 'id' });
      error = res.error;
    } catch (fetchErr: any) {
      console.warn(`⚠️ Network connection issue syncing '${tableName}' (Failed to fetch):`, fetchErr?.message || String(fetchErr));
      return false;
    }

    if (!error) {
      console.log(`✅ Relational sync success for ${tableName} (${currentRows.length} rows inserted)`);
      return true;
    }

    const errorMsg = error.message || error.details || String(error);

    // RLS Policy Error Check
    if (
      error.code === '42501' || 
      errorMsg.includes('row-level security') || 
      errorMsg.includes('permission denied') ||
      errorMsg.includes('violates row-level security policy')
    ) {
      console.warn(`⚠️ Relational table '${tableName}' has Row-Level Security (RLS) active in Supabase. Data is preserved safely in 'app_state'. Run the SQL Fix Script in Supabase Dashboard to enable relational table queries.`);
      return false;
    }

    // Check 1: Missing column error (e.g. "Could not find the 'address' column of 'customers' in the schema cache")
    const missingColMatch = errorMsg.match(/Could not find the '([^']+)' column/i);
    if (missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      console.warn(`⚠️ Column '${missingCol}' missing in '${tableName}' table schema. Stripping column and retrying...`);
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        delete copy[missingCol];
        return copy;
      });
      continue;
    }

    // Check 2: UUID syntax error (e.g. "invalid input syntax for type uuid: "comp-vca"")
    if (errorMsg.includes('invalid input syntax for type uuid')) {
      console.warn(`⚠️ UUID type requirement detected on '${tableName}'. Converting IDs to UUID format...`);
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        if (copy.company_id && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(String(copy.company_id))) {
          copy.company_id = ensureUuid(String(copy.company_id));
        }
        if (copy.id && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(String(copy.id))) {
          copy.id = ensureUuid(String(copy.id));
        }
        return copy;
      });
      continue;
    }

    // Unhandled error
    console.warn(`⚠️ Sync notice for ${tableName}:`, errorMsg);
    return false;
  }

  return false;
}

export async function syncPayloadToRelationalTable(companyId: string, key: string, val: any): Promise<void> {
  const client = getSupabaseClient();
  if (!getIsSupabaseConfigured() || !client || !val) return;

  try {
    if (key === 'companySettings' && typeof val === 'object') {
      const s = val as any;
      await safeUpsertRelationalTable('company_settings', [{
        id: companyId,
        company_id: companyId,
        name: s.name || '',
        address: s.address || '',
        phone: s.phone || '',
        gstin: s.gstin || '',
        state: s.state || 'Tamil Nadu',
        pincode: s.pincode || '',
        bank_name: s.bankName || '',
        bank_account: s.bankAccount || '',
        bank_ifsc: s.bankIfsc || '',
        bank_branch: s.bankBranch || '',
        updated_at: new Date().toISOString()
      }]);
    } else if (key === 'salesBills' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((b: any) => ({
        id: ensureUuid(b.id || `sb_${b.billNo}`),
        company_id: ensureUuid(companyId),
        bill_no: b.billNo || 'VC-000',
        date: b.date || new Date().toISOString().split('T')[0],
        customer_name: b.customerName || 'Customer',
        customer_phone: b.customerPhone || '',
        customer_gstin: b.customerGstin || '',
        customer_address: b.customerAddress || '',
        customer_state: b.customerState || 'Tamil Nadu',
        subtotal: Number(b.subtotal) || 0,
        cgst: Number(b.cgst) || 0,
        sgst: Number(b.sgst) || 0,
        igst: Number(b.igst) || 0,
        grand: Number(b.grand) || Number(b.grandTotal) || 0,
        grand_total: Number(b.grand) || Number(b.grandTotal) || 0,
        status: (b.status === 'paid' || b.status === 'unpaid') ? b.status : 'unpaid',
        items: b.items || []
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('sales_bills', Array.from(uniqueMap.values()));
    } else if (key === 'customers' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((c: any) => ({
        id: ensureUuid(c.id || `cust_${(c.name || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        name: c.name || 'Unnamed Customer',
        phone: c.phone || '',
        gstin: c.gstin || '',
        address: c.address || '',
        place: c.place || c.address || '',
        state: c.state || 'Tamil Nadu',
        pincode: c.pincode || '',
        balance: Number(c.balance) || 0
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('customers', Array.from(uniqueMap.values()));
    } else if (key === 'suppliers' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((s: any) => ({
        id: ensureUuid(s.id || `supp_${(s.name || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        name: s.name || 'Unnamed Supplier',
        phone: s.phone || '',
        gstin: s.gstin || '',
        address: s.address || '',
        place: s.place || s.address || '',
        state: s.state || 'Tamil Nadu',
        balance: Number(s.balance) || 0
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('suppliers', Array.from(uniqueMap.values()));
    } else if (key === 'inventory' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((item: any) => ({
        id: ensureUuid(item.id || `inv_${(item.name || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        name: item.name,
        type: item.type,
        unit: item.unit,
        qty: Number(item.qty) || 0,
        reorder_level: Number(item.reorderLevel) || 0
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('inventory', Array.from(uniqueMap.values()));
    } else if (key === 'employees' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((e: any) => ({
        id: ensureUuid(e.id || `emp_${(e.name || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        name: e.name,
        role: e.role,
        machine: e.machine || '',
        salary: Number(e.salary) || 0
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('employees', Array.from(uniqueMap.values()));
    } else if (key === 'purchaseBills' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((b: any) => ({
        id: ensureUuid(b.id || `pb_${b.poNo || b.billNo || 'PB-000'}`),
        company_id: ensureUuid(companyId),
        bill_no: b.poNo || b.billNo || 'PB-000',
        po_no: b.poNo || b.billNo || 'PB-000',
        supplier_inv_no: b.supplierInvNo || '',
        date: b.date || new Date().toISOString().split('T')[0],
        supplier_name: b.supplierName || 'Supplier',
        supplier_state: b.supplierState || 'Tamil Nadu',
        subtotal: Number(b.subtotal) || 0,
        cgst: Number(b.cgst) || 0,
        sgst: Number(b.sgst) || 0,
        igst: Number(b.igst) || 0,
        grand_total: Number(b.grand) || Number(b.grandTotal) || 0,
        status: b.status || 'paid',
        items: b.items || []
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('purchase_bills', Array.from(uniqueMap.values()));
    } else if (key === 'payments' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((p: any) => ({
        id: ensureUuid(p.id || `pay_${p.date}_${p.amount}`),
        company_id: ensureUuid(companyId),
        customer_name: p.customerName || 'Customer',
        date: p.date || new Date().toISOString().split('T')[0],
        amount: Number(p.amount) || 0,
        payment_mode: p.paymentMode || 'cash',
        ref_no: p.note || p.refNo || ''
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('customer_payments', Array.from(uniqueMap.values()));
    } else if (key === 'productionOrders' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((o: any) => ({
        id: ensureUuid(o.id || `po_${o.orderNo}`),
        company_id: ensureUuid(companyId),
        order_no: o.orderNo,
        customer_name: o.customerName || null,
        order_date: o.orderDate || null,
        delivery_due_date: o.deliveryDueDate || null,
        status: o.status || 'in_production',
        notes: o.notes || null,
        items: o.items || []
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('production_orders', Array.from(uniqueMap.values()));
    } else if (key === 'varietyCatalog' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((v: any) => ({
        id: ensureUuid(v.id || `vc_${(v.varietyName || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        variety_name: v.varietyName,
        category: v.category || null,
        standard_weight_gsm: Number(v.standardWeightGsm) || 0,
        target_length_cm: Number(v.targetLengthCm) || 0,
        target_width_cm: Number(v.targetWidthCm) || 0,
        allowed_sizing_tolerance_pct: Number(v.allowedSizingTolerancePct) || 0,
        allowed_gsm_tolerance_pct: Number(v.allowedGsmTolerancePct) || 0,
        warp_yarn_spec: v.warpYarnSpec || null,
        weft_yarn_spec: v.weftYarnSpec || null,
        pile_yarn_spec: v.pileYarnSpec || null,
        created_date: v.createdDate || null,
        active_status: v.activeStatus ?? true,
        assigned_machines: v.assignedMachines || []
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('variety_catalog', Array.from(uniqueMap.values()));
    } else if (key === 'qualityAudits' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((q: any) => ({
        id: ensureUuid(q.id || `qa_${q.checkDate}_${q.machineNo}`),
        company_id: ensureUuid(companyId),
        check_date: q.checkDate || null,
        check_time: q.checkTime || null,
        machine_no: q.machineNo || null,
        variety_name: q.varietyName || null,
        operator_name: q.operatorName || null,
        sample_no: Number(q.sampleNo) || 1,
        actual_length_cm: Number(q.actualLengthCm) || 0,
        actual_width_cm: Number(q.actualWidthCm) || 0,
        actual_weight_gsm: Number(q.actualWeightGsm) || 0,
        border_quality_score: Number(q.borderQualityScore) || 0,
        selvedge_condition: q.selvedgeCondition || null,
        sizing_status: q.sizingStatus || null,
        gsm_status: q.gsmStatus || null,
        overall_result: q.overallResult || 'PASS',
        variance_notes: q.varianceNotes || null,
        action_taken: q.actionTaken || null,
        auditor_name: q.auditorName || null
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('quality_audits', Array.from(uniqueMap.values()));
    } else if (key === 'routineReminders' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((r: any) => ({
        id: ensureUuid(r.id || `rr_${(r.taskTitle || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        task_title: r.taskTitle,
        machine_no: r.machineNo || null,
        category: r.category || null,
        frequency_days: Number(r.frequencyDays) || 1,
        last_checked_date: r.lastCheckedDate || null,
        next_due_date: r.nextDueDate || null,
        assigned_role_or_person: r.assignedRoleOrPerson || null,
        status: r.status || 'pending',
        checklist_items: r.checklistItems || [],
        notes: r.notes || null
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('routine_reminders', Array.from(uniqueMap.values()));
    } else if (key === 'productionLogs' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((pl: any) => ({
        id: ensureUuid(pl.id || `pl_${pl.logDate}_${pl.machineNo}`),
        company_id: ensureUuid(companyId),
        log_date: pl.logDate || null,
        shift: pl.shift || null,
        machine_no: pl.machineNo || null,
        operator_name: pl.operatorName || null,
        meters_produced: Number(pl.metersProduced) || 0,
        picks: Number(pl.picks) || 0,
        efficiency_pct: Number(pl.efficiencyPct) || 0,
        notes: pl.notes || null
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('production_logs', Array.from(uniqueMap.values()));
    } else if (key === 'salaryAdvances' && Array.isArray(val) && val.length > 0) {
      const rows = val.map((sa: any) => ({
        id: ensureUuid(sa.id || `sa_${sa.employeeName}_${sa.advanceDate}`),
        company_id: ensureUuid(companyId),
        employee_id: sa.employeeId ? ensureUuid(sa.employeeId) : null,
        employee_name: sa.employeeName || null,
        advance_date: sa.advanceDate || null,
        amount: Number(sa.amount) || 0,
        repayment_status: sa.repaymentStatus || 'pending',
        notes: sa.notes || null
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      await safeUpsertRelationalTable('salary_advances', Array.from(uniqueMap.values()));
    }
  } catch (err: any) {
    console.warn(`Relational sync exception for key [${key}]:`, err?.message || String(err));
  }
}

export async function storeSet<T>(key: string, val: T): Promise<void> {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(val));
  } catch (e) {}

  const client = getSupabaseClient();
  if (getIsSupabaseConfigured() && client) {
    try {
      const companyId = getActiveCompanyId();
      const { error: appStateErr } = await client.from('app_state').upsert({
        company_id: companyId,
        store_key: key,
        payload: val,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id,store_key' });

      if (appStateErr) {
        console.warn(`storeSet app_state upsert error for ${key}:`, appStateErr.message);
      } else {
        console.log(`✅ Supabase state saved successfully to app_state [key: ${key}, company: ${companyId}]`);
      }

      // Mirror to dedicated relational table
      await syncPayloadToRelationalTable(companyId, key, val);
    } catch (e: any) {
      console.warn('Real-time Supabase sync warning:', e?.message || e);
    }
  }
}

export async function globalGet<T>(key: string, fallback: T): Promise<T> {
  let hasLocalData = false;
  let localVal = fallback;
  try {
    const value = localStorage.getItem(GLOBAL_STORE_PREFIX + key);
    if (value) {
      localVal = JSON.parse(value);
      hasLocalData = true;
    }
  } catch (e) {}

  const client = getSupabaseClient();
  if (getIsSupabaseConfigured() && client) {
    try {
      const { data, error } = await client
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
      } else if (hasLocalData) {
        await globalSet(key, localVal);
      }
    } catch (e) {}
  }

  return localVal;
}

export async function globalSet<T>(key: string, val: T): Promise<void> {
  try {
    localStorage.setItem(GLOBAL_STORE_PREFIX + key, JSON.stringify(val));
  } catch (e) {}

  const client = getSupabaseClient();
  if (getIsSupabaseConfigured() && client) {
    try {
      await client.from('app_state').upsert({
        company_id: 'global',
        store_key: key,
        payload: val,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id,store_key' });

      if (key === 'companies' && Array.isArray(val) && val.length > 0) {
        const rows = val.map((c: any) => ({
          id: c.id,
          name: c.name,
          prefix: c.prefix || '',
          address: c.address || '',
          gstin: c.gstin || '',
          phone: c.phone || '',
          state: c.state || 'Tamil Nadu',
          bank_name: c.bankName || null,
          bank_account: c.bankAccount || null,
          bank_ifsc: c.bankIfsc || null,
          is_default: Boolean(c.isDefault)
        }));
        await client.from('companies').upsert(rows, { onConflict: 'id' });
      }
    } catch (e) {}
  }
}

export async function forceSyncAllDataToCloud(): Promise<{ syncedKeys: number; error?: string }> {
  const client = getSupabaseClient();
  if (!getIsSupabaseConfigured() || !client) {
    return { syncedKeys: 0, error: 'Supabase credentials not configured' };
  }

  const companyId = getActiveCompanyId();
  const keysToSync = [
    'companySettings',
    'customers',
    'suppliers',
    'inventory',
    'salesBills',
    'purchaseBills',
    'payments',
    'employees',
    'productionLogs',
    'salaryAdvances',
    'productionOrders',
    'varietyCatalog',
    'qualityAudits',
    'routineReminders'
  ];

  let lastError: string | undefined = undefined;

  const syncSingleKey = async (key: string): Promise<boolean> => {
    try {
      const localRaw = localStorage.getItem(scopedKey(key));
      let localVal = localRaw ? JSON.parse(localRaw) : null;

      // Fetch existing Cloud row to perform smart merge
      const { data: cloudRow } = await client
        .from('app_state')
        .select('payload')
        .eq('company_id', companyId)
        .eq('store_key', key)
        .maybeSingle();

      let valToSave = localVal;

      if (cloudRow && cloudRow.payload !== null && cloudRow.payload !== undefined) {
        if (localVal) {
          valToSave = mergePayloads(key, localVal, cloudRow.payload);
        } else {
          valToSave = cloudRow.payload;
        }
      }

      if (!valToSave) {
        return false;
      }

      // Write merged val back to localStorage
      try {
        localStorage.setItem(scopedKey(key), JSON.stringify(valToSave));
      } catch (e) {}

      const val = valToSave;

      // 1. Sync to app_state
      const { error: appStateErr } = await client.from('app_state').upsert({
        company_id: companyId,
        store_key: key,
        payload: val,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id,store_key' });

      if (appStateErr) {
        lastError = appStateErr.message;
      }

      // 2. Relational table sync
      await syncPayloadToRelationalTable(companyId, key, val);

      return true;
    } catch (err: any) {
      return false;
    }
  };

  try {
    // Also sync global companies if exists locally
    try {
      const compsRaw = localStorage.getItem(GLOBAL_STORE_PREFIX + 'companies');
      if (compsRaw) {
        const comps = JSON.parse(compsRaw);
        await client.from('app_state').upsert({
          company_id: 'global',
          store_key: 'companies',
          payload: comps,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,store_key' });

        if (Array.isArray(comps) && comps.length > 0) {
          const compRows = comps.map((c: any) => ({
            id: c.id,
            name: c.name,
            prefix: c.prefix || '',
            address: c.address || '',
            gstin: c.gstin || '',
            phone: c.phone || '',
            state: c.state || 'Tamil Nadu',
            bank_name: c.bankName || null,
            bank_account: c.bankAccount || null,
            bank_ifsc: c.bankIfsc || null,
            is_default: Boolean(c.isDefault)
          }));
          await safeUpsertRelationalTable('companies', compRows);
        }
      }
    } catch (e) {}

    // Run all key syncs in parallel with a 6-second timeout race
    const syncPromise = Promise.allSettled(keysToSync.map(k => syncSingleKey(k)));
    const timeoutPromise = new Promise<any>((resolve) => 
      setTimeout(() => resolve('timeout'), 6000)
    );

    const raceResult = await Promise.race([syncPromise, timeoutPromise]);
    let syncedCount = 0;
    if (Array.isArray(raceResult)) {
      syncedCount = raceResult.filter(r => r.status === 'fulfilled' && r.value === true).length;
    }

    return { syncedKeys: syncedCount, error: lastError };
  } catch (err: any) {
    return { syncedKeys: 0, error: err?.message || 'Sync failed' };
  }
}

/**
 * Deletes a row from a relational table in Supabase by ID or name/number column.
 */
export async function deleteFromRelationalTable(
  tableName: string, 
  recordId?: string, 
  nameOrNoCol?: string, 
  nameOrNoVal?: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!getIsSupabaseConfigured() || !client) return false;

  try {
    if (recordId) {
      await client.from(tableName).delete().eq('id', recordId);
    }
    if (nameOrNoCol && nameOrNoVal) {
      await client.from(tableName).delete().ilike(nameOrNoCol, nameOrNoVal);
    }
    return true;
  } catch (err: any) {
    console.warn(`Error deleting from ${tableName}:`, err?.message || err);
    return false;
  }
}

/**
 * Sweeps Supabase relational tables (customers, sales_bills, suppliers, inventory, employees)
 * and purges duplicate rows keeping only 1 record per unique entity name/number.
 */
export async function cleanDatabaseDuplicatesInSupabase(): Promise<{ deletedCount: number; message: string }> {
  const client = getSupabaseClient();
  if (!getIsSupabaseConfigured() || !client) {
    return { deletedCount: 0, message: 'Supabase credentials not configured' };
  }

  const companyId = getActiveCompanyId();
  let totalDeleted = 0;

  try {
    // 1. Deduplicate 'customers' table in Supabase relational table
    const { data: customers } = await client.from('customers').select('*').eq('company_id', companyId);
    if (customers && customers.length > 1) {
      const seenNames = new Map<string, string>();
      const idsToDelete: string[] = [];

      for (const c of customers) {
        const normName = (c.name || '').toLowerCase().trim();
        if (!normName) continue;
        if (seenNames.has(normName)) {
          idsToDelete.push(c.id);
        } else {
          seenNames.set(normName, c.id);
        }
      }

      if (idsToDelete.length > 0) {
        const { error } = await client.from('customers').delete().in('id', idsToDelete);
        if (!error) {
          totalDeleted += idsToDelete.length;
        }
      }
    }

    // 2. Deduplicate 'sales_bills' table
    const { data: bills } = await client.from('sales_bills').select('*').eq('company_id', companyId);
    if (bills && bills.length > 1) {
      const seenBillNos = new Map<string, string>();
      const idsToDelete: string[] = [];

      for (const b of bills) {
        const normNo = (b.bill_no || '').toLowerCase().trim();
        if (!normNo) continue;
        if (seenBillNos.has(normNo)) {
          idsToDelete.push(b.id);
        } else {
          seenBillNos.set(normNo, b.id);
        }
      }

      if (idsToDelete.length > 0) {
        const { error } = await client.from('sales_bills').delete().in('id', idsToDelete);
        if (!error) {
          totalDeleted += idsToDelete.length;
        }
      }
    }

    // 3. Clean up duplicates in local storage & app_state for 'customers'
    const rawLocalCust = localStorage.getItem(scopedKey('customers'));
    if (rawLocalCust) {
      try {
        const parsed: any[] = JSON.parse(rawLocalCust);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const uniqueCustMap = new Map<string, any>();
          parsed.forEach(c => {
            const key = (c.name || '').toLowerCase().trim();
            if (key) {
              const existing = uniqueCustMap.get(key);
              uniqueCustMap.set(key, existing ? { ...existing, ...c } : c);
            }
          });
          const cleanCustList = Array.from(uniqueCustMap.values());
          localStorage.setItem(scopedKey('customers'), JSON.stringify(cleanCustList));
          
          await client.from('app_state').upsert({
            company_id: companyId,
            store_key: 'customers',
            payload: cleanCustList,
            updated_at: new Date().toISOString()
          }, { onConflict: 'company_id,store_key' });
        }
      } catch (e) {}
    }

    // 4. Clean up duplicates in local storage & app_state for 'salesBills'
    const rawLocalBills = localStorage.getItem(scopedKey('salesBills'));
    if (rawLocalBills) {
      try {
        const parsed: any[] = JSON.parse(rawLocalBills);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const uniqueBillMap = new Map<string, any>();
          parsed.forEach(b => {
            const key = (b.billNo || '').toLowerCase().trim();
            if (key) {
              const existing = uniqueBillMap.get(key);
              uniqueBillMap.set(key, existing ? { ...existing, ...b } : b);
            }
          });
          const cleanBillList = Array.from(uniqueBillMap.values());
          localStorage.setItem(scopedKey('salesBills'), JSON.stringify(cleanBillList));
          
          await client.from('app_state').upsert({
            company_id: companyId,
            store_key: 'salesBills',
            payload: cleanBillList,
            updated_at: new Date().toISOString()
          }, { onConflict: 'company_id,store_key' });
        }
      } catch (e) {}
    }

    return {
      deletedCount: totalDeleted,
      message: `Successfully cleaned database! Purged ${totalDeleted} duplicate rows from Supabase.`
    };
  } catch (err: any) {
    return {
      deletedCount: totalDeleted,
      message: `Notice: ${err?.message || String(err)}`
    };
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

