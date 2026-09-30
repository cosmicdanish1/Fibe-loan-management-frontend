// page/LoanEntry.tsx

import React from 'react';
import { useLoanEntry } from '../hook/useLoanEntry';
import LoanEntryForm from '../components/LoanEntryForm';

const LoanEntry: React.FC = () => {
  const loanProps = useLoanEntry();

  return <LoanEntryForm {...loanProps} />;
};

export default LoanEntry;
