import React from 'react';
import { useLoanConsolidationChain } from '../hooks/useLoanConsolidationChain';
import LoanConsolidationChainView from '../components/LoanConsolidationChainView';

const LoanConsolidationChainPage: React.FC = () => {
    const props = useLoanConsolidationChain();

    return (
        <div className="loan-consolidation-chain-page h-screen bg-slate-50 overflow-hidden">
            <LoanConsolidationChainView {...props} />
            <style>{`
              html.dark .loan-consolidation-chain-page { background-color: #000000 !important; }
            `}</style>
        </div>
    );
};

export default LoanConsolidationChainPage;
