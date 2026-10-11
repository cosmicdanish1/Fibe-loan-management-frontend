import React from 'react';
import { useLoanReagreementHistory } from '../hook/useLoanReagreementHistory';
import LoanReagreementHistoryView from '../components/LoanReagreementHistoryView';

const LoanReagreementHistoryPage: React.FC = () => {
    const props = useLoanReagreementHistory();
    return <LoanReagreementHistoryView {...props} />;
};

export default LoanReagreementHistoryPage;
