// page/JournalTransferEntry.tsx

import React from 'react';
import { useJournalTransfer } from '../hook/useJournalTransfer';
import JournalTransferForm from '../components/JournalTransferForm';

const JournalTransferEntry: React.FC = () => {
  const props = useJournalTransfer();

  return <JournalTransferForm {...props} />;
};

export default JournalTransferEntry;
