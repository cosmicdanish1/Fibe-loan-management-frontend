import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Printer, FileDown, Image as ImageIcon, FileText } from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
import { downloadBlob, fetchAgreementBlob, printImageBlob } from '../../../services/reagreementApi';

interface Props {
    /** loan_reagreements.id */
    id: number;
    /** true = watermarked DRAFT copy (generated on the fly); false/omitted = the saved, issued agreement */
    draft?: boolean;
    /** Specific issued copy; defaults to the current one. */
    issue?: number;
    /** File name stem for downloads, e.g. "RA00001". */
    baseName: string;
    size?: 'sm' | 'md';
}

/**
 * View / print / download one re-agreement document (PDF or image, with signatures).
 * Must be rendered inside an `.app-window`. The saved copy is what was issued at Pass and never changes.
 */
const ReagreementDocumentActions: React.FC<Props> = ({ id, draft, issue, baseName, size = 'sm' }) => {
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [viewUrl, setViewUrl] = useState<string | null>(null);

    useEffect(() => () => { if (viewUrl) URL.revokeObjectURL(viewUrl); }, [viewUrl]);

    const run = async (key: string, fn: () => Promise<void>) => {
        setBusy(key); setError(null);
        try { await fn(); } catch (e: any) { setError(e.message || 'Failed'); } finally { setBusy(null); }
    };
    const label = draft ? `${baseName}-DRAFT` : `${baseName}${issue ? `-copy${issue}` : ''}`;
    const cls = `aw-btn aw-btn-secondary ${size === 'sm' ? 'aw-btn-sm' : ''}`;

    return (
        <>
            <span className="aw-btn-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <button type="button" className={cls} disabled={!!busy} onClick={() => run('view', async () => {
                    const blob = await fetchAgreementBlob(id, 'png', { draft, issue });
                    setViewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
                })}><Eye size={12} /> {busy === 'view' ? 'Loading…' : 'View'}</button>
                <button type="button" className={cls} disabled={!!busy} onClick={() => run('print', async () => {
                    printImageBlob(await fetchAgreementBlob(id, 'png', { draft, issue }));
                })}><Printer size={12} /> {busy === 'print' ? 'Preparing…' : 'Print'}</button>
                <button type="button" className={cls} disabled={!!busy} onClick={() => run('pdf', async () => {
                    downloadBlob(await fetchAgreementBlob(id, 'pdf', { draft, issue }), `${label}.pdf`);
                })}><FileDown size={12} /> {busy === 'pdf' ? '…' : 'PDF'}</button>
                <button type="button" className={cls} disabled={!!busy} onClick={() => run('png', async () => {
                    downloadBlob(await fetchAgreementBlob(id, 'png', { draft, issue }), `${label}.png`);
                })}><ImageIcon size={12} /> {busy === 'png' ? '…' : 'Image'}</button>
                <button type="button" className={cls} disabled={!!busy} onClick={() => run('text', async () => {
                    downloadBlob(await fetchAgreementBlob(id, 'text', { draft, issue }), `${label}.txt`);
                })}><FileText size={12} /> {busy === 'text' ? '…' : 'Text'}</button>
            </span>
            {error && <p className="aw-meta" style={{ color: 'var(--aw-danger)', marginTop: 4 }}>{error}</p>}
            {viewUrl && createPortal(
                (
                <AwDialog open={!!viewUrl} title={draft ? 'Draft agreement' : 'Saved agreement'} icon={<Eye size={14} />}
                    onClose={() => setViewUrl(null)} maxWidth="58rem">
                    {viewUrl && <img src={viewUrl} alt={`Re-agreement ${baseName}`} style={{ width: '100%', height: 'auto', background: '#fff', borderRadius: 4 }} />}
                </AwDialog>
                ),
                // Rendered at the window root (not inside the caller): a parent with an animation/transform would otherwise
                // become the containing block of the fixed dialog and squash it.
                (document.querySelector('.app-window') as HTMLElement) || document.body,
            )}
        </>
    );
};

export default ReagreementDocumentActions;
