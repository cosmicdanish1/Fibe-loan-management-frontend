// page/SavingAccountOpening.tsx

import React from 'react';
import { useSavingAccountOpening } from '../hooks/useSavingAccountOpening';
import SavingAccountForm from '../components/SavingAccountForm';

const SavingAccountOpening: React.FC = () => {
  const saProps = useSavingAccountOpening();

  return <SavingAccountForm {...saProps} />;
};

export default SavingAccountOpening;
