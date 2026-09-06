// page/ImportDemandList.tsx

import React from 'react';
import { useImportDemandList } from '../hook/useImportDemandList';
import ImportDemandListForm from '../components/ImportDemandListForm';

const ImportDemandList: React.FC = () => {
  const props = useImportDemandList();

  return (
    <div className="import-demand-page h-screen bg-slate-50 overflow-hidden">
      <ImportDemandListForm {...props} />
      <style>{`
        html.dark .import-demand-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default ImportDemandList;
