import React, { useState } from 'react';
import { Select } from 'antd';
import { Calculator, CheckCircle2, Camera, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
import { useDividendCalculation } from '../hooks/useDividendCalculation';
import { useTranslation } from 'react-i18next';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DividendCalculation: React.FC = () => {
  const { t } = useTranslation();
    const {
        yearcode, setYearcode, dividendRate, setDividendRate, rateRules,
        preview, loading, committing, commitResult, error,
        loadPreview, commit,
        snapMonth, setSnapMonth, snapYear, setSnapYear, snapshotting, snapshotMessage, captureSnapshot,
    } = useDividendCalculation();
    const [showConfirm, setShowConfirm] = useState(false);

    const totalDividend = preview ? preview.members.reduce((sum, m) => sum + m.dividendAmount, 0) : 0;
    const incompleteCount = preview ? preview.members.filter((m) => m.monthsFound < m.monthsExpected).length : 0;

    return (
        <div className="app-window">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Dividend Calculation')}</h1>
                    <p className="aw-desc">{t('Total Product × Approved Rate ÷ 1200 — writes dividend_master only, never touches Share Value')}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={() => loadPreview()} disabled={loading} className="aw-btn aw-btn-secondary">
                        {loading ? <RefreshCw size={13} className="aw-spin" /> : <Calculator size={13} />}
                        {loading ? t('Calculating…') : t('Preview')}
                    </button>
                    {preview && preview.members.length > 0 && (
                        <button type="button" onClick={() => setShowConfirm(true)} disabled={committing} className="aw-btn aw-btn-primary aw-fade-in">
                            {committing ? <RefreshCw size={13} className="aw-spin" /> : <CheckCircle2 size={13} />}
                            {committing ? t('Committing…') : t('Commit for {{1}} member(s)', { 1: preview.members.length })}
                        </button>
                    )}
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    {/* ── Monthly snapshot capture ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon" style={{ color: 'var(--aw-warning)' }}><Camera size={14} /></span>
                            <div>
                                <h2 className="aw-card-title">{t('Monthly Snapshot')}</h2>
                                <p className="aw-meta">{t("Capture this month's Share Capital snapshot (run once per month)")}</p>
                            </div>
                        </div>
                        <div className="aw-inline" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
                            <div style={{ width: 120 }}>
                                <label className="aw-label" htmlFor="dc-month">{t('Month')}</label>
                                <Select
                                    id="dc-month"
                                    className="aw-select"
                                    popupClassName="aw-select-popup"
                                    value={snapMonth}
                                    onChange={(v) => setSnapMonth(Number(v))}
                                    options={MONTH_NAMES.slice(1).map((m, i) => ({ value: i + 1, label: m }))}
                                />
                            </div>
                            <div style={{ width: 110 }}>
                                <label className="aw-label" htmlFor="dc-year">{t('Year')}</label>
                                <input id="dc-year" type="number" value={snapYear} onChange={(e) => setSnapYear(Number(e.target.value))} className="aw-input" />
                            </div>
                            <button type="button" onClick={captureSnapshot} disabled={snapshotting} className="aw-btn aw-btn-secondary">
                                {snapshotting ? <RefreshCw size={13} className="aw-spin" /> : <Camera size={13} />}
                                {snapshotting ? t('Capturing…') : t('Capture Snapshot')}
                            </button>
                            {snapshotMessage && <span className="aw-meta aw-fade-in" style={{ color: 'var(--aw-warning)', fontWeight: 700 }}>{snapshotMessage}</span>}
                        </div>
                    </section>

                    {/* ── Calculation controls ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Calculator size={14} /></span>
                            <h2 className="aw-card-title">{t('Calculation')}</h2>
                        </div>
                        <div className="aw-inline" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
                            <div style={{ width: 140 }}>
                                <label className="aw-label" htmlFor="dc-yearcode">{t('Year Code')}</label>
                                <input id="dc-yearcode" type="number" value={yearcode} onChange={(e) => setYearcode(Number(e.target.value))} className="aw-input" />
                            </div>
                            <div style={{ width: 160 }}>
                                <label className="aw-label" htmlFor="dc-rate">{t('Dividend Rate (%)')}</label>
                                <input id="dc-rate" type="number" value={dividendRate ?? ''} min={rateRules?.min.active ? rateRules.min.value : 0} max={rateRules?.max.active ? rateRules.max.value : 100} step="any" disabled={!!rateRules?.fixed.active} onChange={(e) => setDividendRate(e.target.value.trim() === '' ? null : Number(e.target.value))} className="aw-input" />
                                {rateRules && (rateRules.fixed.active || rateRules.min.active || rateRules.max.active) && (
                                    <span className="aw-meta">
                                        {rateRules.fixed.active
                                            ? t('Fixed at') + ` ${rateRules.fixed.value}% ` + t('in Business Rules')
                                            : [rateRules.min.active ? t('Minimum') + ` ${rateRules.min.value}%` : '', rateRules.max.active ? t('Maximum') + ` ${rateRules.max.value}%` : ''].filter(Boolean).join(' · ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </section>

                    {error && (
                        <div className="aw-alert aw-alert-danger aw-fade-in" style={{ marginBottom: 0 }} role="alert">
                            <AlertCircle size={15} /><span>{error}</span>
                        </div>
                    )}

                    {commitResult && (
                        <div className="aw-alert aw-alert-success aw-fade-in" style={{ marginBottom: 0 }} role="status">
                            <CheckCircle2 size={15} />
                            <span>{t('Committed dividend calculation for FY')} {commitResult.calculationYear} — {commitResult.membersCommitted} {t("member(s). Not yet credited to Share Value (that happens at the following year's close).")}</span>
                        </div>
                    )}

                    {/* ── Results ── */}
                    {!preview ? (
                        <section className="aw-card">
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <Calculator size={28} />
                                <strong className="aw-strong">{t('Set a year code and rate, then click Preview.')}</strong>
                            </div>
                        </section>
                    ) : preview.members.length === 0 ? (
                        <section className="aw-card">
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <Camera size={28} />
                                <strong className="aw-strong">{t('No Share Capital snapshots found for FY')} {preview.calculationYear}-{String(preview.calculationYear + 1).slice(2)}.</strong>
                                <span className="aw-meta">{t('Capture at least one month above first.')}</span>
                            </div>
                        </section>
                    ) : (
                        <>
                            <div className="aw-stats aw-stats-3 aw-fade-in">
                                <div className="aw-stat aw-stat-left">
                                    <div className="aw-stat-label">{t('Calculation Year')}</div>
                                    <div className="aw-stat-value">{preview.calculationYear}</div>
                                </div>
                                <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-info)' }}>
                                    <div className="aw-stat-label">{t('Members')}</div>
                                    <div className="aw-stat-value">{preview.members.length}</div>
                                </div>
                                <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-success)' }}>
                                    <div className="aw-stat-label">{t('Total Dividend')}</div>
                                    <div className="aw-stat-value">₹{fmt(totalDividend)}</div>
                                </div>
                            </div>

                            {incompleteCount > 0 && (
                                <div className="aw-alert aw-alert-warning aw-fade-in" style={{ marginBottom: 0 }}>
                                    <AlertCircle size={15} />
                                    <span>{incompleteCount} {t('member(s) missing month(s) — Total Product may be understated')}</span>
                                </div>
                            )}

                            <section className="aw-card aw-fade-in">
                                <div className="aw-table-wrap" style={{ maxHeight: '50vh' }}>
                                    <table className="aw-table">
                                        <thead>
                                            <tr>
                                                <th>{t('Member')}</th>
                                                <th className="is-right">{t('Total Product')}</th>
                                                <th className="is-right">{t('Months')}</th>
                                                <th className="is-right">{t('Rate')}</th>
                                                <th className="is-right">{t('Dividend Amount')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.members.map((m) => {
                                                const incomplete = m.monthsFound < m.monthsExpected;
                                                return (
                                                    <tr key={m.mbno}>
                                                        <td>
                                                            <span className="is-accent" style={{ color: 'var(--aw-accent)', fontWeight: 700 }}>{m.mbno}</span>
                                                            {m.memberName && <span className="aw-meta">{m.memberName}</span>}
                                                        </td>
                                                        <td className="is-right">₹{fmt(m.totalProduct)}</td>
                                                        <td className={`is-right ${incomplete ? 'is-warning' : ''}`}>{m.monthsFound} / {m.monthsExpected}</td>
                                                        <td className="is-right is-muted">{m.dividendRate}%</td>
                                                        <td className="is-right is-success">₹{fmt(m.dividendAmount)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>

            <div className="aw-footer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Calculator size={12} /> {t("Committing here only records the calculation — crediting it into member Share Value is a separate step (Dividend Credit), run at the following year's close.")}
                </span>
            </div>
            <AwDialog
                open={showConfirm}
                title={t('Confirm dividend calculation commit')}
                icon={<AlertTriangle size={14} />}
                onClose={() => setShowConfirm(false)}
                maxWidth="28rem"
                compact
            >
                <div className="aw-stack">
                    <p className="aw-meta" style={{ lineHeight: 1.6 }}>
                        <AlertTriangle size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4, color: 'var(--aw-warning)' }} />
                        {t('This records the dividend calculation for FY')} {preview?.calculationYear} at {preview?.dividendRatePercent}% - {preview?.members.length ?? 0} member(s), total ₹{fmt(totalDividend)} - into the dividend register. Please confirm the rate and year are correct.
                    </p>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setShowConfirm(false)} className="aw-btn aw-btn-secondary">{t('Cancel')}</button>
                        <button type="button" onClick={() => { setShowConfirm(false); commit(); }} className="aw-btn aw-btn-primary">{t('Yes, Commit')}</button>
                    </div>
                </div>
            </AwDialog>
        </div>
    );
};

export default DividendCalculation;
