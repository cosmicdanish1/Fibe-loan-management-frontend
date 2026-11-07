// NomineeDetailsTab.tsx
import React from 'react';
import DataTable from './DataTable';
import { type NomineeDetail, type TableColumn } from '../../types';
import { getRelationOptions } from '../../utils/utilsloanApplication';
import { useTranslation } from 'react-i18next';

interface NomineeDetailsTabProps {
  nomineeDetails: NomineeDetail[];
  onNomineeDetailsChange: (details: NomineeDetail[]) => void;
}

const NomineeDetailsTab: React.FC<NomineeDetailsTabProps> = ({
  nomineeDetails,
  onNomineeDetailsChange
}) => {
  const { t } = useTranslation();
  const nomineeColumns: TableColumn<NomineeDetail>[] = [
    { 
      key: 'name', 
      header: t('Name'), 
      type: 'text', 
      width: '250px', 
      required: true 
    },
    { 
      key: 'address', 
      header: t('Address'), 
      type: 'text', 
      width: '300px', 
      required: true 
    },
    { 
      key: 'age', 
      header: t('Age'), 
      type: 'number', 
      width: '100px', 
      required: true 
    },
    { 
      key: 'relation', 
      header: t('Relation'), 
      type: 'select', 
      width: '150px', 
      required: true,
      options: getRelationOptions()
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h2 className="aw-card-title">{t('Nominee Details')}</h2>
        <p className="aw-desc">{t('Add nominee information for the loan application')}</p>
      </div>
      <DataTable
        data={nomineeDetails}
        columns={nomineeColumns}
        onDataChange={onNomineeDetailsChange}
        showAddButton={true}
      />
    </div>
  );
};

export default NomineeDetailsTab;
