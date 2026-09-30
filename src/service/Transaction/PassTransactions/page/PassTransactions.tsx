// page/PassTransactions.tsx

import React from 'react';
import { usePassTransactions } from '../hook/usePassTransactions';
import PassTransactionsTable from '../components/PassTransactionsTable';

const PassTransactions: React.FC = () => {
  const props = usePassTransactions();

  return <PassTransactionsTable {...props} />;
};

export default PassTransactions;
