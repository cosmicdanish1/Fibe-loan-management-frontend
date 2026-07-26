import React from 'react';
import { useLoanRepayment } from '../hooks/useLoanRepayment';
import LoanRepaymentForm from '../components/LoanRepaymentForm';

const LoanRepaymentPage: React.FC = () => {
    const props = useLoanRepayment();

    return (
        <div className="h-screen bg-slate-50 overflow-hidden">
            <LoanRepaymentForm {...props} />
        </div>
    );
};

export default LoanRepaymentPage;
