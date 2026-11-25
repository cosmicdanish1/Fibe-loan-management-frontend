// Modify Business Rules > Operations > Members: minimum age at joining and the deposit ranges.
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { api } = vi.hoisted(() => ({ api: { getBusinessRules: vi.fn(), updateBusinessRules: vi.fn() } }));
vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

import { useBusinessRules, initialData } from '../../../src/service/Administration/ModifyBusinessRules/hook/useBusinessRules';
import { buildProfileFile, parseProfileFile } from '../../../src/service/Administration/ModifyBusinessRules/util/rulesProfile';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  api.updateBusinessRules.mockResolvedValue({ success: true });
});

const mount = async (data: Record<string, any> = {}) => {
  api.getBusinessRules.mockResolvedValue({ success: true, data });
  const h = renderHook(() => useBusinessRules());
  await waitFor(() => expect(h.result.current.loading).toBe(false));
  return h;
};

describe('member rules', () => {
  it('nothing stored: minimum age 18 and the ranges off (0)', async () => {
    const { result } = await mount({});
    expect(result.current.businessRules.memberRules).toEqual({ minAgeAtJoining: 18, cdMin: 0, cdMax: 0, mdMin: 0, mdMax: 0 });
    expect(initialData.memberRules.minAgeAtJoining).toBe(18);
  });

  it('stored values are shown', async () => {
    const { result } = await mount({ RULE_MEMBER_MIN_AGE: 21, RULE_MEMBER_CD_MIN: '20', RULE_MEMBER_CD_MAX: '200', RULE_MEMBER_MD_MIN: 0, RULE_MEMBER_MD_MAX: '8' });
    expect(result.current.businessRules.memberRules).toEqual({ minAgeAtJoining: 21, cdMin: 20, cdMax: 200, mdMin: 0, mdMax: 8 });
  });

  it('a stored 0 for the minimum age stays 0 (rule off), it is not replaced by 18', async () => {
    const { result } = await mount({ RULE_MEMBER_MIN_AGE: 0 });
    expect(result.current.businessRules.memberRules.minAgeAtJoining).toBe(0);
  });

  it('the rules are saved under the keys the server reads', async () => {
    const h = await mount({ RULE_MEMBER_MIN_AGE: 18 });
    const data = JSON.parse(JSON.stringify(h.result.current.businessRules));
    data.memberRules = { minAgeAtJoining: 20, cdMin: 20, cdMax: 200, mdMin: 5, mdMax: 50 };
    await act(async () => { await h.result.current.saveBusinessRules(data); });
    expect(api.updateBusinessRules.mock.calls[0]![0]).toMatchObject({
      RULE_MEMBER_MIN_AGE: 20, RULE_MEMBER_CD_MIN: 20, RULE_MEMBER_CD_MAX: 200, RULE_MEMBER_MD_MIN: 5, RULE_MEMBER_MD_MAX: 50,
    });
  });

  it('a load followed by a save sends back what was loaded (round trip)', async () => {
    const h = await mount({ RULE_MEMBER_MIN_AGE: 21, RULE_MEMBER_CD_MIN: 20, RULE_MEMBER_CD_MAX: 200 });
    await act(async () => { await h.result.current.saveBusinessRules(h.result.current.businessRules); });
    expect(api.updateBusinessRules.mock.calls[0]![0]).toMatchObject({ RULE_MEMBER_MIN_AGE: 21, RULE_MEMBER_CD_MIN: 20, RULE_MEMBER_CD_MAX: 200, RULE_MEMBER_MD_MIN: 0, RULE_MEMBER_MD_MAX: 0 });
  });
});

describe('profile file with member rules', () => {
  it('an exported file contains the member rules and reads back with no change', () => {
    const cur = JSON.parse(JSON.stringify(initialData));
    const text = buildProfileFile(cur);
    expect(JSON.parse(text).rules.memberRules).toEqual(cur.memberRules);
    const r = parseProfileFile(text, cur);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.changes).toEqual([]);
  });

  it('a changed minimum age is listed under "Member Rules"', () => {
    const cur = JSON.parse(JSON.stringify(initialData));
    const doc = JSON.parse(buildProfileFile(cur));
    doc.rules.memberRules.minAgeAtJoining = 21;
    const r = parseProfileFile(JSON.stringify(doc), cur);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.changes).toEqual([{ group: 'Member Rules', field: 'minAgeAtJoining', from: '18', to: '21' }]);
  });

  it('text instead of a number is refused', () => {
    const cur = JSON.parse(JSON.stringify(initialData));
    const doc = { format: 'espat-business-rules', version: 1, rules: { memberRules: { cdMax: 'abc' } } };
    expect(parseProfileFile(JSON.stringify(doc), cur).ok).toBe(false);
  });
});
