import React from 'react';
import { Save, Search, Lock, User, Info, Users, Calendar, Loader2, RefreshCcw, X, ChevronDown } from 'lucide-react';
import MemberLookup from '@/components/shared/MemberLookup/MemberLookup';
import { useChangeLoanSuretyForm } from '../hooks/useChangeLoanSuretyForm';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

// Design import: claude.ai/design project "Professional UI redesign",
// Change Loan Surety.dc.html — security/vault themed. The source design only
// had a dark variant; the light palette below translates the same layout
// using the app's existing light-theme tones (white cards / slate borders)
// so this screen follows Settings → Interface Mode like every other screen.
const ACCENT = '#10b981';
const ACCENT_SOFT = ACCENT + '1f';
const ACCENT_BORDER = ACCENT + '55';
const ERROR_COLOR = '#e5484d';

const DARK = {
  bgPage: '#0a0e16',
  bgCard: '#0d121c',
  bgInput: '#0a0e16',
  bgBtnSecondary: '#141b2a',
  borderCard: '#1a2130',
  borderInput: '#232c3f',
  textTitle: '#f1f5f9',
  textBody: '#c3cbdb',
  textLabel: '#5b6779',
  textSectionHeader: '#9aa5b8',
  iconMuted: '#7c8aa0',
  iconSecondary: '#8592a6',
  textReadonly: '#8a95a8',
  textFooterMinor: '#3f495b',
  resetText: '#c98a8a',
  resetBorder: '#2a2033',
  modalBackdrop: 'rgba(10,14,22,0.75)',
  modalPanelBg: '#0d121c',
  loadingOverlay: 'rgba(10,14,22,0.6)',
  commitDisabledBg: '#1a2130',
  commitDisabledText: '#5b6779',
  commitText: '#04170f',
};

const LIGHT = {
  bgPage: '#f1f5f9',
  bgCard: '#ffffff',
  bgInput: '#f8fafc',
  bgBtnSecondary: '#f1f5f9',
  borderCard: '#e2e8f0',
  borderInput: '#dbe3ec',
  textTitle: '#0f172a',
  textBody: '#1e293b',
  textLabel: '#64748b',
  textSectionHeader: '#475569',
  iconMuted: '#64748b',
  iconSecondary: '#64748b',
  textReadonly: '#94a3b8',
  textFooterMinor: '#94a3b8',
  resetText: '#b3514f',
  resetBorder: '#f1dcdc',
  modalBackdrop: 'rgba(15,23,42,0.5)',
  modalPanelBg: '#ffffff',
  loadingOverlay: 'rgba(255,255,255,0.7)',
  commitDisabledBg: '#e2e8f0',
  commitDisabledText: '#94a3b8',
  commitText: '#04170f',
};

/** Tracks Settings → Interface Mode (the `dark` class ThemeProvider toggles on <html>) live. */
function useIsDark(): boolean {
  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(el.classList.contains('dark')));
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

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

  const isDark = useIsDark();
  const p = isDark ? DARK : LIGHT;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: p.bgInput,
    border: `1px solid ${p.borderInput}`,
    borderRadius: 7,
    color: p.textBody,
    fontSize: 13,
    fontWeight: 600,
    outline: 'none',
  };
  const readonlyStyle: React.CSSProperties = { ...inputStyle, cursor: 'not-allowed', color: p.textReadonly };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em',
    color: p.textLabel, marginBottom: 6, textTransform: 'uppercase',
  };

  return (
    <div className="font-manrope h-screen flex flex-col overflow-hidden" style={{ background: p.bgPage, color: p.textBody }}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 shrink-0" style={{ background: p.bgCard, borderBottom: `1px solid ${p.borderCard}` }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 9, background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}` }}>
            <Lock size={18} color={ACCENT} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.03em', color: p.textTitle }}>CHANGE LOAN SURETY</div>
            <div style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', color: p.textLabel, marginTop: 2, whiteSpace: 'nowrap' }}>ADMINISTRATIVE GUARANTOR UPDATE</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 shrink-0" style={{ padding: '7px 12px', border: `1px solid ${p.borderInput}`, borderRadius: 7, fontSize: 11, fontWeight: 600, color: p.iconSecondary, letterSpacing: '0.04em' }}>
            <Info size={13} color={p.iconSecondary} strokeWidth={2} />
            <span style={{ whiteSpace: 'nowrap' }}>SESSION SECURE</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 active:scale-95 transition-all"
            style={{
              padding: '9px 16px', border: 'none', borderRadius: 7,
              background: isSubmitting ? p.commitDisabledBg : ACCENT,
              color: isSubmitting ? p.commitDisabledText : p.commitText,
              fontSize: 12, fontWeight: 800, letterSpacing: '0.03em',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.4} />}
            {isSubmitting ? 'PROCESSING...' : 'COMMIT CHANGES'}
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex flex-wrap gap-3.5 items-start overflow-auto" style={{ padding: '16px 24px' }}>

        {/* Left: Borrower & Loan Reference */}
        <div className="flex flex-col gap-3.5" style={{ flex: '2 1 480px', background: p.bgCard, border: `1px solid ${p.borderCard}`, borderRadius: 11, padding: 16 }}>
          <div className="flex items-center gap-2" style={{ paddingBottom: 12, borderBottom: `1px solid ${p.borderCard}` }}>
            <User size={15} color={p.iconMuted} strokeWidth={2} />
            <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.08em', color: p.textSectionHeader, whiteSpace: 'nowrap' }}>BORROWER IDENTITY &amp; CASE REFERENCE</span>
          </div>

          {/* Loan Type */}
          <div>
            <label style={labelStyle}>Loan Type</label>
            <div className="relative">
              <select
                value={formData.loanType}
                onChange={(e) => handleInputChange('loanType', e.target.value)}
                style={{ ...inputStyle, paddingRight: 34, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">Select loan type...</option>
                <option value="RLN">RLN - Regular Loan</option>
                <option value="ALN">ALN - Emergency Loan</option>
                <option value="ELN">ELN - Loan Against Recovery</option>
              </select>
              <ChevronDown size={14} color={p.textLabel} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {/* Member Reference */}
            <div>
              <label style={labelStyle}>Member Reference</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.memberNumber}
                  onChange={(e) => handleInputChange('memberNumber', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && formData.memberNumber) fetchMemberLoans(formData.memberNumber); }}
                  className="font-plex-mono"
                  placeholder="Enter MBNO..."
                  style={{ ...inputStyle, flex: 1, minWidth: 0, borderColor: errors.memberNumber ? ERROR_COLOR : p.borderInput }}
                />
                <button
                  onClick={() => handleLookup('memberNumber')}
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 38, background: p.bgBtnSecondary, border: `1px solid ${p.borderInput}`, borderRadius: 7, cursor: 'pointer' }}
                >
                  <Search size={14} color={p.iconSecondary} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Legal Signature Name */}
            <div>
              <label style={labelStyle}>Legal Signature Name</label>
              <input type="text" value={formData.memberName} readOnly placeholder="Verified borrower name" style={readonlyStyle} />
            </div>
          </div>

          {/* Loan Case Resolution */}
          <div>
            <label style={labelStyle}>Loan Case Resolution</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                {isLoadingCases && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: p.loadingOverlay, borderRadius: 7 }}>
                    <Loader2 size={14} className="animate-spin" color={ACCENT} />
                  </div>
                )}
                {loanCases.length > 0 ? (
                  <select
                    value={formData.loanCaseNo || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleInputChange('loanCaseNo', val);
                      if (val) fetchLoanDetails(val);
                    }}
                    style={{ ...inputStyle, paddingRight: 34, appearance: 'none', cursor: 'pointer', borderColor: errors.loanCaseNo ? ERROR_COLOR : p.borderInput }}
                  >
                    <option value="">Select Loan Case</option>
                    {loanCases
                      .filter(lc => !formData.loanType || (lc.loanType || lc.loantype || '').toUpperCase() === formData.loanType.toUpperCase())
                      .map(lc => (
                        <option key={lc.loanCaseNo || lc.loancaseno} value={lc.loanCaseNo || lc.loancaseno}>
                          #{lc.loanCaseNo || lc.loancaseno} - {lc.loanType || lc.loantype} | ₹{parseFloat(lc.loanAmount || lc.loan_amt || '0').toLocaleString()} [{lc.status || 'PENDING'}]
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.loanCaseNo}
                    readOnly
                    placeholder={isLoadingCases ? 'Loading cases...' : 'Choose member to load cases'}
                    style={readonlyStyle}
                  />
                )}
                {loanCases.length > 0 && (
                  <ChevronDown size={14} color={p.textLabel} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                )}
              </div>
              {formData.loanCaseNo && (
                <div className="flex items-center gap-1 shrink-0" style={{ padding: '7px 10px', background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 7, fontSize: '10.5px', fontWeight: 800, color: ACCENT, whiteSpace: 'nowrap' }}>
                  FOUND: {formData.loanCaseNo}
                </div>
              )}
              {!formData.loanCaseNo && formData.memberNumber && (
                <button
                  onClick={() => fetchMemberLoans(formData.memberNumber)}
                  title="Refresh Case List"
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 38, height: 38, background: p.bgBtnSecondary, border: `1px solid ${p.borderInput}`, borderRadius: 7, cursor: 'pointer' }}
                >
                  <RefreshCcw size={14} color={ACCENT} className={isLoadingCases ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {/* Sanction Date */}
            <div>
              <label style={labelStyle}>Sanction Date</label>
              <div className="relative">
                <Calendar size={13} color={p.textLabel} strokeWidth={2} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={formData.sanctionDate} readOnly placeholder="YYYY-MM-DD" className="font-plex-mono" style={{ ...readonlyStyle, paddingLeft: 32 }} />
              </div>
            </div>

            {/* Sanction Amount */}
            <div>
              <label style={labelStyle}>Sanction Amount</label>
              <div className="relative">
                <span className="font-plex-mono" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: p.textLabel, fontSize: 13 }}>₹</span>
                <input
                  type="text"
                  value={formData.sanctionAmount ? parseFloat(formData.sanctionAmount).toLocaleString() : ''}
                  readOnly
                  placeholder="0.00"
                  className="font-plex-mono"
                  style={{ ...readonlyStyle, paddingLeft: 26, textAlign: 'right' }}
                />
              </div>
            </div>
          </div>

          {/* Office */}
          <div>
            <label style={labelStyle}>Office / Unit Mapping</label>
            <input type="text" value={formData.office} readOnly placeholder="Organizational unit..." style={readonlyStyle} />
          </div>
        </div>

        {/* Right: Guarantor Protocol */}
        <div className="flex flex-col gap-3.5" style={{ flex: '1 1 300px', maxWidth: 360, background: p.bgCard, border: `1px solid ${p.borderCard}`, borderRadius: 11, padding: 16, minHeight: '100%' }}>
          <div className="flex items-center gap-2" style={{ paddingBottom: 12, borderBottom: `1px solid ${p.borderCard}` }}>
            <Users size={15} color={p.iconMuted} strokeWidth={2} />
            <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.08em', color: p.textSectionHeader, whiteSpace: 'nowrap' }}>GUARANTOR PROTOCOL</span>
          </div>

          {/* Guarantor 01 */}
          <div className="flex flex-col gap-2" style={{ border: `1px solid ${p.borderCard}`, borderRadius: 9, padding: 14 }}>
            <div className="flex items-baseline justify-between gap-2">
              <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', color: p.textLabel, whiteSpace: 'nowrap' }}>
                GUARANTOR 01 <span style={{ color: ACCENT }}>*</span>
              </span>
              <button onClick={() => handleLookup('surety1')} style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.03em', color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                LOOKUP REGISTRY
              </button>
            </div>
            <input
              type="text"
              value={formData.surety1}
              onChange={(e) => handleInputChange('surety1', e.target.value)}
              placeholder="MBNO"
              className="font-plex-mono"
              style={{ ...inputStyle, borderColor: errors.surety1 ? ERROR_COLOR : p.borderInput, color: ACCENT }}
            />
            {formData.surety1Name && (
              <div style={{ padding: '6px 8px', background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 7, fontSize: '10.5px', fontWeight: 700, color: ACCENT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formData.surety1Name}
              </div>
            )}
          </div>

          {/* Guarantor 02 */}
          <div className="flex flex-col gap-2" style={{ border: `1px solid ${p.borderCard}`, borderRadius: 9, padding: 14 }}>
            <div className="flex items-baseline justify-between gap-2">
              <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', color: p.textLabel, whiteSpace: 'nowrap' }}>GUARANTOR 02</span>
              <button onClick={() => handleLookup('surety2')} style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.03em', color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                LOOKUP REGISTRY
              </button>
            </div>
            <input
              type="text"
              value={formData.surety2}
              onChange={(e) => handleInputChange('surety2', e.target.value)}
              placeholder="MBNO"
              className="font-plex-mono"
              style={{ ...inputStyle, color: ACCENT }}
            />
            {formData.surety2Name && (
              <div style={{ padding: '6px 8px', background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 7, fontSize: '10.5px', fontWeight: 700, color: ACCENT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formData.surety2Name}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <button
            onClick={resetForm}
            style={{ width: '100%', padding: 11, border: `1px solid ${p.resetBorder}`, borderRadius: 7, background: 'transparent', color: p.resetText, fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.05em', cursor: 'pointer' }}
          >
            RESET LEDGER
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0" style={{ padding: '10px 24px', background: p.bgCard, borderTop: `1px solid ${p.borderCard}` }}>
        <div className="flex items-center gap-1.5" style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.05em', color: ACCENT, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block', flexShrink: 0 }} />
          STANDARD COMPLIANT
        </div>
        <div style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.05em', color: p.textFooterMinor }}>SURETY_UPDATE_V1.1</div>
      </div>

      {/* Member Lookup Modal */}
      {isLookupOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: p.modalBackdrop, backdropFilter: 'blur(4px)' }}>
          <div className="relative w-full max-w-4xl overflow-hidden" style={{ background: p.modalPanelBg, border: `1px solid ${p.borderCard}`, borderRadius: 20 }}>
            <button
              onClick={() => setIsLookupOpen(false)}
              className="absolute z-[110] flex items-center justify-center"
              style={{ top: 16, right: 16, width: 32, height: 32, background: p.bgBtnSecondary, border: `1px solid ${p.borderInput}`, borderRadius: '50%', cursor: 'pointer' }}
              title="Close"
            >
              <X size={16} color={p.iconSecondary} />
            </button>
            <MemberLookup
              isModal={true}
              onSelect={(member) => {
                handleMemberSelect(member);
                setIsLookupOpen(false);
              }}
              onClose={() => setIsLookupOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeLoanSuretyForm;
