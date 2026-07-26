// page/Saving.tsx

import React from 'react';
import { useSavingTransaction } from '../hook/useSavingTransaction';
import SavingTransactionForm from '../components/SavingTransactionForm';

const Saving: React.FC = () => {
  const props = useSavingTransaction();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <SavingTransactionForm {...props} />
    </div>
  );
};

export default Saving;
