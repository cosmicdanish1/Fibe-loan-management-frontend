// page/PassTransactions.tsx

import React from 'react';
import { usePassTransactions } from '../hook/usePassTransactions';
import PassTransactionsTable from '../components/PassTransactionsTable';

const PassTransactions: React.FC = () => {
  const props = usePassTransactions();

  return (
    <div className="pass-txn-page h-screen bg-slate-50 overflow-hidden">
      <PassTransactionsTable {...props} />
      <style>{`
        html.dark .pass-txn-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default PassTransactions;
