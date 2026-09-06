// page/UpdationLedgerPosting.tsx

import React from 'react';
import { useUpdationLedgerPosting } from '../hook/useUpdationLedgerPosting';
import UpdationLedgerPostingForm from '../components/UpdationLedgerPostingForm';

const UpdationLedgerPosting: React.FC = () => {
  const props = useUpdationLedgerPosting();

  return (
    <div className="ulp-page h-screen bg-slate-50 overflow-hidden">
      <UpdationLedgerPostingForm {...props} />
      <style>{`
        html.dark .ulp-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default UpdationLedgerPosting;
