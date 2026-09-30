import React from 'react';
import { Select } from 'antd';
import { Save, Search, ShieldCheck, User, Users, RefreshCw, RotateCcw } from 'lucide-react';
import MemberLookupDialog from '@/components/shared/kit/MemberLookupDialog';
import { useChangeLoanSuretyForm } from '../hooks/useChangeLoanSuretyForm';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const LOAN_TYPE_OPTIONS = [
  { value: 'RLN', label: 'RLN - Regular Loan' },
  { value: 'ALN', label: 'ALN - Emergency Loan' },
  { value: 'ELN', label: 'ELN - Loan Against Recovery' },
];

const ChangeLoanSuretyForm: React.FC = () => {
  const {
    formData,
    errors,
    loanCases,
    isSubmitting,
    isLoadingCases,
    isLookupOpen,
    setIsLookupOpen,
    handleInputChange,
    handleSubmit,
    resetForm,
    handleLookup,
    handleMemberSelect,
    fetchLoanDetails,
    fetchMemberLoans,
  } = useChangeLoanSuretyForm();

  usePageToolbarActions({
    onSave: handleSubmit,
    saveLabel: isSubmitting ? 'Processing...' : 'Commit Changes',
    saveEnabled: !isSubmitting,
  });

  const caseOptions = loanCases
    .filter(lc => !formData.loanType || (lc.loanType || lc.loantype || '').toUpperCase() === formData.loanType.toUpperCase())
    .map(lc => {
      const no = lc.loanCaseNo || lc.loancaseno;
      return {
        value: no,
        label: `#${no} - ${lc.loanType || lc.loantype} | ₹${parseFloat(lc.loanAmount || lc.loan_amt || '0').toLocaleString()} [${lc.status || 'PENDING'}]`,
      };
    });

  const suretyBox = (
    key: 'surety1' | 'surety2',
    title: string,
    required: boolean,
    nameValue?: string,
  ) => (
    <div className="aw-panel">
      <label className="aw-label" htmlFor={`cls-${key}`}>
        {title} {required && <span style={{ color: 'var(--aw-danger)' }}>*</span>}
      </label>
      <div className="aw-input-wrap has-action">
        <input
          id={`cls-${key}`}
          type="text"
          value={formData[key]}
          onChange={(e) => handleInputChange(key, e.target.value)}
          placeholder="MBNO"
          className={`aw-input is-accent ${errors[key] ? 'is-invalid' : ''}`}
        />
        <button
          type="button"
          className="aw-input-action"
          onClick={() => handleLookup(key)}
          aria-label={`Look up ${title}`}
          data-tip="Look up member"
          data-tip-pos="top-end"
        >
          <Search size={13} />
        </button>
      </div>
      {nameValue && <p className="aw-strong aw-fade-in" style={{ marginTop: 8, color: 'var(--aw-accent)' }}>{nameValue}</p>}
    </div>
  );

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Change Loan Surety</h1>
          <p className="aw-desc">Administrative guarantor update</p>
        </div>
        <div className="aw-actions">
          <span className="aw-pill tone-success"><ShieldCheck size={12} style={{ marginRight: 5 }} />Session secure</span>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="aw-btn aw-btn-primary">
            {isSubmitting ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />}
            {isSubmitting ? 'Processing...' : 'Commit Changes'}
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-split aw-split-wide" style={{ height: 'auto', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)' }}>
          {/* Borrower & case reference */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><User size={14} /></span>
              <h2 className="aw-card-title">Borrower Identity &amp; Case Reference</h2>
            </div>
            <div className="aw-stack">
              <div>
                <label className="aw-label" htmlFor="cls-type">Loan Type</label>
                <Select
                  id="cls-type"
                  className="aw-select"
                  popupClassName="aw-select-popup"
                  value={formData.loanType || undefined}
                  onChange={(v) => handleInputChange('loanType', v ?? '')}
                  placeholder="Select loan type..."
                  options={LOAN_TYPE_OPTIONS}
                />
              </div>

              <div className="aw-two">
                <div>
                  <label className="aw-label" htmlFor="cls-member">Member Reference</label>
                  <div className="aw-input-wrap has-action">
                    <input
                      id="cls-member"
                      type="text"
                      value={formData.memberNumber}
                      onChange={(e) => handleInputChange('memberNumber', e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && formData.memberNumber) fetchMemberLoans(formData.memberNumber); }}
                      placeholder="Enter MBNO..."
                      className={`aw-input ${errors.memberNumber ? 'is-invalid' : ''}`}
                    />
                    <button
                      type="button"
                      className="aw-input-action"
                      onClick={() => handleLookup('memberNumber')}
                      aria-label="Look up member"
                      data-tip="Look up member"
                      data-tip-pos="top-end"
                    >
                      <Search size={13} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="aw-label" htmlFor="cls-name">Legal Signature Name</label>
                  <input id="cls-name" type="text" value={formData.memberName} readOnly placeholder="Verified borrower name" className="aw-input" />
                </div>
              </div>

              <div>
                <label className="aw-label" htmlFor="cls-case">Loan Case Resolution</label>
                <div className="aw-inline">
                  {loanCases.length > 0 ? (
                    <Select
                      id="cls-case"
                      className={`aw-select ${errors.loanCaseNo ? 'is-invalid' : ''}`}
                      popupClassName="aw-select-popup"
                      style={{ flex: 1, minWidth: 0 }}
                      loading={isLoadingCases}
                      value={formData.loanCaseNo || undefined}
                      onChange={(val) => {
                        handleInputChange('loanCaseNo', val ?? '');
                        if (val) fetchLoanDetails(val);
                      }}
                      placeholder="Select Loan Case"
                      allowClear
                      options={caseOptions}
                    />
                  ) : (
                    <input
                      id="cls-case"
                      type="text"
                      value={formData.loanCaseNo}
                      readOnly
                      placeholder={isLoadingCases ? 'Loading cases...' : 'Choose member to load cases'}
                      className="aw-input"
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  )}
                  {formData.loanCaseNo && <span className="aw-pill">Found: {formData.loanCaseNo}</span>}
                  {!formData.loanCaseNo && formData.memberNumber && (
                    <button
                      type="button"
                      onClick={() => fetchMemberLoans(formData.memberNumber)}
                      className="aw-icon-btn"
                      aria-label="Refresh case list"
                      data-tip="Refresh case list"
                      data-tip-pos="top-end"
                    >
                      <RefreshCw size={14} className={isLoadingCases ? 'aw-spin' : ''} />
                    </button>
                  )}
                </div>
              </div>

              <div className="aw-two">
                <div>
                  <label className="aw-label" htmlFor="cls-sdate">Sanction Date</label>
                  <input id="cls-sdate" type="text" value={formData.sanctionDate} readOnly placeholder="YYYY-MM-DD" className="aw-input" />
                </div>
                <div>
                  <label className="aw-label" htmlFor="cls-samt">Sanction Amount</label>
                  <input
                    id="cls-samt"
                    type="text"
                    value={formData.sanctionAmount ? `₹${parseFloat(formData.sanctionAmount).toLocaleString()}` : ''}
                    readOnly
                    placeholder="₹0.00"
                    className="aw-input is-right"
                  />
                </div>
              </div>

              <div>
                <label className="aw-label" htmlFor="cls-office">Office / Unit Mapping</label>
                <input id="cls-office" type="text" value={formData.office} readOnly placeholder="Organizational unit..." className="aw-input" />
              </div>
            </div>
          </section>

          {/* Guarantors */}
          <section className="aw-card" style={{ alignSelf: 'start' }}>
            <div className="aw-card-head">
              <span className="aw-card-icon"><Users size={14} /></span>
              <h2 className="aw-card-title">Guarantor Protocol</h2>
            </div>
            <div className="aw-stack">
              {suretyBox('surety1', 'Guarantor 01', true, formData.surety1Name)}
              {suretyBox('surety2', 'Guarantor 02', false, formData.surety2Name)}
              <button type="button" onClick={resetForm} className="aw-btn aw-btn-danger" style={{ width: '100%' }}>
                <RotateCcw size={13} /> Reset Ledger
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}><i className="aw-status-dot" />Standard compliant</span>
        <span>SURETY_UPDATE_V1.1</span>
      </div>

      <MemberLookupDialog open={isLookupOpen} onClose={() => setIsLookupOpen(false)} onSelect={handleMemberSelect} />
    </div>
  );
};

export default ChangeLoanSuretyForm;
