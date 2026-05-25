import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/lib/api/client';

export interface FinancialReport {
  reportDate: string;
  generatedBy: string;
  totalRegularSavings: number;
  totalNonRegularSavings: number;
  totalSavings: number;
  totalShareCapital: number;
  totalShares: number;
  totalLoansDisbursed: number;
  totalOutstandingLoans: number;
  totalLoanRepayments: number;
  activeLoanCount: number;
  totalInterestEarned: number;
  totalInterestPaid: number;
  availableLiquidity: number;
  liquidityRatio: number;
  lendingLimitPercentage: number;
  remainingLendingCapacity: number;
  withinLendingLimit: boolean;
  complianceStatus: string;
}

export interface LoanPortfolioReport {
  reportDate: string;
  generatedBy: string;
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalRepaid: number;
  averageLoanAmount: number;
  averageInterestRate: number;
  loansByDuration: Record<string, number>;
  outstandingByDuration: Record<string, number>;
  loansByStatus: Record<string, number>;
  outstandingByStatus: Record<string, number>;
  repaymentRate: number;
  defaultRate: number;
  delinquentLoans: number;
  delinquentAmount: number;
}

export interface MembershipReport {
  reportDate: string;
  generatedBy: string;
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  withdrawnMembers: number;
  regularMembers: number;
  externalCooperativeMembers: number;
  newMembersThisMonth: number;
  newMembersThisYear: number;
  memberGrowthByMonth: Record<string, number>;
  membersByStatus: Record<string, number>;
  totalSuspensions: number;
  activeSuspensions: number;
  suspensionsByReason: Record<string, number>;
  voluntaryWithdrawals: number;
  involuntaryTerminations: number;
  deathExits: number;
}

export interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
}

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery,
  tagTypes: ['Report'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getFinancialReport: builder.query<FinancialReport, ReportQueryParams | void>({
      query: (params) => ({ url: '/api/reports/financial', params: params ?? {} }),
    }),
    getLoanPortfolioReport: builder.query<LoanPortfolioReport, ReportQueryParams | void>({
      query: (params) => ({ url: '/api/reports/loan-portfolio', params: params ?? {} }),
    }),
    getMembershipReport: builder.query<MembershipReport, ReportQueryParams | void>({
      query: (params) => ({ url: '/api/reports/membership', params: params ?? {} }),
    }),
  }),
});

export const {
  useGetFinancialReportQuery,
  useGetLoanPortfolioReportQuery,
  useGetMembershipReportQuery,
} = reportsApi;
