// page/FDWithdrawalInterestPayment.tsx

import React from 'react';
import { useFDWithdrawalInterestPayment } from '../hook/useFDWithdrawalInterestPayment';
import FDWithdrawalForm from '../components/FDWithdrawalInterestPaymentForm';

const FDWithdrawalInterestPayment: React.FC = () => {
  const withdrawalProps = useFDWithdrawalInterestPayment();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <FDWithdrawalForm
        {...withdrawalProps}
        showLookupModal={withdrawalProps.showLookupModal}
        setShowLookupModal={withdrawalProps.setShowLookupModal}
        fetchMemberFDs={withdrawalProps.fetchMemberFDs}
        loading={withdrawalProps.loading}
      />
    </div>
  );
};

export default FDWithdrawalInterestPayment;
