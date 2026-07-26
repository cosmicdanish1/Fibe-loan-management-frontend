// page/PassTransactions.tsx

import React from 'react';
import { usePassTransactions } from '../hook/usePassTransactions';
import PassTransactionsTable from '../components/PassTransactionsTable';

const PassTransactions: React.FC = () => {
  const props = usePassTransactions();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <PassTransactionsTable {...props} />
    </div>
  );
};

export default PassTransactions;
