import { useState, useCallback } from 'react';
import type {
  SignatureScanningData,
  SignatureScanningHookReturn
} from '../interface/interface';
import apiService from '../../../../services/api';
import { API_BASE_URL, getApiBaseUrl, getApiBaseUrlSync } from '../../../../services/apiVersionConfig';
import { message } from 'antd';

export const useSignatureScanning = (): SignatureScanningHookReturn => {
  const [data, setData] = useState<SignatureScanningData>({
    memberNumber: '',
    memberName: '',
    signatureData: '',
    loading: false
  });

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
      if (response && response.success) {
        // BUG FIX 1: member_master returns lowercase DB column names.
        // Use mbno (not id), f_name/l_name (not firstName/lastName),
        // signature_image_path (not signatureImagePath).
        const member = response.data;
        const mbno: string = member.mbno;
        const fullName: string =
          member.fullname ||
          `${member.f_name || ''} ${member.m_name ? member.m_name + ' ' : ''}${member.l_name || ''}`.trim();

        setData(prev => ({
          ...prev,
          // BUG FIX 1+2: store mbno as string, build URL using master route
          memberId: mbno,
          memberName: fullName,
          signatureData: member.signature_image_path
            ? `${getApiBaseUrlSync()}/members/master/${mbno}/signature?t=${Date.now()}`
            : '',
          loading: false
        }));
      } else {
        message.warning('Member not found');
        setData(prev => ({ ...prev, loading: false, memberId: undefined, memberName: '', signatureData: '' }));
      }
    } catch (error) {
      console.error(error);
      message.error('Error searching member');
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const clearSignature = useCallback(async () => {
    if (!data.memberId) {
      setData(prev => ({ ...prev, signatureData: '' }));
      return;
    }

    try {
      // BUG FIX 2: use master (member_master) endpoint, not the TypeORM members endpoint
      await apiService.deleteMemberSignatureMaster(data.memberId);
      setData(prev => ({ ...prev, signatureData: '' }));
      message.success('Signature purged');
    } catch (error) {
      message.error('Failed to delete signature');
    }
  }, [data.memberId]);

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
        // Refresh signature image with cache-buster
        setData(prev => ({
          ...prev,
          loading: false,
          signatureData: `${getApiBaseUrlSync()}/members/master/${data.memberId}/signature?t=${Date.now()}`
        }));
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
  }, [data.memberId]);

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
