// page/FdRdSbEntry.tsx

import React from 'react';
import { useFdRdSbEntry } from '../hook/useFdRdSbEntry';
import FdRdSbEntryForm from '../components/FdRdSbEntryForm';

const FdRdSbEntry: React.FC = () => {
  const entryProps = useFdRdSbEntry();

  return <FdRdSbEntryForm {...entryProps} />;
};

export default FdRdSbEntry;
