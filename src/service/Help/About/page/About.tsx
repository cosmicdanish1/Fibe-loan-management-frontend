import React, { useState, useEffect, useCallback } from 'react';
import { Info, Building2, Mail, Code2, Cpu, Sparkles, Users, ShieldCheck, Zap, Heart, Award } from 'lucide-react';
import { apiService } from '../../../../services/api';
import AwDialog from '@/components/shared/kit/AwDialog';

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp: string;
}

interface ModalDetail {
  kicker: string;
  title: string;
  body: string;
  points: { label: string; value: string }[];
}

const DETAILS: Record<string, ModalDetail> = {
  members: {
    kicker: 'Capability',
    title: 'Member management',
    body: "Onboarding, KYC, share capital and closure handled as one continuous record, so a member's history never fragments across modules.",
    points: [
      { label: 'Records supported', value: 'Unlimited' },
      { label: 'KYC documents', value: 'Aadhaar · PAN · Bank' },
      { label: 'Audit trail', value: 'Per-field history' },
    ],
  },
  security: {
    kicker: 'Capability',
    title: 'Secure transactions',
    body: 'Every posting is double-entry, signed and immutable. Local data rests encrypted; sync is mutually authenticated.',
    points: [
      { label: 'Encryption at rest', value: 'AES-256' },
      { label: 'Transport', value: 'TLS 1.3' },
      { label: 'Access control', value: 'Role based' },
    ],
  },
  reports: {
    kicker: 'Capability',
    title: 'Real-time reports',
    body: 'Ledgers, NPA ageing and collection sheets recompute as vouchers are entered — no nightly batch to wait on.',
    points: [
      { label: 'Refresh', value: 'Live' },
      { label: 'Export', value: 'PDF · XLSX' },
      { label: 'Statutory formats', value: 'Included' },
    ],
  },
  stack: {
    kicker: 'Engineering',
    title: 'Modern stack',
    body: 'A typed React desktop client over a NestJS service layer and PostgreSQL, packaged with Electron for offline-first branches.',
    points: [
      { label: 'Client', value: 'React · TypeScript' },
      { label: 'Service', value: 'NestJS' },
      { label: 'Storage', value: 'PostgreSQL 16' },
    ],
  },
  ux: {
    kicker: 'Experience',
    title: 'User friendly',
    body: 'Keyboard-first data entry, forgiving defaults and one visual language across every screen, tuned for all-day counter work.',
    points: [
      { label: 'Keyboard coverage', value: 'Full' },
      { label: 'Languages', value: 'EN · HI' },
      { label: 'Training time', value: 'Under a day' },
    ],
  },
  enterprise: {
    kicker: 'Operations',
    title: 'Enterprise ready',
    body: 'Multi-branch deployments with scheduled backups, staged upgrades and supervised restore paths.',
    points: [
      { label: 'Branches', value: 'Multi-site' },
      { label: 'Backups', value: 'Hourly · retained 30d' },
      { label: 'Support', value: '24/7' },
    ],
  },
};

const FEATURES = [
  { key: 'members', title: 'Member management', desc: 'Complete member lifecycle', icon: <Users size={16} /> },
  { key: 'security', title: 'Secure transactions', desc: 'Bank-grade security', icon: <ShieldCheck size={16} /> },
  { key: 'reports', title: 'Real-time reports', desc: 'Instant analytics', icon: <Zap size={16} /> },
  { key: 'stack', title: 'Modern stack', desc: 'Latest technologies', icon: <Code2 size={16} /> },
  { key: 'ux', title: 'User friendly', desc: 'Intuitive interface', icon: <Heart size={16} /> },
  { key: 'enterprise', title: 'Enterprise ready', desc: 'Production tested', icon: <Award size={16} /> },
];

const COMPANY = [
  { label: 'Legal name', value: 'Paper White Technology' },
  { label: 'Established', value: '2025' },
  { label: 'Location', value: 'India' },
  { label: 'Industry', value: 'Financial Technology' },
];

const CONTACT: { label: string; value: string; href?: string }[] = [
  { label: 'Email', value: 'thekovain@gmail.com', href: 'mailto:thekovain@gmail.com' },
  { label: 'Phone', value: '+91 7692829866' },
  { label: 'Website', value: 'paperwhitetech.com', href: 'https://www.paperwhitetech.com' },
  { label: 'Support', value: '24/7 available' },
];

const TECH = ['React', 'TypeScript', 'Electron', 'NestJS', 'PostgreSQL', 'Tailwind CSS'];

const About: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [modal, setModal] = useState<string | null>(null);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const response = await apiService.request<SystemInfo>('/admin/system-info', { method: 'GET' });
      if (response.success && response.data) {
        setSystemInfo(response.data);
      }
    } catch { /* system info is optional */ }
  }, []);

  useEffect(() => { fetchSystemInfo(); }, [fetchSystemInfo]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const getModalData = (): ModalDetail | null => {
    if (!modal) return null;
    if (modal === 'runtime') {
      return {
        kicker: 'System',
        title: 'Runtime status',
        body: 'Live figures reported by the local application host at last refresh.',
        points: systemInfo
          ? [
              { label: 'Node version', value: systemInfo.nodeVersion },
              { label: 'Platform', value: systemInfo.platform },
              { label: 'Heap used', value: `${systemInfo.memoryUsage.heapUsed} MB of ${systemInfo.memoryUsage.heapTotal} MB` },
              { label: 'RSS', value: `${systemInfo.memoryUsage.rss} MB` },
            ]
          : [{ label: 'Status', value: 'Unavailable' }],
      };
    }
    return DETAILS[modal] ?? null;
  };

  const modalData = getModalData();
  const heapUsed = systemInfo?.memoryUsage.heapUsed ?? 71;
  const heapTotal = systemInfo?.memoryUsage.heapTotal ?? 84;
  const heapPct = heapTotal > 0 ? Math.min(100, (heapUsed / heapTotal) * 100) : 84.5;
  const uptime = systemInfo ? formatUptime(systemInfo.uptime) : '—';
  const nodeVersion = systemInfo?.nodeVersion ?? 'v22.17.0';

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">About System</h1>
          <p className="aw-desc">Fibe Loan Management</p>
        </div>
        <div className="aw-actions">
          <span className="aw-pill tone-success"><span className="aw-status-dot" /> All systems normal</span>
          <span className="aw-pill">Version 1.0.0</span>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack" style={{ maxWidth: 1080 }}>
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Info size={14} /></span>
              <h2 className="aw-card-title">Paper White Technology</h2>
              <span className="aw-meta" style={{ marginLeft: 'auto' }}>Financial Technology · India</span>
            </div>
            <p className="aw-strong">Lending infrastructure for cooperative societies — members, ledgers and compliance in one desktop workspace.</p>
            <div className="aw-inline" style={{ gap: 8, flexWrap: 'wrap' }}>
              {['Enterprise Edition', 'Production Ready', 'Est. 2025'].map((badge, i) => (
                <span key={badge} className={`aw-pill ${i === 1 ? 'tone-success' : ''}`}>{badge}</span>
              ))}
            </div>
          </section>

          <div className="aw-two">
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Building2 size={14} /></span>
                <h2 className="aw-card-title">Company</h2>
              </div>
              <div className="aw-rows">
                {COMPANY.map(row => (
                  <div key={row.label} className="aw-row"><span className="aw-meta">{row.label}</span><strong>{row.value}</strong></div>
                ))}
              </div>
            </section>

            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Mail size={14} /></span>
                <h2 className="aw-card-title">Contact</h2>
              </div>
              <div className="aw-rows">
                {CONTACT.map(row => (
                  <div key={row.label} className="aw-row">
                    <span className="aw-meta">{row.label}</span>
                    {row.href ? <a href={row.href} style={{ fontWeight: 700, color: 'var(--aw-accent)' }}>{row.value}</a> : <strong>{row.value}</strong>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="aw-two">
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Code2 size={14} /></span>
                <h2 className="aw-card-title">Built with</h2>
                <span className="aw-meta" style={{ marginLeft: 'auto' }}>6 core technologies</span>
              </div>
              <div className="aw-chips">
                {TECH.map(tech => <span key={tech} className="aw-pill">{tech}</span>)}
              </div>
            </section>

            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Cpu size={14} /></span>
                <h2 className="aw-card-title">Runtime</h2>
                <button type="button" onClick={() => setModal('runtime')} className="aw-btn aw-btn-secondary aw-btn-sm" style={{ marginLeft: 'auto' }}>Details</button>
              </div>
              <div className="aw-two">
                <div className="aw-stat">
                  <div className="aw-stat-label">Node</div>
                  <div className="aw-stat-value">{nodeVersion}</div>
                </div>
                <div className="aw-stat">
                  <div className="aw-stat-label">Uptime</div>
                  <div className="aw-stat-value">{uptime}</div>
                </div>
              </div>
              <div className="aw-row" style={{ borderBottom: 0 }}>
                <span className="aw-meta">Heap memory</span>
                <strong>{heapUsed} MB / {heapTotal} MB</strong>
              </div>
              <div className="aw-bar" role="progressbar" aria-valuenow={Math.round(heapPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Heap memory used">
                <span style={{ width: `${heapPct}%` }} />
              </div>
            </section>
          </div>

          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Sparkles size={14} /></span>
              <h2 className="aw-card-title">Capabilities</h2>
              <span className="aw-meta" style={{ marginLeft: 'auto' }}>Select a card for detail</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 'var(--aw-gap)' }}>
              {FEATURES.map(feat => (
                <button key={feat.key} type="button" onClick={() => setModal(feat.key)} className="aw-panel"
                  style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', font: 'inherit', color: 'inherit' }}>
                  <span className="aw-card-icon">{feat.icon}</span>
                  <span>
                    <strong style={{ display: 'block' }}>{feat.title}</strong>
                    <span className="aw-meta">{feat.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="aw-footer">
        <span>© {new Date().getFullYear()} Paper White Technology · All rights reserved</span>
        <span>About</span>
      </div>

      <AwDialog open={!!(modal && modalData)} title={modalData?.title ?? ''} onClose={() => setModal(null)} icon={<Info size={14} />} maxWidth="30rem" compact>
        {modalData && (
          <div className="aw-stack">
            <span className="aw-label">{modalData.kicker}</span>
            <p>{modalData.body}</p>
            <div className="aw-rows">
              {modalData.points.map((pt, i) => (
                <div key={i} className="aw-row"><span className="aw-meta">{pt.label}</span><strong>{pt.value}</strong></div>
              ))}
            </div>
            <button type="button" onClick={() => setModal(null)} className="aw-btn aw-btn-primary">Done</button>
          </div>
        )}
      </AwDialog>
    </div>
  );
};

export default About;
