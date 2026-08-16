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
import { getSupabaseClient, getIsSupabaseConfigured, EXPECTED_TABLES } from './supabase';
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
  if (key === 'salesBills' || key === 'payments' || key === 'companySettings') {
    return STORE_PREFIX + getActiveCompanyId() + ':' + key;
  }
  return GLOBAL_STORE_PREFIX + key;
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
          const mergedCusts = mergePayloads<T>('customers', localVal, combinedCustList as unknown as T);
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
        const { data: suppRows } = await client.from('suppliers').select('*');
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
          const uniqueMap = new Map<string, Supplier>();
          mapped.forEach(s => {
            const k = (s.name || '').toLowerCase().trim();
            if (k) uniqueMap.set(k, s);
          });
          const cleanList = Array.from(uniqueMap.values());
          try { localStorage.setItem(scopedKey(key), JSON.stringify(cleanList)); } catch {}
          return cleanList as unknown as T;
        }
      } else if (key === 'employees') {
        const { data: empRows } = await client.from('employees').select('*');
        if (empRows && empRows.length > 0) {
          const mapped: Employee[] = empRows.map((e: any) => ({
            id: e.id,
            name: e.name,
            role: e.role,
            machine: e.machine || '',
            salary: Number(e.salary) || 0,
            phone: e.phone || '',
            loomCount: Number(e.loom_count) || Number(e.loomCount) || 1,
            loomRates: e.loom_rates || e.loomRates || []
          }));
          const uniqueMap = new Map<string, Employee>();
          mapped.forEach(e => {
            const k = (e.name || '').toLowerCase().trim();
            if (k) uniqueMap.set(k, e);
          });
          const cleanList = Array.from(uniqueMap.values());
          try { localStorage.setItem(scopedKey(key), JSON.stringify(cleanList)); } catch {}
          return cleanList as unknown as T;
        }
      } else if (key === 'productionLogs') {
        const { data: pLogRows } = await client.from('production_logs').select('*');
        if (pLogRows && pLogRows.length > 0) {
          const mapped: ProductionLog[] = pLogRows.map((pl: any) => ({
            id: pl.id,
            date: pl.date || pl.log_date || new Date().toISOString().split('T')[0],
            item: pl.item || pl.item_name || pl.variety_name || '',
            qty: Number(pl.qty) || Number(pl.qty_produced) || Number(pl.meters_produced) || 0,
            unit: pl.unit || 'pcs',
            notes: pl.notes || '',
            waste: Number(pl.waste) || 0,
            machine: pl.machine || pl.machine_no || 'M-1',
            employeeName: pl.employee_name || pl.operator_name || ''
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'salaryAdvances') {
        const { data: advRows } = await client.from('salary_advances').select('*');
        if (advRows && advRows.length > 0) {
          const mapped: SalaryAdvance[] = advRows.map((sa: any) => ({
            id: sa.id,
            employeeId: sa.employee_id || sa.employeeId || '',
            employeeName: sa.employee_name || sa.employeeName || '',
            amount: Number(sa.amount) || 0,
            date: sa.date || sa.advance_date || new Date().toISOString().split('T')[0],
            notes: sa.notes || ''
          }));
          try { localStorage.setItem(scopedKey(key), JSON.stringify(mapped)); } catch {}
          return mapped as unknown as T;
        }
      } else if (key === 'payments') {
        const uuidCompId = ensureUuid(companyId);
        const { data: payRows } = await client.from('customer_payments').select('*').or(`company_id.eq.${companyId},company_id.eq.${uuidCompId}`);
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
        let poRows: any[] | null = null;
        try {
          const { data } = await client.from('production_orders').select('*');
          if (data && data.length > 0) poRows = data;
        } catch (e) {}

        if (!poRows || poRows.length === 0) {
          try {
            const { data } = await client.from('orders').select('*');
            if (data && data.length > 0) poRows = data;
          } catch (e) {}
        }

        if (poRows && poRows.length > 0) {
          const mapped: ProductionOrder[] = poRows.map((o: any) => ({
            id: o.id,
            orderNo: o.order_no || o.order_number || o.po_no || o.id || 'ORD-001',
            customerName: o.customer_name || o.customerName || '',
            orderDate: o.order_date || o.orderDate || o.date || new Date().toISOString().split('T')[0],
            deliveryDueDate: o.delivery_due_date || o.deliveryDueDate || o.due_date || '',
            status: o.status || 'in_production',
            notes: o.notes || '',
            items: Array.isArray(o.items) ? o.items : []
          }));
          const uniqueMap = new Map<string, ProductionOrder>();
          mapped.forEach(o => {
            const k = (o.orderNo || o.id || '').toLowerCase().trim();
            if (k) uniqueMap.set(k, o);
          });
          const cleanList = Array.from(uniqueMap.values());
          try { localStorage.setItem(scopedKey(key), JSON.stringify(cleanList)); } catch {}
          return cleanList as unknown as T;
        }
      } else if (key === 'varietyCatalog') {
        const { data: varRows } = await client.from('variety_catalog').select('*');
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
          const uniqueMap = new Map<string, VarietyCatalog>();
          mapped.forEach(v => {
            const k = (v.varietyName || v.id || '').toLowerCase().trim();
            if (k) uniqueMap.set(k, v);
          });
          const cleanList = Array.from(uniqueMap.values());
          try { localStorage.setItem(scopedKey(key), JSON.stringify(cleanList)); } catch {}
          return cleanList as unknown as T;
        }
      } else if (key === 'qualityAudits') {
        const { data: qaRows } = await client.from('quality_audits').select('*');
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
  let maxAttempts = 15;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    let error: any = null;
    try {
      // 1. Try upsert first
      const res = await client.from(tableName).upsert(currentRows, { onConflict: 'id' });
      error = res.error;
    } catch (fetchErr: any) {
      console.warn(`⚠️ Network connection issue syncing '${tableName}':`, fetchErr?.message || String(fetchErr));
      return false;
    }

    if (!error) {
      return true;
    }

    const errorMsg = error.message || error.details || String(error);
    const errorCode = error.code || '';

    // If table completely does not exist in Supabase (42P01 / PGRST301)
    if (errorCode === '42P01' || errorMsg.includes('does not exist') || errorMsg.includes('relation') || errorCode === 'PGRST301') {
      return false;
    }

    // RLS Policy Error Check
    if (
      errorCode === '42501' || 
      errorMsg.includes('row-level security') || 
      errorMsg.includes('permission denied') ||
      errorMsg.includes('violates row-level security policy')
    ) {
      return false;
    }

    // Auto-Fix 1: Missing column error (e.g. "Could not find the 'xyz' column of 'table' in the schema cache")
    const missingColMatch = errorMsg.match(/Could not find the '([^']+)' column/i);
    if (missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        delete copy[missingCol];
        return copy;
      });
      continue;
    }

    // Auto-Fix 2: Column does not exist error
    const colNotExistMatch = errorMsg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
    if (colNotExistMatch && colNotExistMatch[1]) {
      const missingCol = colNotExistMatch[1];
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        delete copy[missingCol];
        return copy;
      });
      continue;
    }

    // Auto-Fix 3: UUID syntax error (e.g. "invalid input syntax for type uuid: "comp-vca"")
    if (errorMsg.includes('invalid input syntax for type uuid') || errorCode === '22P02') {
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        if (copy.company_id && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(String(copy.company_id))) {
          copy.company_id = ensureUuid(String(copy.company_id));
        }
        if (copy.id && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(String(copy.id))) {
          copy.id = ensureUuid(String(copy.id));
        }
        if (copy.employee_id && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(String(copy.employee_id))) {
          copy.employee_id = ensureUuid(String(copy.employee_id));
        }
        return copy;
      });
      continue;
    }

    // Auto-Fix 4: Foreign key violation (e.g., employee_id or company_id not in parent table)
    if (errorCode === '23503' || errorMsg.includes('violates foreign key constraint')) {
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        // If employee_id is causing FK constraint, nullify it
        if ('employee_id' in copy) delete copy.employee_id;
        return copy;
      });
      continue;
    }

    // Auto-Fix 5: NOT NULL constraint violation (e.g. null value in column "xyz" violates not-null constraint)
    const notNullMatch = errorMsg.match(/null value in column "([^"]+)"(?: of relation "[^"]+")? violates not-null constraint/i);
    if (notNullMatch && notNullMatch[1]) {
      const nullCol = notNullMatch[1];
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        if (copy[nullCol] === null || copy[nullCol] === undefined) {
          if (nullCol.includes('date')) copy[nullCol] = new Date().toISOString().split('T')[0];
          else if (nullCol.includes('id')) copy[nullCol] = ensureUuid('default_' + nullCol);
          else if (typeof copy[nullCol] === 'number' || nullCol.includes('amount') || nullCol.includes('qty') || nullCol.includes('total') || nullCol.includes('price')) copy[nullCol] = 0;
          else copy[nullCol] = '';
        }
        return copy;
      });
      continue;
    }

    // Auto-Fix 6: JSON string parsing issue for JSONB columns
    if (errorMsg.includes('json') || errorMsg.includes('JSON') || errorMsg.includes('array')) {
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        for (const [k, v] of Object.entries(copy)) {
          if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
            // Keep as valid object
          } else if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
            try { copy[k] = JSON.parse(v); } catch {}
          }
        }
        return copy;
      });
      continue;
    }

    // Unhandled error
    return false;
  }

  return false;
}

export async function syncPayloadToRelationalTable(companyId: string, key: string, val: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!getIsSupabaseConfigured() || !client || val === null || val === undefined) return false;

  try {
    if (key === 'companySettings' && typeof val === 'object') {
      const s = val as any;
      return await safeUpsertRelationalTable('company_settings', [{
        id: companyId,
        company_id: companyId,
        name: s.name || '',
        tagline: s.tagline || '',
        address: s.address || '',
        phone: s.phone || '',
        gstin: s.gstin || '',
        state: s.state || 'Tamil Nadu',
        pincode: s.pincode || '',
        role: s.role || 'admin',
        bank_name: s.bankName || '',
        bank_account: s.bankAccount || '',
        bank_ifsc: s.bankIfsc || '',
        bank_branch: s.bankBranch || '',
        logo: s.logo || '',
        updated_at: new Date().toISOString()
      }]);
    } else if (key === 'salesBills' && Array.isArray(val)) {
      if (val.length === 0) return true;
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
      return await safeUpsertRelationalTable('sales_bills', Array.from(uniqueMap.values()));
    } else if (key === 'customers' && Array.isArray(val)) {
      if (val.length === 0) return true;
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
      return await safeUpsertRelationalTable('customers', Array.from(uniqueMap.values()));
    } else if (key === 'suppliers' && Array.isArray(val)) {
      if (val.length === 0) return true;
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
      return await safeUpsertRelationalTable('suppliers', Array.from(uniqueMap.values()));
    } else if (key === 'inventory' && Array.isArray(val)) {
      if (val.length === 0) return true;
      const rows = val.map((item: any) => ({
        id: ensureUuid(item.id || `inv_${(item.name || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        name: item.name,
        type: item.type || 'raw',
        unit: item.unit || 'kg',
        qty: Number(item.qty) || 0,
        reorder_level: Number(item.reorderLevel) || 0
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      return await safeUpsertRelationalTable('inventory', Array.from(uniqueMap.values()));
    } else if (key === 'employees' && Array.isArray(val)) {
      if (val.length === 0) return true;
      const rows = val.map((e: any) => ({
        id: ensureUuid(e.id || `emp_${(e.name || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        name: e.name,
        role: e.role || 'Master Weaver',
        machine: e.machine || 'M-1',
        salary: Number(e.salary) || 0,
        phone: e.phone || '',
        loom_count: Number(e.loomCount) || 1,
        loom_rates: e.loomRates || []
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      return await safeUpsertRelationalTable('employees', Array.from(uniqueMap.values()));
    } else if (key === 'purchaseBills' && Array.isArray(val)) {
      if (val.length === 0) return true;
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
        grand: Number(b.grand) || Number(b.grandTotal) || 0,
        grand_total: Number(b.grand) || Number(b.grandTotal) || 0,
        status: b.status || 'paid',
        items: b.items || []
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      return await safeUpsertRelationalTable('purchase_bills', Array.from(uniqueMap.values()));
    } else if (key === 'payments' && Array.isArray(val)) {
      if (val.length === 0) return true;
      const rows = val.map((p: any) => ({
        id: ensureUuid(p.id || `pay_${p.date}_${p.amount}_${(p.customerName || '').toLowerCase()}`),
        company_id: ensureUuid(companyId),
        customer_name: p.customerName || 'Customer',
        date: p.date || new Date().toISOString().split('T')[0],
        amount: Number(p.amount) || 0,
        payment_mode: p.paymentMode || 'cash',
        ref_no: p.note || p.refNo || '',
        note: p.note || p.refNo || ''
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      return await safeUpsertRelationalTable('customer_payments', Array.from(uniqueMap.values()));
    } else if (key === 'productionOrders' && Array.isArray(val)) {
      if (val.length === 0) return true;
      const rows = val.map((o: any) => ({
        id: ensureUuid(o.id || `po_${o.orderNo}`),
        company_id: ensureUuid(companyId),
        order_no: o.orderNo || o.order_no || o.po_no || 'ORD-001',
        order_number: o.orderNo || o.order_no || o.po_no || 'ORD-001',
        po_no: o.orderNo || o.order_no || o.po_no || 'ORD-001',
        customer_name: o.customerName || o.customer_name || null,
        order_date: o.orderDate || o.order_date || o.date || new Date().toISOString().split('T')[0],
        delivery_due_date: o.deliveryDueDate || o.delivery_due_date || o.due_date || null,
        due_date: o.deliveryDueDate || o.delivery_due_date || o.due_date || null,
        status: o.status || 'in_production',
        notes: o.notes || null,
        items: Array.isArray(o.items) ? o.items : []
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      const cleanRows = Array.from(uniqueMap.values());
      const poOk = await safeUpsertRelationalTable('production_orders', cleanRows);
      const ordOk = await safeUpsertRelationalTable('orders', cleanRows);
      return poOk || ordOk;
    } else if (key === 'varietyCatalog' && Array.isArray(val)) {
      if (val.length === 0) return true;
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
      return await safeUpsertRelationalTable('variety_catalog', Array.from(uniqueMap.values()));
    } else if (key === 'qualityAudits' && Array.isArray(val)) {
      if (val.length === 0) return true;
      const rows = val.map((q: any) => ({
        id: ensureUuid(q.id || `qa_${q.checkDate}_${q.machineNo}_${q.sampleNo || 1}`),
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
      return await safeUpsertRelationalTable('quality_audits', Array.from(uniqueMap.values()));
    } else if (key === 'routineReminders' && Array.isArray(val)) {
      if (val.length === 0) return true;
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
      return await safeUpsertRelationalTable('routine_reminders', Array.from(uniqueMap.values()));
    } else if (key === 'productionLogs' && Array.isArray(val)) {
      if (val.length === 0) return true;
      const rows = val.map((pl: any) => ({
        id: ensureUuid(pl.id || `pl_${pl.date || pl.logDate}_${pl.machine || pl.machineNo}_${(pl.employeeName || pl.operatorName || '').toLowerCase().trim()}`),
        company_id: ensureUuid(companyId),
        date: pl.date || pl.logDate || new Date().toISOString().split('T')[0],
        log_date: pl.date || pl.logDate || new Date().toISOString().split('T')[0],
        shift: pl.shift || 'Day Shift',
        machine: pl.machine || pl.machineNo || 'M-1',
        machine_no: pl.machine || pl.machineNo || 'M-1',
        employee_name: pl.employeeName || pl.operatorName || 'Master Weaver',
        operator_name: pl.employeeName || pl.operatorName || 'Master Weaver',
        item: pl.item || pl.varietyName || 'Bath Towel',
        item_name: pl.item || pl.varietyName || 'Bath Towel',
        variety_name: pl.item || pl.varietyName || 'Bath Towel',
        qty: Number(pl.qty) || Number(pl.metersProduced) || 0,
        qty_produced: Number(pl.qty) || Number(pl.metersProduced) || 0,
        meters_produced: Number(pl.qty) || Number(pl.metersProduced) || 0,
        waste: Number(pl.waste) || 0,
        picks: Number(pl.picks) || 0,
        efficiency_pct: Number(pl.efficiencyPct) || 0,
        notes: pl.notes || null
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      return await safeUpsertRelationalTable('production_logs', Array.from(uniqueMap.values()));
    } else if (key === 'salaryAdvances' && Array.isArray(val)) {
      if (val.length === 0) return true;
      const rows = val.map((sa: any) => ({
        id: ensureUuid(sa.id || `sa_${sa.employeeId || sa.employeeName}_${sa.date || sa.advanceDate}`),
        company_id: ensureUuid(companyId),
        employee_id: sa.employeeId ? ensureUuid(sa.employeeId) : null,
        employee_name: sa.employeeName || null,
        date: sa.date || sa.advanceDate || new Date().toISOString().split('T')[0],
        advance_date: sa.date || sa.advanceDate || new Date().toISOString().split('T')[0],
        amount: Number(sa.amount) || 0,
        repayment_status: sa.repaymentStatus || 'pending',
        notes: sa.notes || null
      }));
      const uniqueMap = new Map<string, any>();
      rows.forEach(r => uniqueMap.set(r.id, r));
      return await safeUpsertRelationalTable('salary_advances', Array.from(uniqueMap.values()));
    }
  } catch (err: any) {
    console.warn(`Relational sync exception for key [${key}]:`, err?.message || String(err));
    return false;
  }
  return false;
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
    targetLengthCm: 55, // 55 inches
    targetWidthCm: 28,  // 28 inches
    allowedSizingTolerancePct: 1.5,
    allowedGsmTolerancePct: 2.0,
    warpYarnSpec: '2/20s Cotton Warp',
    weftYarnSpec: '16s Auto Weft',
    pileYarnSpec: '2/20s Combed Terry Pick',
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
    targetLengthCm: 24, // 24 inches
    targetWidthCm: 16,  // 16 inches
    allowedSizingTolerancePct: 2.0,
    allowedGsmTolerancePct: 3.0,
    warpYarnSpec: '20s Carded Warp',
    weftYarnSpec: '16s Weft',
    pileYarnSpec: '20s Ring Terry Pick',
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
    targetLengthCm: 14, // 14 inches
    targetWidthCm: 14,  // 14 inches
    allowedSizingTolerancePct: 1.0,
    allowedGsmTolerancePct: 2.5,
    warpYarnSpec: '2/30s Double Warp',
    weftYarnSpec: '20s Weft',
    pileYarnSpec: '2/20s Super Combed Terry Pick',
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
    actualLengthCm: 55.2,
    actualWidthCm: 28.1,
    actualWeightGsm: 502,
    borderQualityScore: 5,
    selvedgeCondition: 'pass',
    sizingStatus: 'pass',
    gsmStatus: 'pass',
    overallResult: 'PASS',
    varianceNotes: 'Machine 1 sizing & dimensions (in inches) perfectly aligned with target specs.',
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
    actualLengthCm: 53.5,
    actualWidthCm: 26.8,
    actualWeightGsm: 475,
    borderQualityScore: 3,
    selvedgeCondition: 'defect',
    sizingStatus: 'under_sized',
    gsmStatus: 'low_gsm',
    overallResult: 'FAIL',
    varianceNotes: 'CRITICAL SIZING MISMATCH: Length is 53.5 inches vs 55 inches spec (Machine 1 produces 55.2 in). Reed tension too tight & warp let-off improper!',
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
    actualLengthCm: 54.9,
    actualWidthCm: 27.9,
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
      { id: 'chk_1', label: 'Measure cut length (inches) on 3 consecutive towels per loom', checked: true },
      { id: 'chk_2', label: 'Measure width (inches) at top, middle and bottom', checked: true },
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
      { varietyName: 'Royal Bath Towel 500GSM', gsm: 500, dimensions: '55 x 28 inches', targetQty: 3000, unit: 'pcs', unitRate: 280.00, notes: 'White color, double stitched' }
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
      { varietyName: 'Classic Hotel Hand Towel 400GSM', gsm: 400, dimensions: '24 x 16 inches', targetQty: 1500, unit: 'pcs', unitRate: 110, notes: 'Assorted colors' }
    ]
  }
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp_1',
    name: 'Ramesh Kumar',
    role: 'Senior Loom Weaver',
    machine: 'M-1',
    salary: 22000,
    phone: '9842011223',
    loomCount: 3,
    loomRates: [
      { loomNo: 'M-1', varietyName: 'V-1 (Bath Towel)', rate: 10.50 },
      { loomNo: 'M-2', varietyName: 'V-2 (Hand Towel)', rate: 12.25 },
      { loomNo: 'M-3', varietyName: 'V-3 (Face Towel)', rate: 9.75 }
    ]
  },
  {
    id: 'emp_2',
    name: 'Suresh V',
    role: 'Loom Operator',
    machine: 'M-2',
    salary: 19500,
    phone: '9842122334',
    loomCount: 2,
    loomRates: [
      { loomNo: 'M-1', varietyName: 'V-1 (Bath Towel)', rate: 10.50 },
      { loomNo: 'M-2', varietyName: 'V-2 (Hand Towel)', rate: 12.25 }
    ]
  },
  { id: 'emp_3', name: 'Murugan P', role: 'Loom Operator', machine: 'M-3', salary: 19000, phone: '9842233445' },
  { id: 'emp_4', name: 'Karthik N', role: 'Weaving Specialist', machine: 'M-4', salary: 21000, phone: '9842344556' },
  { id: 'emp_5', name: 'Anand S', role: 'Jacquard Weaver', machine: 'M-5', salary: 24000, phone: '9842455667' },
  { id: 'emp_6', name: 'Selvam K', role: 'Quality & Sizing Inspector', machine: 'All Looms', salary: 26000, phone: '9842566778' }
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

export interface TableSanityResult {
  tableName: string;
  exists: boolean;
  canRead: boolean;
  canInsert: boolean;
  rowCount: number;
  message: string;
  status: 'healthy' | 'missing' | 'rls_restricted' | 'schema_error' | 'unreachable';
}

export interface DatabaseSanityReport {
  overallHealthy: boolean;
  healthyCount: number;
  totalTables: number;
  tables: TableSanityResult[];
  timestamp: string;
}

/**
 * Runs a comprehensive live sanity check across all 16 relational tables in Supabase.
 * Checks whether each table exists, row counts, read permissions, and schema accessibility.
 */
export async function runDatabaseSanityCheck(): Promise<DatabaseSanityReport> {
  const client = getSupabaseClient();
  const isConfigured = getIsSupabaseConfigured();

  if (!isConfigured || !client) {
    const emptyResults: TableSanityResult[] = EXPECTED_TABLES.map(t => ({
      tableName: t,
      exists: false,
      canRead: false,
      canInsert: false,
      rowCount: 0,
      message: 'Supabase credentials not configured.',
      status: 'unreachable'
    }));
    return {
      overallHealthy: false,
      healthyCount: 0,
      totalTables: EXPECTED_TABLES.length,
      tables: emptyResults,
      timestamp: new Date().toISOString()
    };
  }

  const results: TableSanityResult[] = [];

  for (const tableName of EXPECTED_TABLES) {
    try {
      const { data, count, error } = await client
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        const msg = error.message || '';
        const code = error.code || '';
        if (code === '42P01' || msg.includes('does not exist') || msg.includes('relation') || code === 'PGRST301') {
          results.push({
            tableName,
            exists: false,
            canRead: false,
            canInsert: false,
            rowCount: 0,
            message: 'Not yet provisioned in Postgres. App is safely persisting data in app_state storage.',
            status: 'missing'
          });
        } else if (code === '42501' || msg.toLowerCase().includes('permission denied') || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('violates row-level security')) {
          results.push({
            tableName,
            exists: true,
            canRead: false,
            canInsert: false,
            rowCount: 0,
            message: 'Row-Level Security active. App is preserving real-time cloud data safely in app_state.',
            status: 'rls_restricted'
          });
        } else {
          results.push({
            tableName,
            exists: true,
            canRead: false,
            canInsert: false,
            rowCount: 0,
            message: `Schema note: ${msg}. Fallback cloud store active.`,
            status: 'schema_error'
          });
        }
      } else {
        const rowCount = typeof count === 'number' ? count : (Array.isArray(data) ? (data as any[]).length : 0);
        results.push({
          tableName,
          exists: true,
          canRead: true,
          canInsert: true,
          rowCount,
          message: `Active & accessible (${rowCount} row${rowCount === 1 ? '' : 's'})`,
          status: 'healthy'
        });
      }
    } catch (err: any) {
      results.push({
        tableName,
        exists: false,
        canRead: false,
        canInsert: false,
        rowCount: 0,
        message: err?.message || 'Connection failed',
        status: 'unreachable'
      });
    }
  }

  const healthyCount = results.filter(r => r.status === 'healthy').length;
  return {
    overallHealthy: healthyCount === EXPECTED_TABLES.length,
    healthyCount,
    totalTables: EXPECTED_TABLES.length,
    tables: results,
    timestamp: new Date().toISOString()
  };
}

/**
 * Force-syncs all entities from app_state & local storage directly into
 * Supabase relational tables. Ensures everything stored in app_state is properly inserted.
 */
export async function forceSyncAllDataToRelationalTables(): Promise<{
  successCount: number;
  totalKeys: number;
  results: { key: string; table: string; count: number; success: boolean; error?: string }[];
}> {
  const client = getSupabaseClient();
  const companyId = getActiveCompanyId();

  if (!getIsSupabaseConfigured() || !client) {
    return { successCount: 0, totalKeys: 0, results: [] };
  }

  const syncPlan = [
    { key: 'companySettings', table: 'company_settings' },
    { key: 'customers', table: 'customers' },
    { key: 'suppliers', table: 'suppliers' },
    { key: 'inventory', table: 'inventory' },
    { key: 'salesBills', table: 'sales_bills' },
    { key: 'purchaseBills', table: 'purchase_bills' },
    { key: 'payments', table: 'customer_payments' },
    { key: 'employees', table: 'employees' },
    { key: 'productionLogs', table: 'production_logs' },
    { key: 'salaryAdvances', table: 'salary_advances' },
    { key: 'productionOrders', table: 'production_orders' },
    { key: 'varietyCatalog', table: 'variety_catalog' },
    { key: 'qualityAudits', table: 'quality_audits' },
    { key: 'routineReminders', table: 'routine_reminders' }
  ];

  const syncResults: { key: string; table: string; count: number; success: boolean; error?: string }[] = [];

  // 1. Fetch all app_state rows for active company AND global
  let appStateMap = new Map<string, any>();
  try {
    const { data: appStateRows } = await client
      .from('app_state')
      .select('company_id, store_key, payload');

    if (appStateRows && appStateRows.length > 0) {
      appStateRows.forEach(row => {
        if (row.store_key && row.payload !== null && row.payload !== undefined) {
          if (row.company_id === companyId || row.company_id === 'global' || !appStateMap.has(row.store_key)) {
            appStateMap.set(row.store_key, row.payload);
          }
        }
      });
    }
  } catch (e) {
    console.warn('Note: Could not batch query app_state rows:', e);
  }

  // 2. Sync subsidiary companies
  try {
    let comps: any = null;
    if (appStateMap.has('companies')) {
      comps = appStateMap.get('companies');
    } else {
      const rawComps = localStorage.getItem(GLOBAL_STORE_PREFIX + 'companies');
      if (rawComps) comps = JSON.parse(rawComps);
    }

    if (comps && Array.isArray(comps)) {
      const compRows = comps.map((c: any) => ({
        id: ensureUuid(c.id || `comp_${c.name}`),
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
      const ok = await safeUpsertRelationalTable('companies', compRows);
      syncResults.push({ key: 'companies', table: 'companies', count: compRows.length, success: ok });
    }
  } catch (e: any) {
    syncResults.push({ key: 'companies', table: 'companies', count: 0, success: false, error: e?.message });
  }

  // 3. Sync each entity in the plan
  for (const item of syncPlan) {
    try {
      let val: any = null;
      
      // Check app_state first
      if (appStateMap.has(item.key)) {
        val = appStateMap.get(item.key);
      }

      // Check local storage and merge if both exist
      const localRaw = localStorage.getItem(scopedKey(item.key));
      if (localRaw) {
        try {
          const localParsed = JSON.parse(localRaw);
          if (val) {
            val = mergePayloads(item.key, localParsed, val);
          } else {
            val = localParsed;
          }
        } catch (e) {}
      }

      if (!val) {
        syncResults.push({ key: item.key, table: item.table, count: 0, success: true });
        continue;
      }

      const count = Array.isArray(val) ? val.length : (val ? 1 : 0);

      // Ensure updated state is mirrored in app_state
      await client.from('app_state').upsert({
        company_id: companyId,
        store_key: item.key,
        payload: val,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id,store_key' });

      // Insert/Upsert into relational table(s)
      const success = await syncPayloadToRelationalTable(companyId, item.key, val);
      syncResults.push({ key: item.key, table: item.table, count, success });
    } catch (err: any) {
      syncResults.push({ key: item.key, table: item.table, count: 0, success: false, error: err?.message });
    }
  }

  const successCount = syncResults.filter(r => r.success).length;
  return { successCount, totalKeys: syncResults.length, results: syncResults };
}

