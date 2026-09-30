import React from 'react';
import { useLoanEarlyClosure } from '../hooks/useLoanEarlyClosure';
import LoanEarlyClosureForm from '../components/LoanEarlyClosureForm';

const LoanEarlyClosurePage: React.FC = () => {
    const props = useLoanEarlyClosure();

    return <LoanEarlyClosureForm {...props} />;
};

export default LoanEarlyClosurePage;
