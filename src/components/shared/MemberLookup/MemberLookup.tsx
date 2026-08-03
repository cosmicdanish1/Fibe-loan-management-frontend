import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Table, Badge, Button, Empty, message, Typography } from 'antd';
import { SearchOutlined, UserOutlined, LoadingOutlined } from '@ant-design/icons';
import { API_ROUTES, API_BASE_URL, getApiBaseUrl } from '../../../services/apiVersionConfig';

const { Text } = Typography;

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
    const [searchTerm, setSearchTerm] = useState('');
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<any>(null);

    const fetchMembers = useCallback(async (search: string = '') => {
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

            const response = await fetch(url.toString());
            if (response.ok) {
                const result = await response.json();
                const data = result.data || result || [];
                const formattedData = (Array.isArray(data) ? data : []).map((m: any) => ({
                    ...m,
                    name: m.name || m.memberName || '' // Ensure name exists
                }));
                setMembers(formattedData);
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load members. Please try again.');
            message.error('Failed to load members');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMembers();
        // Auto focus input on mount
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    }, [fetchMembers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm) fetchMembers(searchTerm);
        }, 400);
        return () => clearTimeout(timer);
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

    const columns = React.useMemo(() => [
        {
            title: 'MB NO',
            dataIndex: 'memberNo',
            key: 'memberNo',
            width: 120,
            render: (text: string) => <Text className="font-bold text-indigo-600 tracking-tight">{text}</Text>,
        },
        {
            title: 'MEMBER NAME',
            dataIndex: 'memberName',
            key: 'memberName',
            width: 250,
            render: (text: string) => <Text className="font-semibold text-slate-800 uppercase fz-caption truncate block">{text}</Text>,
        },
        {
            title: 'ACCOUNT NO',
            key: 'accountNo',
            width: 120,
            render: (_: any, record: Member) => (
                <Text className="text-slate-500 font-mono fz-caption">{record.memberNo}</Text>
            ),
        },
        {
            title: 'OFFICE / UNIT',
            dataIndex: 'officeName',
            key: 'officeName',
            width: 200,
            render: (text: string, record: Member) => (
                <div className="flex flex-col">
                    <Text className="fz-caption text-slate-700 font-bold uppercase truncate">{text || 'GENERAL OFFICE'}</Text>
                    <Text className="fz-tiny text-slate-400 font-medium tracking-tighter">OFFICE CODE: {record.officeNo}</Text>
                </div>
            ),
        },
    ], []);

    return (
        <div className={`flex flex-col bg-white overflow-hidden ${isModal ? 'h-[70vh]' : 'h-screen'}`}>
            {/* Header - Modern Light Theme */}
            {!isModal && (
                <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                            <UserOutlined className="text-indigo-600 text-xl" />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-800 tracking-tight m-0 leading-none">MEMBER DIRECTORY</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="fz-small text-slate-400 font-bold uppercase tracking-widest">Live Lookup System</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            count={`${members.length} Members`}
                            style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: 800, fontSize: '10px' }}
                        />
                    </div>
                </div>
            )}

            {/* Search Bar Area */}
            <div className="p-3 bg-slate-50 border-b border-slate-200">
                <div className="relative group">
                    <Input
                        ref={inputRef}
                        placeholder="Search by Member No, Name or Office..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        prefix={<SearchOutlined className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />}
                        suffix={isLoading ? <LoadingOutlined className="text-blue-600" /> : null}
                        className="h-10 rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                isModal ? onClose?.() : window.close();
                            }
                            if (e.key === 'Enter' && members.length > 0 && members[0]) {
                                handleSelect(members[0]);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Table Area - Container should not scroll, only the table internally */}
            <div className="flex-1 overflow-hidden bg-white">
                {error ? (
                    <div className="h-full flex items-center justify-center p-6">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="text-center">
                                    <Text type="danger" className="font-medium">{error}</Text>
                                    <br />
                                    <Button type="primary" size="small" className="mt-4" onClick={() => fetchMembers(searchTerm)}>
                                        Retry Connection
                                    </Button>
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <Table
                        virtual
                        dataSource={members}
                        columns={columns}
                        rowKey={(record) => record.memberNo}
                        pagination={false}
                        size="small"
                        loading={isLoading && members.length === 0}
                        onRow={(record) => ({
                            onClick: () => handleSelect(record),
                            className: 'cursor-pointer hover:bg-blue-50/50 transition-colors group',
                        })}
                        scroll={{ y: isModal ? '40vh' : 'calc(100vh - 180px)', x: 690 }}
                        className="member-lookup-table compact-table"
                        locale={{
                            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No members matching your search" />
                        }}
                    />
                )}
            </div>

            {/* Footer Info Bar */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Text className="fz-caption text-slate-500">
                        <span className="font-bold text-slate-700">{members.length}</span> Records Found
                    </Text>
                    {searchTerm && (
                        <Badge
                            count={`Searching: ${searchTerm}`}
                            style={{ backgroundColor: '#e2e8f0', color: '#475569', fontSize: '10px' }}
                        />
                    )}
                </div>
                <Text className="fz-small text-slate-400 font-medium italic">
                    Tip: Double-click row to select • ESC to exit
                </Text>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .member-lookup-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.025em !important;
          padding: 10px 16px !important;
          color: #64748b !important;
          font-weight: 700 !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }
        .member-lookup-table .ant-table-tbody > tr > td {
          padding: 8px 16px !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .compact-table .ant-spin-nested-loading { height: 100%; }
        .compact-table .ant-table { height: 100%; }
      `}} />
        </div>
    );
};

export default MemberLookup;
