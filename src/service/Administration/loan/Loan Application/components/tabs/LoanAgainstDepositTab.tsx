// LoanAgainstDepositTab.tsx
import React, { useEffect } from 'react';
import DataTable from './DataTable';
import { type LoanAgainstDeposit, type FDRDetail } from '../../types/fdr';
import type { TableColumn } from '../../types/table';
import { getUnitOptions, calculateMaturityAmount } from '../../utils/utilsloanApplication';

interface LoanAgainstDepositTabProps {
  loanAgainstDeposit: LoanAgainstDeposit;
  onLoanAgainstDepositChange: (isEnabled: boolean) => void;
  onFDRDetailsChange: (details: FDRDetail[]) => void;
}

const LoanAgainstDepositTab: React.FC<LoanAgainstDepositTabProps> = ({
  loanAgainstDeposit,
  onFDRDetailsChange
}) => {
  const fdrColumns: TableColumn<FDRDetail>[] = [
    {
      key: 'srno',
      header: 'Srno',
      type: 'number',
      width: '70px',
    },
    {
      key: 'lien',
      header: 'Lien',
      type: 'checkbox',
      width: '60px'
    },
    {
      key: 'fdrNo',
      header: 'FDR. No',
      type: 'text',
      width: '110px',
      required: true
    },
    {
      key: 'accountNo',
      header: 'Account No',
      type: 'text',
      width: '130px',
      required: true
    },
    {
      key: 'depDate',
      header: 'Dep.Date',
      type: 'date',
      width: '120px',
      required: true
    },
    {
      key: 'period',
      header: 'Period',
      type: 'number',
      width: '80px',
      required: true
    },
    {
      key: 'unit',
      header: 'Unit',
      type: 'select',
      width: '90px',
      required: true,
      options: getUnitOptions()
    },
    {
      key: 'rate',
      header: 'Rate',
      type: 'number',
      width: '80px',
      required: true
    },
    {
      key: 'amount',
      header: 'Amount',
      type: 'number',
      width: '110px',
      required: true
    },
    {
      key: 'matAmount',
      header: 'Mat.Amount',
      type: 'text',
      width: '110px'
    },
    {
      key: 'matDate',
      header: 'Maturity Date',
      type: 'date',
      width: '120px',
    },
    {
      key: 'lastIntt',
      header: 'Last Intt.',
      type: 'date',
      width: '120px',
    },
    {
      key: 'inttPaid',
      header: 'Intt.Paid',
      type: 'number',
      width: '110px',
    },
  ];

  // Auto-calculate maturity amount when amount, rate, period, or unit changes
  useEffect(() => {
    const updatedDetails = loanAgainstDeposit.fdrDetails.map(fdr => {
      const matAmount = calculateMaturityAmount(fdr.amount, fdr.rate, fdr.period, fdr.unit);
      return { ...fdr, matAmount };
    });
    
    // Only update if there are actual changes
    const hasChanges = updatedDetails.some((fdr, index) => 
      fdr.matAmount !== loanAgainstDeposit.fdrDetails[index]?.matAmount
    );
    
    if (hasChanges) {
      onFDRDetailsChange(updatedDetails);
    }
  }, [loanAgainstDeposit.fdrDetails, onFDRDetailsChange]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h2 className="aw-card-title">Loan Against Deposit</h2>
        <p className="aw-desc">Fixed Deposit Receipt details for loan collateral</p>
      </div>
      <DataTable
        data={loanAgainstDeposit.fdrDetails}
        columns={fdrColumns}
        onDataChange={onFDRDetailsChange}
        showAddButton={true}
      />
    </div>
  );
};

export default LoanAgainstDepositTab;
