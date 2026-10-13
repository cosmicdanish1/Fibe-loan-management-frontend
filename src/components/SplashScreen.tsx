import React, { useEffect, useRef, useState } from 'react';
import { animate, createTimeline, stagger } from 'animejs';
import fibeLogo from '../assets/fibe-logo.png';

interface Props {
  onDone: () => void;
}

const STREAK_COUNT = 21;
const STREAK_COLORS = ['#3b82f6', '#22c55e', '#8b5cf6', '#60a5fa', '#4ade80'];

const FADE_AT = 3200;
const DONE_AT = 3900;

const SplashScreen: React.FC<Props> = ({ onDone }) => {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('out'), FADE_AT);
    const doneTimer = setTimeout(() => {
      sessionStorage.setItem('fibe_splash_shown', '1');
      onDone();
    }, DONE_AT);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (sel: string) => root.querySelectorAll(sel);

    const tl = createTimeline({ defaults: { ease: 'outExpo' } })
      // 1. a thin light line draws across the screen, then collapses
      .add(q('.sp-line'), { scaleX: [0, 1], opacity: [0, 1], duration: 800, ease: 'inOutQuart' }, 100)
      .add(q('.sp-line'), { scaleY: [1, 0.15], opacity: [1, 0], duration: 500, ease: 'inQuad' }, 950)
      // 2. glow blooms and light streaks rise from the line, fanning from the centre
      .add(q('.sp-flare'), { opacity: [0, 1], scale: [0.3, 1.15], duration: 1500 }, 700)
      .add(q('.sp-streak'), {
        scaleY: [0, 1],
        opacity: [{ to: 0.9, duration: 350 }, { to: 0, duration: 1200 }],
        duration: 1550,
      }, stagger(45, { from: 'center', start: 750 }))
      // 3. logo resolves out of a blurred zoom
      .add(q('.sp-logo'), {
        opacity: [0, 1],
        scale: [1.5, 1],
        filter: ['blur(18px)', 'blur(0px)'],
        duration: 1200,
      }, 800)
      // 4. subtitle tightens into place
      .add(q('.sp-sub'), { opacity: [0, 1], translateY: [12, 0], letterSpacing: ['0.8em', '0.38em'], duration: 900 }, 1650)
      .add(q('.sp-sub-rule'), { scaleX: [0, 1], duration: 700 }, 1900);

    const dots = animate(q('.sp-dot'), {
      scale: [0.5, 1], opacity: [0.3, 1], duration: 450,
      delay: stagger(150, { start: 2000 }), loop: true, alternate: true, ease: 'inOutSine',
    });

    return () => { tl.revert(); dots.revert(); };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: '#ffffff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)',
        opacity: phase === 'out' ? 0 : 1,
        transform: phase === 'out' ? 'scale(1.07)' : 'scale(1)',
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      {/* Soft flare behind the logo */}
      <div className="sp-flare" style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 680, height: 360, marginLeft: -340, marginTop: -190, borderRadius: '50%', opacity: 0,
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.16) 0%, rgba(34,197,94,0.07) 40%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Light streaks */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
        {Array.from({ length: STREAK_COUNT }, (_, i) => {
          const offset = i - (STREAK_COUNT - 1) / 2;
          const h = 220 + ((i * 53) % 7) * 34;
          return (
            <div key={i} className="sp-streak" style={{
              position: 'absolute', left: offset * 34, top: -h, height: h * 2,
              width: 2 + (i % 3), borderRadius: 4, opacity: 0, transform: 'scaleY(0)',
              background: `linear-gradient(to bottom, transparent, ${STREAK_COLORS[i % STREAK_COLORS.length]} 50%, transparent)`,
              filter: 'blur(1px)',
            }} />
          );
        })}
      </div>

      {/* Horizontal light line */}
      <div className="sp-line" style={{
        position: 'absolute', top: '50%', left: '8%', right: '8%', height: 2, marginTop: -1, opacity: 0,
        background: 'linear-gradient(90deg, transparent, #3b82f6 25%, #6366f1 50%, #22c55e 75%, transparent)',
        boxShadow: '0 0 22px 3px rgba(96,165,250,0.45)', borderRadius: 2, pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div className="sp-logo" style={{ position: 'relative', width: 230, zIndex: 1, opacity: 0 }}>
        <img src={fibeLogo} alt="Fibe" style={{
          width: '100%', height: 'auto', display: 'block', userSelect: 'none', mixBlendMode: 'multiply',
          
          ...({ WebkitUserDrag: 'none' } as Record<string, string>),
        }} />
      </div>

      {/* Subtitle */}
      <div className="sp-sub" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, zIndex: 1, opacity: 0 }}>
        <div className="sp-sub-rule" style={{ width: 30, height: 1.5, transformOrigin: 'right', background: 'linear-gradient(to right, transparent, #22c55e)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#475569', fontFamily: 'system-ui, sans-serif' }}>
          Loan Management
        </span>
        <div className="sp-sub-rule" style={{ width: 30, height: 1.5, transformOrigin: 'left', background: 'linear-gradient(to left, transparent, #3b82f6)' }} />
      </div>

      {/* Loading dots */}
      <div style={{ position: 'absolute', bottom: 38, display: 'flex', gap: 7 }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="sp-dot" style={{ width: 6, height: 6, borderRadius: '50%', opacity: 0.3, background: i === 1 ? '#22c55e' : '#3b82f6' }} />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
