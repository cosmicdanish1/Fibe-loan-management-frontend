import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/context/AuthContext';
import { loadEggs, useEggHunt } from '../utils/eggHunt';

/** Plain canvas confetti: no dependency, runs ~5 seconds, removes itself. */
const Confetti: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const colors = ['#f5c542', '#ffd966', '#0a84ff', '#34c759', '#ff375f', '#bf5af2'];
    const bits = Array.from({ length: 160 }, () => ({
      x: Math.random() * w, y: -20 - Math.random() * h * 0.6,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      s: 5 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)] ?? '#f5c542',
    }));
    let raf = 0;
    const end = performance.now() + 5000;
    const tick = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const b of bits) {
        b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore();
      }
      if (now < end) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100000 }} aria-hidden="true" />;
};

/**
 * Mounted once in the main window. Loads the user's Easter-egg progress and, the moment they find
 * the last egg, shows a congratulations card with their name and confetti.
 */
const EggHuntHost: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const eggs = useEggHunt();

  // Load now, then re-check every 30 s until finished: eggs found in tool windows are saved from there.
  useEffect(() => {
    void loadEggs();
    const timer = window.setInterval(() => { void loadEggs(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  // Celebrate once per user per PC, whichever window found the last egg.
  useEffect(() => {
    if (!eggs.completed || !user?.id) return;
    const key = `kova:eggs-celebrated:${user.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* still celebrate */ }
    setOpen(true);
  }, [eggs.completed, user?.id]);

  if (!open) return null;
  const name = (user as any)?.fullName || user?.username || '';
  return (
    <>
      <Confetti />
      <div role="dialog" aria-modal="true" onClick={() => setOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
        <div onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 420, margin: 16, padding: '28px 30px', borderRadius: 18, textAlign: 'center', background: 'var(--aw-surface, #fff)', color: 'var(--aw-text, #111)', boxShadow: '0 0 0 2px #f5c542, 0 0 40px 6px rgba(245,197,66,0.55)' }}>
          <div style={{ fontSize: 44 }}>🥚✨</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '6px 0' }}>Congratulations{name ? `, ${name}` : ''}!</h2>
          <p style={{ margin: '8px 0 14px', lineHeight: 1.5 }}>
            You found every hidden egg in this application. Very few people look this closely.
            Your profile now carries a golden glow.
          </p>
          <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 16px' }}>
            With love, MD Danish Qureshi &amp; Akshay Kumar - The Kova Studio
          </p>
          <button type="button" className="aw-btn aw-btn-primary" onClick={() => setOpen(false)}>Thank you</button>
        </div>
      </div>
    </>
  );
};

export default EggHuntHost;
