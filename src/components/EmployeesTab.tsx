import React, { useState } from 'react';
import { Employee, SalaryAdvance, ProductionLog, VarietyCatalog, CompanySettings, LoomRateSetting } from '../types';
import { storeSet, deleteFromRelationalTable } from '../lib/storage';
import {
  Users,
  UserPlus,
  DollarSign,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  Briefcase,
  Cpu,
  Trash2,
  Phone,
  FileText,
  Edit,
  Plus,
  Printer,
  Calculator,
  ChevronRight,
  Receipt,
  X
} from 'lucide-react';

interface EmployeesTabProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  salaryAdvances: SalaryAdvance[];
  setSalaryAdvances: React.Dispatch<React.SetStateAction<SalaryAdvance[]>>;
  productionLogs?: ProductionLog[];
  varieties?: VarietyCatalog[];
  settings?: CompanySettings;
  showToast: (msg: string) => void;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  setEmployees,
  salaryAdvances,
  setSalaryAdvances,
  productionLogs = [],
  varieties = [],
  settings,
  showToast
}) => {
  // Navigation inside Tab
  const [subView, setSubView] = useState<'list' | 'register' | 'advance' | 'wages'>('list');

  // Register / Edit Employee Form State
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState('Master Weaver');
  const [empMachine, setEmpMachine] = useState('M-1');
  const [empSalary, setEmpSalary] = useState<number | ''>(22000);
  const [empLoomCount, setEmpLoomCount] = useState<number | ''>(3);
  const [empLoomRates, setEmpLoomRates] = useState<LoomRateSetting[]>([
    { loomNo: 'M-1', varietyName: 'V-1 (Bath Towel)', rate: 10.50 },
    { loomNo: 'M-2', varietyName: 'V-2 (Hand Towel)', rate: 12.25 },
    { loomNo: 'M-3', varietyName: 'V-3 (Face Towel)', rate: 9.75 }
  ]);

  // Salary Advance Form State
  const [advEmpId, setAdvEmpId] = useState('');
  const [advAmount, setAdvAmount] = useState<number | ''>(2000);
  const [advDate, setAdvDate] = useState(new Date().toISOString().slice(0, 10));
  const [advNotes, setAdvNotes] = useState('');

  // Weekly Wage Calculator State (Start Date & End Date)
  const defaultStartDate = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const defaultEndDate = new Date().toISOString().slice(0, 10);
  const [wageStartDate, setWageStartDate] = useState(defaultStartDate);
  const [wageEndDate, setWageEndDate] = useState(defaultEndDate);
  const [wageEmpIdFilter, setWageEmpIdFilter] = useState('');

  // Handle Open Register New Employee
  const handleOpenRegister = () => {
    setEditingEmpId(null);
    setEmpName('');
    setEmpPhone('');
    setEmpRole('Master Weaver');
    setEmpMachine('M-1');
    setEmpSalary(22000);
    setEmpLoomCount(3);
    setEmpLoomRates([
      { loomNo: 'M-1', varietyName: 'V-1 (Bath Towel)', rate: 10.50 },
      { loomNo: 'M-2', varietyName: 'V-2 (Hand Towel)', rate: 12.25 },
      { loomNo: 'M-3', varietyName: 'V-3 (Face Towel)', rate: 9.75 }
    ]);
    setSubView('register');
  };

  // Handle Open Edit Employee
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name);
    setEmpPhone(emp.phone || '');
    setEmpRole(emp.role || 'Master Weaver');
    setEmpMachine(emp.machine || 'M-1');
    setEmpSalary(emp.salary || 0);

    const rates = emp.loomRates && emp.loomRates.length > 0
      ? emp.loomRates
      : [
          { loomNo: 'M-1', varietyName: 'V-1', rate: 10.50 },
          { loomNo: 'M-2', varietyName: 'V-2', rate: 12.25 },
          { loomNo: 'M-3', varietyName: 'V-3', rate: 9.75 }
        ];

    setEmpLoomCount(emp.loomCount || rates.length);
    setEmpLoomRates(rates);
    setSubView('register');
  };

  // Handle Loom Count Change
  const handleLoomCountChange = (val: number | '') => {
    setEmpLoomCount(val);
    if (val === '' || val <= 0) return;

    const count = Number(val);
    const updatedRates = [...empLoomRates];

    if (count > updatedRates.length) {
      for (let i = updatedRates.length; i < count; i++) {
        updatedRates.push({
          loomNo: `M-${i + 1}`,
          varietyName: `V-${i + 1}`,
          rate: 10.50 + i * 0.5
        });
      }
    } else if (count < updatedRates.length) {
      updatedRates.splice(count);
    }
    setEmpLoomRates(updatedRates);
  };

  // Handle Individual Loom Rate Row Change
  const handleLoomRateChange = (index: number, field: keyof LoomRateSetting, value: string | number) => {
    const updated = [...empLoomRates];
    updated[index] = {
      ...updated[index],
      [field]: field === 'rate' ? (value === '' ? 0 : parseFloat(value as string) || 0) : value
    };
    setEmpLoomRates(updated);
  };

  // Add Row manually
  const handleAddLoomRateRow = () => {
    const newIdx = empLoomRates.length + 1;
    setEmpLoomRates([
      ...empLoomRates,
      { loomNo: `M-${newIdx}`, varietyName: `V-${newIdx}`, rate: 10.50 }
    ]);
    setEmpLoomCount(empLoomRates.length + 1);
  };

  // Remove Row manually
  const handleRemoveLoomRateRow = (index: number) => {
    const updated = empLoomRates.filter((_, i) => i !== index);
    setEmpLoomRates(updated);
    setEmpLoomCount(updated.length);
  };

  // Save Employee (Register or Update)
  const handleSaveEmployee = async () => {
    if (!empName.trim()) {
      showToast('Please enter employee name');
      return;
    }

    const sal = Number(empSalary) || 0;
    const lCount = Number(empLoomCount) || empLoomRates.length;

    if (editingEmpId) {
      const updated = employees.map((e) => {
        if (e.id === editingEmpId) {
          return {
            ...e,
            name: empName.trim(),
            phone: empPhone.trim(),
            role: empRole,
            machine: empMachine,
            salary: sal,
            loomCount: lCount,
            loomRates: empLoomRates
          };
        }
        return e;
      });
      setEmployees(updated);
      await storeSet('employees', updated);
      showToast(`Employee "${empName.trim()}" updated successfully!`);
    } else {
      const newEmp: Employee = {
        id: `emp_${Date.now()}`,
        name: empName.trim(),
        phone: empPhone.trim(),
        role: empRole,
        machine: empMachine,
        salary: sal,
        loomCount: lCount,
        loomRates: empLoomRates
      };

      const updated = [...employees, newEmp];
      setEmployees(updated);
      await storeSet('employees', updated);
      showToast(`Employee "${newEmp.name}" registered successfully!`);
    }

    setSubView('list');
  };

  // Save Salary Advance
  const handleSaveAdvance = async () => {
    if (!advEmpId) {
      showToast('Please select an employee');
      return;
    }
    const amt = Number(advAmount) || 0;
    if (amt <= 0) {
      showToast('Please enter a valid advance amount');
      return;
    }

    const newAdv: SalaryAdvance = {
      id: `adv_${Date.now()}`,
      employeeId: advEmpId,
      amount: amt,
      date: advDate
    };

    const updated = [newAdv, ...salaryAdvances];
    setSalaryAdvances(updated);
    await storeSet('salaryAdvances', updated);

    const empObj = employees.find((e) => e.id === advEmpId);
    showToast(`Salary advance of ₹${amt.toLocaleString('en-IN')} recorded for ${empObj ? empObj.name : 'employee'}!`);

    setAdvAmount('');
    setAdvNotes('');
    setSubView('list');
  };

  // Handle Delete Employee
  const handleDeleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to delete employee "${emp.name}"?`)) return;

    const updated = employees.filter((e) => e.id !== emp.id && e.name.toLowerCase().trim() !== emp.name.toLowerCase().trim());
    setEmployees(updated);
    await storeSet('employees', updated);
    await deleteFromRelationalTable('employees', emp.id, 'name', emp.name);
    showToast(`Employee "${emp.name}" deleted!`);
  };

  // Helper: Calculate Weekly Wage Breakdown for an Employee between Start Date & End Date
  const calculateEmployeeWeeklyWages = (emp: Employee) => {
    const normName = emp.name.toLowerCase().trim();

    // Filter production logs within date range matching employee
    const filteredLogs = productionLogs.filter((log) => {
      const logDate = log.date;
      const matchDate = (!wageStartDate || logDate >= wageStartDate) && (!wageEndDate || logDate <= wageEndDate);
      const matchEmp = log.employeeName.toLowerCase().trim().includes(normName) || normName.includes(log.employeeName.toLowerCase().trim());
      return matchDate && matchEmp;
    });

    // Default loom rates fallback
    const loomRates = emp.loomRates && emp.loomRates.length > 0
      ? emp.loomRates
      : [
          { loomNo: emp.machine || 'M-1', varietyName: 'General Towel', rate: 10.50 }
        ];

    // Build breakdown per Loom and Variety
    const breakdownMap = new Map<string, { loomNo: string; varietyName: string; pcsProduced: number; rate: number; totalWage: number }>();

    // First populate configured looms
    loomRates.forEach((lr) => {
      const key = `${lr.loomNo.toLowerCase().trim()}_${lr.varietyName.toLowerCase().trim()}`;
      breakdownMap.set(key, {
        loomNo: lr.loomNo,
        varietyName: lr.varietyName,
        pcsProduced: 0,
        rate: lr.rate,
        totalWage: 0
      });
    });

    // Populate actual production quantities
    filteredLogs.forEach((log) => {
      const loomName = log.machine || 'M-1';
      const variety = log.item || 'V-1';
      const qty = log.qty || 0;

      // Match loom rate rule
      const matchedRateObj = loomRates.find(
        (lr) =>
          lr.loomNo.toLowerCase().trim() === loomName.toLowerCase().trim() ||
          loomName.toLowerCase().trim().includes(lr.loomNo.toLowerCase().trim()) ||
          lr.loomNo.toLowerCase().trim().includes(loomName.toLowerCase().trim())
      ) || loomRates[0];

      const rate = matchedRateObj ? matchedRateObj.rate : 10.50;
      const key = `${loomName.toLowerCase().trim()}_${variety.toLowerCase().trim()}`;

      if (breakdownMap.has(key)) {
        const existing = breakdownMap.get(key)!;
        existing.pcsProduced += qty;
        existing.totalWage = existing.pcsProduced * existing.rate;
      } else {
        breakdownMap.set(key, {
          loomNo: loomName,
          varietyName: variety,
          pcsProduced: qty,
          rate: rate,
          totalWage: qty * rate
        });
      }
    });

    const breakdownList = Array.from(breakdownMap.values());
    const totalPieces = breakdownList.reduce((sum, b) => sum + b.pcsProduced, 0);
    const grossWages = breakdownList.reduce((sum, b) => sum + b.totalWage, 0);

    // Advances taken within/up to date range
    const advancesTaken = salaryAdvances
      .filter((a) => a.employeeId === emp.id && (!wageEndDate || a.date <= wageEndDate))
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    const netPayable = Math.max(0, grossWages - advancesTaken);

    return { totalPieces, grossWages, advancesTaken, netPayable, breakdownList, logCount: filteredLogs.length };
  };

  // Print Weekly Wage Voucher Statement
  const handlePrintWageSlip = (emp: Employee) => {
    const calc = calculateEmployeeWeeklyWages(emp);

    const rowsHtml = calc.breakdownList
      .map(
        (b) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e1b4b;">${b.loomNo}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155;">${b.varietyName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold;">${b.pcsProduced.toLocaleString('en-IN')} pcs</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">₹${b.rate.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold; color: #047857;">₹${b.totalWage.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly Piece-Rate Wage Voucher — ${emp.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #0f172a; font-size: 12px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .title { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 8px; }
          th { background: #0f172a; color: #ffffff; padding: 8px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          .total-box { margin-top: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; text-align: right; font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${settings?.name || 'VCA FABRICS'}</div>
            <div class="subtitle">${settings?.address || 'Erode, Tamil Nadu'} • GSTIN: ${settings?.gstin || '33AAAAA0000A1Z5'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #e11d48;">WEEKLY PIECE-RATE WAGE SLIP</div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px;">Period: <strong>${wageStartDate}</strong> to <strong>${wageEndDate}</strong></div>
          </div>
        </div>

        <div class="box">
          <div>
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Weaver / Staff Details</div>
            <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 2px;">${emp.name}</div>
            <div style="color: #475569;">Role: <strong>${emp.role}</strong> | Primary Machine: <strong>${emp.machine || 'M-1'}</strong></div>
            <div style="color: #475569;">Contact: ${emp.phone || '—'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Production Summary</div>
            <div style="font-size: 12px;">Total Pieces Produced: <strong>${calc.totalPieces.toLocaleString('en-IN')} pcs</strong></div>
            <div style="font-size: 12px; color: #047857;">Gross Wages: <strong>₹${calc.grossWages.toFixed(2)}</strong></div>
            <div style="font-size: 12px; color: #b91c1c;">Salary Advance Deducted: <strong>₹${calc.advancesTaken.toFixed(2)}</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Loom ID</th>
              <th>Variety / Item</th>
              <th style="text-align: right;">Produced Qty (pcs)</th>
              <th style="text-align: right;">Rate / Piece (₹)</th>
              <th style="text-align: right;">Total Wage (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colSpan="5" style="padding:16px; text-align:center;">No daily production logged in this period.</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          Net Payable Weekly Wage: <span style="font-size: 18px; font-weight: 900; color: #047857; margin-left: 8px;">₹${calc.netPayable.toFixed(2)}</span>
        </div>

        <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="text-align: center; border-top: 1px solid #0f172a; width: 180px; padding-top: 4px; font-weight: bold;">
            Weaver Signature
          </div>
          <div style="text-align: center; border-top: 1px solid #0f172a; width: 180px; padding-top: 4px; font-weight: bold;">
            Manager / Cashier
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

  // Stat Calculations
  const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);
  const totalAdvances = salaryAdvances.reduce((s, a) => s + (a.amount || 0), 0);

  // Filtered list for Weekly Wages view
  const wageEmployeesList = wageEmpIdFilter
    ? employees.filter((e) => e.id === wageEmpIdFilter)
    : employees;

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 m-0 flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600" />
            <span>Employees & Piece-Rate Wage Management</span>
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Manage weavers, multi-loom piece rates, daily production wage calculations & salary advances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSubView('list')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'list' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Staff Register</span>
          </button>

          <button
            onClick={() => setSubView('wages')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'wages' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>📅 Weekly Piece-Rate Wages</span>
          </button>

          <button
            onClick={handleOpenRegister}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'register' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register / Edit Staff</span>
          </button>

          <button
            onClick={() => setSubView('advance')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'advance' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span>+ Pay Advance</span>
          </button>
        </div>
      </div>

      {/* STAT SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Weavers & Staff</div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{employees.length} registered</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Base Monthly Salary Register</div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">₹{totalPayroll.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Advances Disbursed</div>
            <div className="text-2xl font-mono font-bold text-amber-800 mt-1">₹{totalAdvances.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* VIEW 1: REGISTER / EDIT EMPLOYEE FORM */}
      {subView === 'register' && (
        <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700 m-0 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-rose-600" />
              <span>{editingEmpId ? 'Edit Employee & Loom Piece Rates' : 'Register New Employee / Weaver'}</span>
            </h2>
            <button onClick={() => setSubView('list')} className="text-xs text-slate-500 hover:text-slate-900 font-bold cursor-pointer">
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Employee Name *</label>
              <input
                type="text"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                placeholder="e.g. 9842011223"
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Role / Designation</label>
              <select
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold bg-white"
              >
                <option value="Master Weaver">Master Weaver</option>
                <option value="Senior Loom Weaver">Senior Loom Weaver</option>
                <option value="Loom Operator">Loom Operator</option>
                <option value="Assistant Weaver">Assistant Weaver</option>
                <option value="Winder / Warper">Winder / Warper</option>
                <option value="Quality Inspector">Quality Inspector</option>
                <option value="Tailor / Hemmer">Tailor / Hemmer</option>
                <option value="Loom Helper">Loom Helper</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Assigned Machine / Loom</label>
              <input
                type="text"
                value={empMachine}
                onChange={(e) => setEmpMachine(e.target.value)}
                placeholder="e.g. M-1 or Loom 01"
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>

          {/* LOOM PIECE-RATE INPUT TABLE (Matching prompt format: Name | Loom(3) | Variety | Rate) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 m-0 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-rose-600" />
                  <span>Assigned Looms & Variety Wage Rates (₹ per piece)</span>
                </h3>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                  Set piece rates per loom & variety for automatic weekly wage calculation from daily production logs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">No. of Looms Assigned:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={empLoomCount}
                  onChange={(e) => handleLoomCountChange(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                  className="w-16 p-1.5 border border-slate-300 rounded-lg text-center font-bold font-mono text-slate-900 bg-white text-xs"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Loom ({empLoomRates.length})</th>
                    <th className="p-2.5">Variety / Item</th>
                    <th className="p-2.5 text-right">Piece Rate (₹)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empLoomRates.map((lr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{idx === 0 ? empName || '—' : ''}</td>

                      <td className="p-2.5">
                        <input
                          type="text"
                          value={lr.loomNo}
                          onChange={(e) => handleLoomRateChange(idx, 'loomNo', e.target.value)}
                          placeholder={`M-${idx + 1}`}
                          className="w-28 p-1.5 border border-slate-300 rounded font-bold font-mono text-slate-800"
                        />
                      </td>

                      <td className="p-2.5">
                        <input
                          type="text"
                          value={lr.varietyName}
                          onChange={(e) => handleLoomRateChange(idx, 'varietyName', e.target.value)}
                          placeholder={`V-${idx + 1}`}
                          className="w-full max-w-xs p-1.5 border border-slate-300 rounded font-medium text-slate-800"
                        />
                      </td>

                      <td className="p-2.5 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={lr.rate}
                          onChange={(e) => handleLoomRateChange(idx, 'rate', e.target.value)}
                          placeholder="10.50"
                          className="w-28 p-1.5 border border-slate-300 rounded text-right font-bold font-mono text-emerald-800 bg-emerald-50/30"
                        />
                      </td>

                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLoomRateRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remove Loom Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleAddLoomRateRow}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  <span>+ Add Loom Rate Row</span>
                </button>
                <span className="text-[11px] text-slate-500 italic">Example format: M-1, V-1, ₹10.50</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEmployee}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{editingEmpId ? 'Update Employee & Loom Rates' : 'Save & Register Employee'}</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY PIECE-RATE WAGE CALCULATOR */}
      {subView === 'wages' && (
        <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800 m-0 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Weekly Piece-Rate Wage Calculator</span>
              </h2>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                Select start date and end date to calculate weekly wages based on pieces produced in daily inventory logs.
              </p>
            </div>

            <button
              onClick={() => setSubView('list')}
              className="text-xs text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {/* Date Range & Filter Controls */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Start Date *</span>
              </label>
              <input
                type="date"
                value={wageStartDate}
                onChange={(e) => setWageStartDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>End Date *</span>
              </label>
              <input
                type="date"
                value={wageEndDate}
                onChange={(e) => setWageEndDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Filter Weaver / Employee</label>
              <select
                value={wageEmpIdFilter}
                onChange={(e) => setWageEmpIdFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
              >
                <option value="">All Weavers & Staff ({employees.length})</option>
                {employees.map((e, i) => (
                  <option key={i} value={e.id}>
                    {e.name} ({e.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CALCULATED WAGE RESULTS TABLE */}
          <div className="space-y-4">
            {wageEmployeesList.map((emp, empIdx) => {
              const calc = calculateEmployeeWeeklyWages(emp);

              return (
                <div key={empIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {/* Weaver Header */}
                  <div className="bg-slate-900 text-white p-3.5 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-600/30 border border-rose-400/40 flex items-center justify-center text-rose-300 font-bold shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold m-0 text-white flex items-center gap-2">
                          <span>{emp.name}</span>
                          <span className="text-xs font-normal text-slate-400 font-mono">({emp.role})</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 m-0">
                          Primary Loom: {emp.machine || 'M-1'} • Period: {wageStartDate} to {wageEndDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrintWageSlip(emp)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Print Wage Slip</span>
                      </button>
                    </div>
                  </div>

                  {/* Breakdown Table matching user example format */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Loom</th>
                          <th className="p-2.5">Variety</th>
                          <th className="p-2.5 text-right">Produced (pcs)</th>
                          <th className="p-2.5 text-right">Piece Rate (₹)</th>
                          <th className="p-2.5 text-right">Total Wages (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {calc.breakdownList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                              No daily production logs found for {emp.name} between {wageStartDate} and {wageEndDate}.
                            </td>
                          </tr>
                        ) : (
                          calc.breakdownList.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{rIdx === 0 ? emp.name : ''}</td>
                              <td className="p-2.5 font-bold font-mono text-purple-700">{row.loomNo}</td>
                              <td className="p-2.5 font-medium text-slate-800">{row.varietyName}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                {row.pcsProduced.toLocaleString('en-IN')} pcs
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-700">
                                ₹{row.rate.toFixed(2)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                                ₹{row.totalWage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Footer */}
                  <div className="bg-emerald-50/50 border-t border-slate-200 p-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Total Output</div>
                      <div className="text-base font-bold font-mono text-slate-900">{calc.totalPieces.toLocaleString('en-IN')} pcs</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Gross Piece Wages</div>
                      <div className="text-base font-bold font-mono text-emerald-800">₹{calc.grossWages.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Advance Taken</div>
                      <div className="text-base font-bold font-mono text-amber-800">₹{calc.advancesTaken.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>

                    <div className="bg-emerald-100/70 p-2.5 rounded-lg border border-emerald-300">
                      <div className="text-[10px] text-emerald-900 font-bold uppercase">Net Payable Wage</div>
                      <div className="text-base font-extrabold font-mono text-emerald-950">₹{calc.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: RECORD SALARY ADVANCE FORM */}
      {subView === 'advance' && (
        <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 m-0 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span>Log Salary Advance / Cash Payout</span>
            </h2>
            <button onClick={() => setSubView('list')} className="text-xs text-slate-500 hover:text-slate-900 font-bold cursor-pointer">
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Employee *</label>
              <select
                value={advEmpId}
                onChange={(e) => setAdvEmpId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white"
              >
                <option value="">Choose employee...</option>
                {employees.map((e, idx) => (
                  <option key={idx} value={e.id}>
                    {e.name} ({e.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Advance Amount (₹) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={advAmount}
                onChange={(e) => setAdvAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || e.target.value)}
                placeholder="2000"
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-amber-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date Paid</label>
              <input
                type="date"
                value={advDate}
                onChange={(e) => setAdvDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={() => setSubView('list')}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAdvance}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Record Salary Advance</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 4: EMPLOYEES DIRECTORY & PAYROLL REGISTER */}
      {subView === 'list' && (
        <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 m-0 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-rose-600" />
              <span>Employees & Payroll Register ({employees.length})</span>
            </h2>

            <button
              onClick={() => setSubView('wages')}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              <span>Calculate Weekly Wages</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Employee Name</th>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5 text-center">Assigned Looms</th>
                  <th className="p-2.5 text-right">Monthly Salary (₹)</th>
                  <th className="p-2.5 text-right">Advances Taken (₹)</th>
                  <th className="p-2.5 text-right">Net Payable (₹)</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                      No employees registered yet. Click "+ Register Staff" above to add staff.
                    </td>
                  </tr>
                ) : (
                  employees.map((e, idx) => {
                    const empAdvances = salaryAdvances
                      .filter((a) => a.employeeId === e.id)
                      .reduce((sum, a) => sum + (a.amount || 0), 0);
                    const netPayable = Math.max(0, (e.salary || 0) - empAdvances);
                    const loomCount = e.loomCount || (e.loomRates ? e.loomRates.length : 1);

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">
                          <div>{e.name}</div>
                          {e.phone && <div className="text-[10px] font-mono text-slate-400 font-normal">Ph: {e.phone}</div>}
                        </td>

                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] uppercase">
                            {e.role}
                          </span>
                        </td>

                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold font-mono text-[11px]">
                            {loomCount} Looms ({e.loomRates ? e.loomRates.map((l) => l.loomNo).join(', ') : e.machine || 'M-1'})
                          </span>
                        </td>

                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          ₹{(e.salary || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="p-2.5 text-right font-mono font-bold text-amber-700">
                          ₹{empAdvances.toLocaleString('en-IN')}
                        </td>

                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 text-sm">
                          ₹{netPayable.toLocaleString('en-IN')}
                        </td>

                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(e)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                              title="Edit Employee & Loom Rates"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setAdvEmpId(e.id);
                                setSubView('advance');
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 text-[10px] rounded transition-colors cursor-pointer"
                              title="Record advance for this employee"
                            >
                              + Advance
                            </button>

                            <button
                              onClick={() => handleDeleteEmployee(e)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                              title="Delete Employee"
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
      )}
    </div>
  );
};
