import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database, Download, RefreshCw, Folder, Settings, Clock, HardDrive,
  FileText, Trash2, Lock, Info, ShieldCheck, Building2, Activity,
  History, Terminal, Server, Search
} from 'lucide-react';
import { apiService } from '../../../../services/api';
import { ConfigProvider, Switch, Spin, Input, Badge, Empty } from 'antd';
import dayjs from 'dayjs';

const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

const showConfirm = async (title: string, detail: string): Promise<boolean> => {
  if ((window as any).electronAPI?.showMessageBox) {
    const result = await (window as any).electronAPI.showMessageBox({ type: 'question', title: 'electron-react-ts', message: title, detail, buttons: ['Confirm', 'Cancel'], defaultId: 0, cancelId: 1 });
    return result?.response === 0;
  }
  return window.confirm(`${title}\n\n${detail}`);
};

interface BackupInfo { fileName: string; filePath: string; fileSize: number; createdAt: string; type: 'full' | 'schema' | 'data'; }
interface DatabaseInfo { host: string; port: number; database: string; username: string; }

const lbl = "block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inp = "h-7 text-[11px] font-semibold bg-white border-slate-300 rounded px-2 w-full focus:outline-none focus:border-indigo-400";

const DatabaseBackup: React.FC = () => {
  const [destinationPath, setDestinationPath] = useState('C:\\DatabaseBackups');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);
  const [backupOptions, setBackupOptions] = useState({ includeSchema: true, includeData: true, customName: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  useEffect(() => { initializeComponent(); }, []);

  const initializeComponent = useCallback(async () => {
    setIsLoading(true);
    try { await Promise.all([testConnection(), loadDatabaseInfo(), loadBackupList()]); }
    catch { await showDialog('error', 'Initialization Error', 'Failed to initialize backup utility.'); }
    finally { setIsLoading(false); }
  }, []);

  const testConnection = useCallback(async () => {
    try {
      const response = await apiService.testDatabaseConnection();
      if (response.success && response.data) {
        setConnectionStatus(response.data.connected ? 'connected' : 'disconnected');
        if (!response.data.connected) await showDialog('warning', 'Connection Warning', response.data.message || 'Database connection issue detected.');
      } else setConnectionStatus('disconnected');
    } catch { setConnectionStatus('disconnected'); }
  }, []);

  const loadDatabaseInfo = useCallback(async () => {
    try {
      const response = await apiService.getDatabaseInfo();
      if (response.success && response.data) setDbInfo(response.data);
    } catch { }
  }, []);

  const loadBackupList = useCallback(async () => {
    try {
      const response = await apiService.getBackupList();
      if (response.success && response.data) {
        const backups = Array.isArray(response.data) ? response.data : [];
        setBackupList(backups);
        if (backups.length > 0) setLastBackupDate(backups[0].createdAt);
      }
    } catch { setBackupList([]); }
  }, []);

  const handleBackup = useCallback(async () => {
    if (connectionStatus !== 'connected') { await showDialog('error', 'Connection Unavailable', 'Database connection is not available.'); return; }
    setIsBackingUp(true); setBackupProgress(0);
    try {
      const progressInterval = setInterval(() => { setBackupProgress(prev => { if (prev >= 95) { clearInterval(progressInterval); return prev; } return prev + (prev < 30 ? 5 : prev < 70 ? 2 : 1); }); }, 500);
      const response = await apiService.createDatabaseBackup({ destinationPath, ...backupOptions });
      clearInterval(progressInterval); setBackupProgress(100);
      if (response.success) { await showDialog('info', 'Backup Successful', 'Database backup completed!'); await loadBackupList(); }
      else throw new Error(response.message || 'Backup failed');
    } catch (e: any) { await showDialog('error', 'Backup Failed', e.message || 'Unknown error.'); }
    finally { setTimeout(() => { setIsBackingUp(false); setBackupProgress(0); }, 1000); }
  }, [connectionStatus, destinationPath, backupOptions, loadBackupList]);

  const handleCleanup = useCallback(async () => {
    const confirmed = await showConfirm('Cleanup Old Backups', 'This will permanently delete backups older than 30 days.');
    if (!confirmed) return;
    setIsLoading(true);
    try {
      const response = await apiService.cleanupOldBackups();
      if (response.success) { await showDialog('info', 'Cleanup Complete', 'Old backups removed.'); await loadBackupList(); }
      else await showDialog('error', 'Cleanup Failed', response.message || 'Cleanup failed.');
    } catch { await showDialog('error', 'Cleanup Error', 'Failed to cleanup.'); }
    finally { setIsLoading(false); }
  }, [loadBackupList]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const filteredBackups = useMemo(() => backupList.filter(b => b.fileName.toLowerCase().includes(searchQuery.toLowerCase())), [backupList, searchQuery]);

  const STATS = [
    { label: 'Registered Backups', value: backupList.length, icon: FileText, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Database Node', value: dbInfo?.host || 'N/A', icon: Server, color: 'bg-blue-50 text-blue-600' },
    { label: 'Port Protocol', value: dbInfo?.port || 'N/A', icon: Terminal, color: 'bg-slate-100 text-slate-600' },
    { label: 'Backup Engine', value: 'pg_dump v14+', icon: Activity, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <Database size={13} className="text-white" />
            </div>
            <div>
              <h1 className="text-[11px] font-black text-white tracking-wider uppercase leading-none">Database Backup Registry</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge status={connectionStatus === 'connected' ? 'success' : 'error'}
                  text={<span className="text-[7px] font-black text-slate-300 uppercase tracking-wider">
                    {connectionStatus === 'connected' ? 'Live Connection' : 'Disconnected'}
                  </span>} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastBackupDate && (
              <div className="hidden lg:flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                <Activity size={10} className="text-indigo-300" />
                <div className="flex flex-col items-end">
                  <span className="text-[7px] font-black text-slate-300 uppercase">Last Activity</span>
                  <span className="text-[9px] font-bold text-white">{dayjs(lastBackupDate).format('DD MMM YY HH:mm')}</span>
                </div>
              </div>
            )}
            <button onClick={handleBackup} disabled={isBackingUp}
              className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 transition-all uppercase tracking-wide">
              {isBackingUp ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
              {isBackingUp ? `${backupProgress}%` : 'Trigger Backup'}
            </button>
          </div>
        </div>

        {/* Body */}
        <Spin spinning={isLoading} tip="Syncing with database server...">
          <div className="flex-1 overflow-auto p-2 space-y-2">

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-1.5 shrink-0">
              {STATS.map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-2.5 flex items-center justify-between">
                  <div className={`p-1.5 rounded-lg ${stat.color}`}><stat.icon size={14} /></div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{stat.label}</span>
                    <span className="text-[12px] font-black text-slate-800">{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-1.5">

              {/* Config Panel */}
              <div className="col-span-4 space-y-1.5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                    <Settings size={10} className="text-slate-400" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Configuration</span>
                  </div>
                  <div className="p-2.5 space-y-2">
                    <div>
                      <label className={lbl}>Destination Path</label>
                      <Input value={destinationPath} onChange={e => setDestinationPath(e.target.value)}
                        prefix={<Folder size={10} className="text-slate-400" />}
                        className="h-7 text-[10px] font-semibold" />
                    </div>
                    <div>
                      <label className={lbl}>Custom Name (optional)</label>
                      <input value={backupOptions.customName} onChange={e => setBackupOptions(p => ({ ...p, customName: e.target.value }))}
                        placeholder="Leave blank for auto..." className={inp} />
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Switch size="small" checked={backupOptions.includeSchema} onChange={v => setBackupOptions(p => ({ ...p, includeSchema: v }))} />
                          <label className="text-[9px] font-semibold text-slate-600">Include Schema</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch size="small" checked={backupOptions.includeData} onChange={v => setBackupOptions(p => ({ ...p, includeData: v }))} />
                          <label className="text-[9px] font-semibold text-slate-600">Include Data</label>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                      <button onClick={initializeComponent}
                        className="flex-1 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-all">
                        <RefreshCw size={10} /> Refresh
                      </button>
                      <button onClick={handleCleanup}
                        className="flex-1 h-7 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-all border border-rose-200">
                        <Trash2 size={10} /> Purge Old
                      </button>
                    </div>
                  </div>
                </div>

                {/* DB Info */}
                {dbInfo && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                      <Server size={10} className="text-slate-400" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">DB Connection</span>
                    </div>
                    <div className="p-2.5 space-y-1.5 text-[9px]">
                      {[{ l: 'Host', v: dbInfo.host }, { l: 'Port', v: dbInfo.port }, { l: 'Database', v: dbInfo.database }, { l: 'User', v: dbInfo.username }].map(r => (
                        <div key={r.l} className="flex justify-between border-b border-slate-50 pb-1">
                          <span className="font-black text-slate-400 uppercase">{r.l}</span>
                          <span className="font-black text-slate-700">{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Backup History */}
              <div className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <History size={10} className="text-slate-400" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Backup History</span>
                    <span className="text-[8px] font-black text-indigo-600 ml-1">{filteredBackups.length} files</span>
                  </div>
                  <div className="relative">
                    <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search..." className="h-6 pl-6 pr-2 text-[9px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 w-40" />
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {filteredBackups.length > 0 ? (
                    <table className="w-full">
                      <thead className="sticky top-0 bg-[#f8fafc]">
                        <tr>
                          {['File Name', 'Type', 'Size', 'Created', 'Path'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[8px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBackups.map((backup, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <FileText size={11} className="text-indigo-400 shrink-0" />
                                <span className="text-[9px] font-black text-slate-700 truncate max-w-[160px]">{backup.fileName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${backup.type === 'full' ? 'bg-emerald-50 text-emerald-600' : backup.type === 'schema' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                {backup.type}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-[9px] text-slate-600">{formatFileSize(backup.fileSize)}</td>
                            <td className="px-3 py-1.5 text-[9px] text-slate-600">{dayjs(backup.createdAt).format('DD MMM YY HH:mm')}</td>
                            <td className="px-3 py-1.5 text-[9px] text-slate-400 truncate max-w-[120px]" title={backup.filePath}>{backup.filePath}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[9px] font-black text-slate-400 uppercase">No backups found</span>} />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </Spin>

        {/* Progress Overlay */}
        {isBackingUp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center">
              <Database size={32} className="text-indigo-600 mx-auto mb-3" />
              <h3 className="text-[11px] font-black text-slate-800 uppercase mb-1">Backup in Progress</h3>
              <p className="text-[9px] text-slate-400 mb-4">Please wait while the database is being backed up...</p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${backupProgress}%` }} />
              </div>
              <p className="text-[10px] font-black text-indigo-600 mt-2">{backupProgress}%</p>
            </div>
          </div>
        )}

      </div>
    </ConfigProvider>
  );
};

export default DatabaseBackup;
