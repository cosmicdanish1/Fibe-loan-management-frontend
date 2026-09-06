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

      // BUG FIX 49: the real endpoint (GET /loans/search/member-loans) returns a
      // flat array of raw rows (loancaseno, loan_amt, member_name, source:
      // 'loan_master'|'loan_pending', ...), not {activeLoans, pendingLoans} —
      // confirmed live. response.data.activeLoans was always undefined (arrays
      // have no such property), so this fell through to `|| []` for both lists on
      // every single call regardless of real data — confirmed live against two
      // members who each have a real, active, fully-disbursed loan; the EMI Chart
      // screen reported "No Loans Found" for both. Map the real shape here.
      const rows: any[] = Array.isArray(response.data) ? response.data : [];
      const toLoanData = (r: any): LoanData => ({
        loanCaseNo: r.loancaseno?.toString() ?? '',
        loanType: r.loantype ?? '',
        loanAmount: parseFloat(r.loan_amt) || 0,
        rate: parseFloat(r.rate) || 0,
        noOfInstallments: parseInt(r.no_of_instal) || 0,
        installmentAmount: parseFloat(r.instal_amt) || 0,
        balance: parseFloat(r.balance) || 0,
        purpose: '',
        paymentDate: '',
        memberName: r.member_name ?? '',
        memberNumber: r.mbno?.toString() ?? memberNumber,
        officeName: '',
        basicPay: 0,
      });

      // loan_master rows are the real, disbursed loans with an actual EMI
      // schedule to generate. loan_pending rows mirror status through the
      // Application->Sanction->Disbursement pipeline — once DISBURSED they're
      // redundant with the loan_master row for the same case (both appear in
      // `rows`), so only genuinely not-yet-disbursed ones are shown as pending.
      const masterCaseNos = new Set(
        rows.filter(r => r.source === 'loan_master').map(r => r.loancaseno?.toString())
      );
      const activeLoans = rows.filter(r => r.source === 'loan_master').map(toLoanData);
      const pendingLoans = rows
        .filter(r => r.source === 'loan_pending'
          && !masterCaseNos.has(r.loancaseno?.toString())
          && (r.status === 'PENDING' || r.status === 'SANCTIONED'))
        .map(toLoanData);

      return { activeLoans, pendingLoans };
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
