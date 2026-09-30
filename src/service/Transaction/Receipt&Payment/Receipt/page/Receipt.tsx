// page/Receipt.tsx

import React from 'react';
import { useReceipt } from '../hook/useReceipt';
import ReceiptForm from '../components/ReceiptForm';

const Receipt: React.FC = () => {
  const receiptProps = useReceipt();

  return <ReceiptForm {...receiptProps} />;
};

export default Receipt;
