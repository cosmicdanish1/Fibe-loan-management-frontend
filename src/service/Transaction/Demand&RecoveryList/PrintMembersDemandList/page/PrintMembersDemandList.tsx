// page/PrintMembersDemandList.tsx

import React from 'react';
import { usePrintMembersDemandList } from '../hook/usePrintMembersDemandList';
import PrintMembersDemandListForm from '../components/PrintMembersDemandListForm';

const PrintMembersDemandList: React.FC = () => {
  const props = usePrintMembersDemandList();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <PrintMembersDemandListForm {...props} />
    </div>
  );
};

export default PrintMembersDemandList;
