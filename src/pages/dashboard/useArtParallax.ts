import { useEffect, type RefObject } from 'react';

/**
 * Parallax for the dashboard's pictures: while the page scrolls, each card's picture drifts a little against
 * the card, and the picture behind the page drifts slower than the page.
 *
 * It writes straight to the elements (no React re-render per scroll step) and does nothing when the person
 * has switched animations off, is in calm mode, uses the system reduce-motion setting, or is on a PC the
 * app has found to be slow. `strength` is 0–100 from Settings → Dashboard → Background & Art.
 *
 * Card pictures are the `[data-parallax-card]` layers, each inside a box the size of its card; the page picture
 * is `.dash-art`. `changeKey` changes when the cards or pictures change, so the new layers get placed at once.
 */
export const useArtParallax = (root: RefObject<HTMLElement | null>, enabled: boolean, strength: number, changeKey: string) => {
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const html = document.documentElement;
    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const off = !enabled || strength <= 0 || reduce || html.dataset.motion === 'off' || html.dataset.motionLite === '1';

    const layers = () => Array.from(el.querySelectorAll<HTMLElement>('[data-parallax-card]'));
    const clear = () => {
      el.style.setProperty('--par-range', '0px');
      layers().forEach(l => { l.style.transform = ''; });
      const bg = el.querySelector<HTMLElement>('.dash-art');
      if (bg) bg.style.transform = '';
    };
    if (off) { clear(); return undefined; }

    // How far a card's picture may travel up or down, in px. The layer is made that much taller than its card.
    const range = strength * 0.6;
    el.style.setProperty('--par-range', `${range}px`);

    let frame = 0;
    const apply = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const mid = box.top + box.height / 2;
      for (const layer of layers()) {
        const holder = layer.parentElement;
        if (!holder) continue;
        const r = holder.getBoundingClientRect();
        // −1 when the card is at the bottom edge of the view, +1 at the top; cards off screen are held at the ends.
        const rel = ((r.top + r.height / 2) - mid) / (box.height / 2 + r.height / 2);
        const k = Math.max(-1, Math.min(1, rel));
        layer.style.transform = `translate3d(0, ${(-k * range).toFixed(1)}px, 0)`;
      }
      const bg = el.querySelector<HTMLElement>('.dash-art');
      if (bg) bg.style.transform = `translate3d(0, ${(el.scrollTop * 0.35 * (strength / 100)).toFixed(1)}px, 0)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(apply); };

    apply();
    el.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Layers are added and removed as cards are switched on and off, and rows move when cards are rearranged.
    // Only element changes matter; counting numbers up rewrites text nodes every frame and must not trigger this.
    const watcher = new MutationObserver(list => {
      if (list.some(m => [...m.addedNodes, ...m.removedNodes].some(n => n.nodeType === 1))) schedule();
    });
    watcher.observe(el, { childList: true, subtree: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      watcher.disconnect();
    };
  }, [root, enabled, strength, changeKey]);
};
