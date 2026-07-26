import React from 'react';
import TabNavigation from '../components/tabs/TabNavigation';
import LoanDetailsTab from '../components/tabs/LoanDetailsTab';
import NomineeDetailsTab from '../components/tabs/NomineeDetailsTab';
import LoanAgainstDepositTab from '../components/tabs/LoanAgainstDepositTab';
import { useLoanApplication } from '../hooks';
import type { LoanDetails, NomineeDetail, FDRDetail } from '../types';
import { API_ROUTES, API_BASE_URL, getApiBaseUrl } from '../../../../../services/apiVersionConfig';

interface LoanEligibilityStatus {
  isEligible: boolean;
  loanAmount: number;
  requiredShare: number;
  currentShare: number;
  additionalShareRequired: number;
  requiredFd: number;
  currentFd: number;
  additionalFdRequired: number;
  message?: string;
}

const LoanApplication: React.FC = () => {
  const {
    state,
    setActiveTab,
    updateLoanDetails,
    updateNomineeDetails,
    updateLoanAgainstDeposit,
    updateFDRDetails
  } = useLoanApplication();

  // State for selected member data
  const [selectedMember, setSelectedMember] = React.useState<any>(null);
  const [memberLoanCases, setMemberLoanCases] = React.useState<any[]>([]);
  const [isLoadingLoanCases, setIsLoadingLoanCases] = React.useState(false);
  const [lookupTarget, setLookupTarget] = React.useState<'memberNo' | 'surety1' | 'surety2'>('memberNo');

  // Surety rows managed as local state (simpler, guaranteed re-render)
  const [suretyRows, setSuretyRows] = React.useState([
    { mbNo: '', name: '', netSalary: '', dateOfRetire: '', officeName: '', address: '' },
    { mbNo: '', name: '', netSalary: '', dateOfRetire: '', officeName: '', address: '' },
  ]);

  // --- Loan Eligibility State ---
  const [eligibilityStatus, setEligibilityStatus] = React.useState<LoanEligibilityStatus | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = React.useState(false);
  const eligibilityDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const amount = parseFloat(state.loanDetails.loanAmount) || 0;
    const memberNo = state.loanDetails.memberNo;

    if (!memberNo || amount <= 500000) {
      setEligibilityStatus(null);
      setIsCheckingEligibility(false);
      return;
    }

    if (eligibilityDebounceRef.current) clearTimeout(eligibilityDebounceRef.current);

    setIsCheckingEligibility(true);
    eligibilityDebounceRef.current = setTimeout(async () => {
      try {
        const base = await getApiBaseUrl();
        const resp = await fetch(`${base}/loans/eligibility/${memberNo}?amount=${amount}`);
        if (resp.ok) {
          const result = await resp.json();
          const data = result.data || result;
          setEligibilityStatus(data);
        } else {
          setEligibilityStatus(null);
        }
      } catch (err) {
        console.error('Failed to check loan eligibility:', err);
        setEligibilityStatus(null);
      } finally {
        setIsCheckingEligibility(false);
      }
    }, 500);

    return () => {
      if (eligibilityDebounceRef.current) clearTimeout(eligibilityDebounceRef.current);
    };
  }, [state.loanDetails.loanAmount, state.loanDetails.memberNo]);

  // Ref updated synchronously so IPC handler always reads the latest target
  const lookupTargetRef = React.useRef<'memberNo' | 'surety1' | 'surety2'>('memberNo');

  const setLookupTargetSync = (target: 'memberNo' | 'surety1' | 'surety2') => {
    lookupTargetRef.current = target;
    setLookupTarget(target);
  };

  const updateSuretyRowLocal = (idx: number, data: Partial<typeof suretyRows[0]>) => {
    setSuretyRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...data };
      return next;
    });
  };

  // Fetch real loan balances from member_balances after member is selected
  const fetchMemberBalances = async (memberNo: string) => {
    try {
      const url = `${await getApiBaseUrl()}/loans/member/${memberNo}/balances`;
      const resp = await fetch(url);
      if (resp.ok) {
        const json = await resp.json();
        const b = json.data || json;
        setSelectedMember((prev: any) => prev ? {
          ...prev,
          regularLoanBal: String(b.regularLoanBal ?? 0),
          emergencyLoanBal: String(b.emergencyLoanBal ?? 0),
          shareBalance: String(b.shareBalance ?? 0),
        } : prev);
      }
    } catch (e) {
      console.warn('[LoanApp] fetchMemberBalances failed:', e);
    }
  };

  // Function to fetch member's loan cases
  const fetchMemberLoanCases = async (memberNo: string) => {
    if (!memberNo) {
      console.log('⚠️ FRONTEND: fetchMemberLoanCases called with empty memberNo');
      return;
    }

    console.log(`📤 FRONTEND: Fetching loan cases for member ${memberNo}...`);
    setIsLoadingLoanCases(true);
    try {
      const endpoint = API_ROUTES.loans.memberCases(memberNo);
      const url = `${await getApiBaseUrl()}${endpoint}`;
      console.log('Fetch URL:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ FRONTEND: Fetched response:`, result);

        // Extract the data array from the response
        const loanCases = result.data || result || [];
        console.log(`✅ FRONTEND: Extracted ${loanCases.length} loan cases:`, loanCases);
        setMemberLoanCases(loanCases);
      } else {
        console.error('❌ FRONTEND: Failed to fetch loan cases, status:', response.status);
        setMemberLoanCases([]);
      }
    } catch (error) {
      console.error('❌ FRONTEND: Error fetching loan cases:', error);
      setMemberLoanCases([]);
    } finally {
      setIsLoadingLoanCases(false);
    }
  };

  // Listen for member selection from lookup window
  React.useEffect(() => {
    if (window.electronAPI) {
      const handleMemberSelected = async (_event: any, memberData: any) => {
        const target = lookupTargetRef.current;
        console.log('[LoanApp] member-selected fired. target:', target, 'memberData:', memberData);

        if (target === 'surety1' || target === 'surety2') {
          const no = memberData.memberNo || memberData.mbno || '';
          const name = memberData.memberName || memberData.name || '';
          const idx = target === 'surety1' ? 0 : 1;
          console.log('[LoanApp] Surety branch hit. idx:', idx, 'no:', no, 'name:', name);

          // Immediately show MB No + Name from lookup data
          updateLoanDetails(target as any, no);
          updateLoanDetails(`${target}Name` as any, name);
          updateSuretyRowLocal(idx, {
            mbNo: no,
            name,
            officeName: memberData.officeName || '',
          });

          // Enrich with full details from API in background
          try {
            const endpoint = API_ROUTES.members.details(no);
            const resp = await fetch(`${await getApiBaseUrl()}${endpoint}`);
            if (resp.ok) {
              const result = await resp.json();
              const d = result.data || result;
              const fullName = d.fullname || `${d.f_name || ''} ${d.m_name || ''} ${d.l_name || ''}`.trim() || name;
              updateLoanDetails(`${target}Name` as any, fullName);
              updateSuretyRowLocal(idx, {
                mbNo: no,
                name: fullName,
                netSalary: d.basic_pay || '',
                dateOfRetire: d.dor ? new Date(d.dor).toLocaleDateString() : '',
                officeName: d.office_name || memberData.officeName || '',
                address: d.present_address || d.permanent_address || '',
              });
            }
          } catch (e) {
            console.warn('[LoanApp] Surety enrichment fetch failed:', e);
          }
          return;
        }

        try {
          // Fetch detailed member information
          console.log(`🔍 Fetching detailed member info for: ${memberData.memberNo}`);
          const endpoint = API_ROUTES.members.details(memberData.memberNo);
          const response = await fetch(`${await getApiBaseUrl()}${endpoint}`);

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Member details response:', result);

            // Extract member details from wrapped response
            const memberDetails = result.data || result;

            if (memberDetails && memberDetails.mbno) {
              // Map the detailed member data to the expected format
              const enrichedMemberData = {
                memberNo: memberDetails.mbno,
                name: memberDetails.fullname || `${memberDetails.f_name || ''} ${memberDetails.m_name || ''} ${memberDetails.l_name || ''}`.trim(),
                officeNo: memberDetails.officeno,
                wingNo: memberDetails.wingno,
                officeName: memberDetails.office_name,
                basicPay: memberDetails.basic_pay || '0',
                dateOfRetire: memberDetails.dor ? new Date(memberDetails.dor).toLocaleDateString() : 'N/A',
                shareBalance: '0', // Will be fetched separately if needed
                regularLoanBal: '0', // Will be fetched separately if needed
                emergencyLoanBal: '0', // Will be fetched separately if needed
                designation: memberDetails.desig,
                pfNo: memberDetails.pfno,
                presentAddress: memberDetails.present_address,
                permanentAddress: memberDetails.permanent_address,
                age: memberDetails.age,
                dob: memberDetails.dob,
                nomineeName: memberDetails.nominee_name,
                nomineeAddress: memberDetails.nominee_address,
                nomineeRelation: memberDetails.nominee_relation,
                isActive: memberDetails.isactive === 'Y',
                isRetired: memberDetails.flg_retire === 'Y'
              };

              console.log('✅ Enriched member data:', enrichedMemberData);

              // Store the enriched member data
              setSelectedMember(enrichedMemberData);

              // Update the member number in loan details
              updateLoanDetails('memberNo', enrichedMemberData.memberNo);

              // Fetch real loan balances (member_balances) and loan cases in parallel
              fetchMemberBalances(enrichedMemberData.memberNo);
              fetchMemberLoanCases(enrichedMemberData.memberNo);

              // Auto-populate Nominee Details if available
              if (enrichedMemberData.nomineeName) {
                console.log('✅ Auto-populating nominee details');
                // We update the first nominee row (index 0)
                updateNomineeDetails(0, 'name', enrichedMemberData.nomineeName);
                if (enrichedMemberData.nomineeAddress) {
                  updateNomineeDetails(0, 'address', enrichedMemberData.nomineeAddress);
                }
                if (enrichedMemberData.nomineeRelation) {
                  updateNomineeDetails(0, 'relation', enrichedMemberData.nomineeRelation);
                }
                // Age is not typically in member master, so we leave it for manual entry or calculate if DOB available (future improvement)
              }
            } else {
              console.warn('⚠️ Member details not found, using basic lookup data');
              // Fallback to basic lookup data
              setSelectedMember({
                memberNo: memberData.memberNo,
                name: memberData.memberName,
                officeNo: memberData.officeNo,
                wingNo: memberData.wingNo,
                officeName: memberData.officeName,
                basicPay: '0',
                dateOfRetire: 'N/A',
                shareBalance: '0',
                regularLoanBal: '0',
                emergencyLoanBal: '0'
              });
              updateLoanDetails('memberNo', memberData.memberNo);
              fetchMemberLoanCases(memberData.memberNo);
            }
          } else {
            console.error('❌ Failed to fetch member details:', response.status);
            // Fallback to basic lookup data
            setSelectedMember({
              memberNo: memberData.memberNo,
              name: memberData.memberName,
              officeNo: memberData.officeNo,
              wingNo: memberData.wingNo,
              officeName: memberData.officeName,
              basicPay: '0',
              dateOfRetire: 'N/A',
              shareBalance: '0',
              regularLoanBal: '0',
              emergencyLoanBal: '0'
            });
            updateLoanDetails('memberNo', memberData.memberNo);
            fetchMemberLoanCases(memberData.memberNo);
          }
        } catch (error) {
          console.error('❌ Error fetching member details:', error);
          // Fallback to basic lookup data
          setSelectedMember({
            memberNo: memberData.memberNo,
            name: memberData.memberName,
            officeNo: memberData.officeNo,
            wingNo: memberData.wingNo,
            officeName: memberData.officeName,
            basicPay: '0',
            dateOfRetire: 'N/A',
            shareBalance: '0',
            regularLoanBal: '0',
            emergencyLoanBal: '0'
          });
          updateLoanDetails('memberNo', memberData.memberNo);
          fetchMemberLoanCases(memberData.memberNo);
        }
      };

      // Subscribe to member-selected events
      window.electronAPI.ipcRenderer?.on('member-selected', handleMemberSelected);

      // Cleanup on unmount
      return () => {
        window.electronAPI.ipcRenderer?.removeAllListeners('member-selected');
      };
    }
  }, [updateLoanDetails]);

  // Type assertions for the update functions to match expected prop types
  const handleLoanDetailsChange = (field: string | number | symbol, value: string) => {
    updateLoanDetails(field as keyof LoanDetails, value);
  };

  const handleNomineeDetailsChange = (details: NomineeDetail[]) => {
    // Update nominee details through the hook
    details.forEach((detail, index) => {
      Object.entries(detail).forEach(([key, value]) => {
        if (key !== 'id') {
          updateNomineeDetails(index, key as keyof NomineeDetail, value as string);
        }
      });
    });
  };

  const handleLoanAgainstDepositChange = (isEnabled: boolean) => {
    updateLoanAgainstDeposit('isEnabled', isEnabled);
  };

  const handleFDRDetailsChange = (details: FDRDetail[]) => {
    // Update FDR details through the hook
    details.forEach((detail, index) => {
      Object.entries(detail).forEach(([key, value]) => {
        if (key !== 'id') {
          updateFDRDetails(index, key as keyof FDRDetail, value as string | boolean);
        }
      });
    });
  };

  const resetAll = () => {
    updateLoanDetails('memberNo', '');
    updateLoanDetails('loanType', '');
    updateLoanDetails('loanCaseNo', '');
    updateLoanDetails('loanAmount', '');
    updateLoanDetails('formNumber', '');
    updateLoanDetails('reason', '');
    updateLoanDetails('applDate', new Date().toISOString().split('T')[0] as any);
    setSelectedMember(null);
    setMemberLoanCases([]);
    setEligibilityStatus(null);
    setIsCheckingEligibility(false);
    setSuretyRows([
      { mbNo: '', name: '', netSalary: '', dateOfRetire: '', officeName: '', address: '' },
      { mbNo: '', name: '', netSalary: '', dateOfRetire: '', officeName: '', address: '' },
    ]);
  };

  // State for loading
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    // Prevent duplicate submissions
    if (isSaving) {
      console.log('⚠️ Save already in progress, ignoring duplicate click');
      return;
    }

    console.log('=== FRONTEND: Save Button Clicked ===');
    console.log('Current state:', state);
    console.log('Selected member:', selectedMember);

    // Validate required fields
    if (!state.loanDetails.memberNo) {
      console.error('❌ Validation failed: No member number');
      if (window.electronAPI?.showMessageBox) {
        window.electronAPI.showMessageBox({
          type: 'warning',
          title: 'Input Validation Error',
          message: 'Member Selection Required',
          detail: 'Please select a member before saving the application.',
          buttons: ['OK']
        });
      }
      return;
    }
    if (!state.loanDetails.loanType) {
      console.error('❌ Validation failed: No loan type');
      if (window.electronAPI?.showMessageBox) {
        window.electronAPI.showMessageBox({
          type: 'warning',
          title: 'Input Validation Error',
          message: 'Loan Type Required',
          detail: 'Please select a valid loan type.',
          buttons: ['OK']
        });
      }
      return;
    }
    if (!state.loanDetails.loanAmount || state.loanDetails.loanAmount === '0') {
      console.error('❌ Validation failed: No loan amount');
      if (window.electronAPI?.showMessageBox) {
        window.electronAPI.showMessageBox({
          type: 'warning',
          title: 'Input Validation Error',
          message: 'Loan Amount Required',
          detail: 'Please enter a valid loan amount greater than zero.',
          buttons: ['OK']
        });
      }
      return;
    }
    if (!state.loanDetails.reason || !state.loanDetails.reason.trim()) {
      console.error('❌ Validation failed: No reason');
      if (window.electronAPI?.showMessageBox) {
        window.electronAPI.showMessageBox({
          type: 'warning',
          title: 'Input Validation Error',
          message: 'Loan Purpose Required',
          detail: 'Please enter the reason for this loan application.',
          buttons: ['OK']
        });
      }
      return;
    }

    // 5% Share & FD eligibility check
    if (eligibilityStatus && !eligibilityStatus.isEligible) {
      const detail =
        `The member does not meet the 5% Share Value and 5% FD balance requirements.\n\n` +
        `Share: Current ₹${eligibilityStatus.currentShare.toLocaleString('en-IN')} / Required ₹${eligibilityStatus.requiredShare.toLocaleString('en-IN')}` +
        (eligibilityStatus.additionalShareRequired > 0 ? ` (Shortfall: ₹${eligibilityStatus.additionalShareRequired.toLocaleString('en-IN')})` : '') +
        `\nFD: Current ₹${eligibilityStatus.currentFd.toLocaleString('en-IN')} / Required ₹${eligibilityStatus.requiredFd.toLocaleString('en-IN')}` +
        (eligibilityStatus.additionalFdRequired > 0 ? ` (Shortfall: ₹${eligibilityStatus.additionalFdRequired.toLocaleString('en-IN')})` : '');

      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'Loan Eligibility Failed',
          message: 'Cannot Save — 5% Share/FD Rule Not Met',
          detail,
          buttons: ['OK'],
          defaultId: 0,
        });
      } else {
        alert(`❌ Eligibility Failed\n\n${detail}`);
      }
      return;
    }

    console.log('✅ All validations passed');

    setIsSaving(true);

    try {
      let finalLoanCaseNo = state.loanDetails.loanCaseNo;
      let isNewCase = !finalLoanCaseNo;

      // Prepare loan data for backend
      const loanApplicationData = {
        memberNo: state.loanDetails.memberNo,
        loanType: state.loanDetails.loanType,
        loanCaseNo: finalLoanCaseNo, // Can be empty - backend will generate
        loanAmount: state.loanDetails.loanAmount,
        reason: state.loanDetails.reason,
        applDate: state.loanDetails.applDate,
        formNumber: state.loanDetails.formNumber,
        surety1: state.loanDetails.surety1,
        surety2: state.loanDetails.surety2,
        // Nominee details — saved to loan_nominee table
        nominees: state.nomineeDetails.filter(n => n.name && n.name.trim()),
        // FDR details — saved to loan_fdr table (only when Loan Against Deposit is enabled)
        fdrDetails: state.loanAgainstDeposit.isEnabled
          ? state.loanAgainstDeposit.fdrDetails.filter(f => f.fdrNo && f.fdrNo.trim())
          : [],
      };

      console.log('📤 FRONTEND: Sending loan application to backend...');
      const endpoint = API_ROUTES.loans.apply();
      console.log('URL:', `${API_BASE_URL}${endpoint}`);
      console.log('Method: POST');
      console.log('Data:', JSON.stringify(loanApplicationData, null, 2));

      // Save to backend
      const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanApplicationData)
      });

      console.log('📥 FRONTEND: Received response from backend');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FRONTEND: Backend returned error');
        console.error('Error response:', errorText);

        // Parse the error to make it user-friendly
        let userMessage = 'Unable to process your loan application.';
        let details = '';

        try {
          const errorData = JSON.parse(errorText);
          const errorMsg = errorData.message || errorText;

          // Check for specific error types
          if (errorMsg.includes('exceeds maximum limit')) {
            // Extract amounts from error message - Making regex more flexible
            const maxLimitMatch = errorMsg.match(/maximum limit of ₹?([\d,]+)/i);
            const currentBalMatch = errorMsg.match(/current.*?balance:? ₹?([\d,]+)/i);
            const appliedMatch = errorMsg.match(/applied:? ₹?([\d,]+)/i);

            const maxLimit = maxLimitMatch ? maxLimitMatch[1] : '5,00,000';
            const currentBal = currentBalMatch ? currentBalMatch[1] : '0';
            const appliedAmt = appliedMatch ? appliedMatch[1] : state.loanDetails.loanAmount;

            userMessage = 'Loan Amount Exceeds Limit';
            details = `The requested loan amount exceeds the maximum allowed limit for ${state.loanDetails.loanType} loans.\n\n` +
              `📊 LOAN ELIGIBILITY STATUS:\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `• Applied Amount    : ₹${appliedAmt}\n` +
              `• Current Balance   : ₹${currentBal}\n` +
              `• Maximum Limit     : ₹${maxLimit}\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `💡 ACTION REQUIRED:\n` +
              `Please reduce the application amount or contact your Administrator to discuss limit adjustments.`;
          } else if (errorMsg.includes('not found')) {
            userMessage = 'Member Information Conflict';
            details = 'The selected member could not be verified in the primary records.\n\nPlease check the member number and try again.';
          } else {
            userMessage = 'Application Error';
            details = errorMsg;
          }
        } catch (e) {
          details = errorText;
        }

        // Show True Native OS Message Box for Error
        if (window.electronAPI?.showMessageBox) {
          await window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Loan Application Error',
            message: userMessage,
            detail: details,
            buttons: ['Try Again'],
            defaultId: 0,
          });
        } else {
          // Fallback if not in Electron
          alert(`❌ ${userMessage}\n\n${details}`);
        }

        return;
      }

      const result = await response.json();
      console.log('✅ FRONTEND: Backend response:', result);

      // Extract loan case number from response (handle both direct and wrapped responses)
      finalLoanCaseNo = result.loanCaseNo || result.data?.loanCaseNo || result.data;
      console.log('✅ FRONTEND: Extracted loan case number:', finalLoanCaseNo);
      console.log('Generated/Used Loan Case No:', finalLoanCaseNo);

      // Update the loan case number in state
      updateLoanDetails('loanCaseNo', finalLoanCaseNo);

      // Refresh loan cases for this member
      console.log('🔄 FRONTEND: Refreshing loan cases...');
      await fetchMemberLoanCases(state.loanDetails.memberNo);

      console.log('✅ FRONTEND: Loan application saved successfully!');

      const loanTypeLabel: Record<string, string> = { 'ALN': 'EMERGENCY LOAN', 'RLN': 'REGULAR LOAN', 'ELN': 'LOAN AGAINST RECOVERY' };
      // Show True Native OS Message Box
      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: 'electron-react-ts',
          message: 'Application Saved Successfully!',
          detail: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `LOAN CASE NO.         : ${finalLoanCaseNo}\n` +
            `MEMBER DETAILS        : ${state.loanDetails.memberNo} - ${selectedMember?.name || 'N/A'}\n` +
            `LOAN CATEGORY         : ${loanTypeLabel[state.loanDetails.loanType?.toUpperCase()] || state.loanDetails.loanType?.toUpperCase()}\n` +
            `NET AMOUNT            : ₹${parseFloat(state.loanDetails.loanAmount).toLocaleString()}\n` +
            `PURPOSE/REMARKS       : ${state.loanDetails.reason || 'N/A'}\n` +
            (state.loanDetails.surety1 ? `GUARANTOR             : ${state.loanDetails.surety1} - ${state.loanDetails.surety1Name || 'SURETY'}\n` : '') +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `✓ Saved to loan_pending\n` +
            (state.loanDetails.surety1 ? `✓ Suretymaster updated\n` : '') +
            (result.nomineesSaved > 0 ? `✓ ${result.nomineesSaved} nominee(s) saved\n` : '') +
            (result.fdrRowsSaved > 0 ? `✓ ${result.fdrRowsSaved} FDR record(s) saved\n` : '') +
            `✓ Pending administrative sanction`,
          buttons: ['OK'],
          defaultId: 0,
        });
      }
      // Reset form for a fresh application
      resetAll();
    } catch (error: any) {
      console.error('❌ FRONTEND: Error saving loan application');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error:', error);

      // Show True Native OS Message Box for Connection Error
      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'System Connection Error',
          message: 'Unable to connect to the server.',
          detail: `Please check your network connection.\n\nTechnical details: ${error.message}`,
          buttons: ['Close'],
          defaultId: 0,
        });
      } else {
        alert(`❌ Connection Error\n\nUnable to connect to the server. Technical details: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (state.activeTab) {
      case 'loan-details':
        return (
          <LoanDetailsTab
            loanDetails={state.loanDetails}
            selectedMember={selectedMember}
            memberLoanCases={memberLoanCases}
            isLoadingLoanCases={isLoadingLoanCases}
            onLoanDetailsChange={handleLoanDetailsChange}
            onLookup={(field) => setLookupTargetSync(field)}
            suretyDetails={suretyRows}
            onSuretyLookup={(idx) => {
              const target = idx === 0 ? 'surety1' : 'surety2';
              setLookupTargetSync(target);
              if (window.electronAPI?.openNewWindow) {
                window.electronAPI.openNewWindow('/common/member-lookup');
              }
            }}
            eligibilityStatus={eligibilityStatus}
            isCheckingEligibility={isCheckingEligibility}
          />
        );

      case 'nominee-details':
        return (
          <NomineeDetailsTab
            nomineeDetails={state.nomineeDetails}
            onNomineeDetailsChange={handleNomineeDetailsChange}
          />
        );

      case 'loan-against-deposit':
        return (
          <LoanAgainstDepositTab
            loanAgainstDeposit={state.loanAgainstDeposit}
            onLoanAgainstDepositChange={handleLoanAgainstDepositChange}
            onFDRDetailsChange={handleFDRDetailsChange}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="loan-app h-screen flex flex-col bg-white">
      {/* Tab Navigation */}
      <div className="loan-tab-bar px-3 pt-2 pb-0 bg-slate-50 border-b border-slate-200">
        <TabNavigation
          activeTab={state.activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      <div className="loan-content flex-1 p-3 overflow-auto bg-white">
        {renderTabContent()}
      </div>

      {/* Action Buttons */}
      <div className="loan-actions px-3 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            if ((window as any).electronAPI?.ipcRenderer) {
              (window as any).electronAPI.ipcRenderer.send('close-window');
            } else {
              window.close();
            }
          }}
          className="px-6 py-2 fz-button font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isCheckingEligibility || (eligibilityStatus != null && !eligibilityStatus.isEligible)}
          className={`px-6 py-2 fz-button font-medium text-white rounded transition-colors ${isSaving || isCheckingEligibility || (eligibilityStatus != null && !eligibilityStatus.isEligible)
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isSaving ? 'Saving...' : isCheckingEligibility ? 'Checking Eligibility...' : 'Save'}
        </button>
      </div>

      <style>{`
        /* ── Loan Application — dark mode ── */
        html.dark .loan-app { background-color: #0f172a !important; color: #e2e8f0 !important; }
        html.dark .loan-tab-bar { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .loan-tab-bar button { background-color: #1e293b !important; color: #94a3b8 !important; }
        html.dark .loan-tab-bar button.border-b-2 { background-color: #0f172a !important; color: #60a5fa !important; border-bottom-color: #3b82f6 !important; }
        html.dark .loan-content { background-color: #0f172a !important; }
        html.dark .loan-actions { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .loan-actions button:not(.bg-blue-600):not(.bg-blue-400) {
          background-color: #1e293b !important; border-color: #475569 !important; color: #cbd5e1 !important;
        }
        /* Left & right panels */
        html.dark .loan-left-panel { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .loan-right-panel { background-image: none !important; background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .loan-member-hdr { border-color: #334155 !important; }
        html.dark .loan-member-hdr .text-slate-800 { color: #e2e8f0 !important; }
        html.dark .loan-member-card { background-color: #0f172a !important; border-color: #334155 !important; }
        /* All form inputs */
        html.dark .loan-app input,
        html.dark .loan-app select,
        html.dark .loan-app textarea {
          background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #475569 !important;
        }
        html.dark .loan-app label { color: #94a3b8 !important; }
        /* Text colours */
        html.dark .loan-app .text-slate-800 { color: #e2e8f0 !important; }
        html.dark .loan-app .text-slate-700 { color: #cbd5e1 !important; }
        html.dark .loan-app .text-slate-600 { color: #94a3b8 !important; }
        html.dark .loan-app .text-slate-500 { color: #64748b !important; }
        html.dark .loan-app .text-slate-400 { color: #475569 !important; }
        /* Surety table */
        html.dark .surety-table thead tr,
        html.dark .surety-table .surety-hdr { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .surety-table th { color: #94a3b8 !important; border-color: #334155 !important; }
        html.dark .surety-table td { border-color: #334155 !important; color: #e2e8f0 !important; }
        html.dark .surety-table tr:hover { background-color: rgba(59,130,246,0.08) !important; }
        /* Misc */
        html.dark .loan-app .bg-slate-50 { background-color: #1e293b !important; }
        html.dark .loan-app .bg-slate-100 { background-color: #1e293b !important; }
        html.dark .loan-app .bg-white { background-color: #0f172a !important; }
        html.dark .loan-app .bg-blue-50 { background-color: rgba(59,130,246,0.08) !important; }
        html.dark .loan-app .border-slate-200 { border-color: #334155 !important; }
        html.dark .loan-app .border-slate-300 { border-color: #475569 !important; }
        /* Loading spinner text */
        html.dark .loan-app .text-blue-600 { color: #60a5fa !important; }
        html.dark .loan-app .text-green-600 { color: #34d399 !important; }
        html.dark .loan-app .text-amber-600 { color: #fbbf24 !important; }
        html.dark .loan-app .text-orange-600 { color: #fb923c !important; }
        html.dark .loan-app .text-red-600 { color: #f87171 !important; }
        html.dark .loan-app .text-slate-300 { color: #334155 !important; }
      `}</style>
    </div>
  );
};

export default LoanApplication;
