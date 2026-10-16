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

/** One of the member's loans, as listed in the "Member's loans" dropdown. */
export interface MemberLoan {
    loancaseno: string;
    loantype: 'RLN' | 'ALN';
    loanAmt: number;
    balance: number;
    consolidatedInto: string | null;
}

const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useLoanConsolidationChain = () => {
    const [mbno, setMbno] = useState('');
    const [loancaseno, setLoancaseno] = useState('');
    const [loantype, setLoantype] = useState<'RLN' | 'ALN'>('ALN');
    const [chain, setChain] = useState<ChainResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [memberLoans, setMemberLoans] = useState<MemberLoan[]>([]);
    const [loansLoading, setLoansLoading] = useState(false);

    /** Loads one chain. Takes its inputs explicitly so it can run straight after a state change. */
    const fetchChainFor = useCallback(async (no: string, caseNo: string, type: 'RLN' | 'ALN') => {
        if (!no || !caseNo) return;
        setLoading(true);
        setError(null);
        setChain(null);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(
                `${base}/loans/case/${caseNo}/consolidation-chain?mbno=${encodeURIComponent(no)}&loantype=${encodeURIComponent(type)}`,
                { headers: authHeaders() },
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
    }, []);

    const fetchChain = useCallback(() => fetchChainFor(mbno, loancaseno, loantype), [fetchChainFor, mbno, loancaseno, loantype]);

    /** Picks one of the member's loans: sets the case and type, then shows its chain. */
    const selectLoan = useCallback((loan: MemberLoan, no?: string) => {
        setLoancaseno(loan.loancaseno);
        setLoantype(loan.loantype);
        void fetchChainFor(no ?? mbno, loan.loancaseno, loan.loantype);
    }, [fetchChainFor, mbno]);

    /**
     * Lists the member's regular and emergency loans (open one first) and selects the first, so the
     * chain appears without typing a case number.
     */
    const loadMemberLoans = useCallback(async (no: string) => {
        const member = no.trim();
        setMemberLoans([]);
        setChain(null);
        setError(null);
        if (!member) return;
        setLoansLoading(true);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/member/${encodeURIComponent(member)}/master`, { headers: authHeaders() });
            if (!res.ok) throw new Error('Could not load this member’s loans.');
            const body = await res.json();
            const rows: MemberLoan[] = (body.data || body || [])
                .filter((r: any) => r.loantype === 'RLN' || r.loantype === 'ALN')
                .map((r: any) => ({
                    loancaseno: String(r.loancaseno),
                    loantype: r.loantype,
                    loanAmt: Number(r.loan_amt) || 0,
                    balance: Number(r.balance) || 0,
                    consolidatedInto: r.consolidatedIntoLoancaseno ? String(r.consolidatedIntoLoancaseno) : null,
                }))
                .sort((a: MemberLoan, b: MemberLoan) => {
                    const openA = a.balance > 0 && !a.consolidatedInto ? 1 : 0;
                    const openB = b.balance > 0 && !b.consolidatedInto ? 1 : 0;
                    return openB - openA || Number(b.loancaseno) - Number(a.loancaseno);
                });
            setMemberLoans(rows);
            if (rows.length === 0) {
                setError('No regular or emergency loans found for this member.');
                return;
            }
            selectLoan(rows[0]!, member);
        } catch (err: any) {
            setError(err.message || 'Could not load this member’s loans.');
        } finally {
            setLoansLoading(false);
        }
    }, [selectLoan]);

    const reset = () => {
        setMbno('');
        setLoancaseno('');
        setLoantype('ALN');
        setChain(null);
        setError(null);
        setMemberLoans([]);
    };

    return {
        mbno, setMbno,
        loancaseno, setLoancaseno,
        loantype, setLoantype,
        chain, loading, error,
        memberLoans, loansLoading, loadMemberLoans, selectLoan,
        fetchChain, reset,
    };
};
