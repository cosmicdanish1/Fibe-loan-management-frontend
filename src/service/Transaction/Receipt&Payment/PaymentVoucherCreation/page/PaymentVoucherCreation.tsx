// page/PaymentVoucherCreation.tsx

import React from 'react';
import { usePaymentVoucher } from '../hook/usePaymentVoucher';
import PaymentVoucherForm from '../components/PaymentVoucherForm';

const PaymentVoucherCreation: React.FC = () => {
  const voucherProps = usePaymentVoucher();

  return <PaymentVoucherForm {...voucherProps} />;
};

export default PaymentVoucherCreation;
