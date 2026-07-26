import { useState, useCallback } from 'react';
import { apiService } from '../../../../services/api';

export interface LoanDetail {
  loancaseno: number;
  loantype: string;
  loanAmt: number;
  balance: number;
  openbalance: number;
  instalAmt: number;
  noOfInstal: number;
  rate: number;
  penalrate: number;
  paymentDate: string;
  purpose: string;
  repaidPct: number;
}

export interface FactorScore {
  name: string;
  score: number;
  maxScore: number;
  description: string;
  status: 'good' | 'average' | 'poor';
}

export interface SaakhScoreData {
  mbno: string;
  memberName: string;
  membershipDate: string | null;
  tenureYears: number;
  isActive: boolean;
  totalScore: number;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Critical';
  factors: FactorScore[];
  activeLoans: LoanDetail[];
  closedLoans: LoanDetail[];
  totalActiveLoans: number;
  totalOutstanding: number;
  totalOriginalLoanAmt: number;
  shareCapital: number;
  cdBalance: number;
  mdBalance: number;
  suspBal: number;
  eligibility: {
    eligible: 'YES' | 'CONDITIONAL' | 'NO';
    recommendedAmount: number;
    recommendedTenure: number;
    reason: string;
  };
  guarantorInfo: {
    isGuarantorForCount: number;
    guarantorLoansHealthy: boolean;
  };
  improvementTips: string[];
}

export const useSaakhScore = () => {
  const [data, setData] = useState<SaakhScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberNo, setMemberNo] = useState('');

  const fetchScore = useCallback(async (mbno: string) => {
    if (!mbno.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await apiService.getSaakhScore(mbno.trim());
      if (res.success && res.data) {
        setData(res.data as SaakhScoreData);
      } else {
        setError('Member not found or no data available.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch Saakh Score.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setMemberNo('');
  }, []);

  return { data, loading, error, memberNo, setMemberNo, fetchScore, clear };
};
