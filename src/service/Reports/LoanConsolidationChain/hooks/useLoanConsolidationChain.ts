import { useState, useCallback } from 'react';
import { getApiBaseUrl } from '../../../../services/serverConfig';

export interface ChainLink {
    loancaseno: string;
    loantype: string;
    /** This case's own recorded principal — for an absorbed predecessor, this
     *  already reflects whatever IT had absorbed before it, so it's the
     *  "before" figure for the next hop's combine. */
    loanAmt: number;
    currentBalance: number;
    disbursementDate: string;
    /** true only for the chain's current head — the one still open today. */
    isActive: boolean;
    closedIntoLoancaseno: string | null;
    closedDate: string | null;
    /** What this case contributed to the combined balance at the moment it
     *  closed — null for the still-active head, since it hasn't closed. */
    contributedAtClosure: number | null;
}

export interface ChainResult {
    mbno: string;
    loantype: string;
    chainLength: number;
    links: ChainLink[];
}

export const useLoanConsolidationChain = () => {
    const [mbno, setMbno] = useState('');
    const [loancaseno, setLoancaseno] = useState('');
    const [loantype, setLoantype] = useState<'RLN' | 'ALN'>('ALN');
    const [chain, setChain] = useState<ChainResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchChain = useCallback(async () => {
        if (!mbno || !loancaseno) return;
        setLoading(true);
        setError(null);
        setChain(null);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const res = await fetch(
                `${base}/loans/case/${loancaseno}/consolidation-chain?mbno=${encodeURIComponent(mbno)}&loantype=${encodeURIComponent(loantype)}`,
                { headers: token ? { Authorization: `Bearer ${token}` } : {} },
            );
            if (!res.ok) throw new Error('Failed to load consolidation chain');
            const data = await res.json();
            const result: ChainResult = data.data || data;
            if (!result.links || result.links.length === 0) {
                setError('No loan found for this case number / member / type combination.');
                return;
            }
            setChain(result);
        } catch (err: any) {
            setError(err.message || 'Failed to load consolidation chain');
        } finally {
            setLoading(false);
        }
    }, [mbno, loancaseno, loantype]);

    const reset = () => {
        setMbno('');
        setLoancaseno('');
        setLoantype('ALN');
        setChain(null);
        setError(null);
    };

    return {
        mbno, setMbno,
        loancaseno, setLoancaseno,
        loantype, setLoantype,
        chain, loading, error,
        fetchChain, reset,
    };
};
