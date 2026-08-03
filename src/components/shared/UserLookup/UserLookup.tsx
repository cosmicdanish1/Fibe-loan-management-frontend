import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Table, Badge, Button, Empty, message, Typography } from 'antd';
import { SearchOutlined, UserOutlined, LoadingOutlined } from '@ant-design/icons';
import { apiService } from '../../../services/api';

const { Text } = Typography;

interface User {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions?: string[];
    isActive: boolean;
}

interface UserLookupProps {
    onSelect?: (user: User) => void;
    onClose?: () => void;
    isModal?: boolean;
}

const UserLookup: React.FC<UserLookupProps> = ({ onSelect, onClose, isModal = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<any>(null);

    const fetchUsers = useCallback(async (search: string = '') => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiService.getUsers({ limit: 1000 });
            if (response.success && response.data) {
                const allUsers = response.data.users || [];

                // Client-side filtering to maintain the "instant search" feel similar to MemberLookup
                const filtered = search.trim()
                    ? allUsers.filter((u: any) =>
                        u.username.toLowerCase().includes(search.toLowerCase()) ||
                        u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
                        u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
                        u.role.toLowerCase().includes(search.toLowerCase())
                    )
                    : allUsers;

                setUsers(filtered);
            } else {
                throw new Error(response.error || 'Failed to fetch users');
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to load users. Please try again.');
            message.error('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        // Auto focus input on mount
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    }, [fetchUsers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, fetchUsers]);

    const handleSelect = (user: User) => {
        onSelect?.(user);
        onClose?.();
    };

    const columns = [
        {
            title: 'USER NAME',
            dataIndex: 'username',
            key: 'username',
            width: 150,
            render: (text: string) => <Text className="font-bold text-indigo-600 tracking-tight">{text}</Text>,
        },
        {
            title: 'FULL NAME',
            key: 'fullName',
            width: 250,
            render: (_: any, record: User) => (
                <Text className="font-semibold text-slate-800 uppercase fz-caption truncate block">
                    {record.firstName} {record.lastName}
                </Text>
            ),
        },
        {
            title: 'USER LEVEL',
            dataIndex: 'role',
            key: 'role',
            width: 180,
            render: (text: string) => (
                <Badge
                    status={text === 'SYSTEM' || text === 'ADMINISTRATOR' ? 'processing' : 'default'}
                    text={<Text className="fz-small font-black uppercase tracking-tighter text-slate-500">{text}</Text>}
                />
            ),
        },
        {
            title: 'STATUS',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 100,
            render: (active: boolean) => (
                <Badge
                    status={active ? 'success' : 'error'}
                    text={active ? 'Active' : 'Inactive'}
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                />
            ),
        },
    ];

    return (
        <div className={`flex flex-col bg-white overflow-hidden ${isModal ? 'h-full' : 'h-screen'}`}>
            {/* Header - Matches MemberLookup style */}
            {!isModal && (
                <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                            <UserOutlined className="text-indigo-600 text-xl" />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-800 tracking-tight m-0 leading-none uppercase">Identity Directory</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="fz-small text-slate-400 font-bold uppercase tracking-widest">Secure Access Registry</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            count={`${users.length} Users`}
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
                        placeholder="Search identities by name, role or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        prefix={<SearchOutlined className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />}
                        suffix={isLoading ? <LoadingOutlined className="text-blue-600" /> : null}
                        className="h-10 rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                onClose?.();
                            }
                            if (e.key === 'Enter' && users.length > 0 && users[0]) {
                                handleSelect(users[0]);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-hidden bg-white">
                {error ? (
                    <div className="h-full flex items-center justify-center p-6">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="text-center">
                                    <Text type="danger" className="font-medium">{error}</Text>
                                    <br />
                                    <Button type="primary" size="small" className="mt-4" onClick={() => fetchUsers(searchTerm)}>
                                        Retry Connection
                                    </Button>
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <Table
                        dataSource={users}
                        columns={columns}
                        rowKey={(record) => record.id}
                        pagination={false}
                        size="small"
                        loading={isLoading && users.length === 0}
                        onRow={(record) => ({
                            onClick: () => handleSelect(record),
                            className: 'cursor-pointer hover:bg-blue-50/50 transition-colors group',
                        })}
                        scroll={{ y: isModal ? '400px' : 'calc(100vh - 180px)', x: 'max-content' }}
                        className="user-lookup-table compact-table"
                        locale={{
                            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No identities matching your search" />
                        }}
                    />
                )}
            </div>

            {/* Footer Info Bar */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Text className="fz-caption text-slate-500">
                        <span className="font-bold text-slate-700">{users.length}</span> Identities Found
                    </Text>
                </div>
                <Text className="fz-small text-slate-400 font-medium italic uppercase tracking-tighter">
                    Double-click row to load profile • ESC to exit
                </Text>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .user-lookup-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.025em !important;
          padding: 10px 16px !important;
          color: #64748b !important;
          font-weight: 700 !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }
        .user-lookup-table .ant-table-tbody > tr > td {
          padding: 8px 16px !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .compact-table .ant-spin-nested-loading { height: 100%; }
        .compact-table .ant-table { height: 100%; }
      `}} />
        </div>
    );
};

export default UserLookup;
