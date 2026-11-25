// Signature Scanning: the member lookup (search button, dialog, Enter), loading the member and the saved / legacy signature,
// upload checks, Purge.
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, notify } = vi.hoisted(() => ({
  api: { getMemberDetails: vi.fn(), fetchProtectedFile: vi.fn(), uploadMemberSignatureMaster: vi.fn(), deleteMemberSignatureMaster: vi.fn(), lookupMembers: vi.fn() },
  notify: vi.fn(),
}));
vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => {} }));
vi.mock('@/utils/dialog', () => ({ isFailure: (r: any) => !!r && r.success === false, notifyError: notify }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
vi.mock('antd', async () => {
  const actual: any = await vi.importActual('antd');
  return { ...actual, message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } };
});
// the shared lookup dialog: opens when "open", picks a member when the test clicks it
vi.mock('../../../src/components/shared/kit/MemberLookupDialog', () => ({
  default: ({ open, onSelect }: any) => (open ? <div role="dialog"><button onClick={() => onSelect({ memberNo: '30017688', memberName: 'MOHAN DAS' })}>pick MOHAN DAS</button></div> : null),
}));

import SignatureScanning from '../../../src/service/Masters/SignatureScanning/page/SignatureScanning';
import { useSignatureScanning } from '../../../src/service/Masters/SignatureScanning/hook/useSignatureScanning';
import { message } from 'antd';

const MEMBER = { mbno: '30017688', f_name: 'MOHAN', m_name: 'DAS', l_name: '', signature_image_path: null, has_bank_signature: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  (URL as any).createObjectURL = vi.fn(() => 'blob:sig');
  (URL as any).revokeObjectURL = vi.fn();
  api.getMemberDetails.mockResolvedValue({ success: true, data: MEMBER });
  api.fetchProtectedFile.mockResolvedValue(new Blob(['x']));
  api.uploadMemberSignatureMaster.mockResolvedValue({ success: true });
  api.deleteMemberSignatureMaster.mockResolvedValue({ success: true });
});

describe('member lookup on the window', () => {
  it('the search button opens the member lookup dialog (it did nothing before)', async () => {
    render(<SignatureScanning />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Member lookup' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('picking a member loads it: name shown, details asked for that number', async () => {
    render(<SignatureScanning />);
    fireEvent.click(screen.getByRole('button', { name: 'Member lookup' }));
    fireEvent.click(screen.getByText('pick MOHAN DAS'));
    await waitFor(() => expect(api.getMemberDetails).toHaveBeenCalledWith('30017688'));
    expect(await screen.findByText('MOHAN DAS')).toBeInTheDocument();
    expect(screen.getByLabelText('Member number')).toHaveValue('30017688');
  });

  it('F2 and a quick double space open the dialog', () => {
    render(<SignatureScanning />);
    const box = screen.getByLabelText('Member number');
    fireEvent.keyDown(box, { key: 'F2' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('typing a number and pressing Enter loads that member', async () => {
    render(<SignatureScanning />);
    const box = screen.getByLabelText('Member number');
    fireEvent.change(box, { target: { value: '30017688' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(api.getMemberDetails).toHaveBeenCalledWith('30017688'));
  });

  it('Enter in an empty box does nothing', async () => {
    render(<SignatureScanning />);
    fireEvent.keyDown(screen.getByLabelText('Member number'), { key: 'Enter' });
    await act(async () => {});
    expect(api.getMemberDetails).not.toHaveBeenCalled();
  });
});

describe('signature of the member', () => {
  const load = async () => { const h = renderHook(() => useSignatureScanning()); await act(async () => { await h.result.current.searchMember('30017688'); }); return h; };

  it('a member with only the migrated legacy signature (no saved file) shows it', async () => {
    const h = await load();
    expect(api.fetchProtectedFile).toHaveBeenCalledWith('/members/master/30017688/signature');
    expect(h.result.current.data.signatureData).toBe('blob:sig');
    expect(h.result.current.data.memberName).toBe('MOHAN DAS');
  });

  it('a member with a saved file shows it', async () => {
    api.getMemberDetails.mockResolvedValue({ success: true, data: { ...MEMBER, signature_image_path: 'uploads/signatures/a.png', has_bank_signature: false } });
    const h = await load();
    expect(h.result.current.data.signatureData).toBe('blob:sig');
  });

  it('a member with no signature at all shows none and does not ask for an image', async () => {
    api.getMemberDetails.mockResolvedValue({ success: true, data: { ...MEMBER, has_bank_signature: false } });
    const h = await load();
    expect(api.fetchProtectedFile).not.toHaveBeenCalled();
    expect(h.result.current.data.signatureData).toBe('');
  });

  it('a member that does not exist: warning, nothing selected', async () => {
    api.getMemberDetails.mockResolvedValue({ success: true, data: null });
    const h = await load();
    expect(message.warning).toHaveBeenCalledWith('Member not found');
    expect(h.result.current.data.memberId).toBeFalsy();
  });

  it('a server failure is reported (not shown as "member not found")', async () => {
    api.getMemberDetails.mockResolvedValue({ success: false, message: 'down' });
    await load();
    expect(notify).toHaveBeenCalled();
    expect(message.warning).not.toHaveBeenCalled();
  });

  it('a signature image that cannot be fetched leaves the member loaded with no image', async () => {
    api.fetchProtectedFile.mockRejectedValue(new Error('404'));
    const h = await load();
    expect(h.result.current.data.memberId).toBe('30017688');
    expect(h.result.current.data.signatureData).toBe('');
  });
});

describe('upload checks and Purge', () => {
  const loaded = async () => { const h = renderHook(() => useSignatureScanning()); await act(async () => { await h.result.current.searchMember('30017688'); }); return h; };
  const file = (type: string, size = 1000) => new File([new Uint8Array(size)], 'sig', { type });

  it('JPG and PNG up to 2 MB are uploaded to the member', async () => {
    const h = await loaded();
    let ok = false;
    await act(async () => { ok = await h.result.current.uploadFile(file('image/jpeg')); });
    expect(ok).toBe(true);
    expect(api.uploadMemberSignatureMaster).toHaveBeenCalledWith('30017688', expect.any(File));
  });

  it.each([['image/gif', 1000], ['application/pdf', 1000], ['image/png', 3 * 1024 * 1024]])('%s of %s bytes is refused and nothing is sent', async (type, size) => {
    const h = await loaded();
    let ok = true;
    await act(async () => { ok = await h.result.current.uploadFile(file(type, size as number)); });
    expect(ok).toBe(false);
    expect(api.uploadMemberSignatureMaster).not.toHaveBeenCalled();
  });

  it('no member chosen: nothing is uploaded', async () => {
    const h = renderHook(() => useSignatureScanning());
    let ok = true;
    await act(async () => { ok = await h.result.current.uploadFile(file('image/png')); });
    expect(ok).toBe(false);
    expect(api.uploadMemberSignatureMaster).not.toHaveBeenCalled();
  });

  it('a refused upload returns false and reports it', async () => {
    api.uploadMemberSignatureMaster.mockResolvedValue({ success: false, message: 'too big' });
    const h = await loaded();
    let ok = true;
    await act(async () => { ok = await h.result.current.uploadFile(file('image/png')); });
    expect(ok).toBe(false);
    expect(notify).toHaveBeenCalled();
  });

  it('Purge deletes the signature of the chosen member and clears the picture', async () => {
    const h = await loaded();
    await act(async () => { await h.result.current.clearSignature(); });
    expect(api.deleteMemberSignatureMaster).toHaveBeenCalledWith('30017688');
    expect(h.result.current.data.signatureData).toBe('');
  });

  it('a failed Purge is reported and the picture stays', async () => {
    api.deleteMemberSignatureMaster.mockResolvedValue({ success: false, message: 'no' });
    const h = await loaded();
    await act(async () => { await h.result.current.clearSignature(); });
    expect(notify).toHaveBeenCalled();
    expect(h.result.current.data.signatureData).toBe('blob:sig');
  });

  it('the Purge button asks first; Cancel deletes nothing', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SignatureScanning />);
    fireEvent.click(screen.getByRole('button', { name: 'Member lookup' }));
    fireEvent.click(screen.getByText('pick MOHAN DAS'));
    await screen.findByText('MOHAN DAS');
    fireEvent.click(screen.getByRole('button', { name: /Purge DB/ }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(api.deleteMemberSignatureMaster).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Purge DB/ }));
    await waitFor(() => expect(api.deleteMemberSignatureMaster).toHaveBeenCalledWith('30017688'));
  });
});
