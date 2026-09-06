import React, { useState, useEffect } from 'react';
import memberLoanService, { LoanMasterDetails, MemberLoanDetails } from '../../../../services/memberLoanService';

interface MemberLoanDetailsProps {
  memberNumber?: string;
  loanCaseNo?: string;
}

const MemberLoanDetailsComponent: React.FC<MemberLoanDetailsProps> = ({ memberNumber, loanCaseNo }) => {
  const [activeLoans, setActiveLoans] = useState<LoanMasterDetails[]>([]);
  const [pendingLoans, setPendingLoans] = useState<MemberLoanDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'active' | 'pending'>('active');

  useEffect(() => {
    if (memberNumber) {
      fetchMemberLoans();
    } else if (loanCaseNo) {
      fetchLoanByCase();
    }
  }, [memberNumber, loanCaseNo]);

  const fetchMemberLoans = async () => {
    if (!memberNumber) return;

    setLoading(true);
    setError(null);

    try {
      const result = await memberLoanService.getAllMemberLoans(memberNumber);
      setActiveLoans(result.activeLoans);
      setPendingLoans(result.pendingLoans);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch member loans');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanByCase = async () => {
    if (!loanCaseNo) return;

    setLoading(true);
    setError(null);

    try {
      const loan = await memberLoanService.getLoanByCaseNumber(loanCaseNo);
      
      if ('loanAmount' in loan) {
        // It's a LoanMasterDetails (active loan)
        setActiveLoans([loan as LoanMasterDetails]);
        setPendingLoans([]);
        setSelectedTab('active');
      } else {
        // It's a MemberLoanDetails (pending loan)
        setActiveLoans([]);
        setPendingLoans([loan as MemberLoanDetails]);
        setSelectedTab('pending');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch loan details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mld-root flex items-center justify-center p-8">
        <div className="text-gray-600">Loading loan details...</div>
        <style>{`html.dark .mld-root .text-gray-600 { color: #8e8e93 !important; }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mld-root bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <style>{`
          html.dark .mld-root { background-color: rgba(255,69,58,0.08) !important; border-color: rgba(255,69,58,0.3) !important; }
          html.dark .mld-root .text-red-600 { color: #ff453a !important; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mld-root space-y-4">
      {/* Tabs */}
      <div className="mld-tabs flex border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium ${
            selectedTab === 'active'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('active')}
        >
          Active Loans ({activeLoans.length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            selectedTab === 'pending'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('pending')}
        >
          Pending Loans ({pendingLoans.length})
        </button>
      </div>

      {/* Active Loans */}
      {selectedTab === 'active' && (
        <div className="space-y-4">
          {activeLoans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active loans found</div>
          ) : (
            activeLoans.map((loan) => (
              <div key={loan.loanCaseNo} className="mld-card bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Loan Information */}
                  <div className="col-span-2 md:col-span-3 border-b pb-2 mb-2">
                    <h3 className="fz-heading font-semibold text-gray-800">
                      Loan Case No: {loan.loanCaseNo}
                    </h3>
                    <p className="fz-body text-gray-600">
                      {memberLoanService.formatLoanType(loan.loanType)}
                    </p>
                  </div>

                  {/* Member Details */}
                  <div>
                    <label className="fz-label text-gray-500">Member Name</label>
                    <p className="font-medium">{loan.memberName}</p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Member Number</label>
                    <p className="font-medium">{loan.memberNumber}</p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Office</label>
                    <p className="font-medium">{loan.officeName}</p>
                  </div>

                  {/* Loan Details */}
                  <div>
                    <label className="fz-label text-gray-500">Loan Amount</label>
                    <p className="font-medium text-green-600">
                      {memberLoanService.formatCurrency(loan.loanAmount)}
                    </p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Sanction Date</label>
                    <p className="font-medium">
                      {memberLoanService.formatDate(loan.paymentDate)}
                    </p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Rate of Interest</label>
                    <p className="font-medium">{loan.rate.toFixed(2)}%</p>
                  </div>

                  {/* Installment Details */}
                  <div>
                    <label className="fz-label text-gray-500">No. of Installments</label>
                    <p className="font-medium">{loan.noOfInstallments}</p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Installment Amount</label>
                    <p className="font-medium">
                      {memberLoanService.formatCurrency(loan.installmentAmount)}
                    </p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Outstanding Balance</label>
                    <p className="font-medium text-red-600">
                      {memberLoanService.formatCurrency(loan.balance)}
                    </p>
                  </div>

                  {/* Additional Details */}
                  <div>
                    <label className="fz-label text-gray-500">Basic Pay</label>
                    <p className="font-medium">
                      {memberLoanService.formatCurrency(loan.basicPay)}
                    </p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Interest Amount</label>
                    <p className="font-medium">
                      {memberLoanService.formatCurrency(loan.interestAmount)}
                    </p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Penal Rate</label>
                    <p className="font-medium">{loan.penalRate.toFixed(2)}%</p>
                  </div>

                  {/* Purpose */}
                  {loan.purpose && (
                    <div className="col-span-2 md:col-span-3">
                      <label className="fz-label text-gray-500">Purpose</label>
                      <p className="font-medium">{loan.purpose}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending Loans */}
      {selectedTab === 'pending' && (
        <div className="space-y-4">
          {pendingLoans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No pending loans found</div>
          ) : (
            pendingLoans.map((loan) => (
              <div key={loan.loanCaseNo} className="mld-card bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Loan Information */}
                  <div className="col-span-2 md:col-span-3 border-b pb-2 mb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="fz-heading font-semibold text-gray-800">
                          Loan Case No: {loan.loanCaseNo}
                        </h3>
                        <p className="fz-body text-gray-600">
                          {memberLoanService.formatLoanType(loan.loanType)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full fz-label font-medium ${
                          loan.status === 'Sanctioned'
                            ? 'bg-green-100 text-green-800'
                            : loan.status === 'Paid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </div>
                  </div>

                  {/* Member Details */}
                  <div>
                    <label className="fz-label text-gray-500">Member Name</label>
                    <p className="font-medium">{loan.memberName}</p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Member Number</label>
                    <p className="font-medium">{loan.memberNumber}</p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Office</label>
                    <p className="font-medium">{loan.officeName}</p>
                  </div>

                  {/* Application Details */}
                  <div>
                    <label className="fz-label text-gray-500">Applied Amount</label>
                    <p className="font-medium text-blue-600">
                      {memberLoanService.formatCurrency(loan.appliedAmount)}
                    </p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">Application Date</label>
                    <p className="font-medium">
                      {memberLoanService.formatDate(loan.applicationDate)}
                    </p>
                  </div>
                  <div>
                    <label className="fz-label text-gray-500">No. of Installments</label>
                    <p className="font-medium">{loan.noOfInstallments}</p>
                  </div>

                  {/* Sanction Details (if sanctioned) */}
                  {loan.status === 'Sanctioned' && (
                    <>
                      <div>
                        <label className="fz-label text-gray-500">Sanctioned Amount</label>
                        <p className="font-medium text-green-600">
                          {memberLoanService.formatCurrency(loan.sanctionedAmount)}
                        </p>
                      </div>
                      <div>
                        <label className="fz-label text-gray-500">Sanction Date</label>
                        <p className="font-medium">
                          {memberLoanService.formatDate(loan.sanctionDate)}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Additional Details */}
                  <div>
                    <label className="fz-label text-gray-500">Basic Pay</label>
                    <p className="font-medium">
                      {memberLoanService.formatCurrency(loan.basicPay)}
                    </p>
                  </div>

                  {/* Purpose */}
                  {loan.purpose && (
                    <div className="col-span-2 md:col-span-3">
                      <label className="fz-label text-gray-500">Purpose</label>
                      <p className="font-medium">{loan.purpose}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        /* ── Member Loan Details — dark mode ── */
        html.dark .mld-tabs { border-color: rgba(255,255,255,.08) !important; }
        html.dark .mld-tabs button { color: #8e8e93 !important; }
        html.dark .mld-tabs button.border-blue-500 { color: #60a5fa !important; border-color: #3b82f6 !important; }
        html.dark .mld-tabs button:hover { color: #f5f5f7 !important; }
        html.dark .mld-card {
          background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .mld-card .border-b { border-color: rgba(255,255,255,.08) !important; }
        html.dark .mld-card .text-gray-800 { color: #f5f5f7 !important; }
        html.dark .mld-card .text-gray-600 { color: #8e8e93 !important; }
        html.dark .mld-card .text-gray-500 { color: #8e8e93 !important; }
        html.dark .mld-card p.font-medium { color: #f5f5f7 !important; }
        html.dark .mld-card .text-green-600 { color: #34d399 !important; }
        html.dark .mld-card .text-red-600 { color: #ff453a !important; }
        html.dark .mld-card .text-blue-600 { color: #60a5fa !important; }
        html.dark .mld-root .text-gray-500 { color: #8e8e93 !important; }
        html.dark .mld-card .bg-green-100 { background-color: rgba(52,211,153,0.15) !important; color: #34d399 !important; }
        html.dark .mld-card .bg-blue-100 { background-color: rgba(59,130,246,0.15) !important; color: #60a5fa !important; }
        html.dark .mld-card .bg-yellow-100 { background-color: rgba(251,191,36,0.15) !important; color: #fbbf24 !important; }
        html.dark .mld-card .text-green-800 { color: #34d399 !important; }
        html.dark .mld-card .text-blue-800 { color: #60a5fa !important; }
        html.dark .mld-card .text-yellow-800 { color: #fbbf24 !important; }
      `}</style>
    </div>
  );
};

export default MemberLoanDetailsComponent;
