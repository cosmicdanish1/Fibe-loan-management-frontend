// page/ChangeMemberOffice.tsx

import React from 'react';
import { useChangeMemberOffice } from '../hook/useChangeMemberOffice';
import ChangeMemberOfficeForm from '../components/ChangeMemberOfficeForm';

const ChangeMemberOffice: React.FC = () => {
  const props = useChangeMemberOffice();

  return (
    <div className="cmo-page h-screen bg-slate-50 overflow-hidden">
      <ChangeMemberOfficeForm {...props} />
      <style>{`
        html.dark .cmo-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default ChangeMemberOffice;
