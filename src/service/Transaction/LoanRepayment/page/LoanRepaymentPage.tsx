import React from 'react';
import { useLoanRepayment } from '../hooks/useLoanRepayment';
import LoanRepaymentForm from '../components/LoanRepaymentForm';

const LoanRepaymentPage: React.FC = () => {
    const props = useLoanRepayment();

    return (
        <div className="loan-repayment-page h-screen bg-slate-50 overflow-hidden">
            <LoanRepaymentForm {...props} />
            <style>{`
              html.dark .loan-repayment-page { background-color: #000000 !important; }
            `}</style>
        </div>
    );
};

export default LoanRepaymentPage;
