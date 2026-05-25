import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/lib/api/client';
import type { PayrollDeduction } from '@/types';

export interface ReconciliationDiscrepancy {
  memberId: string;
  memberName: string;
  expectedAmount: number;
  confirmedAmount: number;
  difference: number;
  reason: string;
}

export interface ReconciliationReport {
  month: string;
  expectedDeductions: number;
  confirmedDeductions: number;
  failedDeductions: number;
  totalExpected: number;
  totalConfirmed: number;
  discrepancyAmount: number;
  discrepancies: ReconciliationDiscrepancy[];
  reconciliationDate: string;
  reconciledBy: string;
}

export interface DeductionConfirmationDto {
  memberId: string;
  deductionMonth: string; // YYYY-MM
  amount: number;
  employerReference?: string;
}

export interface MemberContributionRow {
  memberId: string;
  memberName: string;
  expectedAmount: number;
  confirmedAmount: number | null;
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'LATE' | 'PENDING';
  failureReason: string | null;
  confirmedDate: string | null;
}

export interface MonthlySummary {
  month: string;
  totalMembers: number;
  paidMembers: number;
  unpaidMembers: number;
  partialMembers: number;
  lateMembers: number;
  pendingMembers: number;
  totalExpected: number;
  totalCollected: number;
  totalShortfall: number;
  members: MemberContributionRow[];
}

export const payrollApi = createApi({
  reducerPath: 'payrollApi',
  baseQuery,
  tagTypes: ['Payroll', 'DeductionList'],
  // Payroll data changes monthly — keep cache for 5 minutes
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    generateDeductionList: builder.mutation<PayrollDeduction[], string>({
      query: (month) => ({ url: '/api/payroll/deduction-list', method: 'POST', params: { month } }),
      invalidatesTags: ['DeductionList'],
    }),
    getDeductionList: builder.query<PayrollDeduction[], string>({
      query: (month) => ({ url: '/api/payroll/deduction-list', params: { month } }),
      providesTags: ['DeductionList'],
    }),
    processConfirmation: builder.mutation<PayrollDeduction, DeductionConfirmationDto>({
      query: (dto) => ({ url: '/api/payroll/confirmations', method: 'POST', body: dto }),
      invalidatesTags: ['DeductionList', 'Payroll'],
    }),
    reconcileDeductions: builder.mutation<ReconciliationReport, string>({
      query: (month) => ({ url: '/api/payroll/reconcile', method: 'POST', params: { month } }),
      invalidatesTags: ['DeductionList'],
    }),
    flagFailedDeduction: builder.mutation<void, { memberId: string; month: string; reason: string }>({
      query: ({ memberId, month, reason }) => ({
        url: '/api/payroll/failed-deductions',
        method: 'POST',
        params: { memberId, month, reason },
      }),
      invalidatesTags: ['DeductionList'],
    }),
    getMonthlySummary: builder.query<MonthlySummary, string>({
      query: (month) => ({ url: '/api/payroll/monthly-summary', params: { month } }),
      providesTags: ['DeductionList'],
    }),
  }),
});

export const {
  useGenerateDeductionListMutation,
  useGetDeductionListQuery,
  useProcessConfirmationMutation,
  useReconcileDeductionsMutation,
  useFlagFailedDeductionMutation,
  useGetMonthlySummaryQuery,
} = payrollApi;
