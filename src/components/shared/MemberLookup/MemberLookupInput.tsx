import React, { useState, useRef, useEffect } from 'react';
import { Search, User, ChevronDown } from 'lucide-react';
import { apiService } from '../../../services/api';

export interface MemberLookupData {
  memberNo: string;
  memberName: string;
  officeNo: number;
  wingNo: string;
  officeName: string;
}

interface MemberLookupInputProps {
  value: string;
  onChange: (memberNo: string, memberData?: MemberLookupData) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showLookupButton?: boolean;
  autoSearch?: boolean;
}

const MemberLookupInput: React.FC<MemberLookupInputProps> = ({
  value,
  onChange,
  placeholder = "Enter member number",
  disabled = false,
  className = "",
  showLookupButton = true,
  autoSearch = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<MemberLookupData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync searchTerm when value changes externally (e.g. navigation buttons)
  // Only sync if value is non-empty and different from current searchTerm
  useEffect(() => {
    if (value && value !== searchTerm) {
      setSearchTerm(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-search when typing
  useEffect(() => {
    if (autoSearch && searchTerm && searchTerm.length >= 2) {
      const debounceTimer = setTimeout(() => {
        searchMembers(searchTerm);
      }, 300);

      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults([]);
      setIsOpen(false);
    }
  }, [searchTerm, autoSearch]);

  const searchMembers = async (search: string) => {
    if (!search.trim()) return;

    setIsLoading(true);
    try {
      console.log(`🔍 [MEMBER-LOOKUP] Searching for: ${search}`);
      
      const response = await apiService.lookupMembers(search, 500, 0);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to search members');
      }

      const members: any[] = response.data || [];
      console.log(`📋 [MEMBER-LOOKUP] Found ${members.length} members`);

      const formattedMembers: MemberLookupData[] = members.map(member => ({
        memberNo: member.memberNo || '',
        memberName: member.memberName || '',
        officeNo: member.officeNo || 0,
        wingNo: member.wingNo || '',
        officeName: member.officeName || ''
      }));

      setSearchResults(formattedMembers);
      setIsOpen(formattedMembers.length > 0);
    } catch (error) {
      console.error('❌ [MEMBER-LOOKUP] Error searching members:', error);
      setSearchResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
  };

  const handleMemberSelect = (member: MemberLookupData) => {
    setSearchTerm(member.memberNo);
    onChange(member.memberNo, member);
    setIsOpen(false);
    setSearchResults([]);
  };

  const handleLookupClick = () => {
    if (searchTerm) {
      searchMembers(searchTerm);
    } else {
      // Show all recent members
      searchMembers('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentTime = Date.now();
    
    // Detect double space to show all members
    if (e.key === ' ') {
      if (currentTime - lastKeyTime < 500) { // Double space within 500ms
        e.preventDefault();
        // Show all members by searching with empty string
        searchMembers('');
        return;
      }
      setLastKeyTime(currentTime);
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleMemberSelect(searchResults[0]);
      } else if (searchTerm) {
        searchMembers(searchTerm);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      // Show all members by searching with empty string
      searchMembers('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-2 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors text-xs"
        />
        
        {showLookupButton && (
          <button
            type="button"
            onClick={handleLookupClick}
            disabled={disabled || isLoading}
            className="px-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white border border-blue-600 rounded-r transition-colors flex items-center gap-1"
            title="Search members (or press PageUp)"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <>
                <Search className="w-3 h-3" />
                <ChevronDown className="w-2 h-2" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-64 overflow-y-auto">
          <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              {searchResults.length} member(s) found
            </span>
            <span className="text-xs text-gray-500">
              Use ↑↓ arrows, Enter to select
            </span>
          </div>
          
          {searchResults.map((member, index) => (
            <div
              key={`${member.memberNo}-${index}`}
              onClick={() => handleMemberSelect(member)}
              className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-gray-900 text-xs">
                      {member.memberNo}
                    </span>
                    <span className="text-gray-700 text-xs truncate font-medium">
                      {member.memberName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="truncate">{member.officeName}</span>
                    <span>Office: {member.officeNo}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {searchResults.length >= 10 && (
            <div className="p-2 bg-gray-50 border-t border-gray-200 text-center">
              <span className="text-xs text-gray-500">
                Type to search for more specific results
              </span>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg p-2">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            <span className="text-xs">Searching members...</span>
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && searchResults.length === 0 && !isLoading && searchTerm && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg p-2">
          <div className="text-center text-gray-500">
            <User className="w-6 h-6 mx-auto mb-1 text-gray-300" />
            <p className="text-xs">No members found for "{searchTerm}"</p>
            <p className="text-xs text-gray-400 mt-0.5">Try different search term</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberLookupInput;
