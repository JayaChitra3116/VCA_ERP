import React, { useState } from 'react';
import { VarietyCatalog, VarietyAssignedMachine, QualityCheckAudit, RoutineTaskReminder } from '../types';
import { Layers, Cpu, AlertTriangle, CheckCircle, Plus, Search, Ruler, Activity, Sliders, Calendar, RotateCcw, Wrench } from 'lucide-react';

interface VarietyAndQualityTabProps {
  varieties: VarietyCatalog[];
  audits: QualityCheckAudit[];
  reminders: RoutineTaskReminder[];
  onSaveVariety: (variety: VarietyCatalog) => void;
  onSaveAudit: (audit: QualityCheckAudit) => void;
  onSaveReminder: (reminder: RoutineTaskReminder) => void;
  onUpdateReminderStatus: (reminderId: string, status: RoutineTaskReminder['status']) => void;
  operatorNames: string[];
}

export const VarietyAndQualityTab: React.FC<VarietyAndQualityTabProps> = ({
  varieties,
  audits,
  reminders,
  onSaveVariety,
  onSaveAudit,
  onSaveReminder,
  onUpdateReminderStatus,
  operatorNames
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'variety_catalog' | 'quality_audits' | 'routine_reminders'>('quality_audits');

  // Modal States
  const [showVarietyModal, setShowVarietyModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Variety Form State
  const [varietyName, setVarietyName] = useState('');
  const [category, setCategory] = useState('Bath Towel');
  const [standardWeightGsm, setStandardWeightGsm] = useState(500);
  const [targetLengthCm, setTargetLengthCm] = useState(55);
  const [targetWidthCm, setTargetWidthCm] = useState(28);
  const [allowedSizingTolerancePct, setAllowedSizingTolerancePct] = useState(1.5);
  const [allowedGsmTolerancePct, setAllowedGsmTolerancePct] = useState(2.0);
  const [warpYarnSpec, setWarpYarnSpec] = useState('2/20s Cotton Warp');
  const [weftYarnSpec, setWeftYarnSpec] = useState('16s Auto Weft');
  const [pileYarnSpec, setPileYarnSpec] = useState('2/20s Combed Terry Pick');
  const [machines, setMachines] = useState<VarietyAssignedMachine[]>([
    { machineNo: 'Machine 1', operatorName: operatorNames[0] || 'Ramesh Kumar', allocatedQty: 1000, completedQty: 0, status: 'running' },
    { machineNo: 'Machine 2', operatorName: operatorNames[1] || 'Suresh V', allocatedQty: 1000, completedQty: 0, status: 'running' },
    { machineNo: 'Machine 3', operatorName: operatorNames[2] || 'Murugan P', allocatedQty: 1000, completedQty: 0, status: 'running' }
  ]);

  // Quality Audit Form State
  const [auditMachineNo, setAuditMachineNo] = useState('Machine 2');
  const [auditVarietyName, setAuditVarietyName] = useState(varieties[0]?.varietyName || 'Royal Bath Towel 500GSM');
  const [auditOperatorName, setAuditOperatorName] = useState(operatorNames[1] || 'Suresh V');
  const [actualLengthCm, setActualLengthCm] = useState(53.5);
  const [actualWidthCm, setActualWidthCm] = useState(26.8);
  const [actualWeightGsm, setActualWeightGsm] = useState(475);
  const [borderScore, setBorderScore] = useState(3);
  const [selvedgeCondition, setSelvedgeCondition] = useState<'pass' | 'defect'>('defect');
  const [varianceNotes, setVarianceNotes] = useState('Size mismatch detected across Machine 2 vs Machine 1 spec.');
  const [actionTaken, setActionTaken] = useState('Tension recalibrated and warp let-off adjusted.');

  // Routine Reminder Form State
  const [taskTitle, setTaskTitle] = useState('Routine Multi-Machine Towel Size & GSM Quality Audit');
  const [reminderMachineNo, setReminderMachineNo] = useState('Machine 1, Machine 2, Machine 3');
  const [frequencyDays, setFrequencyDays] = useState(1);
  const [reminderRole, setReminderRole] = useState('Quality Supervisor Selvam');
  const [reminderCategory, setReminderCategory] = useState<RoutineTaskReminder['category']>('quality_audit');

  // Filter Search State
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState('all');

  // Save Handlers
  const handleSaveVariety = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varietyName) {
      alert('Please enter a variety name');
      return;
    }
    const newVariety: VarietyCatalog = {
      id: `var_${Date.now().toString(36)}`,
      varietyName,
      category,
      standardWeightGsm,
      targetLengthCm,
      targetWidthCm,
      allowedSizingTolerancePct,
      allowedGsmTolerancePct,
      warpYarnSpec,
      weftYarnSpec,
      pileYarnSpec,
      createdDate: new Date().toISOString().slice(0, 10),
      assignedMachines: machines,
      activeStatus: true
    };

    onSaveVariety(newVariety);
    setShowVarietyModal(false);
    setVarietyName('');
  };

  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVar = varieties.find(v => v.varietyName === auditVarietyName);
    const targetLength = selectedVar ? selectedVar.targetLengthCm : 55;
    const targetWidth = selectedVar ? selectedVar.targetWidthCm : 28;
    const targetGsm = selectedVar ? selectedVar.standardWeightGsm : 500;
    const lengthTol = selectedVar ? (selectedVar.allowedSizingTolerancePct / 100) * targetLength : 3;
    const gsmTol = selectedVar ? (selectedVar.allowedGsmTolerancePct / 100) * targetGsm : 15;

    const lengthDiff = Math.abs(actualLengthCm - targetLength);
    const widthDiff = Math.abs(actualWidthCm - targetWidth);
    const gsmDiff = Math.abs(actualWeightGsm - targetGsm);

    let sizingStatus: 'pass' | 'under_sized' | 'over_sized' = 'pass';
    if (actualLengthCm < targetLength - lengthTol) sizingStatus = 'under_sized';
    else if (actualLengthCm > targetLength + lengthTol) sizingStatus = 'over_sized';

    let gsmStatus: 'pass' | 'low_gsm' | 'high_gsm' = 'pass';
    if (actualWeightGsm < targetGsm - gsmTol) gsmStatus = 'low_gsm';
    else if (actualWeightGsm > targetGsm + gsmTol) gsmStatus = 'high_gsm';

    let overallResult: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
    if (sizingStatus !== 'pass' || selvedgeCondition === 'defect' || borderScore < 3) {
      overallResult = 'FAIL';
    } else if (gsmStatus !== 'pass' || borderScore === 3) {
      overallResult = 'WARNING';
    }

    const newAudit: QualityCheckAudit = {
      id: `qa_${Date.now().toString(36)}`,
      checkDate: new Date().toISOString().slice(0, 10),
      checkTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      machineNo: auditMachineNo,
      varietyName: auditVarietyName,
      operatorName: auditOperatorName,
      sampleNo: 1,
      actualLengthCm,
      actualWidthCm,
      actualWeightGsm,
      borderQualityScore: borderScore,
      selvedgeCondition,
      sizingStatus,
      gsmStatus,
      overallResult,
      varianceNotes,
      actionTaken,
      auditorName: 'QC Auditor'
    };

    onSaveAudit(newAudit);
    setShowAuditModal(false);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    const today = new Date().toISOString().slice(0, 10);
    const nextDue = new Date(Date.now() + frequencyDays * 86400000).toISOString().slice(0, 10);

    const newReminder: RoutineTaskReminder = {
      id: `rem_${Date.now().toString(36)}`,
      taskTitle,
      machineNo: reminderMachineNo,
      category: reminderCategory,
      frequencyDays,
      lastCheckedDate: today,
      nextDueDate: nextDue,
      assignedRoleOrPerson: reminderRole,
      status: 'due_today',
      checklistItems: [
        { id: 'c1', label: 'Verify towel cut length across 3 consecutive samples per machine', checked: false },
        { id: 'c2', label: 'Verify towel width at top, middle and bottom hem', checked: false },
        { id: 'c3', label: 'Weigh 1 sq meter sample for GSM check', checked: false },
        { id: 'c4', label: 'Confirm ZERO sizing discrepancy between all machines running this variety', checked: false }
      ],
      notes: 'Routine scheduled task for quality maintenance.'
    };

    onSaveReminder(newReminder);
    setShowReminderModal(false);
  };

  const filteredAudits = audits.filter(a => {
    const matchesSearch = a.varietyName.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          a.machineNo.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          a.operatorName.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesMachine = selectedMachineFilter === 'all' || a.machineNo === selectedMachineFilter;
    return matchesSearch && matchesMachine;
  });

  // Calculate machine sizing comparison table
  const getMachineSizingComparison = () => {
    const machineMap: Record<string, {
      machineNo: string;
      operatorName: string;
      varietyName: string;
      avgLength: number;
      avgWidth: number;
      avgGsm: number;
      passCount: number;
      failCount: number;
      lastCheckTime: string;
    }> = {};

    audits.forEach(a => {
      if (!machineMap[a.machineNo]) {
        machineMap[a.machineNo] = {
          machineNo: a.machineNo,
          operatorName: a.operatorName,
          varietyName: a.varietyName,
          avgLength: a.actualLengthCm,
          avgWidth: a.actualWidthCm,
          avgGsm: a.actualWeightGsm,
          passCount: a.overallResult === 'PASS' ? 1 : 0,
          failCount: a.overallResult === 'FAIL' ? 1 : 0,
          lastCheckTime: `${a.checkDate} ${a.checkTime}`
        };
      } else {
        const m = machineMap[a.machineNo];
        m.avgLength = (m.avgLength + a.actualLengthCm) / 2;
        m.avgWidth = (m.avgWidth + a.actualWidthCm) / 2;
        m.avgGsm = (m.avgGsm + a.actualWeightGsm) / 2;
        if (a.overallResult === 'PASS') m.passCount++;
        if (a.overallResult === 'FAIL') m.failCount++;
      }
    });

    return Object.values(machineMap);
  };

  const machineComparisons = getMachineSizingComparison();

  return (
    <div className="space-y-6">
      {/* Sub Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2 bg-slate-100 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveSubTab('quality_audits')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'quality_audits'
              ? 'bg-white text-slate-900 shadow-sm border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="subtab-quality-audits"
        >
          <Ruler className="w-4 h-4 text-indigo-600" />
          <span>Variety Verification Matrix ({audits.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('variety_catalog')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'variety_catalog'
              ? 'bg-white text-slate-900 shadow-sm border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="subtab-variety-catalog"
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Variety Catalog ({varieties.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('routine_reminders')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'routine_reminders'
              ? 'bg-white text-slate-900 shadow-sm border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          id="subtab-routine-reminders"
        >
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Routine Maintenance ({reminders.length})</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. QUALITY AUDITS & SIZING CHECK TAB */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'quality_audits' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 m-0">Quality Control & Sizing Matrix</h2>
              <p className="text-xs text-slate-500 mt-1">
                Monitors variety dimensions across all operating machines to guarantee zero sizing mismatch.
              </p>
            </div>
            <button
              onClick={() => setShowAuditModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              id="btn-new-quality-audit"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Sizing Entry</span>
            </button>
          </div>

          {/* Alert Highlight Banner for Sizing Mismatch Issues */}
          {audits.some(a => a.overallResult === 'FAIL') && (
            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block">VARIANCE ALERT: Sizing Mismatch Detected!</span>
                <p className="mt-0.5 text-amber-800">
                  Recent quality checks indicate towel size / GSM variance on <strong>Machine 2</strong> compared to Machine 1 and target specs. 
                  Follow the calibration guide below to eliminate tension drift.
                </p>
              </div>
            </div>
          )}

          {/* Grid Layout with Matrix and Calibration Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Multi-Machine Size Comparison Summary */}
            <div className="lg:col-span-8 panel mb-0">
              <div className="p-4 -mx-5 -mt-5 mb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl">
                <span className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Variety Verification Matrix
                </span>
                <span className="text-xs text-slate-500 font-medium">Active: Premium Terry Cotton</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-500 bg-white border-b border-slate-100 uppercase">
                      <th className="p-3">Machine No.</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3 text-center">Measured Size</th>
                      <th className="p-3 text-center">Standard</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {machineComparisons.map((m, idx) => {
                      const isFail = m.failCount > 0;
                      return (
                        <tr key={idx} className={isFail ? 'bg-red-50/30' : 'hover:bg-slate-50/80'}>
                          <td className="p-3 font-semibold text-slate-900">{m.machineNo}</td>
                          <td className="p-3 text-slate-700">{m.operatorName || 'Rajesh Kumar'}</td>
                          <td className="p-3 text-center font-mono font-semibold text-slate-900">
                            {m.avgLength.toFixed(1)} x {m.avgWidth.toFixed(1)} in
                          </td>
                          <td className="p-3 text-center font-mono text-slate-500">55 x 28 in</td>
                          <td className="p-3">
                            {isFail ? (
                              <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded text-xs uppercase font-bold">VARIANCE ALERT</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded text-xs font-bold uppercase">PASSED</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calibration Guide Hero Card */}
            <div className="lg:col-span-4 bg-indigo-900 text-white rounded-xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <h2 className="text-lg font-bold mb-2">Calibration Guide</h2>
                <p className="text-indigo-200 text-xs mb-4 leading-relaxed">
                  Critical issue detected on M-02. Tension settings may have drifted since the new variety introduction.
                </p>
                <div className="space-y-3">
                  <div className="bg-white/10 p-3 rounded-lg border border-white/10">
                    <span className="block text-[10px] uppercase font-bold text-indigo-300">Step 1</span>
                    <span className="text-xs">Check tensioners on Machine 02</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg border border-white/10">
                    <span className="block text-[10px] uppercase font-bold text-indigo-300">Step 2</span>
                    <span className="text-xs">Compare sizing output at 10% speed</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg border border-white/10">
                    <span className="block text-[10px] uppercase font-bold text-indigo-300">Step 3</span>
                    <span className="text-xs">Log results to Supabase `qc_logs`</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Inspection Logs */}
          <div className="panel">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
              <h3 className="font-serif text-sm font-bold text-slate-800 m-0">Detailed Audit Inspection Logs</h3>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60 flex items-center">
                  <input
                    type="text"
                    placeholder="Search variety, machine..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    className="w-full mb-0 text-xs py-1.5 border border-slate-300 rounded-lg"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                </div>

                <select
                  value={selectedMachineFilter}
                  onChange={(e) => setSelectedMachineFilter(e.target.value)}
                  className="text-xs mb-0 w-auto"
                >
                  <option value="all">All Machines</option>
                  <option value="Machine 1">Machine 1</option>
                  <option value="Machine 2">Machine 2</option>
                  <option value="Machine 3">Machine 3</option>
                  <option value="Machine 4">Machine 4</option>
                  <option value="Machine 5">Machine 5</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Machine</th>
                    <th>Operator</th>
                    <th>Variety</th>
                    <th className="num">Actual Size (L x W)</th>
                    <th className="num">Weight</th>
                    <th>Result</th>
                    <th>Notes & Corrective Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-note text-center py-6">
                        No quality check audits logged yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAudits.map((a) => (
                      <tr key={a.id} className={a.overallResult === 'FAIL' ? 'bg-rose-50/50' : ''}>
                        <td className="font-mono text-xs">
                          <div>{a.checkDate}</div>
                          <div className="text-[10px] text-slate-400">{a.checkTime}</div>
                        </td>
                        <td className="font-bold font-mono text-slate-800">{a.machineNo}</td>
                        <td>{a.operatorName}</td>
                        <td className="font-medium">{a.varietyName}</td>
                        <td className="num font-mono">
                          {a.actualLengthCm} x {a.actualWidthCm} in
                          {a.sizingStatus !== 'pass' && (
                            <span className="block text-[10px] text-rose-600 font-bold uppercase">{a.sizingStatus.replace('_', ' ')}</span>
                          )}
                        </td>
                        <td className="num font-mono">
                          {a.actualWeightGsm} grm
                        </td>
                        <td>
                          {a.overallResult === 'PASS' && <span className="pill paid">PASS</span>}
                          {a.overallResult === 'WARNING' && <span className="pill low">WARNING</span>}
                          {a.overallResult === 'FAIL' && <span className="pill unpaid">FAIL</span>}
                        </td>
                        <td className="text-xs">
                          <div className="font-medium text-slate-800">{a.varianceNotes}</div>
                          {a.actionTaken && (
                            <div className="text-[11px] text-emerald-800 italic mt-0.5">
                              Action: {a.actionTaken}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. VARIETY CATALOG & MACHINE ALLOCATION TAB */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'variety_catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-900 m-0">Towel Variety Catalog & Machine Assignments</h2>
              <p className="text-xs font-mono text-slate-500 mt-1">
                Define master towel specs (GSM, Target Length & Width, Yarn Specs) and track which machines are running each variety.
              </p>
            </div>
            <button
              onClick={() => setShowVarietyModal(true)}
              className="btn primary flex items-center justify-center gap-2"
              id="btn-add-variety"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Variety</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {varieties.map((v) => (
              <div key={v.id} className="bg-white border border-slate-300 p-5 rounded shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {v.category}
                    </span>
                    <h3 className="font-serif font-bold text-lg text-slate-900 mt-1">{v.varietyName}</h3>
                  </div>
                  <span className="pill ok">Active</span>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-200 pt-3 my-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-mono block text-[10px]">Standard Weight</span>
                      <span className="font-bold font-mono text-slate-800">{v.standardWeightGsm} grm</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono block text-[10px]">Target Dimensions</span>
                      <span className="font-bold font-mono text-slate-800">{v.targetLengthCm} x {v.targetWidthCm} inches</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-mono block text-[10px]">Sizing Tolerance</span>
                      <span className="font-mono text-slate-700">±{v.allowedSizingTolerancePct}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono block text-[10px]">Weight Tolerance</span>
                      <span className="font-mono text-slate-700">±{v.allowedGsmTolerancePct}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                    <div><strong>Warp Yarn:</strong> {v.warpYarnSpec}</div>
                    <div><strong>Weft Yarn:</strong> {v.weftYarnSpec}</div>
                    <div><strong>Terry Pick:</strong> {v.pileYarnSpec}</div>
                  </div>
                </div>

                {/* Assigned Machines */}
                <div>
                  <h4 className="font-mono text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-indigo-600" />
                    <span>Assigned Loom Machines ({v.assignedMachines.length})</span>
                  </h4>

                  <div className="space-y-1">
                    {v.assignedMachines.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-1.5 bg-slate-100 rounded">
                        <span className="font-bold font-mono text-slate-800">{m.machineNo}</span>
                        <span className="text-slate-600">{m.operatorName || 'No Operator'}</span>
                        <span className="text-[10px] font-mono text-indigo-700 font-semibold">{m.completedQty} / {m.allocatedQty} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. ROUTINE TASK REMINDERS TAB */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'routine_reminders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-900 m-0">Routine Loom Inspection & Task Reminders</h2>
              <p className="text-xs font-mono text-slate-500 mt-1">
                Scheduled daily/weekly maintenance, sizing viscosity, and towel dimension quality checks.
              </p>
            </div>
            <button
              onClick={() => setShowReminderModal(true)}
              className="btn primary flex items-center justify-center gap-2"
              id="btn-add-routine-reminder"
            >
              <Plus className="w-4 h-4" />
              <span>Add Routine Task</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map((r) => {
              const isDueToday = r.status === 'due_today';
              const isOverdue = r.status === 'overdue';
              return (
                <div
                  key={r.id}
                  className={`panel relative border-l-4 ${
                    isOverdue
                      ? 'border-l-rose-600 bg-rose-50/30'
                      : isDueToday
                      ? 'border-l-amber-500 bg-amber-50/20'
                      : 'border-l-emerald-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif font-bold text-slate-900 text-base m-0">{r.taskTitle}</h3>
                    <select
                      value={r.status}
                      onChange={(e) => onUpdateReminderStatus(r.id, e.target.value as any)}
                      className="text-xs p-1 mb-0 border border-slate-300 rounded bg-white w-auto"
                    >
                      <option value="pending">Pending</option>
                      <option value="due_today">Due Today</option>
                      <option value="overdue">Overdue</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div className="text-xs font-mono text-slate-600 space-y-1 my-3">
                    <div className="flex justify-between">
                      <span>Assigned Loom: <strong>{r.machineNo || 'All Looms'}</strong></span>
                      <span>Frequency: <strong>Every {r.frequencyDays} Day(s)</strong></span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Assigned To: {r.assignedRoleOrPerson}</span>
                      <span className="text-amber-800 font-bold">Due Date: {r.nextDueDate}</span>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="bg-white p-3 border border-slate-200 rounded space-y-1.5 text-xs">
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Checklist Items:
                    </span>
                    {r.checklistItems.map((chk) => (
                      <label key={chk.id} className="flex items-center gap-2 cursor-pointer font-sans mb-0">
                        <input
                          type="checkbox"
                          defaultChecked={chk.checked}
                          className="rounded text-amber-600 mb-0"
                        />
                        <span className={chk.checked ? 'line-through text-slate-400' : 'text-slate-800'}>
                          {chk.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {r.notes && (
                    <div className="text-xs text-slate-500 italic mt-2">
                      Note: {r.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD VARIETY */}
      {/* ---------------------------------------------------- */}
      {showVarietyModal && (
        <div className="modal-backdrop">
          <section className="modal max-w-2xl" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h2>Add Towel Variety to Master Catalog</h2>
              <button className="close-btn" aria-label="Close" onClick={() => setShowVarietyModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveVariety} className="space-y-4">
              <div className="row2">
                <div>
                  <label>Variety Name *</label>
                  <input
                    type="text"
                    value={varietyName}
                    onChange={(e) => setVarietyName(e.target.value)}
                    placeholder="e.g. Royal Bath Towel 500GSM"
                    required
                  />
                </div>
                <div>
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Bath Towel">Bath Towel</option>
                    <option value="Hand Towel">Hand Towel</option>
                    <option value="Face Towel">Face Towel</option>
                    <option value="Jacquard">Jacquard</option>
                    <option value="Terry Cloth">Terry Cloth</option>
                  </select>
                </div>
              </div>

              <div className="row3">
                <div>
                  <label>Standard Weight (Grams / grm)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={standardWeightGsm || ''}
                    onChange={(e) => setStandardWeightGsm(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label>Target Length (inches)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetLengthCm || ''}
                    onChange={(e) => setTargetLengthCm(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label>Target Width (inches)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetWidthCm || ''}
                    onChange={(e) => setTargetWidthCm(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="row2">
                <div>
                  <label>Allowed Sizing Tolerance (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={allowedSizingTolerancePct || ''}
                    onChange={(e) => setAllowedSizingTolerancePct(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label>Allowed Weight Tolerance (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={allowedGsmTolerancePct || ''}
                    onChange={(e) => setAllowedGsmTolerancePct(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="row3">
                <div>
                  <label>Warp Yarn Spec</label>
                  <input
                    type="text"
                    value={warpYarnSpec}
                    onChange={(e) => setWarpYarnSpec(e.target.value)}
                  />
                </div>
                <div>
                  <label>Weft Yarn Spec</label>
                  <input
                    type="text"
                    value={weftYarnSpec}
                    onChange={(e) => setWeftYarnSpec(e.target.value)}
                  />
                </div>
                <div>
                  <label>Terry Pick Yarn Spec</label>
                  <input
                    type="text"
                    value={pileYarnSpec}
                    onChange={(e) => setPileYarnSpec(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 bg-white sticky bottom-0 z-20">
                <button type="submit" className="btn primary full font-bold">Save Towel Variety</button>
                <button type="button" onClick={() => setShowVarietyModal(false)} className="btn text-slate-600 border-slate-300 font-bold">Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: RECORD QUALITY AUDIT */}
      {/* ---------------------------------------------------- */}
      {showAuditModal && (
        <div className="modal-backdrop">
          <section className="modal max-w-2xl" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h2>Record Towel Sizing & Quality Inspection</h2>
              <button className="close-btn" aria-label="Close" onClick={() => setShowAuditModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveAudit} className="space-y-4">
              <div className="row3">
                <div>
                  <label>Machine No *</label>
                  <select value={auditMachineNo} onChange={(e) => setAuditMachineNo(e.target.value)}>
                    <option value="Machine 1">Machine 1</option>
                    <option value="Machine 2">Machine 2</option>
                    <option value="Machine 3">Machine 3</option>
                    <option value="Machine 4">Machine 4</option>
                    <option value="Machine 5">Machine 5</option>
                  </select>
                </div>
                <div>
                  <label>Running Variety *</label>
                  <select value={auditVarietyName} onChange={(e) => setAuditVarietyName(e.target.value)}>
                    {varieties.map((v, i) => (
                      <option key={i} value={v.varietyName}>{v.varietyName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Operator Name</label>
                  <select value={auditOperatorName} onChange={(e) => setAuditOperatorName(e.target.value)}>
                    {operatorNames.map((o, i) => (
                      <option key={i} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded text-xs space-y-1 font-mono">
                <span className="font-bold text-amber-900 block uppercase">Target Specs for {auditVarietyName}:</span>
                <div>
                  Standard Length: <strong>{varieties.find(v => v.varietyName === auditVarietyName)?.targetLengthCm || 55} in</strong> | 
                  Standard Width: <strong>{varieties.find(v => v.varietyName === auditVarietyName)?.targetWidthCm || 28} in</strong> | 
                  Standard Weight: <strong>{varieties.find(v => v.varietyName === auditVarietyName)?.standardWeightGsm || 500} grm</strong>
                </div>
              </div>

              <div className="row3">
                <div>
                  <label>Measured Length (inches) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={actualLengthCm || ''}
                    onChange={(e) => setActualLengthCm(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label>Measured Width (inches) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={actualWidthCm || ''}
                    onChange={(e) => setActualWidthCm(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label>Measured Weight (Grams / grm) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={actualWeightGsm || ''}
                    onChange={(e) => setActualWeightGsm(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="row2">
                <div>
                  <label>Selvedge & Edge Condition</label>
                  <select value={selvedgeCondition} onChange={(e) => setSelvedgeCondition(e.target.value as any)}>
                    <option value="pass">Pass (Clean edge)</option>
                    <option value="defect">Defect / Frayed</option>
                  </select>
                </div>
                <div>
                  <label>Border Quality Rating (1-5)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={borderScore || ''}
                    onChange={(e) => setBorderScore(e.target.value === '' ? 5 : parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>

              <div>
                <label>Variance Notes / Discrepancy Details</label>
                <input
                  type="text"
                  value={varianceNotes}
                  onChange={(e) => setVarianceNotes(e.target.value)}
                  placeholder="e.g. Length is 53.5 in vs Machine 1 spec 55 in"
                />
              </div>

              <div>
                <label>Corrective Action Taken</label>
                <input
                  type="text"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g. Reed tension adjusted & warp beam let-off recalibrated"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 bg-white sticky bottom-0 z-20">
                <button type="submit" className="btn primary full font-bold">Save Audit Record</button>
                <button type="button" onClick={() => setShowAuditModal(false)} className="btn text-slate-600 border-slate-300 font-bold">Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD ROUTINE REMINDER */}
      {/* ---------------------------------------------------- */}
      {showReminderModal && (
        <div className="modal-backdrop">
          <section className="modal max-w-xl" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h2>Schedule Routine Inspection Task</h2>
              <button className="close-btn" aria-label="Close" onClick={() => setShowReminderModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveReminder} className="space-y-4">
              <div>
                <label>Task Title *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Towel Length & Sizing Variance Check"
                  required
                />
              </div>

              <div className="row2">
                <div>
                  <label>Assigned Loom Machines</label>
                  <input
                    type="text"
                    value={reminderMachineNo}
                    onChange={(e) => setReminderMachineNo(e.target.value)}
                    placeholder="e.g. Machine 1, Machine 2, Machine 3"
                  />
                </div>
                <div>
                  <label>Frequency (Every N Days)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={frequencyDays || ''}
                    onChange={(e) => setFrequencyDays(e.target.value === '' ? 1 : parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </div>

              <div className="row2">
                <div>
                  <label>Task Category</label>
                  <select value={reminderCategory} onChange={(e) => setReminderCategory(e.target.value as any)}>
                    <option value="quality_audit">Quality Audit</option>
                    <option value="sizing_check">Sizing & Chemical Check</option>
                    <option value="machine_calibration">Machine Calibration</option>
                    <option value="lubrication">Lubrication & Maintenance</option>
                  </select>
                </div>
                <div>
                  <label>Assigned Role / Person</label>
                  <input
                    type="text"
                    value={reminderRole}
                    onChange={(e) => setReminderRole(e.target.value)}
                    placeholder="e.g. QC Supervisor Selvam"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 bg-white sticky bottom-0 z-20">
                <button type="submit" className="btn primary full font-bold">Schedule Task</button>
                <button type="button" onClick={() => setShowReminderModal(false)} className="btn text-slate-600 border-slate-300 font-bold">Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
