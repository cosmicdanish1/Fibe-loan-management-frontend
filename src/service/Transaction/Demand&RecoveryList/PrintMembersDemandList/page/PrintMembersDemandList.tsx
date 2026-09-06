// page/PrintMembersDemandList.tsx

import React from 'react';
import { usePrintMembersDemandList } from '../hook/usePrintMembersDemandList';
import PrintMembersDemandListForm from '../components/PrintMembersDemandListForm';

const PrintMembersDemandList: React.FC = () => {
  const props = usePrintMembersDemandList();

  return (
    <div className="pmdl-page h-screen bg-slate-50 overflow-hidden">
      <PrintMembersDemandListForm {...props} />
      <style>{`
        html.dark .pmdl-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default PrintMembersDemandList;
