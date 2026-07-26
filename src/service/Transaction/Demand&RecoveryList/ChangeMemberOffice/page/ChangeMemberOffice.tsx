// page/ChangeMemberOffice.tsx

import React from 'react';
import { useChangeMemberOffice } from '../hook/useChangeMemberOffice';
import ChangeMemberOfficeForm from '../components/ChangeMemberOfficeForm';

const ChangeMemberOffice: React.FC = () => {
  const props = useChangeMemberOffice();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <ChangeMemberOfficeForm {...props} />
    </div>
  );
};

export default ChangeMemberOffice;
