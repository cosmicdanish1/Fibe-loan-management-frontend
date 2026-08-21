import React, { useState } from 'react';
import MemberLoanDetailsComponent from '../components/MemberLoanDetails';
import MemberLookupModal from '../components/MemberLookupModal';

const MemberLoanSearch: React.FC = () => {
  const [searchType, setSearchType] = useState<'member' | 'loan'>('member');
  const [memberNumber, setMemberNumber] = useState('');
  const [memberName, setMemberName] = useState('');
  const [loanCaseNo, setLoanCaseNo] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showMemberLookup, setShowMemberLookup] = useState(false);

  const handleSearch = () => {
    if (searchType === 'member' && memberNumber) {
      setShowResults(true);
    } else if (searchType === 'loan' && loanCaseNo) {
      setShowResults(true);
    }
  };

  const handleReset = () => {
    setMemberNumber('');
    setMemberName('');
    setLoanCaseNo('');
    setShowResults(false);
  };

  const handleMemberSelect = (memberNo: string, name: string) => {
    setMemberNumber(memberNo);
    setMemberName(name);
    setShowMemberLookup(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Member Loan Search</h1>
        <p className="text-slate-400">Search for member loans from loan_master and loan_pending tables</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {/* Search Type Selection */}
          <div>
            <label className="block fz-label font-medium text-gray-700 mb-2">Search By</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="member"
                  checked={searchType === 'member'}
                  onChange={(e) => {
                    setSearchType(e.target.value as 'member');
                    setShowResults(false);
                  }}
                  className="mr-2"
                />
                <span>Member Number</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="loan"
                  checked={searchType === 'loan'}
                  onChange={(e) => {
                    setSearchType(e.target.value as 'loan');
                    setShowResults(false);
                  }}
                  className="mr-2"
                />
                <span>Loan Case Number</span>
              </label>
            </div>
          </div>

          {/* Search Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchType === 'member' ? (
              <>
                <div>
                  <label className="block fz-label font-medium text-gray-700 mb-2">
                    Member Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={memberNumber}
                      onChange={(e) => setMemberNumber(e.target.value)}
                      placeholder="Enter member number"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent fz-body"
                    />
                    <button
                      onClick={() => setShowMemberLookup(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      title="Search Member"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block fz-label font-medium text-gray-700 mb-2">
                    Member Name
                  </label>
                  <input
                    type="text"
                    value={memberName}
                    readOnly
                    placeholder="Member name will appear here"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 fz-body"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block fz-label font-medium text-gray-700 mb-2">
                  Loan Case Number
                </label>
                <input
                  type="text"
                  value={loanCaseNo}
                  onChange={(e) => setLoanCaseNo(e.target.value)}
                  placeholder="Enter loan case number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent fz-body"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={
                (searchType === 'member' && !memberNumber) ||
                (searchType === 'loan' && !loanCaseNo)
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Results</h2>
          <MemberLoanDetailsComponent
            {...(searchType === 'member' && memberNumber ? { memberNumber } : {})}
            {...(searchType === 'loan' && loanCaseNo ? { loanCaseNo } : {})}
          />
        </div>
      )}

      {/* Member Lookup Modal */}
      {showMemberLookup && (
        <MemberLookupModal
          onSelect={handleMemberSelect}
          onClose={() => setShowMemberLookup(false)}
        />
      )}
    </div>
  );
};

export default MemberLoanSearch;
