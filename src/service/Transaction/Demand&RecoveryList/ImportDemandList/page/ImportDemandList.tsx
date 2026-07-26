// page/ImportDemandList.tsx

import React from 'react';
import { useImportDemandList } from '../hook/useImportDemandList';
import ImportDemandListForm from '../components/ImportDemandListForm';

const ImportDemandList: React.FC = () => {
  const props = useImportDemandList();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <ImportDemandListForm {...props} />
    </div>
  );
};

export default ImportDemandList;
