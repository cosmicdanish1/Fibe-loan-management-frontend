// page/Receipt.tsx

import React from 'react';
import { useReceipt } from '../hook/useReceipt';
import ReceiptForm from '../components/ReceiptForm';

const Receipt: React.FC = () => {
  const receiptProps = useReceipt();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <ReceiptForm {...receiptProps} />
    </div>
  );
};

export default Receipt;
