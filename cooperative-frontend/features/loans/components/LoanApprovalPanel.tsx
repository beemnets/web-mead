'use client';

import React, { useState, useMemo } from 'react';
import { CircularProgress } from '@mui/material';
import {
  useGetPendingApplicationsQuery,
  useApproveApplicationMutation,
  useRejectApplicationMutation,
  useStartReviewMutation,
} from '../loansApi';
import { toastSuccess, toastError } from '@/components/common/Toast';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import type { LoanApplication } from '@/types';

type SortField = 'requestedAmount' | 'loanDurationMonths' | 'submissionDate';

export function LoanApprovalPanel() {
  const { data: applications = [], isLoading } = useGetPendingApplicationsQuery();
  const [approveApp, { isLoading: approving }] = useApproveApplicationMutation();
  const [rejectApp, { isLoading: rejecting }] = useRejectApplicationMutation();
  const [startReview] = useStartReviewMutation();

  const [selected, setSelected] = useState<LoanApplication | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');

  const [sortField, setSortField] = useState<SortField>('submissionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 5;

  const getAmount = (app: LoanApplication) =>
    typeof app.requestedAmount === 'object' ? (app.requestedAmount as any).amount : app.requestedAmount;

  const sorted = useMemo(() => {
    return [...applications].sort((a, b) => {
      if (sortField === 'submissionDate') {
        const av = new Date(a.submissionDate ?? 0).getTime();
        const bv = new Date(b.submissionDate ?? 0).getTime();
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const av = Number((a as any)[sortField] ?? 0);
      const bv = Number((b as any)[sortField] ?? 0);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [applications, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(0);
  };

  const sortIcon = (field: SortField) => {
    if (field !== sortField) return <span className="ml-0.5 text-gray-300 text-xs">↕</span>;
    return <span className="ml-0.5 text-blue-500 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await approveApp(selected.id).unwrap();
      toastSuccess('Application approved successfully');
      setSelected(null);
      setAction(null);
    } catch (e: any) {
      toastError(e?.data?.message ?? 'Failed to approve application');
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      setRejectReasonError('Denial reason is required');
      return;
    }
    if (rejectReason.trim().length < 5) {
      setRejectReasonError('Reason must be at least 5 characters');
      return;
    }
    setRejectReasonError('');
    try {
      await rejectApp({ id: selected.id, reason: rejectReason }).unwrap();
      toastSuccess('Application denied');
      setSelected(null);
      setAction(null);
      setRejectReason('');
    } catch (e: any) {
      toastError(e?.data?.message ?? 'Failed to deny application');
    }
  };

  const handleStartReview = async (app: LoanApplication) => {
    try {
      await startReview(app.id).unwrap();
      toastSuccess('Review started');
    } catch {
      // silently ignore — status may already be in review
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-600',
      UNDER_REVIEW: 'bg-blue-100 text-blue-700',
      APPROVED: 'bg-green-100 text-green-700',
      DENIED: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  if (isLoading) return <div className="flex justify-center py-8"><CircularProgress size={24} /></div>;

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No pending applications awaiting approval
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">App ID</th>
              <th
                className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700"
                onClick={() => handleSort('requestedAmount')}
              >
                Amount {sortIcon('requestedAmount')}
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700"
                onClick={() => handleSort('loanDurationMonths')}
              >
                Duration {sortIcon('loanDurationMonths')}
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Purpose</th>
              <th
                className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700"
                onClick={() => handleSort('submissionDate')}
              >
                Submitted {sortIcon('submissionDate')}
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Status</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((app: LoanApplication) => (
              <tr
                key={app.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => { setSelected(app); setAction(null); setRejectReason(''); setRejectReasonError(''); }}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{app.id.slice(0, 8)}…</td>
                <td className="px-4 py-2.5 font-semibold text-gray-800">
                  ETB {Number(getAmount(app)).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{app.loanDurationMonths}mo</td>
                <td className="px-4 py-2.5 text-gray-600 capitalize">
                  {app.loanPurpose?.toLowerCase().replace(/_/g, ' ') ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                  {app.submissionDate ? new Date(app.submissionDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(app.status ?? '')}`}>
                    {app.status ?? 'PENDING'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1.5 justify-end">
                    {((app.status as string) === 'PENDING') && (
                      <button
                        onClick={() => handleStartReview(app)}
                        className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
                      >
                        Review
                      </button>
                    )}
                    <button
                      onClick={() => { setSelected(app); setAction('approve'); setRejectReason(''); setRejectReasonError(''); }}
                      className="px-2.5 py-1 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => { setSelected(app); setAction('reject'); setRejectReason(''); setRejectReasonError(''); }}
                      className="px-2.5 py-1 rounded-md bg-red-500 text-white text-xs font-medium hover:bg-red-600"
                    >
                      Deny
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={sorted.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>

      {/* Detail / Action Modal */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setAction(null); setRejectReason(''); setRejectReasonError(''); }}
        title={`Application — ETB ${selected ? Number(getAmount(selected)).toLocaleString() : ''} · ${selected?.loanDurationMonths}mo`}
        width="max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Requested Amount', value: `ETB ${Number(getAmount(selected)).toLocaleString()}` },
                { label: 'Duration', value: `${selected.loanDurationMonths} months` },
                { label: 'Purpose', value: selected.loanPurpose?.toLowerCase().replace(/_/g, ' ') ?? '—' },
                { label: 'Status', value: selected.status ?? 'PENDING' },
                { label: 'Member ID', value: selected.memberId ? selected.memberId.slice(0, 8) + '…' : '—' },
                { label: 'Submitted', value: selected.submissionDate ? new Date(selected.submissionDate).toLocaleDateString() : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 capitalize">{value}</p>
                </div>
              ))}
            </div>

            {(selected as any).purposeDescription && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-400 mb-0.5">Description</p>
                <p className="text-sm text-gray-700">{(selected as any).purposeDescription}</p>
              </div>
            )}

            {/* Approve confirmation */}
            {action === 'approve' && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  Approve ETB {Number(getAmount(selected)).toLocaleString()} for {selected.loanDurationMonths} months?
                </p>
                <p className="text-xs text-green-700 mb-3">
                  This will move the loan to the disbursement queue.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {approving && <CircularProgress size={14} color="inherit" />}
                    {approving ? 'Approving…' : 'Confirm Approve'}
                  </button>
                  <button
                    onClick={() => setAction(null)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Reject form */}
            {action === 'reject' && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                <p className="text-sm font-semibold text-red-800">Deny this application</p>
                <div>
                  <textarea
                    rows={3}
                    placeholder="Reason for denial (min. 5 characters)..."
                    value={rejectReason}
                    onChange={(e) => { setRejectReason(e.target.value); setRejectReasonError(''); }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-400 ${
                      rejectReasonError ? 'border-red-400 bg-red-50' : 'border-red-300 bg-white'
                    }`}
                  />
                  {rejectReasonError && (
                    <p className="text-xs text-red-500 mt-1">{rejectReasonError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={rejecting}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {rejecting && <CircularProgress size={14} color="inherit" />}
                    {rejecting ? 'Denying…' : 'Confirm Deny'}
                  </button>
                  <button
                    onClick={() => setAction(null)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Default action buttons when no action selected */}
            {!action && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setAction('approve')}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  Deny
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
