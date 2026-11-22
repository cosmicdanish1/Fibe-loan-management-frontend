import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { Search, Users, RotateCcw } from 'lucide-react';
import { API_ROUTES, getApiBaseUrl } from '../../../services/apiVersionConfig';
import { useTranslation } from 'react-i18next';

interface Member {
    memberNo: string;
    memberName: string;
    name: string; // Compatibility alias
    officeNo: number;
    wingNo?: string;
    officeName: string;
    basicPay?: string | number;
    dateOfRetire?: string;
}

interface MemberLookupProps {
    onSelect?: (member: Member) => void;
    onClose?: () => void;
    isModal?: boolean;
}

const MemberLookup: React.FC<MemberLookupProps> = ({ onSelect, onClose, isModal = false }) => {
  const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Tracks the in-flight request so a slower, stale response (e.g. from a
    // search term the user already changed) can never overwrite a newer one.
    const abortRef = useRef<AbortController | null>(null);
    // The search text the list on screen belongs to, and the pause timer before a typed search runs (ES-620):
    // Enter must never pick a member from a list that is older than what is typed in the box.
    const loadedTermRef = useRef('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const firstRun = useRef(true);

    const fetchMembers = useCallback(async (search: string = ''): Promise<Member[] | null> => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        setIsLoading(true);
        setError(null);
        try {
            const endpoint = API_ROUTES.members.lookup();
            const base = await getApiBaseUrl();
            const url = new URL(`${base}${endpoint}`, base.startsWith('/') ? window.location.origin : undefined);
            if (search.trim()) {
                url.searchParams.append('search', search.trim());
            }
            url.searchParams.append('limit', '500');

            const token = localStorage.getItem('accessToken');
            const response = await fetch(url.toString(), {
                signal: controller.signal,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (response.ok) {
                const result = await response.json();
                const data = result.data || result || [];
                const formattedData = (Array.isArray(data) ? data : []).map((m: any) => ({
                    ...m,
                    name: m.name || m.memberName || '' // Ensure name exists
                }));
                setMembers(formattedData);
                loadedTermRef.current = search.trim();
                return formattedData;
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        } catch (err: any) {
            // Superseded by a newer search — not a real failure, stay quiet.
            if (err?.name === 'AbortError' && abortRef.current !== controller) return null;
            if (err?.name === 'AbortError') {
                setError('Request timed out. Please check your connection and try again.');
                message.error(t('Request timed out'));
                return null;
            }
            console.error('Fetch error:', err);
            setError('Failed to load members. Please try again.');
            message.error(t('Failed to load members'));
            return null;
        } finally {
            clearTimeout(timeoutId);
            if (abortRef.current === controller) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMembers();
        // Auto focus input on mount
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
        return () => {
            abortRef.current?.abort();
        };
    }, [fetchMembers]);

    // A typed search runs after a short pause. Clearing the box searches too (ES-620: it used to leave the old filtered list).
    // The very first load is done by the effect above.
    useEffect(() => {
        if (firstRun.current) { firstRun.current = false; return; }
        debounceRef.current = setTimeout(() => { fetchMembers(searchTerm); }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchTerm, fetchMembers]);

    const handleSelect = (member: Member) => {
        // Cross-window communication for Electron
        if (window.electronAPI) {
            window.electronAPI.send('member-selected', member);
        }

        // Callback for modal usage
        onSelect?.(member);
        onClose?.();

        if (!isModal && !onSelect) {
            window.close();
        }
    };

    const body = (
        <>
            <div className="aw-input-wrap has-icon" style={{ flex: 'none' }}>
                <Search size={13} />
                <input
                    ref={inputRef}
                    aria-label={t('Search members')}
                    placeholder={t('Search by Member No, Name or Office...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="aw-input"
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            isModal ? onClose?.() : window.close();
                        }
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (searchTerm.trim() === loadedTermRef.current) {
                                // the list on screen is the result of what is typed
                                if (members[0]) handleSelect(members[0]);
                            } else {
                                // typed but not searched yet: search now and pick from THAT result, never from the old list
                                if (debounceRef.current) clearTimeout(debounceRef.current);
                                fetchMembers(searchTerm).then(rows => { if (rows && rows[0]) handleSelect(rows[0]); });
                            }
                        }
                    }}
                />
            </div>

            {error ? (
                <div className="aw-empty" style={{ padding: 32 }}>
                    <p className="aw-strong" style={{ color: 'var(--aw-danger)' }}>{error}</p>
                    <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" onClick={() => fetchMembers(searchTerm)}>
                        <RotateCcw size={12} /> {t('Retry Connection')}
                    </button>
                </div>
            ) : (
                <div className="aw-table-wrap" style={{ flex: 1, minHeight: 0 }}>
                    <table className="aw-table" style={{ minWidth: 640 }}>
                        <thead>
                            <tr>
                                <th style={{ width: 130 }}>MB NO</th>
                                <th>{t('Member Name')}</th>
                                <th style={{ width: 130 }}>{t('Account No')}</th>
                                <th style={{ width: 220 }}>{t('Office / Unit')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && members.length === 0 ? (
                                <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 28 }}><span className="aw-spin" /></div></td></tr>
                            ) : members.length === 0 ? (
                                <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 28 }}><span className="aw-meta">{t('No members matching your search')}</span></div></td></tr>
                            ) : members.map((record, idx) => (
                                <tr key={`${record.memberNo}-${idx}`} className="is-clickable" onClick={() => handleSelect(record)}>
                                    <td className="is-accent" style={{ fontWeight: 700 }}>{record.memberNo}</td>
                                    <td style={{ fontWeight: 600, textTransform: 'uppercase' }}>{record.memberName}</td>
                                    <td className="is-muted" style={{ fontFamily: 'monospace' }}>{record.memberNo}</td>
                                    <td>
                                        <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{record.officeName || 'GENERAL OFFICE'}</div>
                                        <div className="aw-meta">OFFICE CODE: {record.officeNo}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="aw-inline" style={{ flex: 'none', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="aw-meta">
                    <strong>{members.length}</strong> {t('Records Found')}
                    {searchTerm && <>· {t('Searching: {{1}}', { 1: searchTerm })}</>}
                </span>
                <span className="aw-meta" style={{ fontStyle: 'italic' }}>{t('Tip: Click a row or press Enter to select • ESC to exit')}</span>
            </div>
        </>
    );

    if (isModal) {
        return (
            <div className="app-window" style={{ height: '70vh' }}>
                <div className="aw-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aw-gap)', overflow: 'hidden' }}>
                    {body}
                </div>
            </div>
        );
    }

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Member Directory')}</h1>
                    <p className="aw-desc">{t('Live Lookup System')}</p>
                </div>
                <div className="aw-actions">
                    <span className="aw-pill tone-info"><Users size={12} /> {members.length} {t('Members')}</span>
                </div>
            </div>
            <div className="aw-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aw-gap)', overflow: 'hidden' }}>
                {body}
            </div>
        </div>
    );
};

export default MemberLookup;
