// components/ModifyBalanceForm.tsx
// Layout follows Member Master: a header with crumb and status chip, a member rail on the left, balance cards on the right.
import React from 'react';
import { Select } from 'antd';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, RotateCcw, Save, X, Lock } from 'lucide-react';
import type { MemberBalanceHookReturn, MemberBalanceData } from '../interfaces/interface';
import MemberField from '../../../../components/shared/kit/MemberField';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '–';

// Amount box: right-aligned tabular figures. A locked box shows a quiet lock instead of an edit border.
const AmtInput: React.FC<{ value: string; onChange: (v: string) => void; label: string; readOnly?: boolean; disabled?: boolean }> = ({
    value, onChange, label, readOnly, disabled,
}) => (
    <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
        onWheel={e => (e.target as HTMLInputElement).blur()}
        placeholder="0.00"
        readOnly={readOnly}
        disabled={disabled}
        tabIndex={readOnly ? -1 : undefined}
        className={`aw-input mb-amt ${readOnly ? 'is-locked' : ''}`}
    />
);

const ModifyBalanceForm: React.FC<MemberBalanceHookReturn> = ({
    formData, setFormData,
    wing, setWing, wings,
    memberNo, memberName, memberInput, setMemberInput, submitMember, loading,
    memberIndex, memberTotal,
    handleMemberSelect, navigateMember,
    save, reset,
}) => {
    const { t } = useTranslation();
    const handleExit = () => {
        if ((window as any).electron?.ipcRenderer) (window as any).electron.ipcRenderer.send('window-close');
    };
    const upd = (key: keyof MemberBalanceData) => (val: string) => setFormData(prev => ({ ...prev, [key]: val }));
    usePageToolbarActions({ onSave: save, saveLabel: 'Save' });

    const has = !!memberNo;
    const off = !has || loading;

    // One row per fund: opening balance is locked history, the installment is the editable figure.
    const funds: { label: string; op: keyof MemberBalanceData; amt?: keyof MemberBalanceData; lockedAmt?: boolean }[] = [
        { label: t('Shares'), op: 'shareOpBal', amt: 'shareAmt' },
        { label: t('Monthly contribution'), op: 'mdOpBal', amt: 'mdAmt' },
        { label: t('RD / CD'), op: 'cdOpBal', amt: 'cdAmt' },
        { label: t('Loan execution receipt'), op: 'lnExecRec' },
    ];
    const loans: { label: string; op: keyof MemberBalanceData; amt: keyof MemberBalanceData }[] = [
        { label: t('Regular loan'), op: 'rlnOpBal', amt: 'rlnAmt' },
        { label: t('Emergency loan'), op: 'elnOpBal', amt: 'elnAmt' },
    ];

    return (
        <div className="app-window mb-form">
            <div className="aw-header">
                <div className="min-w-0">
                    <div className="mb-crumb">{t('Masters')}</div>
                    <h1 className="aw-title">{t('Modify Member Balance')}</h1>
                </div>
                <div className="aw-actions">
                    <span className="mb-mode"><span className="mb-mode-dot" aria-hidden="true" />{has ? t('Editing member {{1}}', { 1: memberNo }) : t('No member selected')}</span>
                    <button type="button" onClick={reset} disabled={off} className="aw-btn aw-btn-secondary" data-tip={t('Undo changes and reload this member')} data-tip-pos="bottom-end">
                        <RotateCcw size={13} /> {t('Revert')}
                    </button>
                    <button type="button" onClick={save} disabled={off} className="aw-btn aw-btn-primary">
                        <Save size={13} /> {t('Save')}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost" data-tip={t('Close this window')} data-tip-pos="bottom-end">
                        <X size={13} /> {t('Exit')}
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="mb-layout">
                    {/* Member rail */}
                    <aside className="mb-rail" aria-label={t('Member')}>
                        <div className="mb-card">
                            <div className="mb-who">
                                <span className="mb-avatar" aria-hidden="true">{has ? initials(memberName) : '–'}</span>
                                <div className="min-w-0">
                                    <div className="mb-name">{memberName || (has ? t('Member {{1}}', { 1: memberNo }) : t('Select a member'))}</div>
                                    <div className="mb-sub">{has ? t('Member no. {{1}}', { 1: memberNo }) : t('Search by number or name')}</div>
                                </div>
                            </div>

                            <label className="aw-label mb-field-label" htmlFor="mmb-wing">{t('Wing')}</label>
                            <Select
                                id="mmb-wing"
                                value={wing || null}
                                onChange={v => setWing((v as string) ?? '')}
                                placeholder={t('All wings')}
                                className="aw-select"
                                popupClassName="aw-select-popup"
                                allowClear
                                options={wings.map(w => ({ value: w.id, label: w.name }))}
                            />

                            <label className="aw-label mb-field-label" htmlFor="mmb-member">{t('Member number')}</label>
                            <MemberField
                                id="mmb-member"
                                value={memberInput}
                                onChange={setMemberInput}
                                onSelect={m => handleMemberSelect(String(m?.memberNo ?? ''), m)}
                                onSubmit={submitMember}
                                placeholder={t('Enter number or press F2')}
                                digitsOnly
                                shortcuts
                            />

                            <div className="mb-nav" role="group" aria-label={t('Move between members')}>
                                <button type="button" onClick={() => navigateMember('first')} className="aw-btn aw-btn-secondary" aria-label={t('First member')} data-tip={t('First member')}><ChevronsLeft size={14} /></button>
                                <button type="button" onClick={() => navigateMember('prev')} className="aw-btn aw-btn-secondary" aria-label={t('Previous member')} data-tip={t('Previous member')}><ChevronLeft size={14} /></button>
                                <span className="mb-count">{memberIndex > 0 ? `${memberIndex} / ${memberTotal}` : t('{{1}} members', { 1: memberTotal })}</span>
                                <button type="button" onClick={() => navigateMember('next')} className="aw-btn aw-btn-secondary" aria-label={t('Next member')} data-tip={t('Next member')}><ChevronRight size={14} /></button>
                                <button type="button" onClick={() => navigateMember('last')} className="aw-btn aw-btn-secondary" aria-label={t('Last member')} data-tip={t('Last member')}><ChevronsRight size={14} /></button>
                            </div>
                        </div>
                    </aside>

                    {/* Balances */}
                    <div className="mb-main">
                        <section className="mb-card">
                            <h2 className="mb-card-title">{t('Funds')}</h2>
                            <p className="mb-card-desc">{t('Opening balances are carried in from the previous system and cannot be changed. Edit the installment amounts.')}</p>
                            <div className="mb-table">
                                <div className="mb-th" />
                                <div className="mb-th"><Lock size={11} aria-hidden="true" /> {t('Opening balance')}</div>
                                <div className="mb-th">{t('Installment')}</div>
                                {funds.map(r => (
                                    <React.Fragment key={r.label}>
                                        <div className="mb-row-label">{r.label}</div>
                                        <AmtInput value={formData[r.op]} onChange={upd(r.op)} readOnly={r.op !== 'lnExecRec'} disabled={off} label={t('{{1}} opening balance', { 1: r.label })} />
                                        {r.amt ? <AmtInput value={formData[r.amt]} onChange={upd(r.amt)} disabled={off} label={t('{{1}} installment', { 1: r.label })} /> : <div className="mb-none">–</div>}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="mb-suspense">
                                <div>
                                    <div className="mb-row-label">{t('Suspense balance')}</div>
                                    <div className="mb-card-desc">{t('Amount held in suspense for this member')}</div>
                                </div>
                                <div className="mb-suspense-box">
                                    <AmtInput value={formData.suspBal} onChange={upd('suspBal')} disabled={off} label={t('Suspense balance')} />
                                </div>
                            </div>
                        </section>

                        <section className="mb-card">
                            <h2 className="mb-card-title">{t('Loans')}</h2>
                            <p className="mb-card-desc">{t('The latest loan of each type, shown for reference. Change a loan from the loan windows.')}</p>
                            <div className="mb-table">
                                <div className="mb-th" />
                                <div className="mb-th"><Lock size={11} aria-hidden="true" /> {t('Opening balance')}</div>
                                <div className="mb-th"><Lock size={11} aria-hidden="true" /> {t('Installment')}</div>
                                {loans.map(l => (
                                    <React.Fragment key={l.label}>
                                        <div className="mb-row-label">{l.label}</div>
                                        <AmtInput value={formData[l.op]} onChange={upd(l.op)} readOnly disabled={off} label={t('{{1}} opening balance', { 1: l.label })} />
                                        <AmtInput value={formData[l.amt]} onChange={upd(l.amt)} readOnly disabled={off} label={t('{{1}} installment', { 1: l.label })} />
                                    </React.Fragment>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <style>{`
                .mb-form { --mb-page: color-mix(in srgb, var(--aw-accent) 5%, #eceff5); --mb-edge: #e2e6ee; --mb-shadow: 0 1px 2px rgba(16,24,40,.05), 0 10px 28px -12px rgba(16,24,40,.14); background: var(--mb-page); }
                html.dark .mb-form { --mb-page: color-mix(in srgb, var(--aw-accent) 6%, #0a0d12); --mb-edge: rgba(255,255,255,.09); --mb-shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 28px -12px rgba(0,0,0,.5); }
                html.no-shadows .mb-form { --mb-shadow: none; }
                .mb-form .aw-header { background: var(--aw-surface); border-bottom: 1px solid var(--mb-edge); padding-top: 16px; padding-bottom: 16px; }
                .mb-form .aw-content { padding: 28px calc(var(--aw-pad) * 2.2) 56px; }
                .mb-crumb { font-size: calc(var(--type-body-size) - 1px); color: var(--aw-muted); margin-bottom: 2px; }
                .mb-mode { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border-radius: 999px; background: color-mix(in srgb, var(--aw-accent) 10%, var(--aw-surface)); color: var(--aw-text); font-size: var(--type-label-size); font-weight: 600; font-variant-numeric: tabular-nums; }
                .mb-mode-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--aw-accent); }
                .mb-layout { display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start; max-width: 1120px; margin: 0 auto; }
                .mb-rail { flex: 1 1 280px; max-width: 320px; position: sticky; top: 0; }
                .mb-main { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 24px; }
                .mb-card { background: var(--aw-surface); border: 1px solid var(--mb-edge); border-radius: 16px; box-shadow: var(--mb-shadow); padding: 24px 28px 28px; }
                .mb-rail .mb-card { padding: 20px; }
                .mb-card-title { margin: 0; font-size: calc(var(--type-panel-title) + 3px); font-weight: 600; color: var(--aw-text); }
                .mb-card-desc { margin: 2px 0 0; font-size: calc(var(--type-body-size) - 1px); color: var(--aw-muted); }
                .mb-who { display: flex; align-items: center; gap: 14px; padding-bottom: 16px; margin-bottom: 4px; border-bottom: 1px solid var(--mb-edge); }
                .mb-avatar { width: 56px; height: 56px; flex: none; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; color: var(--aw-accent); background: color-mix(in srgb, var(--aw-accent) 12%, var(--aw-surface)); }
                .mb-name { font-size: calc(var(--type-body-size) + 2px); font-weight: 600; line-height: 1.25; color: var(--aw-text); overflow-wrap: anywhere; }
                .mb-sub { font-size: calc(var(--type-body-size) - 1px); color: var(--aw-muted); font-variant-numeric: tabular-nums; }
                .mb-form .mb-field-label { display: block; margin: 16px 0 6px; text-transform: none; letter-spacing: 0; font-size: calc(var(--type-body-size) - 1px); font-weight: 600; color: var(--aw-text); }
                .mb-nav { display: grid; grid-template-columns: 40px 40px 1fr 40px 40px; gap: 6px; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--mb-edge); }
                .mb-nav .aw-btn { height: 36px; padding: 0; justify-content: center; }
                .mb-count { text-align: center; font-size: var(--type-label-size); color: var(--aw-muted); font-variant-numeric: tabular-nums; }
                .mb-table { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(120px, 190px) minmax(120px, 190px); gap: 12px 16px; align-items: center; margin-top: 20px; }
                .mb-th { display: flex; align-items: center; justify-content: flex-end; gap: 6px; font-size: calc(var(--type-body-size) - 1px); font-weight: 600; color: var(--aw-muted); }
                .mb-row-label { font-size: var(--type-field-size); font-weight: 600; color: var(--aw-text); }
                .mb-none { text-align: right; color: var(--aw-muted); padding-right: 12px; }
                .mb-form .mb-amt { text-align: right; font-variant-numeric: tabular-nums; height: 40px; }
                .mb-form .mb-amt.is-locked { background: var(--aw-surface-muted); color: var(--aw-muted); border-color: transparent; cursor: default; }
                .mb-suspense { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--mb-edge); }
                .mb-suspense-box { width: 190px; }
                @media (max-width: 720px) { .mb-table { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .mb-table > .mb-th:first-child, .mb-table > .mb-row-label { grid-column: 1 / -1; } }
            `}</style>
        </div>
    );
};

export default ModifyBalanceForm;
