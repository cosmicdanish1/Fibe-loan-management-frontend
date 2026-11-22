// components/LoanSanctionPanel.tsx
// The sanction form for use inside a dialog (e.g. from Loan Payment): same hook and
// same form as the standalone Loan Sanction window, without its own header, footer
// or toolbar binding. Mount it only while the dialog is open so every opening starts clean.

import React from 'react';
import { useLoanSanction } from '../hook/useLoanSanction';
import LoanSanctionForm from './LoanSanctionForm';

interface LoanSanctionPanelProps {
  /** Case to open with, when it is still waiting for sanction. */
  initialCaseNo?: string;
  onSanctioned?: (caseNo: string) => void;
  onClose: () => void;
}

const LoanSanctionPanel: React.FC<LoanSanctionPanelProps> = ({ initialCaseNo, onSanctioned, onClose }) => {
  const props = useLoanSanction({
    ...(initialCaseNo ? { initialCaseNo } : {}),
    ...(onSanctioned ? { onSanctioned } : {}),
    onClose,
  });
  return <LoanSanctionForm {...props} embedded />;
};

export default LoanSanctionPanel;
