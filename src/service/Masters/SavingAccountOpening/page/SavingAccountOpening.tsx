// page/SavingAccountOpening.tsx

import React from 'react';
import { useSavingAccountOpening } from '../hooks/useSavingAccountOpening';
import SavingAccountForm from '../components/SavingAccountForm';

const SavingAccountOpening: React.FC = () => {
  const saProps = useSavingAccountOpening();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <SavingAccountForm {...saProps} />
    </div>
  );
};

export default SavingAccountOpening;
