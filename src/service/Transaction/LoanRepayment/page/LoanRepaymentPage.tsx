import React from 'react';
import { useLoanRepayment } from '../hooks/useLoanRepayment';
import LoanRepaymentForm from '../components/LoanRepaymentForm';

const LoanRepaymentPage: React.FC = () => {
    const props = useLoanRepayment();

    return <LoanRepaymentForm {...props} />;
};

export default LoanRepaymentPage;
