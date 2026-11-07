import React from 'react';
import { Sparkles, TrendingUp, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Slide } from '../slides/SlideDeck';
import type { Release } from './whatsNew';

const GROUPS = [
  { key: 'new', label: 'New', Icon: Sparkles, color: '#6366f1' },
  { key: 'improved', label: 'Improved', Icon: TrendingUp, color: '#0ea5e9' },
  { key: 'fixed', label: 'Fixed', Icon: Wrench, color: '#10b981' },
] as const;

const ReleaseBody: React.FC<{ release: Release }> = ({ release }) => {
  const { t } = useTranslation();
  const groups = GROUPS.map((g) => ({ ...g, items: release[g.key] ?? [] })).filter((g) => g.items.length > 0);
  if (groups.length === 0) return <p className="ob-lead">{t('This update has no notes.')}</p>;
  return (
    <div className="ob-wn">
      {groups.map((g) => (
        <section key={g.key} className="ob-wn-group" style={{ ['--c' as any]: g.color }}>
          <h3><span className="ob-chip"><g.Icon size={16} /></span>{t(g.label)}</h3>
          <ul className="ob-wn-list">
            {g.items.map((text, i) => <li key={i} style={{ ['--k' as any]: i }}>{text}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '';

/** One slide per release, newest first. */
export const buildWhatsNewSlides = (releases: Release[], title: (version: string) => string): Slide[] =>
  releases.map((r) => {
    const subtitle = [r.title, fmtDate(r.date)].filter(Boolean).join(' · ');
    return { id: `v${r.version}`, title: title(r.version), ...(subtitle ? { subtitle } : {}), body: <ReleaseBody release={r} /> };
  });
