// hook/useImportDemandList.ts

import { useState, useCallback, useEffect } from 'react';
import {
    ImportConfig,
    DemandListItem,
    BranchOption,
    ImportDemandListHookReturn,
} from '../interface/ImportDemandListInterfaces';
import { getApiBaseUrl } from '../../../../../services/serverConfig';

const showDialog = async (
    type: 'info' | 'warning' | 'error',
    title: string,
    msg: string,
    detail: string,
) => {
    if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({
            type, title, message: msg, detail, buttons: ['OK'], defaultId: 0,
        });
    } else {
        alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`);
    }
};

const currentMonth = new Date().toLocaleString('default', { month: 'short' }).toUpperCase();

export const useImportDemandList = (): ImportDemandListHookReturn => {
    const [importConfig, setImportConfig] = useState<ImportConfig>({
        divisionRO: 'BHILAI',
        branch: '',
        monthStr: currentMonth,
        yearStr: new Date().getFullYear().toString(),
    });

    const [previewData, setPreviewData] = useState<DemandListItem[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
        (async () => {
            try {
                const base = await getApiBaseUrl();
                const token = localStorage.getItem('accessToken');
                const resp = await fetch(`${base}/admin/offices`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (resp.ok) {
                    const result = await resp.json();
                    const offices = Array.isArray(result) ? result : (result.data || []);
                    setBranches(offices.map((o: any) => ({
                        officeno: o.officeno || o.officeId,
                        office_name: o.office_name || o.officeName || '',
                        division: o.division || '',
                    })));
                }
            } catch (e) {
                console.error('Failed to fetch branches:', e);
            }
        })();
    }, []);

    const updateConfig = useCallback((field: keyof ImportConfig, value: any) => {
        setImportConfig(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleImport = useCallback(() => {
        if (!importConfig.monthStr) {
            showDialog('warning', 'electron-react-ts', 'Month Required', 'Please select a month.');
            return;
        }
        if (!importConfig.yearStr) {
            showDialog('warning', 'electron-react-ts', 'Year Required', 'Please select a year.');
            return;
        }

        // Trigger native file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        input.onchange = async (e: any) => {
            const file = e.target?.files?.[0];
            if (!file) return;

            setIsImporting(true);
            setPreviewData([]);

            try {
                const base = await getApiBaseUrl();
                const token = localStorage.getItem('accessToken');
                const formData = new FormData();
                formData.append('file', file);
                formData.append('month', importConfig.monthStr);
                formData.append('year', importConfig.yearStr);
                formData.append('branch', importConfig.branch);

                const resp = await fetch(`${base}/transactions/demand-generation/import-preview`, {
                    method: 'POST',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: formData,
                });

                if (!resp.ok) {
                    const errText = await resp.text();
                    throw new Error(errText);
                }

                const result = await resp.json();
                const payload = result.data || result;
                const rows: DemandListItem[] = payload.rows || (Array.isArray(payload) ? payload : []);
                const summary = payload.summary || {};
                const warnings: string[] = payload.validationErrors || [];
                setPreviewData(rows);

                if (rows.length === 0) {
                    await showDialog('warning', 'electron-react-ts', 'No Records', 'The file did not contain any valid demand records.\n\nMake sure the sheet has column headers like S.NO., YYMM, CODE, MS.NO., PS.NO., NAME, TOTAL, R/D, R/LOAN, E/LOAN, INTT.');
                } else {
                    const msg =
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `SHEET         : ${summary.sheetName || '—'}\n` +
                        `TOTAL RECORDS : ${summary.total || rows.length}\n` +
                        `VALID         : ${summary.valid ?? rows.filter((r: any) => r.status === 'Valid').length}\n` +
                        `ERRORS        : ${summary.errors ?? rows.filter((r: any) => r.status === 'Error').length}\n` +
                        `COLUMNS       : ${(summary.columns || []).join(', ') || '—'}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` +
                        (warnings.length > 0 ? `\n\n⚠ WARNINGS:\n${warnings.map((w: string) => `• ${w}`).join('\n')}` : '');

                    await showDialog(
                        warnings.length > 0 ? 'warning' : 'info',
                        'electron-react-ts',
                        `Import Preview — ${rows.length} Records Loaded`,
                        msg
                    );
                }
            } catch (err: any) {
                console.error('Import failed:', err);
                let msg = err.message || 'Unknown error';
                try { msg = JSON.parse(msg)?.message || msg; } catch {}
                await showDialog('error', 'electron-react-ts', 'Import Failed', msg);
            } finally {
                setIsImporting(false);
            }
        };
        input.click();
    }, [importConfig]);

    const handleSave = useCallback(async () => {
        if (previewData.length === 0) {
            await showDialog('warning', 'electron-react-ts', 'No Data', 'Please import a file first before saving.');
            return;
        }

        const validRows = previewData.filter(r => r.status === 'Valid');
        if (validRows.length === 0) {
            await showDialog('warning', 'electron-react-ts', 'No Valid Records', 'All records have errors. Cannot save.');
            return;
        }

        setIsSaving(true);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const resp = await fetch(`${base}/transactions/demand-generation/import-process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    month: importConfig.monthStr,
                    year: importConfig.yearStr,
                    branch: importConfig.branch,
                    data: validRows,
                }),
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(errText);
            }

            const result = await resp.json();
            const data = result.data || result;

            if (data.success === false) {
                await showDialog('warning', 'electron-react-ts', 'Import Warning', data.message || 'Records already exist.');
                return;
            }

            const skippedMsg = data.skipped > 0 ? `\nSKIPPED       : ${data.skipped} (already exist)\n` : '';

            await showDialog(
                'info',
                'electron-react-ts',
                'Demand Saved Successfully!',
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `MONTH         : ${importConfig.monthStr}\n` +
                `YEAR          : ${importConfig.yearStr}\n` +
                `BRANCH        : ${importConfig.branch || 'All'}\n` +
                `RECORDS SAVED : ${data.recordCount || validRows.length}\n` +
                skippedMsg +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `✓ Saved to demand_master (pending posting)\n` +
                `➜ Go to 'Updation / Ledger Posting' to post`
            );
        } catch (err: any) {
            console.error('Save failed:', err);
            let msg = err.message || 'Unknown error';
            try { msg = JSON.parse(msg)?.message || msg; } catch {}
            await showDialog('error', 'electron-react-ts', 'Save Failed', msg);
        } finally {
            setIsSaving(false);
        }
    }, [previewData, importConfig]);

    const handleClear = useCallback(() => {
        setPreviewData([]);
        setImportConfig(prev => ({ ...prev, branch: '' }));
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, []);

    return {
        importConfig,
        previewData,
        branches,
        isImporting,
        isSaving,
        recordCount: previewData.length,
        updateConfig,
        handleImport,
        handleSave,
        handleClear,
        handleExit,
    };
};
