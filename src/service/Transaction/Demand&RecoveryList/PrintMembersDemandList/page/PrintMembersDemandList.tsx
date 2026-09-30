// page/PrintMembersDemandList.tsx

import React from 'react';
import { usePrintMembersDemandList } from '../hook/usePrintMembersDemandList';
import PrintMembersDemandListForm from '../components/PrintMembersDemandListForm';

const PrintMembersDemandList: React.FC = () => {
  const props = usePrintMembersDemandList();

  return <PrintMembersDemandListForm {...props} />;
};

export default PrintMembersDemandList;
