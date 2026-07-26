import api from './api';

export interface MemberLoanDetails {
  loanCaseNo: string;
  loanType: string;
  appliedAmount: number;
  applicationDate: Date;
  sanctionedAmount: number;
  sanctionDate: Date;
  rate: number;
  noOfInstallments: number;
  installmentAmount: number;
  balance: number;
  purpose: string;
  memberNumber: string;
  memberName: string;
  officeName: string;
  basicPay: number;
  status: string;
}

export interface LoanMasterDetails {
  loanCaseNo: string;
  memberNumber: string;
  loanType: string;
  loanAmount: number;
  paymentDate: Date;
  rate: number;
  noOfInstallments: number;
  installmentAmount: number;
  balance: number;
  purpose: string;
  interestAmount: number;
  penalRate: number;
  memberName: string;
  officeName: string;
  basicPay: number;
}

export interface LoanSearchResults {
  activeLoans: LoanMasterDetails[];
  pendingLoans: MemberLoanDetails[];
}

class MemberLoanService {
  /**
   * Get loan details from loan_master by loan case number
   */
  async getLoanFromMaster(loanCaseNo: string): Promise<LoanMasterDetails> {
    const response = await api.get(`/loans/master/loan-case/${loanCaseNo}`);
    return response.data;
  }

  /**
   * Get loan details from loan_pending by loan case number
   */
  async getLoanFromPending(loanCaseNo: string): Promise<MemberLoanDetails> {
    const response = await api.get(`/loans/pending/loan-case/${loanCaseNo}`);
    return response.data;
  }

  /**
   * Get all active loans for a member from loan_master
   */
  async getMemberLoansFromMaster(memberNumber: string): Promise<LoanMasterDetails[]> {
    const response = await api.get(`/loans/master/member/${memberNumber}`);
    return response.data;
  }

  /**
   * Get all pending loans for a member from loan_pending
   */
  async getMemberLoansFromPending(memberNumber: string): Promise<MemberLoanDetails[]> {
    const response = await api.get(`/loans/pending/member/${memberNumber}`);
    return response.data;
  }

  /**
   * Search loans across loan_master and loan_pending
   */
  async searchMemberLoans(params: {
    memberNumber?: string;
    loanCaseNo?: string;
    loanType?: string;
    status?: 'active' | 'pending' | 'all';
  }): Promise<LoanSearchResults> {
    const response = await api.get('/loans/search/member-loans', { params });
    return response.data;
  }

  /**
   * Get loan by case number (tries both master and pending)
   */
  async getLoanByCaseNumber(loanCaseNo: string): Promise<LoanMasterDetails | MemberLoanDetails> {
    try {
      // Try loan_master first
      return await this.getLoanFromMaster(loanCaseNo);
    } catch (error) {
      // If not found in master, try loan_pending
      return await this.getLoanFromPending(loanCaseNo);
    }
  }

  /**
   * Get all loans for a member (both active and pending)
   */
  async getAllMemberLoans(memberNumber: string): Promise<{
    activeLoans: LoanMasterDetails[];
    pendingLoans: MemberLoanDetails[];
  }> {
    const [activeLoans, pendingLoans] = await Promise.all([
      this.getMemberLoansFromMaster(memberNumber).catch(() => []),
      this.getMemberLoansFromPending(memberNumber).catch(() => []),
    ]);

    return {
      activeLoans,
      pendingLoans,
    };
  }

  /**
   * Format loan type for display
   */
  formatLoanType(loanType: string): string {
    const loanTypes: Record<string, string> = {
      ALN: 'Advance Loan',
      RLN: 'Regular Loan',
      ELN: 'Emergency Loan',
      MLN: 'Medical Loan',
    };
    return loanTypes[loanType] || loanType;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}

export default new MemberLoanService();
