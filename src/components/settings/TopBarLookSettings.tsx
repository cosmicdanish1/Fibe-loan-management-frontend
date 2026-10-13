import React, { useState } from 'react';
import { Bell, Search, CheckCircle2, Trash2, Inbox, AppWindow } from 'lucide-react';
import {
  useUiPrefs, saveUiPrefs, clearSearchUsage, glassVars, DEFAULT_UI_PREFS,
  type NotifPrefs, type SearchPrefs, type UiPrefs, type Shape,
} from '../../services/uiPrefs';
import '../topbar/topbar.css';

// Colours come from the Settings shell variables so this follows Light / Dark.
const S = {
  text: 'var(--settings-text)',
  strong: 'var(--settings-text-strong)',
  dim: 'var(--settings-dim)',
  dimmer: 'var(--settings-dimmer)',
  border: 'var(--settings-border)',
  divider: 'var(--settings-divider)',
  fill: 'var(--settings-fill)',
};

const label: React.CSSProperties = { color: S.text };

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; accent: string; label: string }> = ({ on, onChange, accent, label: l }) => (
  <button
    type="button" role="switch" aria-checked={on} aria-label={l} onClick={() => onChange(!on)}
    className="relative shrink-0 border-0 cursor-pointer"
    style={{ width: 42, height: 24, borderRadius: 12, background: on ? accent : S.border }}
  >
    <span
      className="absolute block rounded-full settings-knob"
      style={{ width: 20, height: 20, top: 2, left: 2, transform: `translateX(${on ? 18 : 0}px)`, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }}
    />
  </button>
);

function Choice<T extends string>({ value, options, onChange, accent, name }: {
  value: T; accent: string; name: string;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={name}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className="flex-1 text-left rounded-xl px-3 py-2.5 cursor-pointer"
            style={on
              ? { background: `color-mix(in srgb, ${accent} 16%, transparent)`, border: `1.5px solid ${accent}`, color: S.strong }
              : { background: S.fill, border: `1.5px solid transparent`, color: S.text }}
          >
            <span className="fz-body font-bold block">{o.label}</span>
            {o.hint && <span className="fz-small block mt-0.5" style={{ color: S.dim }}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

const Row: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <span className="fz-body font-bold block" style={label}>{title}</span>
      {desc && <span className="fz-small block mt-0.5" style={{ color: S.dim }}>{desc}</span>}
    </div>
    {children}
  </div>
);

const Strength: React.FC<{ value: number; onChange: (v: number) => void; accent: string; disabled?: boolean; name: string }> = ({ value, onChange, accent, disabled, name }) => (
  <div className="flex items-center gap-3" style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
    <span className="fz-tiny font-black uppercase tracking-widest" style={{ color: S.dimmer }}>Clear</span>
    <input
      type="range" min={0} max={100} value={value} aria-label={name}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: 160, accentColor: accent }}
    />
    <span className="fz-tiny font-black uppercase tracking-widest" style={{ color: S.dimmer }}>Solid</span>
  </div>
);

const Heading: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-center gap-2 pt-1">
    <span style={{ color: S.dim }}>{icon}</span>
    <h4 className="fz-small font-black uppercase tracking-widest" style={{ color: S.dim }}>{children}</h4>
  </div>
);

/** Tiny live preview on a colourful backdrop so the glass effect is visible. */
const Preview: React.FC<{ shape: Shape; glass: boolean; strength: number; children: React.ReactNode }> = ({ shape, glass, strength, children }) => (
  <div className="relative overflow-hidden rounded-xl p-3" style={{ background: 'linear-gradient(120deg,#6366f1,#ec4899 55%,#f59e0b)' }}>
    <div className="absolute -top-6 -left-4 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,.35)', filter: 'blur(18px)' }} />
    <div className="absolute -bottom-8 right-4 w-28 h-28 rounded-full" style={{ background: 'rgba(16,185,129,.55)', filter: 'blur(20px)' }} />
    <div className="tb-root tb-still relative" data-shape={shape} style={glassVars(glass, strength)}>
      {children}
    </div>
  </div>
);

export const TopBarLookSettings: React.FC<{ accent: string }> = ({ accent }) => {
  const prefs = useUiPrefs();
  const [cleared, setCleared] = useState(false);

  const setNotif = (patch: Partial<NotifPrefs>) => saveUiPrefs({ ...prefs, notif: { ...prefs.notif, ...patch } });
  const setSearch = (patch: Partial<SearchPrefs>) => saveUiPrefs({ ...prefs, search: { ...prefs.search, ...patch } });
  const reset = () => saveUiPrefs(DEFAULT_UI_PREFS as UiPrefs);

  const n = prefs.notif;
  const s = prefs.search;
  const shapeOptions: { value: Shape; label: string; hint: string }[] = [
    { value: 'soft', label: 'Rounded', hint: 'Soft corners' },
    { value: 'round', label: 'Round', hint: 'Pill / circular shapes' },
  ];

  return (
    <div className="space-y-5">
      {/* ── Notifications ─────────────────────────────────────────────── */}
      <Heading icon={<Bell size={14} />}>Notification look</Heading>

      <Preview shape={n.shape} glass={n.glass} strength={n.glassStrength}>
        <div className="flex flex-col gap-2" style={{ maxWidth: 320 }}>
          {[
            { t: 'error', title: '2 notifications failed', d: 'Last failure — EMAIL to Member #900000002', I: <Inbox size={16} /> },
            { t: 'success', title: 'Backup completed', d: 'Database backed up successfully.', I: <CheckCircle2 size={16} /> },
          ].map(x => (
            <div
              key={x.title}
              className={`tb-item tb-surface ${n.style === 'panel' ? '' : ''}`}
              data-type={x.t}
              style={{ padding: '10px 12px', borderRadius: n.style === 'bubble' ? 'var(--tb-r)' : 'var(--tb-ri)', animation: 'none' }}
            >
              <div className="tb-ico">{x.I}</div>
              <div className="tb-body">
                <div className="tb-name">{x.title}</div>
                <p className="tb-desc" style={{ margin: 0 }}>{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </Preview>

      <div>
        <p className="fz-small font-black uppercase tracking-widest mb-2" style={{ color: S.dimmer }}>Style</p>
        <Choice
          name="Notification style" accent={accent} value={n.style} onChange={v => setNotif({ style: v })}
          options={[
            { value: 'panel', label: 'Panel', hint: 'One tidy card with a list' },
            { value: 'bubble', label: 'Bubbles', hint: 'Each alert floats on its own' },
          ]}
        />
      </div>
      <div>
        <p className="fz-small font-black uppercase tracking-widest mb-2" style={{ color: S.dimmer }}>Shape</p>
        <Choice name="Notification shape" accent={accent} value={n.shape} onChange={v => setNotif({ shape: v })} options={shapeOptions} />
      </div>
      <Row title="Liquid glass" desc="Semi-transparent, blurred surface">
        <Switch on={n.glass} accent={accent} label="Notification liquid glass" onChange={v => setNotif({ glass: v })} />
      </Row>
      <Row title="Glass transparency" desc="Clear shows more of what is behind">
        <Strength value={n.glassStrength} accent={accent} disabled={!n.glass} name="Notification glass strength" onChange={v => setNotif({ glassStrength: v })} />
      </Row>
      <Row title="Animations" desc="Smooth open, close and list motion">
        <Switch on={n.animations} accent={accent} label="Notification animations" onChange={v => setNotif({ animations: v })} />
      </Row>
      <Row title="Pop-up for new alerts" desc="A small toast when something new arrives">
        <Switch on={n.toasts} accent={accent} label="New alert pop-ups" onChange={v => setNotif({ toasts: v })} />
      </Row>
      {n.toasts && (
        <div>
          <p className="fz-small font-black uppercase tracking-widest mb-2" style={{ color: S.dimmer }}>Pop-up position</p>
          <Choice
            name="Pop-up position" accent={accent} value={n.toastPosition} onChange={v => setNotif({ toastPosition: v })}
            options={[
              { value: 'top-right', label: 'Top right' },
              { value: 'top-center', label: 'Top centre' },
              { value: 'bottom-right', label: 'Bottom right' },
            ]}
          />
        </div>
      )}

      <div style={{ borderTop: `1px solid ${S.divider}` }} />

      {/* ── Search ────────────────────────────────────────────────────── */}
      <Heading icon={<Search size={14} />}>Search look</Heading>

      <Preview shape={s.shape} glass={s.glass} strength={s.glassStrength}>
        <div className="tb-field tb-still" style={{ width: '100%', maxWidth: 320 }}>
          <Search size={15} />
          <input readOnly placeholder="Search windows & features" tabIndex={-1} />
          <span className="tb-kbd"><span>Ctrl</span><span>K</span></span>
        </div>
        <div className="tb-surface" style={{ marginTop: 8, maxWidth: 320, borderRadius: 'var(--tb-r)', padding: 6 }}>
          <div className="tb-res" data-active="true" style={{ animation: 'none' }}>
            <span className="tb-res-ico"><AppWindow size={15} /></span>
            <span className="tb-res-main">
              <div className="tb-res-title"><mark>I</mark>nterest Calculation</div>
              <div className="tb-res-path">Administration</div>
            </span>
          </div>
        </div>
      </Preview>

      <div>
        <p className="fz-small font-black uppercase tracking-widest mb-2" style={{ color: S.dimmer }}>Shape</p>
        <Choice name="Search shape" accent={accent} value={s.shape} onChange={v => setSearch({ shape: v })} options={shapeOptions} />
      </div>
      <Row title="Liquid glass" desc="Semi-transparent, blurred search bar and results">
        <Switch on={s.glass} accent={accent} label="Search liquid glass" onChange={v => setSearch({ glass: v })} />
      </Row>
      <Row title="Glass transparency">
        <Strength value={s.glassStrength} accent={accent} disabled={!s.glass} name="Search glass strength" onChange={v => setSearch({ glassStrength: v })} />
      </Row>
      <Row title="Animations" desc="Expanding bar and result motion">
        <Switch on={s.animations} accent={accent} label="Search animations" onChange={v => setSearch({ animations: v })} />
      </Row>
      <Row title="Learn what I open" desc="Typing “i” puts Interest Calculation first if that is what you usually open">
        <Switch on={s.learn} accent={accent} label="Learn search habits" onChange={v => setSearch({ learn: v })} />
      </Row>
      <Row title="Learned searches" desc="Forget which windows you open most">
        <button
          type="button"
          onClick={() => { clearSearchUsage(); setCleared(true); window.setTimeout(() => setCleared(false), 1800); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer fz-small font-black uppercase tracking-widest"
          style={{ background: S.fill, border: `1px solid ${S.border}`, color: cleared ? 'var(--settings-green)' : S.text }}
        >
          <Trash2 size={12} /> {cleared ? 'Cleared' : 'Reset'}
        </button>
      </Row>

      <div className="flex justify-end">
        <button
          type="button" onClick={reset}
          className="px-3 py-1.5 rounded-lg cursor-pointer fz-small font-black uppercase tracking-widest"
          style={{ background: S.fill, border: `1px solid ${S.border}`, color: S.dim }}
        >
          Restore defaults
        </button>
      </div>
    </div>
  );
};

export default TopBarLookSettings;
