import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SignatureScanningData,
  SignatureScanningHookReturn
} from '../interface/interface';
import apiService from '../../../../services/api';
import { message } from 'antd';
import { isFailure, notifyError } from '@/utils/dialog';
import { useTranslation } from 'react-i18next';

export const useSignatureScanning = (): SignatureScanningHookReturn => {
  const { t } = useTranslation();
  const [data, setData] = useState<SignatureScanningData>({
    memberNumber: '',
    memberName: '',
    signatureData: '',
    loading: false
  });

  // Tracks the current blob object URL so it can be revoked before replacing/unmounting.
  const objectUrlRef = useRef<string | null>(null);
  const setSignatureObjectUrl = useCallback((url: string) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url || null;
    setData(prev => ({ ...prev, signatureData: url }));
  }, []);
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  // BUG FIX: the endpoint is JWT-protected, so a plain <img src="..."> 401s —
  // fetch it as a blob (with the Authorization header) and hand back an object URL.
  const loadSignatureImage = useCallback(async (mbno: string) => {
    try {
      const blob = await apiService.fetchProtectedFile(`/members/master/${mbno}/signature`);
      setSignatureObjectUrl(blob ? URL.createObjectURL(blob) : '');
    } catch (error) {
      console.error(error);
      setSignatureObjectUrl('');
    }
  }, [setSignatureObjectUrl]);

  const updateMemberNumber = useCallback((value: string) => {
    setData(prev => ({ ...prev, memberNumber: value }));
  }, []);

  const updateMemberName = useCallback((value: string) => {
    setData(prev => ({ ...prev, memberName: value }));
  }, []);

  const searchMember = useCallback(async (memberNo: string) => {
    if (!memberNo) return;

    setData(prev => ({ ...prev, loading: true }));
    try {
      const response = await apiService.getMemberDetails(memberNo);
      // TransformInterceptor wraps: { success, data: <member_master row> }
      // BUG FIX: the endpoint returns { success: true, data: null } for a
      // nonexistent member rather than a 404 — must be checked explicitly,
      // otherwise `member.mbno` below throws and surfaces as a generic error.
      // A failed call (network, 500) is not 'member not found'.
      if (isFailure(response)) {
        await notifyError(response, 'look up the member');
        setSignatureObjectUrl('');
        setData(prev => ({ ...prev, loading: false, memberId: '', memberName: '' }));
        return;
      }
      const member = response?.success ? response.data : null;
      if (member) {
        // BUG FIX 1: member_master returns lowercase DB column names.
        // Use mbno (not id), f_name/l_name (not firstName/lastName),
        // signature_image_path (not signatureImagePath).
        const mbno: string = member.mbno;
        const fullName: string =
          member.fullname ||
          `${member.f_name || ''} ${member.m_name ? member.m_name + ' ' : ''}${member.l_name || ''}`.trim();

        setData(prev => ({
          ...prev,
          // BUG FIX 1+2: store mbno as string, build URL using master route
          memberId: mbno,
          memberName: fullName,
          loading: false
        }));

        if (member.signature_image_path) {
          await loadSignatureImage(mbno);
        } else {
          setSignatureObjectUrl('');
        }
      } else {
        message.warning(t('Member not found'));
        setSignatureObjectUrl('');
        setData(prev => ({ ...prev, loading: false, memberId: '', memberName: '' }));
      }
    } catch (error) {
      console.error(error);
      await notifyError(null, 'look up the member');
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [loadSignatureImage, setSignatureObjectUrl]);

  const clearSignature = useCallback(async () => {
    if (!data.memberId) {
      setSignatureObjectUrl('');
      return;
    }

    try {
      // BUG FIX 2: use master (member_master) endpoint, not the TypeORM members endpoint
      const res = await apiService.deleteMemberSignatureMaster(data.memberId);
      // apiService.request does not throw: without this check a failed delete was reported as "Signature purged".
      if (isFailure(res)) { await notifyError(res, 'delete the signature'); return; }
      setSignatureObjectUrl('');
      message.success(t('Signature purged'));
    } catch (error) {
      await notifyError(null, 'delete the signature');
    }
  }, [data.memberId, setSignatureObjectUrl]);

  const uploadFile = useCallback(async (file: File) => {
    if (!data.memberId) {
      message.error(t('Please search for a member first'));
      return false;
    }

    // Client-side validation
    const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isImage) {
      message.error(t('You can only upload JPG/PNG file!'));
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error(t('Image must smaller than 2MB!'));
      return false;
    }

    setData(prev => ({ ...prev, loading: true }));
    try {
      // BUG FIX 2: use master (member_master) endpoint so signature is stored
      // in member_master.signature_image_path, not in the TypeORM members table.
      const response = await apiService.uploadMemberSignatureMaster(data.memberId, file);
      if (response.success) {
        message.success(t('Signature uploaded successfully'));
        await loadSignatureImage(data.memberId);
        setData(prev => ({ ...prev, loading: false }));
        return true;
      } else {
        await notifyError(response, 'upload the signature');
        setData(prev => ({ ...prev, loading: false }));
        return false;
      }
    } catch (error) {
      console.error(error);
      message.error(t('Upload error'));
      setData(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [data.memberId, loadSignatureImage]);

  return {
    data,
    updateMemberNumber,
    updateMemberName,
    clearSignature,
    uploadFile,
    searchMember
  };
};

export default useSignatureScanning;
