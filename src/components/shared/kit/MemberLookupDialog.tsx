import React from 'react';
import { Search } from 'lucide-react';
import MemberLookup from '../MemberLookup/MemberLookup';
import AwDialog from './AwDialog';
import { useTranslation } from 'react-i18next';

interface MemberLookupDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen member. The dialog closes itself first. */
  onSelect: (member: any) => void;
}

/**
 * The one member-lookup dialog for windows on the shared `.app-window` styling.
 * Wraps the shared `MemberLookup` list in the standard dialog.
 */
const MemberLookupDialog: React.FC<MemberLookupDialogProps> = ({ open, onClose, onSelect }) => {
  const { t } = useTranslation();
  return (
  <AwDialog open={open} title={t('Member Lookup')} icon={<Search size={14} />} onClose={onClose} maxWidth="52rem" flush>
    <MemberLookup
      isModal
      onSelect={(member: any) => { onClose(); onSelect(member); }}
      onClose={onClose}
    />
  </AwDialog>
);
};

export default MemberLookupDialog;
