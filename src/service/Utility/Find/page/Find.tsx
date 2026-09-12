import React, { useState, useCallback } from 'react';
import {
  Search,
  FileText,
  RefreshCw,
  X
} from 'lucide-react';
import { ConfigProvider, Spin } from 'antd';
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

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";

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
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="find-app h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <Search size={13} className="text-white" />
            </div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Find</h1>
              <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Global Member &amp; Account Search</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={clearSearch}
              className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
              <RefreshCw size={11} /> Clear
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5">
          <Spin spinning={isLoading} tip="Searching...">

            {/* Search Config Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <Search size={10} className="text-slate-400" />
                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Search Parameters</span>
              </div>
              <div className="p-2.5 space-y-2">
                <div>
                  <label className={lbl}>Find What</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SEARCH_TYPES.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSearchType(opt.value)}
                        className={`h-6 px-3 rounded fz-tiny font-black uppercase tracking-wide transition-all border ${
                          searchType === opt.value
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter search term..."
                    className="flex-1 h-7 px-3 fz-caption font-semibold bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim()}
                    className="h-7 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded fz-tiny font-black uppercase tracking-wide flex items-center gap-1.5 transition-all">
                    <Search size={11} /> Find
                  </button>
                </div>
                {error && (
                  <div className="fz-tiny font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results Card */}
            {results.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <FileText size={10} className="text-slate-400" />
                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Results</span>
                  </div>
                  <span className="fz-mini font-black text-indigo-600 uppercase">{results.length} record(s)</span>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#f8fafc]">
                      <tr>
                        {['MB No', 'Name', 'Wing', 'Division', 'A/C No', 'SR No'].map(h => (
                          <th key={h} className="px-3 py-2 text-left fz-mini font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr key={result.id + index} className="border-b border-slate-100 hover:bg-[#eef2ff] transition-colors cursor-pointer">
                          <td className="px-3 py-1.5 fz-small font-black text-indigo-600">{result.memberNo || '—'}</td>
                          <td className="px-3 py-1.5 fz-small font-semibold text-slate-700">{result.name || result.title}</td>
                          <td className="px-3 py-1.5 fz-small text-slate-600">{result.wing || '—'}</td>
                          <td className="px-3 py-1.5 fz-small text-slate-600">{result.division || '—'}</td>
                          <td className="px-3 py-1.5 fz-small text-slate-600">{result.accountNo || '—'}</td>
                          <td className="px-3 py-1.5 fz-small text-slate-600">{result.srNo || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : !isLoading && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col items-center justify-center text-center p-8">
                {searchQuery ? (
                  <>
                    <Search size={32} className="text-slate-200 mb-3" />
                    <p className="fz-small font-black text-slate-500 uppercase tracking-wider">No Results Found</p>
                    <p className="fz-tiny text-slate-400 mt-1">Try adjusting your search criteria</p>
                  </>
                ) : (
                  <>
                    <FileText size={32} className="text-slate-200 mb-3" />
                    <p className="fz-small font-black text-slate-500 uppercase tracking-wider">Ready to Search</p>
                    <p className="fz-tiny text-slate-400 mt-1">Select a search type and enter your query</p>
                  </>
                )}
              </div>
            )}

          </Spin>
        </div>

        <style>{`
          /* ── Find — dark mode ── */
          html.dark .find-app { background-color: #000000 !important; color: #f5f5f7 !important; }
          html.dark .find-app .bg-white { background-color: #1c1c1e !important; }
          html.dark .find-app .bg-slate-50 { background-color: rgba(255,255,255,.05) !important; }
          html.dark .find-app .bg-\\[\\#f8fafc\\] { background-color: #1c1c1e !important; }
          html.dark .find-app .hover\\:bg-\\[\\#eef2ff\\]:hover { background-color: rgba(99,102,241,0.1) !important; }
          html.dark .find-app .border-slate-100 { border-color: rgba(255,255,255,.07) !important; }
          html.dark .find-app .border-slate-200 { border-color: rgba(255,255,255,.08) !important; }
          html.dark .find-app .border-slate-300 { border-color: rgba(255,255,255,.08) !important; }
          html.dark .find-app input {
            background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
          }
          html.dark .find-app label { color: #8e8e93 !important; }
          html.dark .find-app .text-slate-700 { color: #f5f5f7 !important; }
          html.dark .find-app .text-slate-600 { color: #8e8e93 !important; }
          html.dark .find-app .text-slate-500 { color: #8e8e93 !important; }
          html.dark .find-app .text-slate-400 { color: #71717a !important; }
          html.dark .find-app .bg-slate-300 { background-color: rgba(255,255,255,.15) !important; }
          html.dark .find-app .bg-rose-50 { background-color: rgba(255,69,58,0.08) !important; }
          html.dark .find-app .text-rose-600 { color: #ff453a !important; }
          html.dark .find-app .border-rose-200 { border-color: rgba(255,69,58,0.3) !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default Find;
