// page/Saving.tsx

import React from 'react';
import { useSavingTransaction } from '../hook/useSavingTransaction';
import SavingTransactionForm from '../components/SavingTransactionForm';

const Saving: React.FC = () => {
  const props = useSavingTransaction();

  return (
    <div className="saving-txn-page h-screen bg-slate-50 overflow-hidden">
      <SavingTransactionForm {...props} />
      <style>{`
        html.dark .saving-txn-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default Saving;
