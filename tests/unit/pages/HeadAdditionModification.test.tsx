// Head Addition / Modification: the tree rules, the form checks, and the window itself (load, add, delete, refusals),
// plus stress runs: a very large chart, and a bulk delete where some heads are refused.
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, msg } = vi.hoisted(() => ({
  api: { getHeadMaster: vi.fn(), saveHeadMaster: vi.fn(), deleteHeadMaster: vi.fn(), rebuildBalancesheet: vi.fn() },
  msg: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../../src/services/api', () => ({ default: api, apiService: api }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => {} }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: any) => (o ? s.replace(/\{\{(\d)\}\}/g, (_m, i) => String(o[i])) : s) }) }));
vi.mock('antd', async () => {
  const actual: any = await vi.importActual('antd');
  return { ...actual, message: msg };
});

import HeadAdditionModification from '../../../src/service/Administration/HeadAdditionModification/page/HeadAdditionModification';
import {
  buildRows, unwrapHeads, validateHeadForm, toPayload, sortEntries, totalsOf, fmt, BLANK_FORM, SECTION_ROOTS,
} from '../../../src/service/Administration/HeadAdditionModification/utils/headTree';

const head = (code: string, parent: string, name: string, extra: any = {}) => ({
  code, parentCode: parent, headName: name, headType: 'OTH', interest: 'N', pflag: code[0], hposition: null, opBal: 0,
  opening: 0, debit: 0, credit: 0, balance: 0, ...extra,
});
const CHART = [
  head('M1000', 'ROOT', 'SOCIETY', { pflag: 'R' }),
  head('L1000', 'M1000', 'LIABILITIES', { pflag: 'R' }),
  head('A1000', 'M1000', 'ASSET', { pflag: 'R' }),
  head('I1000', 'M1000', 'INCOME', { pflag: 'R' }),
  head('E1000', 'M1000', 'EXPENDITURE', { pflag: 'R' }),
  head('L1001', 'L1000', 'SHARE', { headType: 'SHR', balance: 500 }),
  head('L1005', 'L1000', 'FUND GROUP'),
  head('L1006', 'L1005', 'RESERVE FUND', { balance: 250 }),
  head('A1001', 'A1000', 'CASH IN HAND', { headType: 'CINH', balance: -40 }),
  head('A1007', 'A1000', 'BANKS'),
  head('A1008', 'A1007', 'BANK ONE', { headType: 'BANK', balance: 1000 }),
];
const all = new Set<string>(SECTION_ROOTS);

describe('tree rules', () => {
  it('reads the list whether it comes plain or wrapped once', () => {
    expect(unwrapHeads({ success: true, data: CHART })).toHaveLength(CHART.length);
    expect(unwrapHeads({ success: true, data: { success: true, data: CHART } })).toHaveLength(CHART.length);
    expect(unwrapHeads({ success: false, data: CHART })).toBeNull();
    expect(unwrapHeads({ success: true, data: { nothing: 1 } })).toBeNull();
    expect(unwrapHeads(undefined)).toBeNull();
  });

  it('puts a head under its parent, indented by depth', () => {
    const rows = buildRows(CHART, '', all);
    const l = rows.filter(r => r.entry.code[0] === 'L').map(r => `${r.entry.code}:${r.depth}`);
    expect(l).toEqual(['L1000:0', 'L1001:0', 'L1005:0', 'L1006:1']);
    expect(rows.find(r => r.entry.code === 'A1008')!.depth).toBe(1);
    expect(rows.find(r => r.entry.code === 'A1007')!.hasChildren).toBe(true);
  });

  it('a collapsed section shows only its own row', () => {
    const rows = buildRows(CHART, '', new Set(['A1000']));
    expect(rows.filter(r => r.entry.code[0] === 'L').map(r => r.entry.code)).toEqual(['L1000']);
    expect(rows.filter(r => r.entry.code[0] === 'A').length).toBeGreaterThan(1);
  });

  it('a search lists matches flat, with the section above them, and hides sections with no match', () => {
    const rows = buildRows(CHART, 'reserve', new Set());
    expect(rows.map(r => r.entry.code)).toEqual(['L1000', 'L1006']);
    expect(rows[1]!.depth).toBe(0);
    expect(buildRows(CHART, 'zzz', all)).toEqual([]);
    expect(buildRows(CHART, 'a1008', all).map(r => r.entry.code)).toEqual(['A1000', 'A1008']);
  });

  it('a head whose parent is missing is still listed, and a parent loop does not hang the screen', () => {
    const odd = [...CHART, head('L1090', 'L9999', 'ORPHAN'), head('L1091', 'L1092', 'LOOP A'), head('L1092', 'L1091', 'LOOP B')];
    const codes = buildRows(odd, '', all).map(r => r.entry.code);
    expect(codes).toContain('L1090');
    expect(codes).toContain('L1091');
    expect(codes).toContain('L1092');
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('sorts by position first, then by code', () => {
    const s = sortEntries([head('L1003', 'L1000', 'c', { hposition: '20' }), head('L1002', 'L1000', 'b', { hposition: '10' }), head('L1001', 'L1000', 'a')]);
    expect(s.map(e => e.code)).toEqual(['L1001', 'L1002', 'L1003']);
  });

  it('totals add up and zero shows blank', () => {
    expect(totalsOf(CHART).balance).toBe(500 + 250 - 40 + 1000);
    expect(totalsOf([head('L1', 'L1000', 'x', { balance: 'abc' })]).balance).toBe(0);
    expect(fmt(0)).toBe('');
    expect(fmt(1234567.5)).toBe('12,34,567.50');
    expect(fmt(null)).toBe('');
  });
});

describe('form checks', () => {
  const ok = { ...BLANK_FORM, code: 'L1010', parentCode: 'L1005', headName: 'New fund', pflag: 'L' };
  const codes = new Set(CHART.map(c => c.code));
  it('accepts a good head', () => expect(validateHeadForm(ok, 'add', codes)).toBeNull());
  it.each([
    [{ code: '' }, 'Code is required'],
    [{ code: 'L10100' }, 'Code must be 1 to 5 letters or digits'],
    [{ code: 'L1 01' }, 'Code must be 1 to 5 letters or digits'],
    [{ code: 'L1001' }, 'Head L1001 already exists'],
    [{ parentCode: '' }, 'Parent head is required'],
    [{ parentCode: 'L1010' }, 'A head cannot be its own parent'],
    [{ parentCode: 'A1000' }, 'Code must start with A, the section of A1000'],
    [{ headName: '   ' }, 'Head name is required'],
    [{ headName: 'x'.repeat(101) }, 'Head name can be at most 100 characters'],
    [{ pflag: '' }, 'P flag is required'],
    [{ opBal: 'abc' }, 'Opening balance must be a number'],
  ])('refuses %j', (patch, text) => expect(validateHeadForm({ ...ok, ...patch }, 'add', codes)).toBe(text));
  it('edit may keep an existing code', () => expect(validateHeadForm({ ...ok, code: 'L1001' }, 'edit', codes)).toBeNull());
  it('lower case is accepted and sent in capitals, with the add flag', () => {
    const p = toPayload({ ...ok, code: 'l1010', parentCode: 'l1005' }, 'add');
    expect(p).toMatchObject({ code: 'L1010', parentCode: 'L1005', isNew: true, headType: 'OTH', opBal: 0 });
    expect(toPayload(ok, 'edit').isNew).toBe(false);
    expect(toPayload({ ...ok, hposition: '12', opBal: '5.5' }, 'edit')).toMatchObject({ hposition: 12, opBal: 5.5 });
  });
});

const mountWith = async (list: any, shape: 'plain' | 'wrapped' = 'plain') => {
  api.getHeadMaster.mockResolvedValue(shape === 'plain' ? { success: true, data: list } : { success: true, data: { success: true, data: list } });
  render(<HeadAdditionModification />);
  await waitFor(() => expect(api.getHeadMaster).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());
};

beforeEach(() => {
  vi.clearAllMocks();
  api.saveHeadMaster.mockResolvedValue({ success: true });
  api.deleteHeadMaster.mockResolvedValue({ success: true });
  api.rebuildBalancesheet.mockResolvedValue({ success: true, data: { leafCount: 7 } });
});

describe('Head Addition / Modification window', () => {
  it.each(['plain', 'wrapped'] as const)('shows the chart when the list comes %s', async (shape) => {
    await mountWith(CHART, shape);
    expect(screen.getByText('FUND GROUP')).toBeInTheDocument();
    expect(screen.getByText('RESERVE FUND')).toBeInTheDocument();
    expect(screen.getAllByText('6 heads').length).toBeGreaterThan(0);
    expect(msg.error).not.toHaveBeenCalled();
  });

  it('says so when the list cannot be read, instead of the old "click Build Tree" hint', async () => {
    api.getHeadMaster.mockResolvedValue({ success: true, data: { nope: 1 } });
    render(<HeadAdditionModification />);
    await waitFor(() => expect(msg.error).toHaveBeenCalledWith('The list of heads could not be read'));
  });

  it('a failed load shows the server reason', async () => {
    api.getHeadMaster.mockRejectedValue(new Error('Database down'));
    render(<HeadAdditionModification />);
    await waitFor(() => expect(msg.error).toHaveBeenCalledWith('Database down'));
  });

  it('search narrows the list', async () => {
    await mountWith(CHART);
    fireEvent.change(screen.getByLabelText('Search heads'), { target: { value: 'bank one' } });
    expect(screen.getByText('BANK ONE')).toBeInTheDocument();
    expect(screen.queryByText('RESERVE FUND')).not.toBeInTheDocument();
  });

  it('adds a head under a section: flag is filled, the add flag is sent, the list reloads', async () => {
    await mountWith(CHART);
    fireEvent.click(screen.getAllByLabelText('Add child head under L1000')[0]!);
    fireEvent.change(await screen.findByLabelText(/^Code/), { target: { value: 'l1020' } });
    fireEvent.change(screen.getByLabelText(/^Head name/), { target: { value: 'Welfare fund' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add head' }).pop()!);
    await waitFor(() => expect(api.saveHeadMaster).toHaveBeenCalledTimes(1));
    expect(api.saveHeadMaster.mock.calls[0]![0]).toMatchObject({ code: 'L1020', parentCode: 'L1000', pflag: 'L', isNew: true, headType: 'OTH' });
    await waitFor(() => expect(api.getHeadMaster).toHaveBeenCalledTimes(2));
  });

  it('an existing code is refused on the screen and nothing is sent', async () => {
    await mountWith(CHART);
    fireEvent.click(screen.getAllByLabelText('Add child head under L1000')[0]!);
    fireEvent.change(await screen.findByLabelText(/^Code/), { target: { value: 'L1001' } });
    fireEvent.change(screen.getByLabelText(/^Head name/), { target: { value: 'Again' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add head' }).pop()!);
    expect(msg.error).toHaveBeenCalledWith('Head L1001 already exists');
    expect(api.saveHeadMaster).not.toHaveBeenCalled();
  });

  it('a server refusal on save is shown with its reason and the dialog stays open', async () => {
    api.saveHeadMaster.mockRejectedValue(new Error('Head L1020 already exists. Open it to change it.'));
    await mountWith(CHART);
    fireEvent.click(screen.getAllByLabelText('Add child head under L1000')[0]!);
    fireEvent.change(await screen.findByLabelText(/^Code/), { target: { value: 'L1020' } });
    fireEvent.change(screen.getByLabelText(/^Head name/), { target: { value: 'Welfare' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add head' }).pop()!);
    await waitFor(() => expect(msg.error).toHaveBeenCalledWith('Head L1020 already exists. Open it to change it.'));
    expect(screen.getByLabelText(/^Code/)).toBeInTheDocument();
  });

  it('editing keeps the code fixed and sends the edit flag', async () => {
    await mountWith(CHART);
    fireEvent.click(screen.getByLabelText('Edit L1006'));
    const code = await screen.findByLabelText(/^Code/);
    expect(code).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText(/^Head name/), { target: { value: 'RESERVE FUND NEW' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.saveHeadMaster).toHaveBeenCalled());
    expect(api.saveHeadMaster.mock.calls[0]![0]).toMatchObject({ code: 'L1006', parentCode: 'L1005', headName: 'RESERVE FUND NEW', isNew: false });
  });

  it('delete asks first; Cancel deletes nothing; confirm deletes and reloads', async () => {
    await mountWith(CHART);
    fireEvent.click(screen.getByLabelText('Delete L1006'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(api.deleteHeadMaster).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Delete L1006'));
    const dlg = await screen.findByRole('dialog');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteHeadMaster).toHaveBeenCalledWith('L1006'));
    await waitFor(() => expect(msg.success).toHaveBeenCalledWith('L1006 deleted'));
  });

  it('a refused delete shows which head and why', async () => {
    api.deleteHeadMaster.mockRejectedValue(new Error('L1006 has 3 ledger transaction(s) posted against it — cannot delete.'));
    await mountWith(CHART);
    fireEvent.click(screen.getByLabelText('Delete L1006'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(msg.error).toHaveBeenCalledWith('L1006: L1006 has 3 ledger transaction(s) posted against it — cannot delete.'));
  });

  it('Build tree reports how many accounts it recalculated', async () => {
    await mountWith(CHART);
    fireEvent.click(screen.getByRole('button', { name: /Build tree/ }));
    await waitFor(() => expect(msg.success).toHaveBeenCalledWith('Built — 7 accounts recalculated from ledger'));
  });
});

describe('stress', () => {
  const big = (n: number) => [
    ...CHART.slice(0, 5),
    ...Array.from({ length: n }, (_, i) => head(`L${String(2000 + i).padStart(4, '0')}`.slice(0, 5), i % 10 === 0 ? 'L1000' : `L${String(2000 + i - (i % 10)).padStart(4, '0')}`.slice(0, 5), `HEAD ${i}`, { balance: i })),
  ];

  it('tree building is fast and linear for 3,000 heads', () => {
    const list = Array.from({ length: 3000 }, (_, i) => head(`L${i + 1000}`.slice(0, 5), i % 25 === 0 ? 'L1000' : `L${i - (i % 25) + 1000}`.slice(0, 5), `H${i}`));
    const t0 = performance.now();
    const rows = buildRows([...CHART.slice(0, 5), ...list], '', all);
    const ms = performance.now() - t0;
    expect(rows.length).toBeGreaterThan(100);
    expect(ms).toBeLessThan(1500);
    const t1 = performance.now();
    buildRows([...CHART.slice(0, 5), ...list], 'h2', all);
    expect(performance.now() - t1).toBeLessThan(1500);
  });

  it('the window draws 400 heads', async () => {
    const list = big(400);
    await mountWith(list);
    expect(screen.getAllByRole('row').length).toBeGreaterThan(300);
  });

  it('bulk delete of 25 heads: refused ones stay and are named, the rest go, one reload', async () => {
    const list = [...CHART.slice(0, 5), ...Array.from({ length: 25 }, (_, i) => head(`E${1100 + i}`, 'E1000', `EXP ${i}`))];
    api.deleteHeadMaster.mockImplementation(async (code: string) => {
      const n = Number(code.slice(1)) - 1100;
      if (n % 5 === 0) throw new Error(`${code} has ledger postings`);
      return { success: true };
    });
    await mountWith(list);
    fireEvent.click(screen.getByLabelText('Select all'));
    fireEvent.click(screen.getByRole('button', { name: /^Delete \(25\)/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete all' }));
    await waitFor(() => expect(api.deleteHeadMaster).toHaveBeenCalledTimes(25));
    await waitFor(() => expect(msg.success).toHaveBeenCalledWith('20 heads deleted'));
    expect(msg.error).toHaveBeenCalledTimes(5);
    await waitFor(() => expect(api.getHeadMaster).toHaveBeenCalledTimes(2));
  });
});
