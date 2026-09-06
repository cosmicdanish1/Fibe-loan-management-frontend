import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SignatureScanningData,
  SignatureScanningHookReturn
} from '../interface/interface';
import apiService from '../../../../services/api';
import { message } from 'antd';

export const useSignatureScanning = (): SignatureScanningHookReturn => {
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
        message.warning('Member not found');
        setSignatureObjectUrl('');
        setData(prev => ({ ...prev, loading: false, memberId: undefined, memberName: '' }));
      }
    } catch (error) {
      console.error(error);
      message.error('Error searching member');
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
      await apiService.deleteMemberSignatureMaster(data.memberId);
      setSignatureObjectUrl('');
      message.success('Signature purged');
    } catch (error) {
      message.error('Failed to delete signature');
    }
  }, [data.memberId, setSignatureObjectUrl]);

  const uploadFile = useCallback(async (file: File) => {
    if (!data.memberId) {
      message.error('Please search for a member first');
      return false;
    }

    // Client-side validation
    const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isImage) {
      message.error('You can only upload JPG/PNG file!');
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Image must smaller than 2MB!');
      return false;
    }

    setData(prev => ({ ...prev, loading: true }));
    try {
      // BUG FIX 2: use master (member_master) endpoint so signature is stored
      // in member_master.signature_image_path, not in the TypeORM members table.
      const response = await apiService.uploadMemberSignatureMaster(data.memberId, file);
      if (response.success) {
        message.success('Signature uploaded successfully');
        await loadSignatureImage(data.memberId);
        setData(prev => ({ ...prev, loading: false }));
        return true;
      } else {
        message.error('Upload failed');
        setData(prev => ({ ...prev, loading: false }));
        return false;
      }
    } catch (error) {
      console.error(error);
      message.error('Upload error');
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
