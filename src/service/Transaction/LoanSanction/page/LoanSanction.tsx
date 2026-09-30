// page/LoanSanction.tsx

import React from 'react';
import { useLoanSanction } from '../hook/useLoanSanction';
import LoanSanctionForm from '../components/LoanSanctionForm';

const LoanSanction: React.FC = () => {
  const props = useLoanSanction();

  return <LoanSanctionForm {...props} />;
};

export default LoanSanction;
