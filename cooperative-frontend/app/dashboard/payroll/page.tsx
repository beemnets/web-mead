'use client';

import { useState, useMemo } from 'react';
import {
  useGenerateDeductionListMutation,
  useGetDeductionListQuery,
  useProcessConfirmationMutation,
  useReconcileDeductionsMutation,
  useGetMonthlySummaryQuery,
  useFlagFailedDeductionMutation,
  type MonthlySummary,
  type MemberContributionRow,
  type ReconciliationReport,
} from '@/features/payroll/payrollApi';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Modal } from '@/components/common/Modal';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { toastSuccess, toastError } from '@/components/common/Toast';
import { exportToCsv } from '@/lib/exportCsv';

function toYearMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const DEDUCTION_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700 border border-amber-200',
  CONFIRMED: 'bg-green-100 text-green-700 border border-green-200',
  FAILED:    'bg-red-100 text-red-700 border border-red-200',
};

const CONTRIBUTION_STATUS: Record<string, { color: string; label: string; dot: string }> = {
  PAID:    { color: 'bg-green-100 text-green-700 border border-green-200',   label: 'Paid',    dot: 'bg-green-500' },
  PARTIAL: { color: 'bg-blue-100 text-blue-700 border border-blue-200',     label: 'Partial', dot: 'bg-blue-500' },
  UNPAID:  { color: 'bg-red-100 text-red-700 border border-red-200',        label: 'Unpaid',  dot: 'bg-red-500' },
  LATE:    { color: 'bg-orange-100 text-orange-700 border border-orange-200',label: 'Late',    dot: 'bg-orange-500' },
  PENDING: { color: 'bg-gray-100 text-gray-600 border border-gray-200',     label: 'Pending', dot: 'bg-gray-400' },
};

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`p-4 rounded-xl border ${color} space-y-1`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

// ── Month/Year picker shared ─────────────────────────────────────────────────
function PeriodPicker({ year, month, onYear, onMonth }: {
  year: number; month: number;
  onYear: (y: number) => void; onMonth: (m: number) => void;
}) {
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const cls = 'px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  return (
    <div className="flex items-center gap-2">
      <select value={month} onChange={e => onMonth(Number(e.target.value))} className={cls}>
        {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
      </select>
      <select value={year} onChange={e => onYear(Number(e.target.value))} className={cls}>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

// ── Monthly Report Tab ───────────────────────────────────────────────────────
function MonthlyReportTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<MemberContributionRow | null>(null);

  const period = toYearMonth(year, month);
  const { data: summary, isLoading, error } = useGetMonthlySummaryQuery(period);

  const filtered = useMemo(() => {
    if (!summary) return [];
    let rows = [...summary.members];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.memberName.toLowerCase().includes(q) || r.memberId.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    return rows;
  }, [summary, search, statusFilter]);

  const collectionRate = summary && summary.totalExpected > 0
    ? Math.round((summary.totalCollected / summary.totalExpected) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Period picker */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Monthly Contribution Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">Track member payment behavior for any month</p>
          </div>
          <PeriodPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No deduction list found for {MONTHS[month-1]} {year}. Generate the list first in the Processing tab.
        </div>
      )}

      {summary && !isLoading && (
        <>
          {/* Dashboard summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard label="Total Members"   value={summary.totalMembers}  color="bg-gray-50 border-gray-200 text-gray-800" />
            <StatCard label="Paid"            value={summary.paidMembers}   color="bg-green-50 border-green-200 text-green-800" />
            <StatCard label="Unpaid"          value={summary.unpaidMembers} color="bg-red-50 border-red-200 text-red-800" />
            <StatCard label="Partial"         value={summary.partialMembers}color="bg-blue-50 border-blue-200 text-blue-800" />
            <StatCard label="Pending"         value={summary.pendingMembers}color="bg-amber-50 border-amber-200 text-amber-800" />
            <StatCard label="Collection Rate" value={`${collectionRate}%`}  color="bg-indigo-50 border-indigo-200 text-indigo-800" />
          </div>

          {/* Money summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Expected</p>
              <p className="text-2xl font-bold text-gray-900">ETB {Number(summary.totalExpected).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-green-700">ETB {Number(summary.totalCollected).toLocaleString()}</p>
            </div>
            <div className={`rounded-xl border p-4 shadow-sm ${Number(summary.totalShortfall) > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Shortfall</p>
              <p className={`text-2xl font-bold ${Number(summary.totalShortfall) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                ETB {Number(summary.totalShortfall).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Collection Progress — {MONTHS[month-1]} {year}</span>
              <span className="font-semibold text-gray-700">{collectionRate}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${collectionRate >= 90 ? 'bg-green-500' : collectionRate >= 60 ? 'bg-blue-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, collectionRate)}%` }}
              />
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
              {Object.entries(CONTRIBUTION_STATUS).map(([key, s]) => {
                const count = key === 'PAID' ? summary.paidMembers
                  : key === 'UNPAID' ? summary.unpaidMembers
                  : key === 'PARTIAL' ? summary.partialMembers
                  : key === 'LATE' ? summary.lateMembers
                  : summary.pendingMembers;
                if (count === 0) return null;
                return (
                  <span key={key} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    {s.label}: {count}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search by member name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PENDING">Pending</option>
            </select>
            <button
              onClick={() => exportToCsv(filtered as unknown as Record<string, unknown>[], `contribution_${period}`, [
                { key: 'memberName', label: 'Member Name' },
                { key: 'memberId', label: 'Member ID' },
                { key: 'expectedAmount', label: 'Expected (ETB)' },
                { key: 'confirmedAmount', label: 'Confirmed (ETB)' },
                { key: 'status', label: 'Status' },
                { key: 'confirmedDate', label: 'Confirmed Date' },
                { key: 'failureReason', label: 'Failure Reason' },
              ])}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {summary.members.length} members</span>
          </div>

          {/* Members table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Member</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Expected</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Confirmed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No members match your filters</td></tr>
                ) : filtered.map(row => {
                  const s = CONTRIBUTION_STATUS[row.status] ?? CONTRIBUTION_STATUS.PENDING;
                  return (
                    <tr
                      key={row.memberId}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedMember(row)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{row.memberName}</td>
                      <td className="px-4 py-3 text-right text-gray-700">ETB {Number(row.expectedAmount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {row.confirmedAmount != null ? `ETB ${Number(row.confirmedAmount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {row.confirmedDate ? new Date(row.confirmedDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Member detail modal */}
      <Modal open={!!selectedMember} onClose={() => setSelectedMember(null)} title="Member Contribution Detail" width="max-w-md">
        {selectedMember && (() => {
          const s = CONTRIBUTION_STATUS[selectedMember.status] ?? CONTRIBUTION_STATUS.PENDING;
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold text-sm">{selectedMember.memberName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedMember.memberName}</p>
                  <p className="text-xs text-gray-400 font-mono">{selectedMember.memberId.slice(0, 16)}…</p>
                </div>
                <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.color}`}>
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Expected', value: `ETB ${Number(selectedMember.expectedAmount).toLocaleString()}` },
                  { label: 'Confirmed', value: selectedMember.confirmedAmount != null ? `ETB ${Number(selectedMember.confirmedAmount).toLocaleString()}` : '—' },
                  { label: 'Period', value: `${MONTHS[parseInt(period.split('-')[1]) - 1]} ${period.split('-')[0]}` },
                  { label: 'Confirmed Date', value: selectedMember.confirmedDate ? new Date(selectedMember.confirmedDate).toLocaleDateString() : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
              {selectedMember.confirmedAmount != null && selectedMember.confirmedAmount < selectedMember.expectedAmount && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Shortfall</p>
                  <p className="text-sm font-bold text-blue-800">
                    ETB {(Number(selectedMember.expectedAmount) - Number(selectedMember.confirmedAmount)).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedMember.failureReason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-xs font-semibold text-red-700 mb-0.5">Failure Reason</p>
                  <p className="text-sm text-red-800">{selectedMember.failureReason}</p>
                </div>
              )}
              <button onClick={() => setSelectedMember(null)} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ── Processing Tab (existing workflow, cleaned up) ───────────────────────────
function ProcessingTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [reconcileResult, setReconcileResult] = useState<ReconciliationReport | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmAmounts, setConfirmAmounts] = useState<Record<string, number | undefined>>({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [flagTarget, setFlagTarget] = useState<any | null>(null);
  const [flagReason, setFlagReason] = useState('');

  const period = toYearMonth(year, month);

  const { data: deductionList = [], isLoading, refetch } = useGetDeductionListQuery(period);
  const [generateList, { isLoading: generating }] = useGenerateDeductionListMutation();
  const [processConfirmation] = useProcessConfirmationMutation();
  const [reconcile, { isLoading: reconciling }] = useReconcileDeductionsMutation();
  const [flagFailed] = useFlagFailedDeductionMutation();

  const filtered = useMemo(() => {
    let rows = [...(deductionList as any[])];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(d => (d.memberName ?? d.memberId ?? '').toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') rows = rows.filter(d => d.status === filterStatus);
    return rows;
  }, [deductionList, search, filterStatus]);

  const handleGenerate = async () => {
    try {
      await generateList(period).unwrap();
      toastSuccess(`Deduction list generated for ${MONTHS[month-1]} ${year}`);
      refetch();
    } catch (e: any) {
      toastError(e?.data?.message ?? 'Failed to generate list');
    }
  };

  const handleConfirm = async (d: any) => {
    const amount = confirmAmounts[d.id] ?? Number(d.deductionAmount ?? 0);
    if (!amount || amount <= 0) { toastError('Enter a valid amount'); return; }
    setConfirmingId(d.id);
    try {
      await processConfirmation({ memberId: d.memberId, deductionMonth: period, amount }).unwrap();
      toastSuccess(`Confirmed ETB ${amount.toLocaleString()} for ${d.memberName ?? d.memberId}`);
      setConfirmAmounts(prev => { const n = { ...prev }; delete n[d.id]; return n; });
      refetch();
    } catch (e: any) {
      toastError(e?.data?.message ?? 'Confirmation failed');
    }
    setConfirmingId(null);
  };

  const handleFlag = async () => {
    if (!flagTarget || !flagReason.trim()) return;
    try {
      await flagFailed({ memberId: flagTarget.memberId, month: period, reason: flagReason }).unwrap();
      toastSuccess(`Flagged as failed for ${flagTarget.memberName ?? flagTarget.memberId}`);
      setFlagTarget(null); setFlagReason('');
      refetch();
    } catch (e: any) {
      toastError(e?.data?.message ?? 'Failed to flag deduction');
    }
  };

  const handleReconcile = async () => {
    try {
      const result = await reconcile(period).unwrap();
      setReconcileResult(result);
      setShowReconcileModal(false);
      toastSuccess('Reconciliation complete');
    } catch (e: any) {
      toastError(e?.data?.message ?? 'Reconciliation failed');
    }
  };

  const pending = (deductionList as any[]).filter(d => d.status === 'PENDING').length;
  const confirmed = (deductionList as any[]).filter(d => d.status === 'CONFIRMED').length;
  const failed = (deductionList as any[]).filter(d => d.status === 'FAILED').length;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Period</p>
            <PeriodPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {generating && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {generating ? 'Generating…' : 'Generate List'}
            </button>
            <button
              onClick={() => setShowReconcileModal(true)}
              disabled={(deductionList as any[]).length === 0}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-40"
            >
              Reconcile
            </button>
          </div>
          {(deductionList as any[]).length > 0 && (
            <div className="flex gap-3 ml-auto text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{pending} pending</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{confirmed} confirmed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{failed} failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Deduction list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Deductions — {MONTHS[month-1]} {year}
          </h2>
          {(deductionList as any[]).length > 0 && (
            <>
              <input
                type="text"
                placeholder="Search member…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
              />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="FAILED">Failed</option>
              </select>
              <button
                onClick={() => exportToCsv(filtered as unknown as Record<string, unknown>[], `payroll_${period}`, [
                  { key: 'memberName', label: 'Member' },
                  { key: 'deductionAmount', label: 'Expected' },
                  { key: 'confirmedAmount', label: 'Confirmed' },
                  { key: 'deductionMonth', label: 'Month' },
                  { key: 'status', label: 'Status' },
                ])}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            {(deductionList as any[]).length === 0
              ? `No deduction list for ${MONTHS[month-1]} ${year}. Click Generate List.`
              : 'No deductions match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Member</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600">Expected</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{d.memberName ?? d.memberId}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      ETB {Number(d.deductionAmount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${DEDUCTION_STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.status}
                        {d.status === 'CONFIRMED' && d.confirmedAmount != null && (
                          <span className="ml-1 opacity-70">· ETB {Number(d.confirmedAmount).toLocaleString()}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {d.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <div className="w-32">
                            <CurrencyInput
                              value={confirmAmounts[d.id] ?? Number(d.deductionAmount ?? 0)}
                              onChange={v => setConfirmAmounts(prev => ({ ...prev, [d.id]: v }))}
                              className="w-full px-2 py-1 rounded border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                              placeholder={String(d.deductionAmount ?? '')}
                            />
                          </div>
                          <button
                            onClick={() => handleConfirm(d)}
                            disabled={confirmingId === d.id}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            {confirmingId === d.id ? '…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => { setFlagTarget(d); setFlagReason(''); }}
                            className="px-3 py-1 border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50"
                          >
                            Flag Failed
                          </button>
                        </div>
                      )}
                      {d.status === 'CONFIRMED' && (
                        <span className="text-xs text-gray-400">
                          {d.confirmedDate ? new Date(d.confirmedDate).toLocaleDateString() : 'Confirmed'}
                        </span>
                      )}
                      {d.status === 'FAILED' && (
                        <span className="text-xs text-red-500">{d.failureReason ?? 'Failed'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reconciliation result */}
      {reconcileResult && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Reconciliation — {String(reconcileResult.month)}</h2>
            <button onClick={() => setReconcileResult(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Expected', value: reconcileResult.expectedDeductions, color: 'text-gray-900' },
              { label: 'Confirmed', value: reconcileResult.confirmedDeductions, color: 'text-green-600' },
              { label: 'Failed', value: reconcileResult.failedDeductions, color: 'text-red-600' },
              { label: 'Discrepancy', value: `ETB ${Number(reconcileResult.discrepancyAmount).toLocaleString()}`, color: 'text-orange-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          {reconcileResult.discrepancies?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Discrepancies ({reconcileResult.discrepancies.length})</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {reconcileResult.discrepancies.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="font-medium text-gray-700">{d.memberName}</span>
                    <span className="text-gray-500">Expected: ETB {Number(d.expectedAmount).toLocaleString()}</span>
                    <span className="text-gray-500">Confirmed: ETB {Number(d.confirmedAmount).toLocaleString()}</span>
                    <span className={`font-semibold ${Number(d.difference) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {Number(d.difference) >= 0 ? '+' : ''}ETB {Number(d.difference).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reconcile confirm modal */}
      <Modal open={showReconcileModal} onClose={() => setShowReconcileModal(false)} title="Confirm Reconciliation" width="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Reconcile deductions for <strong>{MONTHS[month-1]} {year}</strong>?
            This will compare expected vs confirmed amounts and generate a discrepancy report.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReconcile}
              disabled={reconciling}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
            >
              {reconciling ? 'Reconciling…' : 'Confirm'}
            </button>
            <button onClick={() => setShowReconcileModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Flag failed modal */}
      <Modal open={!!flagTarget} onClose={() => { setFlagTarget(null); setFlagReason(''); }} title="Flag as Failed" width="max-w-sm">
        {flagTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Flag deduction for <strong>{flagTarget.memberName ?? flagTarget.memberId}</strong> as failed?
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Reason *</label>
              <textarea
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
                rows={3}
                placeholder="e.g. Member on unpaid leave, employer did not deduct…"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleFlag}
                disabled={!flagReason.trim()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Flag
              </button>
              <button onClick={() => { setFlagTarget(null); setFlagReason(''); }} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


// ── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [tab, setTab] = useState<'processing' | 'report'>('processing');

  return (
    <RoleGuard allowedRoles={['MANAGER', 'ACCOUNTANT']}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payroll & Contributions</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monthly deduction processing and contribution monitoring</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('processing')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'processing' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Processing
          </button>
          <button
            onClick={() => setTab('report')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'report' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly Report
          </button>
        </div>

        {/* Tab content */}
        {tab === 'processing' && <ProcessingTab />}
        {tab === 'report'     && <MonthlyReportTab />}
      </div>
    </RoleGuard>
  );
}
