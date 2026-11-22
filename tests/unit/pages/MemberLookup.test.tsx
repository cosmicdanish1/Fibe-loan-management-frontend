// Member Lookup (shared member search window / dialog body). ES-620: Enter picks from the search just typed, clearing the box reloads the list.
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../../src/services/apiVersionConfig', () => ({
  API_ROUTES: { members: { lookup: () => '/members/lookup' } },
  getApiBaseUrl: async () => 'http://api.test/api/v1',
}));
vi.mock('antd', async () => {
  const actual: any = await vi.importActual('antd');
  return { ...actual, message: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } };
});

import MemberLookup from '../../../src/components/shared/MemberLookup/MemberLookup';

const ALL = [
  { memberNo: '610000001', memberName: 'AMAR SINGH', officeNo: 1, officeName: 'BHILAI' },
  { memberNo: '610000002', memberName: 'ANAND KUMAR', officeNo: 2, officeName: 'RAIPUR' },
];
const ANAND_ONLY = [{ memberNo: '610000002', memberName: 'ANAND KUMAR', officeNo: 2, officeName: 'RAIPUR' }];

const reply = (rows: any[]) => ({ ok: true, status: 200, json: async () => ({ data: rows }) });
const urls = () => (global.fetch as any).mock.calls.map((c: any[]) => String(c[0]));

describe('Member Lookup', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url: any) => {
      const u = new URL(String(url));
      return reply(u.searchParams.get('search') === 'ANAND' ? ANAND_ONLY : ALL) as any;
    }) as any;
    localStorage.setItem('accessToken', 'tok-123');
  });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('loads the members on open (limit 500) and sends the sign-in token', async () => {
    render(<MemberLookup isModal onSelect={vi.fn()} />);
    expect(await screen.findByText('AMAR SINGH')).toBeInTheDocument();
    expect(screen.getByText('ANAND KUMAR')).toBeInTheDocument();
    expect(urls()[0]).toContain('/members/lookup');
    expect(urls()[0]).toContain('limit=500');
    expect((global.fetch as any).mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tok-123' });
    expect(screen.getByText(/Records Found/)).toBeInTheDocument();
  });

  it('shows the record count and the office of each member', async () => {
    render(<MemberLookup isModal onSelect={vi.fn()} />);
    await screen.findByText('AMAR SINGH');
    expect(screen.getByText('BHILAI')).toBeInTheDocument();
    expect(screen.getByText('OFFICE CODE: 2')).toBeInTheDocument();
  });

  it('searches after a short pause with the typed text', async () => {
    render(<MemberLookup isModal onSelect={vi.fn()} />);
    await screen.findByText('AMAR SINGH');
    fireEvent.change(screen.getByLabelText('Search members'), { target: { value: 'ANAND' } });
    await waitFor(() => expect(urls().some(u => u.includes('search=ANAND'))).toBe(true));
    await waitFor(() => expect(screen.queryByText('AMAR SINGH')).not.toBeInTheDocument());
    expect(screen.getByText('ANAND KUMAR')).toBeInTheDocument();
  });

  it('clicking a row selects that member and closes', async () => {
    const onSelect = vi.fn(); const onClose = vi.fn();
    render(<MemberLookup isModal onSelect={onSelect} onClose={onClose} />);
    fireEvent.click((await screen.findByText('ANAND KUMAR')).closest('tr')!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ memberNo: '610000002', memberName: 'ANAND KUMAR', name: 'ANAND KUMAR' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('Enter after a search has finished selects the first member of that result', async () => {
    const onSelect = vi.fn();
    render(<MemberLookup isModal onSelect={onSelect} />);
    await screen.findByText('AMAR SINGH');
    const box = screen.getByLabelText('Search members');
    fireEvent.change(box, { target: { value: 'ANAND' } });
    await waitFor(() => expect(screen.queryByText('AMAR SINGH')).not.toBeInTheDocument());
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ memberNo: '610000002' }));
  });

  it('Enter selects the first member of the list shown', async () => {
    const onSelect = vi.fn();
    render(<MemberLookup isModal onSelect={onSelect} />);
    await screen.findByText('AMAR SINGH');
    fireEvent.keyDown(screen.getByLabelText('Search members'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ memberNo: '610000001' }));
  });

  it('Escape closes the dialog', async () => {
    const onClose = vi.fn();
    render(<MemberLookup isModal onClose={onClose} />);
    await screen.findByText('AMAR SINGH');
    fireEvent.keyDown(screen.getByLabelText('Search members'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the empty message when nothing matches', async () => {
    (global.fetch as any).mockImplementation(async () => reply([]));
    render(<MemberLookup isModal />);
    expect(await screen.findByText('No members matching your search')).toBeInTheDocument();
  });

  it('a server error shows a message and Retry loads again', async () => {
    (global.fetch as any).mockImplementationOnce(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    render(<MemberLookup isModal />);
    expect(await screen.findByText('Failed to load members. Please try again.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry Connection/ }));
    expect(await screen.findByText('AMAR SINGH')).toBeInTheDocument();
  });

  it('as a stand-alone window it has a title and the member count', async () => {
    render(<MemberLookup onSelect={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Member Directory' })).toBeInTheDocument();
    expect(await screen.findByText(/2 Members/)).toBeInTheDocument();
  });

  // ---- ES-620 ----
  it('clearing the search box brings the full list back', async () => {
    render(<MemberLookup isModal onSelect={vi.fn()} />);
    await screen.findByText('AMAR SINGH');
    const box = screen.getByLabelText('Search members');
    fireEvent.change(box, { target: { value: 'ANAND' } });
    await waitFor(() => expect(screen.queryByText('AMAR SINGH')).not.toBeInTheDocument());
    fireEvent.change(box, { target: { value: '' } });
    // after clearing, the list must show everybody again
    await waitFor(() => expect(screen.getByText('AMAR SINGH')).toBeInTheDocument(), { timeout: 1500 });
  });

  it('Enter right after typing selects a member of the NEW search, not the first of the old list', async () => {
    const onSelect = vi.fn();
    render(<MemberLookup isModal onSelect={onSelect} />);
    await screen.findByText('AMAR SINGH');
    const box = screen.getByLabelText('Search members');
    fireEvent.change(box, { target: { value: 'ANAND' } });
    fireEvent.keyDown(box, { key: 'Enter' }); // pressed before the 400 ms pause: the list still shows the old results
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ memberNo: '610000002', memberName: 'ANAND KUMAR' }));
    expect(urls().filter(u => u.includes('search=ANAND')).length).toBe(1); // the pending pause did not search a second time
  });

  it('the hint matches what happens: one click or Enter selects', async () => {
    render(<MemberLookup isModal onSelect={vi.fn()} />);
    await screen.findByText('AMAR SINGH');
    expect(screen.queryByText(/Double-click/)).not.toBeInTheDocument();
    expect(screen.getByText(/Click a row or press Enter/)).toBeInTheDocument();
  });
});
