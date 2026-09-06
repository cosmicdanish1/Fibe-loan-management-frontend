// page/SavingAccountOpening.tsx

import React from 'react';
import { useSavingAccountOpening } from '../hooks/useSavingAccountOpening';
import SavingAccountForm from '../components/SavingAccountForm';

const SavingAccountOpening: React.FC = () => {
  const saProps = useSavingAccountOpening();

  return (
    <div className="sa-acc-opening-page h-screen bg-slate-50 overflow-hidden">
      <SavingAccountForm {...saProps} />

      <style>{`
        /* ── Saving Account Opening — page wrapper dark mode ── */
        html.dark .sa-acc-opening-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default SavingAccountOpening;
