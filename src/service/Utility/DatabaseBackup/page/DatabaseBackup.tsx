import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database, Download, RefreshCw, Folder, Settings,
  FileText, Trash2, Activity,
  History, Terminal, Server, Search
} from 'lucide-react';
import { apiService } from '../../../../services/api';
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
    { label: 'Registered Backups', value: backupList.length, icon: FileText, tone: '' },
    { label: 'Database Node', value: dbInfo?.host || 'N/A', icon: Server, tone: 'tone-info' },
    { label: 'Port Protocol', value: dbInfo?.port || 'N/A', icon: Terminal, tone: 'tone-warning' },
    { label: 'Backup Engine', value: 'pg_dump v14+', icon: Activity, tone: 'tone-success' },
  ];

  return (
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Database Backup Registry</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`aw-pill ${connectionStatus === 'connected' ? 'tone-success' : 'tone-danger'}`}>
              <i className="aw-status-dot" style={{ background: 'var(--aw-tone)' }} />
              {connectionStatus === 'connected' ? 'Live Connection' : 'Disconnected'}
            </span>
          </p>
        </div>
        <div className="aw-actions">
          {isLoading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> Syncing with database server...
            </span>
          )}
          {lastBackupDate && (
            <div style={{ textAlign: 'right' }}>
              <span className="aw-stat-label" style={{ display: 'block' }}>Last Activity</span>
              <span className="aw-strong">{dayjs(lastBackupDate).format('DD MMM YY HH:mm')}</span>
            </div>
          )}
          <button type="button" onClick={handleBackup} disabled={isBackingUp} className="aw-btn aw-btn-primary" data-tip="Create a new backup now" data-tip-pos="bottom-end">
            {isBackingUp ? <RefreshCw size={13} className="aw-spin" /> : <Download size={13} />}
            {isBackingUp ? `${backupProgress}%` : 'Trigger Backup'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="aw-content">
        <div className="aw-stack">

          {/* Stats Overview */}
          <div className="aw-stats aw-stats-4">
            {STATS.map(stat => (
              <div key={stat.label} className={`aw-stat aw-stat-left ${stat.tone}`}>
                <div className="aw-stat-head">
                  <stat.icon size={14} />
                  <span className="aw-stat-label">{stat.label}</span>
                </div>
                <div className="aw-stat-value" style={{ fontSize: 'calc(var(--type-body-size) + 3px)' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="aw-split aw-split-wide">

            {/* Config Panel */}
            <div className="aw-stack">
              <section className="aw-card">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Settings size={14} /></span>
                  <h2 className="aw-card-title">Configuration</h2>
                </div>
                <div className="aw-stack">
                  <div>
                    <label className="aw-label" htmlFor="dbb-path">Destination Path</label>
                    <div className="aw-input-wrap has-icon">
                      <Folder size={13} />
                      <input id="dbb-path" value={destinationPath} onChange={e => setDestinationPath(e.target.value)} className="aw-input" />
                    </div>
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="dbb-name">Custom Name (optional)</label>
                    <input id="dbb-name" value={backupOptions.customName} onChange={e => setBackupOptions(p => ({ ...p, customName: e.target.value }))}
                      placeholder="Leave blank for auto..." className="aw-input" />
                  </div>
                  <div className="aw-stack" style={{ gap: 10 }}>
                    <div className="aw-switch-row">
                      <button type="button" role="switch" id="dbb-schema" aria-checked={backupOptions.includeSchema}
                        onClick={() => setBackupOptions(p => ({ ...p, includeSchema: !p.includeSchema }))} className="aw-switch" />
                      <label htmlFor="dbb-schema" style={{ cursor: 'pointer' }}>Include Schema</label>
                    </div>
                    <div className="aw-switch-row">
                      <button type="button" role="switch" id="dbb-data" aria-checked={backupOptions.includeData}
                        onClick={() => setBackupOptions(p => ({ ...p, includeData: !p.includeData }))} className="aw-switch" />
                      <label htmlFor="dbb-data" style={{ cursor: 'pointer' }}>Include Data</label>
                    </div>
                  </div>
                  <div className="aw-btn-row" style={{ paddingTop: 12, borderTop: '1px solid var(--aw-border)' }}>
                    <button type="button" onClick={initializeComponent} className="aw-btn aw-btn-secondary" data-tip="Reload connection and backup list" data-tip-pos="top-start">
                      <RefreshCw size={13} /> Refresh
                    </button>
                    <button type="button" onClick={handleCleanup} className="aw-btn aw-btn-danger" data-tip="Delete backups older than 30 days" data-tip-pos="top-end">
                      <Trash2 size={13} /> Purge Old
                    </button>
                  </div>
                </div>
              </section>

              {/* DB Info */}
              {dbInfo && (
                <section className="aw-card aw-fade-in">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><Server size={14} /></span>
                    <h2 className="aw-card-title">DB Connection</h2>
                  </div>
                  <div className="aw-rows">
                    {[{ l: 'Host', v: dbInfo.host }, { l: 'Port', v: dbInfo.port }, { l: 'Database', v: dbInfo.database }, { l: 'User', v: dbInfo.username }].map(r => (
                      <div key={r.l} className="aw-row">
                        <span className="aw-row-label">{r.l}</span>
                        <span className="aw-row-value">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Backup History */}
            <section className="aw-card aw-main">
              <div className="aw-main-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span className="aw-card-icon"><History size={14} /></span>
                  <h2 className="aw-card-title">Backup History</h2>
                  <span className="aw-pill">{filteredBackups.length} files</span>
                </div>
                <div className="aw-input-wrap has-icon aw-search">
                  <Search size={13} />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." aria-label="Search backups" className="aw-input" />
                </div>
              </div>
              <div className="aw-main-body" style={{ padding: 0, maxHeight: '60vh' }}>
                {filteredBackups.length > 0 ? (
                  <table className="aw-table">
                    <thead>
                      <tr>
                        {['File Name', 'Type', 'Size', 'Created', 'Path'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBackups.map((backup, i) => (
                        <tr key={i}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <FileText size={14} style={{ color: 'var(--aw-accent)', flex: 'none' }} />
                              <span style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{backup.fileName}</span>
                            </span>
                          </td>
                          <td>
                            <span className={`aw-pill ${backup.type === 'full' ? 'tone-success' : backup.type === 'schema' ? 'tone-info' : 'tone-warning'}`} style={{ textTransform: 'uppercase' }}>
                              {backup.type}
                            </span>
                          </td>
                          <td className="is-muted" style={{ whiteSpace: 'nowrap' }}>{formatFileSize(backup.fileSize)}</td>
                          <td className="is-muted" style={{ whiteSpace: 'nowrap' }}>{dayjs(backup.createdAt).format('DD MMM YY HH:mm')}</td>
                          <td className="is-muted" title={backup.filePath} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{backup.filePath}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="aw-empty">
                    <FileText size={34} />
                    <span>No backups found</span>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Progress Overlay */}
      {isBackingUp && (
        <div className="aw-modal-backdrop">
          <div className="aw-modal" role="alertdialog" aria-modal="true" aria-label="Backup in progress" style={{ maxWidth: '20rem', height: 'auto', padding: 24, textAlign: 'center' }}>
            <Database size={32} style={{ color: 'var(--aw-accent)', margin: '0 auto 12px' }} />
            <h3 className="aw-card-title" style={{ marginBottom: 4 }}>Backup in Progress</h3>
            <p className="aw-muted" style={{ marginBottom: 16 }}>Please wait while the database is being backed up...</p>
            <div className="aw-bar" role="progressbar" aria-valuenow={backupProgress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${backupProgress}%` }} />
            </div>
            <p className="aw-strong" style={{ marginTop: 8, color: 'var(--aw-accent)' }}>{backupProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseBackup;
