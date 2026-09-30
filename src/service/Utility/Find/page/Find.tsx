import React, { useState, useCallback } from 'react';
import {
  Search,
  FileText,
  RefreshCw
} from 'lucide-react';
import { getApiBaseUrl } from '../../../../services/apiVersionConfig';

interface SearchResult {
  id: string;
  memberNo?: string;
  name?: string;
  wing?: string;
  division?: string;
  accountNo?: string;
  srNo?: string;
  type: 'member' | 'account' | 'transaction' | 'loan';
  title: string;
  subtitle: string;
  details: string;
}


const SEARCH_TYPE_LABELS: Record<string, string> = {
  memberNo: 'Member No',
  accountNo: 'A/C Number',
  memberName: 'Member Name',
  headCode: 'Head Code',
  headName: 'Head Name',
};

// Maps each GlobalSearchResult category (members/loans/deposits/transactions —
// see backend/src/modules/utility/dto/search.dto.ts GlobalSearchResult) into
// the flat row shape this screen renders.
const flattenSearchResults = (payload: any): SearchResult[] => {
  const rows: SearchResult[] = [];

  (payload?.members?.data ?? []).forEach((m: any) => {
    rows.push({
      id: `member-${m.mbno}`,
      memberNo: m.mbno,
      name: m.name,
      wing: m.wingName,
      division: m.divisionName,
      type: 'member',
      title: m.name || String(m.mbno),
      subtitle: `Member No ${m.mbno}`,
      details: '',
    });
  });

  (payload?.loans?.data ?? []).forEach((l: any) => {
    rows.push({
      id: `loan-${l.loanType}-${l.loanCaseNo}`,
      memberNo: l.mbno,
      name: l.name,
      wing: l.wingName,
      division: l.divisionName,
      accountNo: l.loanCaseNo,
      type: 'loan',
      title: l.name || String(l.mbno),
      subtitle: `Loan A/c ${l.loanCaseNo}`,
      details: '',
    });
  });

  (payload?.deposits?.data ?? []).forEach((d: any) => {
    rows.push({
      id: `deposit-${d.accountNumber}`,
      memberNo: d.mbno,
      name: d.name,
      wing: d.wingName,
      division: d.divisionName,
      accountNo: d.accountNumber,
      type: 'account',
      title: d.name || String(d.mbno),
      subtitle: `RD A/c ${d.accountNumber}`,
      details: '',
    });
  });

  (payload?.transactions?.data ?? []).forEach((t: any) => {
    rows.push({
      id: `transaction-${t.id}`,
      type: 'transaction',
      title: t.transactionNumber || 'Transaction',
      subtitle: t.description || '',
      details: '',
    });
  });

  return rows;
};

// Native "record not found" popup — mirrors the legacy Find dialog.
// Uses Electron's native message box (consistent with the rest of the app);
// falls back to window.alert when not running inside Electron.
const showNotFoundDialog = async (term: string, typeLabel: string) => {
  const message = 'Record Not Found';
  const detail = `No record matches "${term}" for ${typeLabel}.`;
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({
      type: 'info', title: 'Find', message, detail, buttons: ['OK'], defaultId: 0,
    });
  } else {
    alert(`${message}\n\n${detail}`);
  }
};

const Find: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('memberNo');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setResults([]); return; }
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const typeMapping: Record<string, string> = {
        memberNo: 'member', memberName: 'member', accountNo: 'account',
        headCode: 'all', headName: 'all'
      };
      const backendType = typeMapping[searchType] || 'all';
      const searchUrl = `${await getApiBaseUrl()}/search/global?query=${encodeURIComponent(searchQuery)}&entityType=${backendType}&limit=100`;
      const response = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      const data = await response.json();
      const actualData: any[] = data.success && data.data ? flattenSearchResults(data.data) : [];
      setResults(actualData);
      if (actualData.length === 0) {
        setError('No results found for your search.');
        const typeLabel = SEARCH_TYPE_LABELS[searchType] || 'the selected search type';
        await showNotFoundDialog(searchQuery.trim(), typeLabel);
      }
    } catch (error: any) {
      setError(`Search failed: ${error.message || 'Unknown error'}`);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchType]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) performSearch();
  }, [searchQuery, performSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery(''); setResults([]); setSearchType('memberNo'); setError(null);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const SEARCH_TYPES = Object.entries(SEARCH_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Find</h1>
          <p className="aw-desc">Global Member &amp; Account Search</p>
        </div>
        <div className="aw-actions">
          {isLoading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> Searching...
            </span>
          )}
          <button type="button" onClick={clearSearch} className="aw-btn aw-btn-secondary">
            <RefreshCw size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="aw-fit">
        <div className="aw-column">

          {/* Search Config Card */}
          <section className="aw-card" style={{ flex: 'none' }}>
            <div className="aw-card-head">
              <span className="aw-card-icon"><Search size={14} /></span>
              <h2 className="aw-card-title">Search Parameters</h2>
            </div>
            <div className="aw-stack">
              <div>
                <span className="aw-label" id="find-what-label">Find What</span>
                <div className="aw-chips" role="radiogroup" aria-labelledby="find-what-label">
                  {SEARCH_TYPES.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={searchType === opt.value}
                      onClick={() => setSearchType(opt.value)}
                      className="aw-chip"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="aw-inline">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter search term..."
                  aria-label="Search term"
                  className="aw-input"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isLoading}
                  className="aw-btn aw-btn-primary">
                  <Search size={13} /> {isLoading ? 'Searching...' : 'Find'}
                </button>
              </div>
              {error && (
                <div className="aw-alert aw-alert-danger aw-fade-in" role="alert" style={{ marginBottom: 0 }}>
                  {error}
                </div>
              )}
            </div>
          </section>

          {/* Results Card */}
          {results.length > 0 ? (
            <section className="aw-card aw-main" style={{ flex: 1 }}>
              <div className="aw-main-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span className="aw-card-icon"><FileText size={14} /></span>
                  <h2 className="aw-card-title">Results</h2>
                </div>
                <span className="aw-pill">{results.length} record(s)</span>
              </div>
              <div className="aw-main-body" style={{ padding: 0 }}>
                <table className="aw-table">
                  <thead>
                    <tr>
                      {['MB No', 'Name', 'Wing', 'Division', 'A/C No', 'SR No'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={result.id + index} className="is-clickable">
                        <td className="is-accent">{result.memberNo || '—'}</td>
                        <td>{result.name || result.title}</td>
                        <td className="is-muted">{result.wing || '—'}</td>
                        <td className="is-muted">{result.division || '—'}</td>
                        <td className="is-muted">{result.accountNo || '—'}</td>
                        <td className="is-muted">{result.srNo || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : !isLoading && (
            <section className="aw-card" style={{ flex: 1, justifyContent: 'center' }}>
              {searchQuery ? (
                <div className="aw-empty">
                  <Search size={34} />
                  <strong className="aw-strong">No Results Found</strong>
                  <span>Try adjusting your search criteria</span>
                </div>
              ) : (
                <div className="aw-empty">
                  <FileText size={34} />
                  <strong className="aw-strong">Ready to Search</strong>
                  <span>Select a search type and enter your query</span>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

export default Find;
