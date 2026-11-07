import { describe, it, expect } from 'vitest';
import { classifyPc, resolveMotion, MOTION_STYLES } from '../../src/config/motion';

// ES-436: animation settings - PC detection and what finally plays.
describe('classifyPc', () => {
  it('a fast, well-equipped PC is high', () => expect(classifyPc(8, 16, 16.7)).toBe('high'));
  it('slow frames are only believed on a PC with modest specs (start-up load must not demote a good PC)', () => {
    expect(classifyPc(16, 32, 58)).toBe('mid');
    expect(classifyPc(8, 8, 58.2)).toBe('mid');
    expect(classifyPc(4, 8, 40)).toBe('low');
    expect(classifyPc(16, 32, 22)).toBe('high');
    expect(classifyPc(4, 8, 22)).toBe('mid');
  });
  it('without a measurement it falls back to cores and memory', () => {
    expect(classifyPc(2, 8, null)).toBe('low');
    expect(classifyPc(8, 2, null)).toBe('low');
    expect(classifyPc(4, 8, null)).toBe('mid');
    expect(classifyPc(8, 4, null)).toBe('mid');
    expect(classifyPc(8, null, null)).toBe('high');
  });
});

describe('resolveMotion', () => {
  const p = (style: any, adaptive = true) => ({ style, adaptive });
  it('plays the chosen style on a fast PC', () => {
    for (const s of ['fade', 'slide', 'zoom'] as const) expect(resolveMotion(p(s), 'high', false, false)).toEqual({ mode: s, lite: false, reason: 'chosen' });
  });
  it('Off is off', () => expect(resolveMotion(p('off'), 'high', false, false).mode).toBe('off'));
  it('Calm mode and the system reduce-motion setting always win', () => {
    expect(resolveMotion(p('zoom'), 'high', true, false)).toMatchObject({ mode: 'off', reason: 'calm' });
    expect(resolveMotion(p('zoom'), 'high', false, true)).toMatchObject({ mode: 'off', reason: 'system' });
  });
  it('a middling PC gets a short fade; a slow PC gets none (when adapting)', () => {
    expect(resolveMotion(p('zoom'), 'mid', false, false)).toEqual({ mode: 'fade', lite: true, reason: 'mid-pc' });
    expect(resolveMotion(p('slide'), 'low', false, false)).toMatchObject({ mode: 'off', reason: 'slow-pc' });
  });
  it('with adapting off the choice is kept on any PC', () => {
    expect(resolveMotion(p('zoom', false), 'low', false, false)).toMatchObject({ mode: 'zoom', lite: false });
  });
  it('the four styles exist', () => expect(MOTION_STYLES.map(m => m.id).sort()).toEqual(['fade', 'off', 'slide', 'zoom']));
});
