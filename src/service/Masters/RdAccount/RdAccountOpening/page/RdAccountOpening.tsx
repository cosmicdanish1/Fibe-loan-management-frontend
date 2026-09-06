// page/RdAccountOpening.tsx

import React from 'react';
import { useRDMaster } from '../hooks/useRDMaster';
import RDMasterForm from '../components/RDMasterForm';

const RdAccountOpening: React.FC = () => {
  const rdMasterProps = useRDMaster();

  return (
    <div className="rd-acc-opening-page h-screen bg-slate-50 overflow-hidden">
      <RDMasterForm {...rdMasterProps} />

      <style>{`
        /* ── RD Account Opening — page wrapper dark mode ── */
        html.dark .rd-acc-opening-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default RdAccountOpening;
