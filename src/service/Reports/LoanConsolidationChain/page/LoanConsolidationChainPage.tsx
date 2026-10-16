import React from 'react';
import { useLoanConsolidationChain } from '../hooks/useLoanConsolidationChain';
import LoanConsolidationChainView from '../components/LoanConsolidationChainView';

const LoanConsolidationChainPage: React.FC = () => {
    const props = useLoanConsolidationChain();
    return <LoanConsolidationChainView {...props} />;
};

export default LoanConsolidationChainPage;
