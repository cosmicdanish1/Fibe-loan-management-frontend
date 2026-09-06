// page/JournalTransferEntry.tsx

import React from 'react';
import { useJournalTransfer } from '../hook/useJournalTransfer';
import JournalTransferForm from '../components/JournalTransferForm';

const JournalTransferEntry: React.FC = () => {
  const props = useJournalTransfer();

  return (
    <div className="jte-page h-screen bg-slate-50 overflow-hidden">
      <JournalTransferForm {...props} />
      <style>{`
        html.dark .jte-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default JournalTransferEntry;
