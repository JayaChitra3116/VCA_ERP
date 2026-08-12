import React, { useState } from 'react';
import { Employee, SalaryAdvance } from '../types';
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
  FileText
} from 'lucide-react';

interface EmployeesTabProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  salaryAdvances: SalaryAdvance[];
  setSalaryAdvances: React.Dispatch<React.SetStateAction<SalaryAdvance[]>>;
  showToast: (msg: string) => void;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  setEmployees,
  salaryAdvances,
  setSalaryAdvances,
  showToast
}) => {
  // Navigation inside Tab
  const [subView, setSubView] = useState<'register' | 'advance' | 'list'>('list');

  // Register Employee Form
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Master Weaver');
  const [empMachine, setEmpMachine] = useState('Loom 01');
  const [empSalary, setEmpSalary] = useState<number | ''>(22000);

  // Salary Advance Form
  const [advEmpId, setAdvEmpId] = useState('');
  const [advAmount, setAdvAmount] = useState<number | ''>(2000);
  const [advDate, setAdvDate] = useState(new Date().toISOString().slice(0, 10));
  const [advNotes, setAdvNotes] = useState('');

  // Save New Employee
  const handleSaveEmployee = async () => {
    if (!empName.trim()) {
      showToast('Please enter employee name');
      return;
    }
    const sal = Number(empSalary) || 0;

    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      name: empName.trim(),
      role: empRole,
      machine: empMachine,
      salary: sal
    };

    const updated = [...employees, newEmp];
    setEmployees(updated);
    await storeSet('employees', updated);

    showToast(`Employee "${newEmp.name}" registered!`);
    setEmpName('');
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
    showToast(`Salary advance of ₹${amt} recorded for ${empObj ? empObj.name : 'employee'}!`);

    setAdvAmount('');
    setAdvNotes('');
    setSubView('list');
  };

  // Stat Calculations
  const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);
  const totalAdvances = salaryAdvances.reduce((s, a) => s + (a.amount || 0), 0);

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to delete employee "${emp.name}"?`)) return;

    const updated = employees.filter((e) => e.id !== emp.id && e.name.toLowerCase().trim() !== emp.name.toLowerCase().trim());
    setEmployees(updated);
    await storeSet('employees', updated);
    await deleteFromRelationalTable('employees', emp.id, 'name', emp.name);
    showToast(`Employee "${emp.name}" deleted!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 m-0 flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600" />
            <span>Employees & Salary Management</span>
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Manage weavers, winders, helpers, monthly wage registers, and salary advance records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubView('register')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'register' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register Employee</span>
          </button>

          <button
            onClick={() => setSubView('advance')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'advance' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>+ Pay Salary Advance</span>
          </button>
        </div>
      </div>

      {/* STAT SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Staff Count</div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{employees.length} weavers & staff</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Base Payroll</div>
            <div className="text-2xl font-mono font-bold text-rose-700 mt-1">₹{totalPayroll.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Advances Paid</div>
            <div className="text-2xl font-mono font-bold text-amber-700 mt-1">₹{totalAdvances.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* REGISTER NEW EMPLOYEE FORM */}
      {subView === 'register' && (
        <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700 m-0 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-rose-600" />
              <span>Register New Employee / Weaver</span>
            </h2>
            <button onClick={() => setSubView('list')} className="text-xs text-slate-500 hover:text-slate-900 font-bold">
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Employee Name *</label>
              <input
                type="text"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Role / Designation</label>
              <select
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
              >
                <option value="Master Weaver">Master Weaver</option>
                <option value="Assistant Weaver">Assistant Weaver</option>
                <option value="Winder / Warper">Winder / Warper</option>
                <option value="Quality Inspector">Quality Inspector</option>
                <option value="Tailor / Hemmer">Tailor / Hemmer</option>
                <option value="Loom Helper">Loom Helper</option>
                <option value="Production Supervisor">Production Supervisor</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Machine / Loom</label>
              <select
                value={empMachine}
                onChange={(e) => setEmpMachine(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                <option value="Loom 01">Loom 01</option>
                <option value="Loom 02">Loom 02</option>
                <option value="Loom 03">Loom 03</option>
                <option value="Loom 04">Loom 04</option>
                <option value="Loom 05">Loom 05</option>
                <option value="All Looms">All Looms / Floating</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Monthly Salary / Base Wage (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                value={empSalary}
                onChange={(e) => setEmpSalary(e.target.value === '' ? '' : parseFloat(e.target.value) || e.target.value)}
                placeholder="22000"
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={() => setSubView('list')} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleSaveEmployee}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Register Employee</span>
            </button>
          </div>
        </div>
      )}

      {/* RECORD SALARY ADVANCE FORM */}
      {subView === 'advance' && (
        <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 m-0 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span>Log Salary Advance / Cash Payout</span>
            </h2>
            <button onClick={() => setSubView('list')} className="text-xs text-slate-500 hover:text-slate-900 font-bold">
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Employee *</label>
              <select
                value={advEmpId}
                onChange={(e) => setAdvEmpId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
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
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={() => setSubView('list')} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleSaveAdvance}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Record Salary Advance</span>
            </button>
          </div>
        </div>
      )}

      {/* EMPLOYEES LIST TABLE & ADVANCE BALANCE */}
      <div className="panel bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-rose-600" />
          <span>Employees & Payroll Register</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Employee Name</th>
                <th className="p-2.5">Designation / Role</th>
                <th className="p-2.5">Assigned Loom</th>
                <th className="p-2.5 text-right">Monthly Salary (₹)</th>
                <th className="p-2.5 text-right">Total Advances Taken (₹)</th>
                <th className="p-2.5 text-right">Net Payable Balance (₹)</th>
                <th className="p-2.5 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                    No employees registered yet. Click "+ Register Employee" above to add staff.
                  </td>
                </tr>
              ) : (
                employees.map((e, idx) => {
                  const empAdvances = salaryAdvances
                    .filter((a) => a.employeeId === e.id)
                    .reduce((sum, a) => sum + (a.amount || 0), 0);
                  const netPayable = Math.max(0, (e.salary || 0) - empAdvances);

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{e.name}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] uppercase">
                          {e.role}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium">{e.machine || 'All Looms'}</td>
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
                            onClick={() => {
                              setAdvEmpId(e.id);
                              setSubView('advance');
                            }}
                            className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 text-[11px] transition-colors cursor-pointer"
                          >
                            + Advance
                          </button>

                          <button
                            onClick={() => handleDeleteEmployee(e)}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors cursor-pointer"
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
    </div>
  );
};
