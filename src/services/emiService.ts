import { apiService } from './api';

export interface LoanData {
  loanCaseNo: string;
  loanType: string;
  loanAmount: number;
  rate: number;
  noOfInstallments: number;
  installmentAmount: number;
  balance: number;
  purpose: string;
  paymentDate: string;
  memberName: string;
  memberNumber: string;
  officeName: string;
  basicPay: number;
}

export interface EMIScheduleItem {
  month: number;
  dueDate: string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  balance: number;
  status: 'Paid' | 'Pending' | 'Overdue';
}

export interface EMIScheduleResponse {
  loanDetails: LoanData;
  schedule: EMIScheduleItem[];
  summary: {
    paidInstallments: number;
    pendingInstallments: number;
    overdueInstallments: number;
    totalPaid: number;
    totalInterestPaid: number;
    totalPrincipalPaid: number;
    remainingBalance: number;
    completionPercentage: number;
  };
}

export interface SearchMemberLoansResponse {
  activeLoans: LoanData[];
  pendingLoans: LoanData[];
}

class EMIService {
  /**
   * Get all loans for a member from both loan_master and loan_pending
   */
  async getMemberLoans(memberNumber: string): Promise<SearchMemberLoansResponse> {
    try {
      const response = await apiService.searchMemberLoans({
        memberNumber,
        status: 'all',
      });
      
      if (!response.success || !response.data) {
        console.warn('Loan search API returned no data');
        return { activeLoans: [], pendingLoans: [] };
      }
      
      return {
        activeLoans: response.data.activeLoans || [],
        pendingLoans: response.data.pendingLoans || [],
      };
    } catch (error) {
      console.error('Error fetching member loans:', error);
      return { activeLoans: [], pendingLoans: [] };
    }
  }

  /**
   * Get EMI schedule for a loan case number from loan_master
   */
  async getEMISchedule(loanCaseNo: string): Promise<EMIScheduleResponse> {
    try {
      const response = await apiService.getLoanEMISchedule(loanCaseNo);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch EMI schedule');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching EMI schedule:', error);
      throw new Error('Failed to fetch EMI schedule');
    }
  }

  /**
   * Get loan details from loan_master
   */
  async getLoanFromMaster(loanCaseNo: string): Promise<LoanData> {
    try {
      const response = await apiService.getLoanFromMaster(loanCaseNo);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch loan details');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching loan details:', error);
      throw new Error('Failed to fetch loan details');
    }
  }

  /**
   * Calculate EMI for given parameters
   */
  async calculateEMI(principal: number, annualRate: number, tenureMonths: number) {
    try {
      const response = await apiService.calculateEMI(principal, annualRate, tenureMonths);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to calculate EMI');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error calculating EMI:', error);
      throw new Error('Failed to calculate EMI');
    }
  }

  /**
   * Generate amortization schedule
   */
  async generateAmortizationSchedule(principal: number, annualRate: number, tenureMonths: number) {
    try {
      const response = await apiService.generateAmortizationSchedule(principal, annualRate, tenureMonths);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate amortization schedule');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error generating amortization schedule:', error);
      throw new Error('Failed to generate amortization schedule');
    }
  }

  /**
   * Export EMI schedule as PDF (placeholder for future implementation)
   */
  async exportEMISchedulePDF(loanCaseNo: string): Promise<Blob> {
    try {
      return await apiService.exportEMISchedulePDF(loanCaseNo);
    } catch (error) {
      console.error('Error exporting EMI schedule:', error);
      throw new Error('Failed to export EMI schedule');
    }
  }
}

export const emiService = new EMIService();
