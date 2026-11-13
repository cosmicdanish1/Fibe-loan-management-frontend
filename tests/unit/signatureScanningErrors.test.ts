import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const api = vi.hoisted(() => ({
  getMemberDetails: vi.fn(),
  deleteMemberSignatureMaster: vi.fn(),
  uploadMemberSignatureMaster: vi.fn(),
  fetchProtectedFile: vi.fn(),
}));
const msg = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
const dlg = vi.hoisted(() => ({ notifyError: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../../src/services/api', () => ({ default: api }));
vi.mock('antd', () => ({ message: msg }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
vi.mock('../../src/utils/dialog', async () => ({
  isFailure: (r: any) => !!r && r.success === false,
  notifyError: dlg.notifyError,
}));

import { useSignatureScanning } from '../../src/service/Masters/SignatureScanning/hook/useSignatureScanning';

// ES-473: failures are reported as what they are.
describe('useSignatureScanning', () => {
  beforeEach(() => { Object.values(api).forEach(f => f.mockReset()); Object.values(msg).forEach(f => f.mockReset()); dlg.notifyError.mockClear(); });

  it('a network failure while looking up a member is not reported as "Member not found"', async () => {
    api.getMemberDetails.mockResolvedValue({ success: false, network: true, message: 'x' });
    const { result } = renderHook(() => useSignatureScanning());
    await act(async () => { await result.current.searchMember('610000039'); });
    expect(dlg.notifyError).toHaveBeenCalledWith(expect.objectContaining({ network: true }), 'look up the member');
    expect(msg.warning).not.toHaveBeenCalled();
  });

  it('a member that really does not exist still says "Member not found"', async () => {
    api.getMemberDetails.mockResolvedValue({ success: true, data: null });
    const { result } = renderHook(() => useSignatureScanning());
    await act(async () => { await result.current.searchMember('1'); });
    expect(msg.warning).toHaveBeenCalledWith('Member not found');
    expect(dlg.notifyError).not.toHaveBeenCalled();
  });

  it('a failed delete is not reported as "Signature purged"', async () => {
    api.getMemberDetails.mockResolvedValue({ success: true, data: { mbno: '610000039', f_name: 'A', l_name: 'B', signature_image_path: '' } });
    api.deleteMemberSignatureMaster.mockResolvedValue({ success: false, status: 500, message: 'boom' });
    const { result } = renderHook(() => useSignatureScanning());
    await act(async () => { await result.current.searchMember('610000039'); });
    await act(async () => { await result.current.clearSignature(); });
    expect(api.deleteMemberSignatureMaster).toHaveBeenCalledWith('610000039');
    expect(msg.success).not.toHaveBeenCalledWith('Signature purged');
    expect(dlg.notifyError).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }), 'delete the signature');
  });

  it('a delete that worked says so', async () => {
    api.getMemberDetails.mockResolvedValue({ success: true, data: { mbno: '610000039', f_name: 'A', l_name: 'B', signature_image_path: '' } });
    api.deleteMemberSignatureMaster.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useSignatureScanning());
    await act(async () => { await result.current.searchMember('610000039'); });
    await act(async () => { await result.current.clearSignature(); });
    expect(msg.success).toHaveBeenCalledWith('Signature purged');
    expect(dlg.notifyError).not.toHaveBeenCalled();
  });
});
