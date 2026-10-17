import React, { useEffect, useRef } from 'react';
import { prefersCalm } from './calm';

const COLORS = ['#f97316', '#6366f1', '#10b981', '#ec4899', '#eab308', '#0ea5e9', '#8b5cf6'];

/**
 * One-shot confetti burst on a full-screen canvas that ignores the mouse. Pieces fall from
 * the top and are gone after a few seconds. Skipped entirely when the OS asks for reduced motion.
 */
export const Confetti: React.FC<{ durationMs?: number; count?: number }> = ({ durationMs = 4000, count = 160 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersCalm()) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const pieces = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vx: -1.5 + Math.random() * 3,
      vy: 2 + Math.random() * 3.5,
      rot: Math.random() * Math.PI * 2,
      vr: -0.2 + Math.random() * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#6366f1',
    }));

    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Fade out over the last second so it does not vanish abruptly.
      ctx.globalAlpha = t > durationMs - 1000 ? Math.max(0, (durationMs - t) / 1000) : 1;
      for (const p of pieces) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.02;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < durationMs) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [durationMs, count]);

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-[10000]" aria-hidden="true" />;
};

export default Confetti;
