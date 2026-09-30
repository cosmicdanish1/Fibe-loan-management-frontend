// page/ChangeMemberOffice.tsx

import React from 'react';
import { useChangeMemberOffice } from '../hook/useChangeMemberOffice';
import ChangeMemberOfficeForm from '../components/ChangeMemberOfficeForm';

const ChangeMemberOffice: React.FC = () => {
  const props = useChangeMemberOffice();

  return <ChangeMemberOfficeForm {...props} />;
};

export default ChangeMemberOffice;
