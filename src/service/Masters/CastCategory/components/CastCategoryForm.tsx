// components/CastCategoryForm.tsx

import React from 'react';
import {
    Users, Hash, Save, RotateCcw, X,
    Building2, Edit, Trash2, Tag, Calendar,
} from 'lucide-react';
import dayjs from 'dayjs';
import { CastCategoryHookReturn } from '../interface/CastCategoryInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

const CastCategoryForm: React.FC<CastCategoryHookReturn> = ({
    data,
    categories,
    updateCategoryCode,
    updateCategoryName,
    save,
    reset,
    deleteCategory,
    editCategory
}) => {
  const { t } = useTranslation();
    const handleExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    };

    // Editing an existing row when the current code matches one already in the list; else it's a new entry.
    const isEditing = !!data.categoryCode && categories.some(c => c.categoryCode === data.categoryCode);

    usePageToolbarActions({
        onSave: save,
        saveLabel: 'Save',
    });

    return (
        <div className="app-window">

            {/* Header */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Cast Category Master')}</h1>
                    <p className="aw-desc">{t('Administrative Registry')}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={reset} className="aw-btn aw-btn-secondary" data-tip={t('Clear the form for a new entry')} data-tip-pos="bottom-end">
                        <RotateCcw size={13} /> {t('Reset')}
                    </button>
                    <button type="button" onClick={save} className="aw-btn aw-btn-primary">
                        <Save size={13} /> {t('Save')}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost" data-tip={t('Close this window')} data-tip-pos="bottom-end">
                        <X size={13} /> {t('Exit')}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="aw-content">
                <div className="aw-stack aw-narrow">

                    {/* ── Entry ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Tag size={14} /></span>
                            <h2 className="aw-card-title">{t('Add / Edit Category')}</h2>
                            <span className={`aw-pill ${isEditing ? 'tone-warning' : 'tone-success'}`} style={{ marginLeft: 'auto', textTransform: 'uppercase' }}>
                                {isEditing ? t('Editing #{{1}}', { 1: data.categoryCode }) : t('New Entry')}
                            </span>
                        </div>
                        <div className="aw-two">
                            <div>
                                <label className="aw-label" htmlFor="cc-code">{t('Category Code')}</label>
                                <div className="aw-input-wrap has-icon">
                                    <Hash size={13} />
                                    <input id="cc-code" value={data.categoryCode}
                                        onChange={e => updateCategoryCode(e.target.value)}
                                        inputMode="numeric"
                                        disabled={isEditing}
                                        placeholder={t('Auto (e.g. 5)')}
                                        className="aw-input font-mono" />
                                </div>
                                {isEditing && (
                                    <p className="aw-meta" style={{ marginTop: 4 }}>{t('Code cannot be changed while editing — Reset first to create a new entry.')}</p>
                                )}
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="cc-name">{t('Category Name')}</label>
                                <input id="cc-name" value={data.categoryName}
                                    onChange={e => updateCategoryName(e.target.value)}
                                    placeholder={t('General / OBC / SC / ST…')}
                                    className="aw-input" />
                            </div>
                        </div>
                    </section>

                    {/* ── List ── */}
                    <section className="aw-card aw-main">
                        <div className="aw-main-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <span className="aw-card-icon"><Users size={14} /></span>
                                <h2 className="aw-card-title">{t('Categories')}</h2>
                            </div>
                            {categories.length > 0 && <span className="aw-pill">{t('{{1}} entries', { 1: categories.length })}</span>}
                        </div>
                        <div className="aw-main-body" style={{ padding: 0, maxHeight: 420 }}>
                            {categories.length > 0 ? (
                                <table className="aw-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 110 }}>{t('Code')}</th>
                                            <th>{t('Category Name')}</th>
                                            <th className="is-center" style={{ width: 100 }}>{t('Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map(record => (
                                            <tr key={record.categoryCode}>
                                                <td className="is-accent font-mono">{record.categoryCode}</td>
                                                <td>{record.categoryName}</td>
                                                <td className="is-center">
                                                    <span style={{ display: 'inline-flex', gap: 4 }}>
                                                        <button type="button" onClick={() => editCategory(record)} className="aw-icon-btn is-sm"
                                                            aria-label={t('Edit {{1}}', { 1: record.categoryName })} data-tip={t('Edit')} data-tip-pos="left">
                                                            <Edit size={14} />
                                                        </button>
                                                        <button type="button" onClick={() => deleteCategory(record.categoryCode)} className="aw-icon-btn is-sm is-danger"
                                                            aria-label={t('Delete {{1}}', { 1: record.categoryName })} data-tip={t('Delete')} data-tip-pos="left">
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
                                    <Users size={32} />
                                    <span>{t('No categories yet')}</span>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            </div>

            {/* Footer */}
            <div className="aw-footer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={12} /> {t('Cast Category Registry')}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--aw-accent)' }}><Calendar size={12} /> {dayjs().format('DD-MMM-YY')}</span>
            </div>

        </div>
    );
};

export default CastCategoryForm;
