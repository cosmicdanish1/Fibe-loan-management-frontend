// page/UpdationLedgerPosting.tsx

import React from 'react';
import { useUpdationLedgerPosting } from '../hook/useUpdationLedgerPosting';
import UpdationLedgerPostingForm from '../components/UpdationLedgerPostingForm';

const UpdationLedgerPosting: React.FC = () => {
  const props = useUpdationLedgerPosting();

  return <UpdationLedgerPostingForm {...props} />;
};

export default UpdationLedgerPosting;
