import React from 'react';
import { useLoanReagreement } from '../hook/useLoanReagreement';
import LoanReagreementForm from '../components/LoanReagreementForm';

const LoanReagreementPage: React.FC = () => {
    const props = useLoanReagreement();
    return <LoanReagreementForm {...props} />;
};

export default LoanReagreementPage;
