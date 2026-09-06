// page/FdRdSbEntry.tsx

import React from 'react';
import { useFdRdSbEntry } from '../hook/useFdRdSbEntry';
import FdRdSbEntryForm from '../components/FdRdSbEntryForm';

const FdRdSbEntry: React.FC = () => {
  const entryProps = useFdRdSbEntry();

  return (
    <div className="fdrdsb-page h-screen bg-slate-50 overflow-hidden">
      <FdRdSbEntryForm {...entryProps} />

      <style>{`
        html.dark .fdrdsb-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default FdRdSbEntry;
