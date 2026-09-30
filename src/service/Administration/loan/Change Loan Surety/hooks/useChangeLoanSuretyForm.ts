import { useState, useCallback, useEffect } from 'react';
import type { FormData } from '../type/types';
import { API_ROUTES, getApiBaseUrl, logApiVersion } from '../../../../../services/apiVersionConfig';

export const useChangeLoanSuretyForm = () => {
  const [formData, setFormData] = useState<FormData>({
    loanType: '',
    memberNumber: '',
    memberName: '',
    office: '',
    loanCaseNo: '',
    sanctionDate: '',
    sanctionAmount: '',
    surety1: '',
    surety1Name: '',
    surety2: '',
    surety2Name: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [loanCases, setLoanCases] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [lookupTarget, setLookupTarget] = useState<'memberNumber' | 'surety1' | 'surety2' | null>(null);

  const fetchLoanDetails = useCallback(async (caseNo: string) => {
    try {
      const endpoint = API_ROUTES.loans.caseDetails(caseNo);
      logApiVersion('Loan Details', endpoint.includes('/v2/'));
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setFormData(prev => ({
          ...prev,
          loanCaseNo: String(data.loanCaseNo || ''),
          loanType: String(data.loanType || ''),
          sanctionDate: (data.sanctionDate ? new Date(data.sanctionDate).toISOString().split('T')[0] : '') || '',
          sanctionAmount: String(data.sanctionedAmount || ''),
          surety1: String(data.surety1 || ''),
          surety1Name: String(data.surety1Name || ''),
          surety2: String(data.surety2 || ''),
          surety2Name: String(data.surety2Name || ''),
          office: String(data.officeName || data.officeNo || ''),
          memberNumber: String(data.memberNo || prev.memberNumber),
          memberName: String(data.memberName || prev.memberName),
        }));
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
    }
  }, []);

  const fetchMemberLoans = useCallback(async (memberNo: string) => {
    if (!memberNo || memberNo.length < 3) return;

    setIsLoadingCases(true);
    try {
      console.log('🔍 Searching for ALL loans (pending + active) for member:', memberNo);
      // Use suretyCases endpoint — returns ALL loan cases (pending + disbursed/active)
      const endpoint = API_ROUTES.loans.suretyCases(memberNo);
      logApiVersion('Member Surety Cases', endpoint.includes('/v2/'));
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        const cases = Array.isArray(data) ? data : [];
        setLoanCases(cases);

        if (cases.length === 1) {
          // Single case — auto-select it immediately, then fetch details
          const singleCaseNo = String(cases[0].loanCaseNo || cases[0].loancaseno);
          setFormData(prev => ({ ...prev, loanCaseNo: singleCaseNo }));
          fetchLoanDetails(singleCaseNo);
        } else if (cases.length === 0) {
          if (window.electronAPI?.showMessageBox) {
            window.electronAPI.showMessageBox({
              type: 'info',
              title: 'Loan Search',
              message: 'No loan applications found for this member.',
              buttons: ['OK']
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching member loans:', error);
    } finally {
      setIsLoadingCases(false);
    }
  }, [fetchLoanDetails]);

  const handleInputChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'memberNumber' && value.length >= 3) {
      fetchMemberLoans(value);
    }
    // Note: loanCaseNo fetch is triggered directly at the call site (not here) to avoid double-call

    if (errors[name as keyof FormData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormData];
        return newErrors;
      });
    }
  }, [errors, fetchLoanDetails, fetchMemberLoans]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.memberNumber) newErrors.memberNumber = 'Member number is required';
    if (!formData.loanCaseNo) newErrors.loanCaseNo = 'Loan case number is required';
    if (!formData.surety1) newErrors.surety1 = 'Surety 1 is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({
      loanType: '',
      memberNumber: '',
      memberName: '',
      office: '',
      loanCaseNo: '',
      sanctionDate: '',
      sanctionAmount: '',
      surety1: '',
      surety1Name: '',
      surety2: '',
      surety2Name: '',
    });
    setErrors({});
    setLoanCases([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    console.log('Attempting to submit surety change...');
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        console.log('🚀 FRONTEND: Submitting change surety request...', formData);
        // Use V2 API for changing sureties
        const endpoint = API_ROUTES.loans.changeSurety(formData.loanCaseNo);
        logApiVersion('Change Surety', endpoint.includes('/v2/'));
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            surety1: formData.surety1,
            surety2: formData.surety2
          })
        });

        if (response.ok) {
          const result = await response.json();
          const data = result.data || result;

          console.log('✅ SUCCESS Response:', result);
          console.log('📊 Data for notification:', data);

          // Build detailed success message
          const memberInfo = `Member: ${data.memberNo || formData.memberNumber} - ${formData.memberName}`;
          const loanInfo = `Loan Case: ${data.loanCaseNo || formData.loanCaseNo}`;
          const guarantor1 = `Guarantor 1: ${formData.surety1} - ${formData.surety1Name}`;
          const guarantor2 = formData.surety2 ? `Guarantor 2: ${formData.surety2} - ${formData.surety2Name}` : '';

          const dbUpdates = data.updatedTables?.loan_pending
            ? '✓ LOAN_PENDING (Primary guarantor record)\n'
            : '';
          const suretyUpdate = data.updatedTables?.suretymaster
            ? '✓ SURETYMASTER (Guarantor master registry)'
            : '⚠ SURETYMASTER (No existing record)';

          const fullMessage = `
${memberInfo}
${loanInfo}

NEW GUARANTORS:
${guarantor1}
${guarantor2}

DATABASE UPDATES:
${dbUpdates}${suretyUpdate}

🎉 Guarantor information synchronized successfully!
          `.trim();

          console.log('📢 Showing notification with message:', fullMessage);

          // Show detailed success modal (more reliable than notification)
          // Show detailed success modal using Native OS Box
          if (window.electronAPI?.showMessageBox) {
            await window.electronAPI.showMessageBox({
              type: 'info',
              title: 'Surety Update Successful',
              message: 'Guarantor information synchronized successfully!',
              detail: fullMessage,
              buttons: ['OK']
            });
          } else {
            alert(`✅ Surety Update Successful\n\n${fullMessage}`);
          }

          console.log('✅ Modal.success called');

          // Reset form after successful update
          setTimeout(() => {
            resetForm();
          }, 1000);
        } else {
          const errorData = await response.json();
          const errorMsg = errorData.message || 'Server Error';
          if (window.electronAPI?.showMessageBox) {
            window.electronAPI.showMessageBox({
              type: 'error',
              title: 'Update Failed',
              message: 'Failed to update surety information.',
              detail: errorMsg,
              buttons: ['OK']
            });
          } else {
            alert(`❌ Update Failed: ${errorMsg}`);
          }
        }
      } catch (error: any) {
        console.error('Submission error:', error);
        if (window.electronAPI?.showMessageBox) {
          window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Connection Error',
            message: 'Unable to connect to the server.',
            detail: error.message,
            buttons: ['OK']
          });
        } else {
          alert(`❌ Connection Error: ${error.message}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (window.electronAPI?.showMessageBox) {
        window.electronAPI.showMessageBox({
          type: 'warning',
          title: 'Validation Error',
          message: 'Required Fields Missing',
          detail: 'Please fill required fields: Member, Loan Case, and Guarantor 1',
          buttons: ['OK']
        });
      } else {
        alert('⚠️ Please fill required fields: Member, Loan Case, and Guarantor 1');
      }
    }
  }, [formData, validateForm, resetForm]);



  const handleLookup = useCallback((fieldName: keyof FormData) => {
    if (fieldName === 'memberNumber' || fieldName === 'surety1' || fieldName === 'surety2') {
      setLookupTarget(fieldName);
      setIsLookupOpen(true);
    }
  }, []);

  const handleMemberSelect = useCallback((member: any) => {
    if (!lookupTarget) return;

    if (lookupTarget === 'memberNumber') {
      const mbNo = member.memberNo || member.mbno;
      setFormData(prev => ({
        ...prev,
        memberNumber: mbNo,
        memberName: member.memberName || member.name,
        office: member.officeName || member.officeNo || ''
      }));
      fetchMemberLoans(mbNo);
    } else if (lookupTarget === 'surety1') {
      setFormData(prev => ({
        ...prev,
        surety1: member.memberNo || member.mbno,
        surety1Name: member.memberName || member.name
      }));
    } else if (lookupTarget === 'surety2') {
      setFormData(prev => ({
        ...prev,
        surety2: member.memberNo || member.mbno,
        surety2Name: member.memberName || member.name
      }));
    }

    setIsLookupOpen(false);
    setLookupTarget(null);
  }, [lookupTarget, fetchMemberLoans]);

  useEffect(() => {
    if (window.electronAPI) {
      const handleMemberBroadcast = (_event: any, member: any) => {
        console.log('Broadcast received in ChangeLoanSurety:', member);
        if (!isLookupOpen) {
          const mbNo = member.memberNo || member.mbno;
          setFormData(prev => ({
            ...prev,
            memberNumber: mbNo,
            memberName: member.memberName || member.name,
            office: member.officeName || member.officeNo || ''
          }));
          fetchMemberLoans(mbNo);
        }
      };

      // ipcRenderer.on() returns a cleanup fn that removes the internal subscription
      // wrapper. Calling it is the only correct way to remove a specific listener
      // without touching listeners registered by other components.
      const cleanup = window.electronAPI.ipcRenderer?.on('member-selected', handleMemberBroadcast);
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }
  }, [isLookupOpen, fetchMemberLoans]);

  return {
    formData,
    errors,
    loanCases,
    isSubmitting,
    isLoadingCases,
    isLookupOpen,
    setIsLookupOpen,
    handleInputChange,
    handleSubmit,
    resetForm,
    handleLookup,
    handleMemberSelect,
    fetchLoanDetails,
    fetchMemberLoans,
  };
};
