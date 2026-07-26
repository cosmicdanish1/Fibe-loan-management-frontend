// page/FdRdSbEntry.tsx

import React from 'react';
import { useFdRdSbEntry } from '../hook/useFdRdSbEntry';
import FdRdSbEntryForm from '../components/FdRdSbEntryForm';

const FdRdSbEntry: React.FC = () => {
  const entryProps = useFdRdSbEntry();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <FdRdSbEntryForm {...entryProps} />
    </div>
  );
};

export default FdRdSbEntry;
