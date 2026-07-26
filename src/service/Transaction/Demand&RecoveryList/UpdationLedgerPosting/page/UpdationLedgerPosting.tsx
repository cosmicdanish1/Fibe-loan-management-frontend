// page/UpdationLedgerPosting.tsx

import React from 'react';
import { useUpdationLedgerPosting } from '../hook/useUpdationLedgerPosting';
import UpdationLedgerPostingForm from '../components/UpdationLedgerPostingForm';

const UpdationLedgerPosting: React.FC = () => {
  const props = useUpdationLedgerPosting();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <UpdationLedgerPostingForm {...props} />
    </div>
  );
};

export default UpdationLedgerPosting;
