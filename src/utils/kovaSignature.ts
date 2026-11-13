import { reportEgg } from './eggHunt';

/** Easter egg #9: on 1 December (from 2026 on) the login footer carries a personal greeting. '' on other days. */
export function specialDayGreeting(): string {
  try {
    const d = new Date();
    if (d.getFullYear() >= 2026 && d.getMonth() === 11 && d.getDate() === 1) {
      reportEgg('date');
      return 'A special day for us. Thank you for being part of it. - MD Danish Qureshi & Akshay Kumar, The Kova Studio. Riddle: ask the server, it keeps a text for humans.';
    }
  } catch { /* never break login */ }
  return '';
}

/** Easter egg #7: story shown in the global search when someone types our names. Null otherwise. */
export function kovaSearchMessage(query: string): { title: string; body: string } | null {
  const q = query.trim().toLowerCase();
  if (q === 'kova' || q === 'the kova studio' || q === 'kova studio') {
    return { title: 'The Kova Studio', body: 'Two friends, one idea, and our first application in production. Riddle: a code of arrows and two letters opens the door where you sign in.' };
  }
  if (q === 'danish' || q === 'md danish qureshi' || q === 'akshay' || q === 'akshay kumar') {
    return { title: 'MD Danish Qureshi & Akshay Kumar', body: 'The people who built this, late nights and all. Riddle: a code of arrows and two letters opens the door where you sign in.' };
  }
  return null;
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/** Easter egg #8: calls onUnlock when the Konami code is typed. Attach in a component with useEffect. */
export function listenForKonami(onUnlock: () => void): () => void {
  let pos = 0;
  const onKey = (e: KeyboardEvent) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = key === KONAMI[pos] ? pos + 1 : key === KONAMI[0] ? 1 : 0;
    if (pos === KONAMI.length) { pos = 0; reportEgg('konami'); onUnlock(); }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

/**
 * Easter egg #6: a rare (about 1 in 40) line appended to the Day-End success message,
 * at most once per calendar day. Returns '' almost always. Never throws.
 */
export function rareDayEndLine(): string {
  try {
    if (Math.random() > 1 / 40) return '';
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('kova:dayend-egg') === today) return '';
    localStorage.setItem('kova:dayend-egg', today);
    reportEgg('dayend');
    return '\n\nBooks balanced. Go home.\n- MD Danish Qureshi & Akshay Kumar, The Kova Studio\n\nRiddle: only on the first day of the last month does the door speak.';
  } catch {
    return '';
  }
}

/**
 * Easter egg #2: a small signature for anyone who opens DevTools (F12).
 * Display-only. Touches no data, makes no network calls, and never throws.
 */
export function printKovaSignature(): void {
  try {
    const art = [
      '  _  __                  ____  _             _ _       ',
      ' | |/ /_____   ____ _   / ___|| |_ _   _  __| (_) ___  ',
      " | ' // _ \\ \\ / / _` |  \\___ \\| __| | | |/ _` | |/ _ \\ ",
      ' | . \\ (_) \\ V / (_| |   ___) | |_| |_| | (_| | | (_) |',
      ' |_|\\_\\___/ \\_/ \\__,_|  |____/ \\__|\\__,_|\\__,_|_|\\___/ ',
    ].join('\n');

    console.log(`%c${art}`, 'color:#0a84ff;font-family:monospace;font-weight:bold;');
    console.log(
      '%cThe Kova Studio%c  -  our first application to go into production.',
      'color:#0a84ff;font-size:14px;font-weight:bold;',
      'color:#8e8e93;font-size:12px;',
    );
    console.log(
      '%cBuilt with love by MD Danish Qureshi & Akshay Kumar.\nIf you found this, you looked closely. Thank you for using it.\nRiddle: where every road ends, a page is lost. Wander off the map.',
      'color:#8e8e93;font-size:12px;',
    );
  } catch {
    /* an Easter egg must never break the app */
  }
}
