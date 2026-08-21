import React from 'react';
import { useLoanEarlyClosure } from '../hooks/useLoanEarlyClosure';
import LoanEarlyClosureForm from '../components/LoanEarlyClosureForm';

const LoanEarlyClosurePage: React.FC = () => {
    const props = useLoanEarlyClosure();

    return (
        <div className="h-screen bg-slate-50 overflow-hidden">
            <LoanEarlyClosureForm {...props} />
        </div>
    );
};

export default LoanEarlyClosurePage;
