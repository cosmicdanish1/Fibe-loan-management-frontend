// page/ImportDemandList.tsx

import React from 'react';
import { useImportDemandList } from '../hook/useImportDemandList';
import ImportDemandListForm from '../components/ImportDemandListForm';

const ImportDemandList: React.FC = () => {
  const props = useImportDemandList();

  return <ImportDemandListForm {...props} />;
};

export default ImportDemandList;
