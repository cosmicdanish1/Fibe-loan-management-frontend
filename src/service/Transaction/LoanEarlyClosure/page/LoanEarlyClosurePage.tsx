import React from 'react';
import { useLoanEarlyClosure } from '../hooks/useLoanEarlyClosure';
import LoanEarlyClosureForm from '../components/LoanEarlyClosureForm';

const LoanEarlyClosurePage: React.FC = () => {
    const props = useLoanEarlyClosure();

    return (
        <div className="loan-early-closure-page h-screen bg-slate-50 overflow-hidden">
            <LoanEarlyClosureForm {...props} />
            <style>{`
              html.dark .loan-early-closure-page { background-color: #000000 !important; }
            `}</style>
        </div>
    );
};

export default LoanEarlyClosurePage;
