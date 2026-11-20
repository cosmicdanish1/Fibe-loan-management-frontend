// hook/useImportDemandList.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    ImportConfig,
    DemandListItem,
    BranchOption,
    ImportDemandListHookReturn,
} from '../interface/ImportDemandListInterfaces';
import { getApiBaseUrl } from '../../../../../services/serverConfig';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog } from '@/utils/dialog';

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const currentMonth = MONTH_ABBR[new Date().getMonth()] as string;

export const useImportDemandList = (): ImportDemandListHookReturn => {
  const { t } = useTranslation();
    const [importConfig, setImportConfig] = useState<ImportConfig>({
        divisionRO: 'BHILAI',
        branch: '',
        monthStr: currentMonth,
        yearStr: new Date().getFullYear().toString(),
    });

    const [previewData, setPreviewData] = useState<DemandListItem[]>([]);
    // the name of the imported file, sent with the save so the import log can show where each row came from (ES-588)
    const [fileName, setFileName] = useState('');
    // ES-591: the strictness from Modify Business Rules, as the server reported it with the last preview. STRICT until known.
    const [strictness, setStrictness] = useState<'STRICT' | 'STANDARD'>('STRICT');
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const savingRef = useRef(false);
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
        // The preview belongs to the month/year/branch it was imported for - drop it when those change
        if (field === 'monthStr' || field === 'yearStr' || field === 'branch') {
            setPreviewData([]);
        }
    }, []);

    const handleImport = useCallback(() => {
        if (!importConfig.monthStr) {
            showDialog('warning', 'electron-react-ts', t('Month Required'), t('Please select a month.'));
            return;
        }
        if (!importConfig.yearStr) {
            showDialog('warning', 'electron-react-ts', t('Year Required'), t('Please select a year.'));
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
            setFileName(file.name || '');

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
                setStrictness(summary.strictness === 'STANDARD' ? 'STANDARD' : 'STRICT');
                const warnings: string[] = payload.validationErrors || [];
                setPreviewData(rows);

                if (rows.length === 0) {
                    await showDialog('warning', 'electron-react-ts', t('No Records'), t('The file did not contain any valid demand records. Make sure the sheet has column headers like H.O.NO. (or MS.NO.), PS.NO., NAME, TOTAL, F/D (or R/D), R/LOAN, E/LOAN, INTT, F.R.S.-1, F.R.S.-2.'));
                } else {
                    const by = summary.matchedBy || {};
                    const msg =
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `SHEET         : ${summary.sheetName || '—'}\n` +
                        `TOTAL RECORDS : ${summary.total || rows.length}\n` +
                        `VALID         : ${summary.valid ?? rows.filter((r: any) => r.status === 'Valid').length}\n` +
                        `ERRORS        : ${summary.errors ?? rows.filter((r: any) => r.status === 'Error').length}\n` +
                        ((by.HONO || by.MEMBER_NO) ? `MEMBER FOUND BY: H.O.NO. ${by.HONO || 0}, MS.NO. ${by.MEMBER_NO || 0}\n` : '') +
                        (rows.some((r: any) => r.warnings?.length) ? `CHECK NAME/PS.NO.: ${rows.filter((r: any) => r.warnings?.length).length} row(s), see the Check column\n` : '') +
                        (summary.flagged > 0 ? `NEED CHECKING : ${summary.flagged} (possible old EMI / new EMI mix-up)\n` : '') +
                        `COLUMNS       : ${(summary.columns || []).join(', ') || '—'}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` +
                        (warnings.length > 0 ? `\n\n⚠ WARNINGS:\n${warnings.map((w: string) => `• ${w}`).join('\n')}` : '') +
                        (summary.flagged > 0
                            ? `\n\n⚠ PLEASE CHECK (first 8):\n${rows.filter((r: any) => r.flags?.length).slice(0, 8).map((r: any) => `• Member ${r.memberId}: ${r.flags[0].message}`).join('\n')}`
                            : '') +
                        (summary.errors > 0 ? `\n\nRows with an error are not saved. For a member that was not found you can pick one of the suggested members in the Status column.` : '');

                    await showDialog(
                        (warnings.length > 0 || summary.flagged > 0) ? 'warning' : 'info',
                        'electron-react-ts',
                        t('Import Preview — {{1}} Records Loaded', { 1: rows.length }),
                        msg
                    );
                }
            } catch (err: any) {
                console.error('Import failed:', err);
                let msg = err.message || 'Unknown error';
                try { msg = JSON.parse(msg)?.message || msg; } catch {}
                await showDialog('error', 'electron-react-ts', t('Import Failed'), msg);
            } finally {
                setIsImporting(false);
            }
        };
        input.click();
    }, [importConfig]);

    // ES-591: STRICT = a file with any problem (an error row, or a name / PS.NO. that differs from the member's) is not saved at all
    const strictProblemRows = previewData.filter(r => r.status === 'Error' || (r.strictIssues?.length ?? 0) > 0);
    const saveBlockedReason = strictness === 'STRICT' && strictProblemRows.length > 0
        ? `Strict mode (Modify Business Rules): ${strictProblemRows.length} row(s) have a problem, so nothing can be saved. ` +
          `Fix the file and import it again, or pick the right member in the Status column.\n\n` +
          strictProblemRows.slice(0, 8).map(r => `• Row ${r.rowNo ?? '?'}: ${r.status === 'Error' ? (r.remarks || 'error') : (r.strictIssues || []).join('; ')}`).join('\n') +
          (strictProblemRows.length > 8 ? `\n• ... and ${strictProblemRows.length - 8} more` : '')
        : '';

    // STANDARD: rows with an error are skipped; ask before doing that. Native dialog: Modal.confirm does not run in Electron.
    const confirmSkip = async (count: number): Promise<boolean> => {
        const title = t('{{1}} row(s) have an error and will be skipped', { 1: count });
        const detail = t('The other rows are saved. The skipped rows and their reasons are kept in the import log.');
        if ((window as any).electronAPI?.showMessageBox) {
            const result = await (window as any).electronAPI.showMessageBox({
                type: 'question', title: t('Confirm'), message: title, detail,
                buttons: [t('Save the rest'), t('Cancel')], defaultId: 1, cancelId: 1,
            });
            return result?.response === 0;
        }
        return window.confirm(`${title}\n\n${detail}`);
    };

    const handleSave = useCallback(async () => {
        if (savingRef.current) return;
        if (previewData.length === 0) {
            await showDialog('warning', 'electron-react-ts', t('No Data'), t('Please import a file first before saving.'));
            return;
        }

        // ES-591: in STRICT mode a file with a problem cannot be saved at all (the server refuses it as well)
        if (saveBlockedReason) {
            await showDialog('warning', 'electron-react-ts', t('Cannot Save (Strict)'), saveBlockedReason);
            return;
        }
        const errorRowCount = previewData.filter(r => r.status === 'Error').length;
        if (errorRowCount > 0 && !(await confirmSkip(errorRowCount))) return;

        const validRows = previewData.filter(r => r.status === 'Valid');
        if (validRows.length === 0) {
            await showDialog('warning', 'electron-react-ts', t('No Valid Records'), t('All records have errors. Cannot save.'));
            return;
        }

        savingRef.current = true;
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
                    fileName,
                    // every row goes to the server: rows with an error are skipped there and recorded with the reason (ES-588)
                    data: previewData,
                }),
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(errText);
            }

            const result = await resp.json();
            const data = result.data || result;

            if (data.success === false) {
                await showDialog('warning', 'electron-react-ts', t('Import Warning'), data.message || t('Records already exist.'));
                return;
            }

            const skippedList: Array<{ rowNo?: number; memberId: string; reason: string }> = data.skippedDetails || [];
            const skippedMsg = (data.skipped > 0
                    ? `\nSKIPPED       : ${data.skipped}\n${skippedList.slice(0, 8).map(s => `• Row ${s.rowNo ?? '?'}${s.memberId ? ` (member ${s.memberId})` : ''}: ${s.reason}`).join('\n')}${data.skipped > 8 ? `\n• ... and ${data.skipped - 8} more (all are in the import log)` : ''}\n`
                    : '')
                + (data.flagged > 0 ? `\nNEED CHECKING : ${data.flagged} row(s) flagged - see the Loan Position notices on Loan Repayment\n` : '');

            await showDialog(
                'info',
                'electron-react-ts',
                t('Demand Saved Successfully!'),
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
            setPreviewData([]);
        } catch (err: any) {
            console.error('Save failed:', err);
            let msg = err.message || 'Unknown error';
            try { msg = JSON.parse(msg)?.message || msg; } catch {}
            await showDialog('error', 'electron-react-ts', t('Save Failed'), msg);
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    }, [previewData, importConfig, fileName, saveBlockedReason]);

    // ES-587: the operator picks one of the suggested members for a row whose member was not found.
    // The pick is only a proposal: the server checks the member and the total again when saving.
    const pickMember = useCallback((rowKey: string, memberNo: string) => {
        const row = previewData.find(r => r.key === rowKey);
        const suggestion = row?.suggestions?.find(s => s.memberNo === memberNo);
        if (!row || !suggestion) return;
        if (previewData.some(r => r.key !== rowKey && r.status === 'Valid' && r.memberId === memberNo)) {
            showDialog('warning', 'electron-react-ts', t('Member Already In File'), t('Member {{1}} is already used by another row of this file.', { 1: memberNo }));
            return;
        }
        // a hand-picked member must still belong to the selected branch and the row must still add up; the server checks again
        if (importConfig.branch && String(suggestion.officeno) !== String(importConfig.branch)) {
            showDialog('warning', 'electron-react-ts', t('Different Branch'), t('Member {{1}} belongs to branch {{2}}, not {{3}}.', { 1: memberNo, 2: suggestion.officeno, 3: importConfig.branch }));
            return;
        }
        const sum = Math.round(((row.rlnAmount || 0) + (row.alnAmount || 0) + (row.cdAmount || 0) + (row.mdAmount || 0) + (row.md1Amount || 0) + (row.interest || 0)) * 100) / 100;
        if (Math.abs(sum - (row.fileTotal ?? sum)) > 0.01) {
            showDialog('warning', 'electron-react-ts', t('Total Does Not Match'), t("This row's parts do not add up to the file's TOTAL, so it cannot be saved."));
            return;
        }
        setPreviewData(prev => prev.map((r): DemandListItem => {
            if (r.key !== rowKey) return r;
            // the suggestions are no longer needed once one is picked, and a hand-picked row has no name/PS.NO. difference to report
            const { suggestions: _used, strictIssues: _issues, ...rest } = r;
            return {
                ...rest,
                memberId: memberNo,
                memberName: suggestion.name || r.memberName,
                status: 'Valid',
                remarks: '',
                matchMethod: 'MANUAL',
                warnings: [...(r.warnings || []), `Member picked by hand from the suggestions (H.O.NO. in file: ${r.honoGiven || '-'})`],
            };
        }));
    }, [previewData, importConfig.branch, t]);

    const handleClear = useCallback(() => {
        setPreviewData([]);
        setFileName('');
        setImportConfig(prev => ({ ...prev, branch: '' }));
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, []);

    return {
        strictness,
        saveBlockedReason,
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
        pickMember,
    };
};
