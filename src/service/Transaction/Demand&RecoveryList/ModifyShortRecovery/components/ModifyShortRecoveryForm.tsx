// components/ModifyShortRecoveryForm.tsx

import React from 'react';
import { Select } from 'antd';
import { X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, Save, Navigation, Layers, FileText } from 'lucide-react';
import { ModifyShortRecoveryHookReturn } from '../interface/ModifyShortRecoveryInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

const ModifyShortRecoveryForm: React.FC<ModifyShortRecoveryHookReturn> = ({
    formData, updateField, shortRecoveryList, selectedRecord,
    handleSelectRecord, handleSaveAdjustment, handleRefresh, handleExit, wings,
}) => {
  const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const total = shortRecoveryList.length;

    usePageToolbarActions({
        onSave: handleSaveAdjustment,
        saveLabel: 'Save',
    });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Modify Short Recovery')}</h1>
                    <p className="aw-desc">{t('Demand & Recovery')}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleRefresh} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> {t('Refresh')}</button>
                    <button type="button" onClick={handleSaveAdjustment} className="aw-btn aw-btn-primary"><Save size={13} /> {t('Save')}</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Exit')}</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Layers size={14} /></span>
                            <h2 className="aw-card-title">{t('Select Wing')}</h2>
                        </div>
                        <div style={{ maxWidth: 420 }}>
                            <label className="aw-label" htmlFor="msr-wing">{t('Wing')}</label>
                            <Select id="msr-wing" value={(formData.wing || undefined) as string} onChange={(v) => updateField('wing', v)}
                                className="aw-select" popupClassName="aw-select-popup" placeholder={t('Select Wing...')}
                                options={wings.map(w => ({ value: w.id, label: w.name }))} />
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Navigation size={14} /></span>
                            <h2 className="aw-card-title">{t('Navigation')}</h2>
                            <span className="aw-meta" style={{ marginLeft: 'auto' }}>{t('{{1}} record(s)', { 1: total })}</span>
                        </div>
                        <div className="aw-inline" style={{ gap: 6 }}>
                            <button type="button" className="aw-icon-btn" onClick={() => setCurrentIndex(0)} disabled={currentIndex === 0} aria-label={t('First record')} data-tip={t('First')} data-tip-pos="bottom"><ChevronsLeft size={15} /></button>
                            <button type="button" className="aw-icon-btn" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} aria-label={t('Previous record')} data-tip={t('Previous')} data-tip-pos="bottom"><ChevronLeft size={15} /></button>
                            <span className="aw-pill" style={{ minWidth: 96, justifyContent: 'center' }}>{total > 0 ? `${currentIndex + 1} / ${total}` : '—'}</span>
                            <button type="button" className="aw-icon-btn" onClick={() => setCurrentIndex(Math.min(total - 1, currentIndex + 1))} disabled={currentIndex >= total - 1} aria-label={t('Next record')} data-tip={t('Next')} data-tip-pos="bottom"><ChevronRight size={15} /></button>
                            <button type="button" className="aw-icon-btn" onClick={() => setCurrentIndex(total - 1)} disabled={currentIndex >= total - 1} aria-label={t('Last record')} data-tip={t('Last')} data-tip-pos="bottom"><ChevronsRight size={15} /></button>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">{t('Short Recovery Records')}</h2>
                            {selectedRecord && <span className="aw-pill tone-info" style={{ marginLeft: 'auto' }}>{t('Selected:')} {selectedRecord.memberNo}</span>}
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 480px)', minHeight: 180 }}>
                            <table className="aw-table" style={{ minWidth: 820 }}>
                                <thead>
                                    <tr>
                                        <th>{t('Member No')}</th>
                                        <th>{t('Name')}</th>
                                        <th>{t('Type')}</th>
                                        <th className="is-right">{t('Expected')}</th>
                                        <th className="is-right">{t('Recovered')}</th>
                                        <th className="is-right">{t('Shortfall')}</th>
                                        <th className="is-center">{t('Status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shortRecoveryList.length === 0 ? (
                                        <tr><td colSpan={7}><div className="aw-empty" style={{ padding: 28 }}><span className="aw-meta">{t('No records')}</span></div></td></tr>
                                    ) : shortRecoveryList.map(record => (
                                        <tr key={record.id} className="is-clickable" aria-selected={selectedRecord?.id === record.id}
                                            onClick={() => handleSelectRecord(record)}>
                                            <td className="is-accent" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{record.memberNo}</td>
                                            <td style={{ fontWeight: 700, textTransform: 'uppercase' }}>{record.memberName}</td>
                                            <td className="is-muted">{record.recoveryType}</td>
                                            <td className="is-right">{record.expectedAmount.toLocaleString()}</td>
                                            <td className="is-right is-success">{record.recoveredAmount.toLocaleString()}</td>
                                            <td className="is-right is-danger">{record.shortfallAmount.toLocaleString()}</td>
                                            <td className="is-center"><span className={`aw-pill ${record.status === 'Adjusted' ? 'tone-success' : 'tone-warning'}`}>{record.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{t('Recoveries')}</span>
                <span>{t('Supervisor Mode')}</span>
            </div>
        </div>
    );
};

export default ModifyShortRecoveryForm;
