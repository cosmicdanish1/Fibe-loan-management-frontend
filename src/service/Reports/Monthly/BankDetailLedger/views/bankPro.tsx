import React from 'react';
import { GenericEditorial, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { useDetailSpec, ProBento, ProTerm, type DetailRow } from '../../DetailLedger/views/ledgerPro';

export { useDetailSpec as useBankSpec, ProBento, ProTerm };
export const ProEd: React.FC<{ spec: ProSpec<DetailRow>; subtitle: string }> = ({ spec, subtitle }) => (
  <GenericEditorial spec={spec} title="Bank Detail Ledger" subtitle={subtitle} />
);
