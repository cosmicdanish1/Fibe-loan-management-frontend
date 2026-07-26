// page/JournalTransferEntry.tsx

import React from 'react';
import { useJournalTransfer } from '../hook/useJournalTransfer';
import JournalTransferForm from '../components/JournalTransferForm';

const JournalTransferEntry: React.FC = () => {
  const props = useJournalTransfer();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <JournalTransferForm {...props} />
    </div>
  );
};

export default JournalTransferEntry;
