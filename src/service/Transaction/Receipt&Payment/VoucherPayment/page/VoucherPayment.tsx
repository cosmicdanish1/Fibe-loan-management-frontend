// page/VoucherPayment.tsx

import React from 'react';
import { useVoucherPayment } from '../hook/useVoucherPayment';
import VoucherPaymentForm from '../components/VoucherPaymentForm';

const VoucherPayment: React.FC = () => {
  const voucherProps = useVoucherPayment();

  return (
    <div className="voucher-payment-page h-screen bg-slate-50 overflow-hidden">
      <VoucherPaymentForm {...voucherProps} />
      <style>{`
        html.dark .voucher-payment-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default VoucherPayment;
