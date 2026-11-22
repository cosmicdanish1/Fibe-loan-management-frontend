// page/CompulsoryDepositLegacy.tsx
// RD/CD Transaction Legacy: bulk charge on members' Compulsory Deposit (same form as RD/CD Transaction, charge variant).

import React from 'react';
import { useCompulsoryDepositLegacy } from '../hook/useCompulsoryDepositLegacy';
import CompulsoryDepositForm from '../../CompulsoryDepositTransaction/components/CompulsoryDepositForm';

const CompulsoryDepositLegacy: React.FC = () => {
  const props = useCompulsoryDepositLegacy();
  return <CompulsoryDepositForm {...props} variant="charge" />;
};

export default CompulsoryDepositLegacy;
