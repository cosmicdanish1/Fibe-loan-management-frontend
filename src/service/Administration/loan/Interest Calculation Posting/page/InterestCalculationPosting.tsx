import React from 'react';
import { Select, DatePicker } from 'antd';
import {
  Calculator, FileText, Send, RefreshCw, Search, RotateCcw, TrendingUp, Database, X,
} from 'lucide-react';
import dayjs from 'dayjs';
import MemberLookupDialog from '@/components/shared/kit/MemberLookupDialog';
import DataTable from '../components/DataTable';
import { useInterestCalculation } from '../hooks/useInterestCalculation';
import { interestCalculationOptions, accountTypeOptions } from '../constants/options';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const InterestCalculationPosting: React.FC = () => {
  const {
    formData,
    memberRecords,
    isLoading,
    handleInputChange,
    handleMemberLookup,
    handlePrintList,
    handlePost,
    resetForm,
    isLookupOpen,
    setIsLookupOpen,
    handleMemberSelect,
  } = useInterestCalculation();

  const isYearly = formData.calcInterestFor === 'yearly_fund_process';
  const isSpecific = formData.calcInterestFor === 'specific_member';
  const postDisabled = memberRecords.length === 0 || isLoading;

  usePageToolbarActions({
    onSave: handlePost,
    saveLabel: 'Post Transaction',
    saveEnabled: !postDisabled,
  });

  const glHead =
    formData.accountType === 'SB' ? 'A1001 — Savings' :
    formData.accountType === 'RD' ? 'A1002 — Recurring' : 'A1003 — Fixed Deposit';

  const totals = {
    principal: memberRecords.reduce((s, r) => s + r.balance, 0),
    interest: memberRecords.reduce((s, r) => s + r.interest, 0),
    debit: memberRecords.reduce((s, r) => s + r.debit, 0),
    credit: memberRecords.reduce((s, r) => s + r.credit, 0),
  };

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Interest Calculation &amp; Posting</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calculator size={12} /> Daily Balance Method · Ledger Auto-Post
            <span className="aw-pill" style={{ marginLeft: 4 }}>v3.0</span>
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={resetForm} className="aw-btn aw-btn-secondary">
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={handlePost} disabled={postDisabled} className="aw-btn aw-btn-primary">
            {isLoading ? <RefreshCw size={13} className="aw-spin" /> : <Send size={13} />}
            Post Transaction
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.electronAPI?.ipcRenderer) {
                window.electronAPI.ipcRenderer.send('window-close');
              } else {
                window.close();
              }
            }}
            className="aw-btn aw-btn-ghost"
          >
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          <div className="aw-split aw-split-wide" style={{ height: 'auto', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)' }}>
            {/* ── Calculation scope ── */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Calculator size={14} /></span>
                <h2 className="aw-card-title">Calculation Scope</h2>
              </div>
              <div className="aw-form-3">
                <div>
                  <label className="aw-label" htmlFor="ic-type">Interest Type</label>
                  <Select
                    id="ic-type"
                    className="aw-select"
                    popupClassName="aw-select-popup"
                    value={formData.calcInterestFor}
                    onChange={(v) => handleInputChange('calcInterestFor', v)}
                    options={interestCalculationOptions.map(o => ({ value: o.id, label: o.name }))}
                  />
                </div>

                <div>
                  <label className="aw-label" htmlFor="ic-acc">Account Type</label>
                  <Select
                    id="ic-acc"
                    className="aw-select"
                    popupClassName="aw-select-popup"
                    value={formData.accountType}
                    onChange={(v) => handleInputChange('accountType', v)}
                    options={accountTypeOptions.map(o => ({ value: o.id, label: o.name }))}
                  />
                </div>

                {/* Interest Rate — hidden for yearly fund */}
                {!isYearly ? (
                  <div>
                    <label className="aw-label" htmlFor="ic-rate">Annual Rate (%)</label>
                    <input
                      id="ic-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      value={formData.interestRate}
                      onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value))}
                      className="aw-input"
                    />
                  </div>
                ) : (
                  <div>
                    <span className="aw-label">Annual Rate</span>
                    <div className="aw-panel aw-panel-accent" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 'var(--aw-control-h)', padding: '0 10px' }}>
                      <TrendingUp size={13} style={{ color: 'var(--aw-accent)' }} />
                      <span className="aw-strong">Rate from Business Rules</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="aw-label" htmlFor="ic-from">{isYearly ? 'FY Start Date' : 'From Date'}</label>
                  <DatePicker
                    id="ic-from"
                    value={dayjs(formData.fromDate)}
                    onChange={(date) => handleInputChange('fromDate', date ? date.format('YYYY-MM-DD') : '')}
                    format="DD-MMM-YYYY"
                    className="aw-picker"
                    popupClassName="aw-select-popup"
                    allowClear={false}
                  />
                </div>

                <div>
                  <label className="aw-label" htmlFor="ic-to">{isYearly ? 'FY End Date' : 'To Date'}</label>
                  <DatePicker
                    id="ic-to"
                    value={dayjs(formData.toDate)}
                    onChange={(date) => handleInputChange('toDate', date ? date.format('YYYY-MM-DD') : '')}
                    format="DD-MMM-YYYY"
                    className="aw-picker"
                    popupClassName="aw-select-popup"
                    allowClear={false}
                  />
                </div>

                {/* Member No — only for specific_member */}
                {isSpecific ? (
                  <div>
                    <label className="aw-label" htmlFor="ic-member">Member Number</label>
                    <div className="aw-input-wrap has-action">
                      <input
                        id="ic-member"
                        type="text"
                        value={formData.memberNo}
                        onChange={(e) => handleInputChange('memberNo', e.target.value)}
                        placeholder="Enter MBNO"
                        className="aw-input"
                      />
                      <button
                        type="button"
                        className="aw-input-action"
                        onClick={handleMemberLookup}
                        aria-label="Look up member"
                        data-tip="Look up member"
                        data-tip-pos="top-end"
                      >
                        <Search size={13} />
                      </button>
                    </div>
                    {formData.memberName && (
                      <p className="aw-strong aw-fade-in" style={{ marginTop: 6, color: 'var(--aw-accent)' }}>{formData.memberName}</p>
                    )}
                  </div>
                ) : isYearly ? (
                  <div>
                    <span className="aw-label">Applies</span>
                    <p className="aw-meta">Opening Balance Interest · Monthly Contribution · Dividend &amp; Group Insurance Deduction</p>
                  </div>
                ) : (
                  <div>
                    <span className="aw-label">Members</span>
                    <span className="aw-pill tone-success">Processing all eligible members</span>
                  </div>
                )}
              </div>
            </section>

            {/* ── Actions ── */}
            <section className="aw-card" style={{ alignSelf: 'start' }}>
              <div className="aw-card-head">
                <span className="aw-card-icon"><Database size={14} /></span>
                <h2 className="aw-card-title">Actions</h2>
              </div>
              <div className="aw-stack">
                <dl className="aw-facts" style={{ gridTemplateColumns: '1fr' }}>
                  <div><dt>GL Head</dt><dd style={{ color: 'var(--aw-success)' }}>{glHead}</dd></div>
                </dl>
                <button type="button" onClick={handlePrintList} disabled={isLoading} className="aw-btn aw-btn-secondary" style={{ width: '100%' }}>
                  {isLoading ? <RefreshCw size={13} className="aw-spin" /> : <FileText size={13} />}
                  Preview Interest List
                </button>
                <p className="aw-meta" style={{ textAlign: 'center' }}>Preview records · then click Post Transaction</p>
              </div>
            </section>
          </div>

          {/* ── Preview records ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Database size={14} /></span>
              <h2 className="aw-card-title">Interest Preview Records</h2>
              {memberRecords.length > 0 && <span className="aw-pill">{memberRecords.length} Records</span>}
              {isLoading && (
                <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={12} className="aw-spin" /> Processing...
                </span>
              )}
            </div>

            {memberRecords.length > 0 && (
              <div className="aw-stats aw-fade-in" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 'var(--aw-gap)' }}>
                <div className="aw-stat"><div className="aw-stat-label">Principal</div><div className="aw-stat-value">{inr(totals.principal)}</div></div>
                <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-info)' }}><div className="aw-stat-label">Interest</div><div className="aw-stat-value">{inr(totals.interest)}</div></div>
                <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-danger)' }}><div className="aw-stat-label">Debit</div><div className="aw-stat-value">{inr(totals.debit)}</div></div>
                <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-success)' }}><div className="aw-stat-label">Credit</div><div className="aw-stat-value">{inr(totals.credit)}</div></div>
              </div>
            )}

            {memberRecords.length > 0 ? (
              <DataTable data={memberRecords} />
            ) : !isLoading ? (
              <div className="aw-empty" style={{ padding: 32 }}>
                <Search size={26} />
                <strong className="aw-strong">No records loaded</strong>
                <span className="aw-meta">Set parameters and click Preview Interest List</span>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <MemberLookupDialog open={isLookupOpen} onClose={() => setIsLookupOpen(false)} onSelect={handleMemberSelect} />
    </div>
  );
};

export default InterestCalculationPosting;
