// page/Saving.tsx

import React from 'react';
import { useSavingTransaction } from '../hook/useSavingTransaction';
import SavingTransactionForm from '../components/SavingTransactionForm';

const Saving: React.FC = () => {
  const props = useSavingTransaction();

  return <SavingTransactionForm {...props} />;
};

export default Saving;
