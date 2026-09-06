// page/Receipt.tsx

import React from 'react';
import { useReceipt } from '../hook/useReceipt';
import ReceiptForm from '../components/ReceiptForm';

const Receipt: React.FC = () => {
  const receiptProps = useReceipt();

  return (
    <div className="receipt-page h-screen bg-slate-50 overflow-hidden">
      <ReceiptForm {...receiptProps} />
      <style>{`
        html.dark .receipt-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default Receipt;
