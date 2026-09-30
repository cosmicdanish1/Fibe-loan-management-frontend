// components/DesignationForm.tsx

import React from 'react';
import {
    Briefcase, Hash, Save, RotateCcw, X,
    Building2, Layers, Calendar, Edit, Trash2,
} from 'lucide-react';
import dayjs from 'dayjs';
import { DesignationHookReturn } from '../interfaces/interface';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

const DesignationForm: React.FC<DesignationHookReturn> = ({
    formData,
    designations,
    isExisting,
    handleChange,
    editDesignation,
    deleteDesignation,
    handleSave,
    handleCancel,
    handleExit
}) => {
    const onExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        } else {
            handleExit();
        }
    };

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: 'Save',
    });

    return (
        <div className="app-window">

            {/* Header */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Designation Master</h1>
                    <p className="aw-desc">Organizational Hierarchy</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleCancel} className="aw-btn aw-btn-secondary" data-tip="Clear the form for a new entry" data-tip-pos="bottom-end">
                        <RotateCcw size={13} /> Reset
                    </button>
                    <button type="button" onClick={handleSave} className="aw-btn aw-btn-primary">
                        <Save size={13} /> Save
                    </button>
                    <button type="button" onClick={onExit} className="aw-btn aw-btn-ghost" data-tip="Close this window" data-tip-pos="bottom-end">
                        <X size={13} /> Exit
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="aw-content">
                <div className="aw-stack aw-narrow">

                    {/* ── Designation Entry ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Briefcase size={14} /></span>
                            <h2 className="aw-card-title">Designation Details</h2>
                            <span className={`aw-pill ${isExisting ? 'tone-warning' : 'tone-success'}`} style={{ marginLeft: 'auto', textTransform: 'uppercase' }}>
                                {isExisting ? `Editing ${formData.code}` : 'New Entry'}
                            </span>
                        </div>
                        <div className="aw-stack">

                            <div className="aw-two">
                                <div>
                                    <label className="aw-label" htmlFor="dm-code">Designation Code</label>
                                    <div className="aw-input-wrap has-icon">
                                        <Hash size={13} />
                                        <input id="dm-code" value={formData.code}
                                            onChange={e => handleChange('code', e.target.value)}
                                            placeholder="e.g. DES011"
                                            className="aw-input font-mono" />
                                    </div>
                                </div>
                                <div>
                                    <label className="aw-label" htmlFor="dm-level">Hierarchical Level</label>
                                    <div className="aw-input-wrap has-icon">
                                        <Layers size={13} />
                                        <input id="dm-level" value={formData.level}
                                            onChange={e => handleChange('level', e.target.value)}
                                            inputMode="numeric"
                                            placeholder="e.g. 1, 2, 3…"
                                            className="aw-input" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="aw-label" htmlFor="dm-name">Designation Name</label>
                                <div className="aw-input-wrap has-icon">
                                    <Briefcase size={13} />
                                    <input id="dm-name" value={formData.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        placeholder="e.g. Senior Executive Officer"
                                        className="aw-input" />
                                </div>
                            </div>

                        </div>
                    </section>

                    {/* ── List ── */}
                    <section className="aw-card aw-main">
                        <div className="aw-main-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <span className="aw-card-icon"><Building2 size={14} /></span>
                                <h2 className="aw-card-title">Designations</h2>
                            </div>
                            {designations.length > 0 && <span className="aw-pill">{designations.length} entries</span>}
                        </div>
                        <div className="aw-main-body" style={{ padding: 0, maxHeight: 360 }}>
                            {designations.length > 0 ? (
                                <table className="aw-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 120 }}>Code</th>
                                            <th>Designation Name</th>
                                            <th className="is-center" style={{ width: 80 }}>Level</th>
                                            <th className="is-center" style={{ width: 100 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {designations.map(record => (
                                            <tr key={record.code}>
                                                <td className="is-accent font-mono">{record.code}</td>
                                                <td>{record.name || <span className="aw-meta" style={{ fontStyle: 'italic' }}>— unnamed —</span>}</td>
                                                <td className="is-center is-muted">{record.level || '—'}</td>
                                                <td className="is-center">
                                                    <span style={{ display: 'inline-flex', gap: 4 }}>
                                                        <button type="button" onClick={() => editDesignation(record)} className="aw-icon-btn is-sm"
                                                            aria-label={`Edit ${record.name || record.code}`} data-tip="Edit" data-tip-pos="left">
                                                            <Edit size={14} />
                                                        </button>
                                                        <button type="button" onClick={() => deleteDesignation(record.code)} className="aw-icon-btn is-sm is-danger"
                                                            aria-label={`Delete ${record.name || record.code}`} data-tip="Delete" data-tip-pos="left">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="aw-empty">
                                    <Briefcase size={32} />
                                    <span>No designations yet</span>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            </div>

            {/* Footer */}
            <div className="aw-footer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={12} /> Designation Registry
                    {formData.name && <span style={{ color: 'var(--aw-accent)' }}>· {formData.name}</span>}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--aw-accent)' }}><Calendar size={12} /> {dayjs().format('DD-MMM-YY')}</span>
            </div>

        </div>
    );
};

export default DesignationForm;
