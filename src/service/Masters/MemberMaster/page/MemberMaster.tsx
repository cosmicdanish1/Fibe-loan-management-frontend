import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Save, RotateCcw, PenTool, Upload as UploadIcon, X as XIcon, CheckCircle2, User, Camera, Sun, Moon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import apiService from '../../../../services/api';
import { getApiBaseUrlSync } from '../../../../services/apiVersionConfig';
import { useMemberForm } from '../Hook/useMemberForm';
import { Modal } from 'antd';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';
import { API_BASE_URL, getApiBaseUrl } from '../../../../services/apiVersionConfig';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { setTheme } from '../../../../store/slices/themeSlice';
import type { RootState } from '../../../../store';

const MemberMaster: React.FC = () => {
  const { formData, handleInputChange, resetForm, setFormValues } = useMemberForm();
  const dispatch = useDispatch();
  const interfaceMode = useSelector((s: RootState) => s.theme.interfaceMode);
  const isDarkMode = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => dispatch(setTheme({ interfaceMode: isDarkMode ? 'light' : 'dark' }));
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    sticky?: boolean;   // if true, stays until user clicks ✕
    detail?: Record<string, string>; // structured fields for create-success card
  } | null>(null);

  // Auto-hide non-sticky notifications after 5 seconds
  useEffect(() => {
    if (notification && !notification.sticky) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);



  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
  };

  // BUG FIX 18: errors were shown as a dismissable banner/toast that looked and behaved
  // differently from every other error path in this app (Loan Application, and this file's
  // own save-success case) — all of which use the native OS dialog via electronAPI.showMessageBox.
  // Routes every error through the same native dialog for consistency; falls back to the old
  // toast only if the Electron bridge isn't available (e.g. running in a plain browser).
  const showErrorDialog = async (title: string, detail: string) => {
    if (window.electronAPI?.showMessageBox) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: 'Input Validation Error',
        message: title,
        detail,
        buttons: ['OK'],
      });
    } else {
      showNotification('error', detail);
    }
  };

  // ── Documents & Media state ───────────────────────────────────────────────
  type PhotoType = 'profile' | 'doc_front' | 'doc_back';
  const [mediaQueue, setMediaQueue] = useState<Partial<Record<PhotoType, File>>>({});
  const [mediaPreviews, setMediaPreviews] = useState<Partial<Record<PhotoType, string>>>({});
  const [mediaSavedUrls, setMediaSavedUrls] = useState<Partial<Record<PhotoType, string>>>({});
  const [sigMode, setSigMode] = useState<'draw' | 'upload'>('draw');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [sigQueue, setSigQueue] = useState<File | null>(null);
  const [savedSigUrl, setSavedSigUrl] = useState('');

  // Tracks blob object URLs (signature + 3 photos) so they can be revoked before replacement/unmount.
  type MediaKey = PhotoType | 'signature';
  const mediaObjectUrlsRef = useRef<Partial<Record<MediaKey, string>>>({});
  const setMediaObjectUrl = useCallback((key: MediaKey, url: string) => {
    const prev = mediaObjectUrlsRef.current[key];
    if (prev) URL.revokeObjectURL(prev);
    mediaObjectUrlsRef.current[key] = url || undefined;
    if (key === 'signature') {
      setSavedSigUrl(url);
      return;
    }
    const photoKey = key;
    setMediaSavedUrls(p => {
      const n = { ...p };
      if (url) n[photoKey] = url; else delete n[photoKey];
      return n;
    });
  }, []);
  useEffect(() => () => {
    Object.values(mediaObjectUrlsRef.current).forEach(u => u && URL.revokeObjectURL(u));
  }, []);

  // BUG FIX: /members/master/:mbno/(signature|photo/:type) are JWT-protected —
  // a plain <img src="..."> can't carry the Authorization header and 401s.
  // Fetch as a blob (with the header) and hand the <img> an object URL instead.
  const loadProtectedImage = useCallback(async (key: MediaKey, endpoint: string) => {
    try {
      const blob = await apiService.fetchProtectedFile(endpoint);
      setMediaObjectUrl(key, blob ? URL.createObjectURL(blob) : '');
    } catch {
      setMediaObjectUrl(key, '');
    }
  }, [setMediaObjectUrl]);

  // ── KYC Documents state ───────────────────────────────────────────────────
  const DOC_TYPES = ['Aadhaar', 'PAN', 'Voter ID', 'Driving License', 'Passport', 'Ration Card', 'Bank Passbook', 'Photo', 'Other'];
  const [kycDocType, setKycDocType] = useState('Aadhaar');
  const [kycDocuments, setKycDocuments] = useState<any[]>([]);
  const [kycUploading, setKycUploading] = useState(false);

  // ── Cast Category options — loaded from the Cast Category Master screen so
  // the two stay in sync; falls back to the legacy fixed list if the fetch fails. ──
  const FALLBACK_CAST_CATEGORIES = ['OBC', 'General', 'SC', 'ST'];
  const [castCategoryList, setCastCategoryList] = useState<string[]>(FALLBACK_CAST_CATEGORIES);
  useEffect(() => {
    (async () => {
      try {
        const response = await apiService.getCastCategories();
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          const names = response.data.map((c: any) => c.name || c.castcategory).filter(Boolean);
          if (names.length > 0) setCastCategoryList(names);
        }
      } catch (error) {
        console.error('Failed to load cast categories, using fallback list:', error);
      }
    })();
  }, []);

  // Prefill Compulsory Deposit with the currently-configured RD minimum
  // monthly amount, but ONLY for a genuinely fresh new-member form (never
  // overwrites a value already loaded for an existing member, and only
  // runs once on mount — loading an existing member afterward goes through
  // a different code path that sets formData directly).
  useEffect(() => {
    (async () => {
      if (formData.memberNumber || formData.compulsatoryDeposit) return;
      try {
        const response = await apiService.getBusinessRules();
        const minAmount = response.success ? Number(response.data?.RULE_RD_MIN_MONTHLY_AMOUNT) : NaN;
        if (Number.isFinite(minAmount) && minAmount > 0) {
          handleInputChange('compulsatoryDeposit', String(minAmount));
        }
      } catch (error) {
        console.error('Failed to load RD minimum amount default:', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasDrawingRef = useRef(false);

  // Canvas init + touch listeners
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = isDarkMode ? '#151A21' : '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = isDarkMode ? '#E6E9EF' : '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const scaled = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      return { x: (cx - r.left) * (canvas.width / r.width), y: (cy - r.top) * (canvas.height / r.height) };
    };
    const onTS = (e: TouchEvent) => { e.preventDefault(); isDrawingRef.current = true; lastPosRef.current = scaled(e.touches[0].clientX, e.touches[0].clientY); };
    const onTM = (e: TouchEvent) => {
      e.preventDefault(); if (!isDrawingRef.current) return;
      const p = scaled(e.touches[0].clientX, e.touches[0].clientY);
      ctx.beginPath(); ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      lastPosRef.current = p;
      if (!hasDrawingRef.current) { hasDrawingRef.current = true; setHasDrawing(true); }
    };
    const onTE = () => { isDrawingRef.current = false; };
    canvas.addEventListener('touchstart', onTS, { passive: false });
    canvas.addEventListener('touchmove', onTM, { passive: false });
    canvas.addEventListener('touchend', onTE);
    return () => { canvas.removeEventListener('touchstart', onTS); canvas.removeEventListener('touchmove', onTM); canvas.removeEventListener('touchend', onTE); };
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = isDarkMode ? '#151A21' : '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = isDarkMode ? '#E6E9EF' : '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    isDrawingRef.current = false; hasDrawingRef.current = false; setHasDrawing(false); setSigQueue(null);
  }, [isDarkMode]);

  const scaledMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!; const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  };
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => { isDrawingRef.current = true; lastPosRef.current = scaledMouse(e); };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current!.getContext('2d')!; const p = scaledMouse(e);
    ctx.beginPath(); ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastPosRef.current = p;
    if (!hasDrawingRef.current) { hasDrawingRef.current = true; setHasDrawing(true); }
  };
  const stopDrawing = () => { isDrawingRef.current = false; };

  // Queue canvas drawing as a file for upload after save
  const queueDrawing = useCallback(() => {
    if (!hasDrawingRef.current) return;
    canvasRef.current?.toBlob(blob => {
      if (blob) setSigQueue(new File([blob], 'signature.png', { type: 'image/png' }));
    }, 'image/png');
  }, []);

  // Handle photo file selection — show preview + queue
  const handlePhotoSelect = (type: PhotoType, file: File) => {
    setMediaQueue(prev => ({ ...prev, [type]: file }));
    const url = URL.createObjectURL(file);
    setMediaPreviews(prev => ({ ...prev, [type]: url }));
  };

  // Upload all queued media after save
  const uploadQueuedMedia = useCallback(async (mbno: string) => {
    const uploads: Promise<void>[] = [];
    for (const [type, file] of Object.entries(mediaQueue) as [PhotoType, File][]) {
      uploads.push(apiService.uploadMemberPhotoMaster(mbno, type, file).then(() =>
        loadProtectedImage(type, `/members/master/${mbno}/photo/${type}`)
      ).catch(() => {}));
    }
    if (sigQueue) {
      uploads.push(apiService.uploadMemberSignatureMaster(mbno, sigQueue).then(async () => {
        await loadProtectedImage('signature', `/members/master/${mbno}/signature`);
        clearCanvas();
      }).catch(() => {}));
    }
    await Promise.all(uploads);
    setMediaQueue({});
    setSigQueue(null);
  }, [mediaQueue, sigQueue, clearCanvas, loadProtectedImage]);

  // Load saved media when an existing member is loaded
  const loadMemberMedia = useCallback((mbno: string) => {
    loadProtectedImage('signature', `/members/master/${mbno}/signature`);
    (['profile', 'doc_front', 'doc_back'] as PhotoType[]).forEach(type =>
      loadProtectedImage(type, `/members/master/${mbno}/photo/${type}`)
    );
    setMediaQueue({}); setMediaPreviews({}); setSigQueue(null); clearCanvas();
  }, [clearCanvas, loadProtectedImage]);

  // ── KYC Documents handlers ────────────────────────────────────────────────
  const loadKycDocuments = useCallback(async (mbno: string) => {
    try {
      const res = await apiService.getMemberDocuments(mbno);
      const docs = Array.isArray(res.data) ? res.data : ((res.data as any)?.data || []);
      setKycDocuments(Array.isArray(docs) ? docs : []);
    } catch { setKycDocuments([]); }
  }, []);

  const handleKycUpload = async (file: File) => {
    const mbno = formData.memberNumber;
    if (!mbno) { await showErrorDialog('Member Not Saved', 'Please save the member first, then add KYC documents.'); return; }
    setKycUploading(true);
    try {
      const res = await apiService.uploadMemberDocument(mbno, kycDocType, file);
      if (res.success) { showNotification('success', `${kycDocType} uploaded successfully.`); await loadKycDocuments(mbno); }
      else await showErrorDialog('Document Upload Failed', res.message || 'Document upload failed.');
    } catch (e: any) { await showErrorDialog('Document Upload Failed', e.message); }
    finally { setKycUploading(false); }
  };

  const handleKycDelete = async (id: number) => {
    const mbno = formData.memberNumber;
    if (!mbno) return;
    try {
      const res = await apiService.deleteMemberDocument(mbno, id);
      if (res.success) { showNotification('info', 'Document removed.'); await loadKycDocuments(mbno); }
    } catch { /* ignore */ }
  };

  const handleSearchClick = () => {
    setShowLookupModal(true);
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Required fields
    const fn = formData.firstName?.trim() || '';
    if (!fn) errors.push('First Name is required');
    else if (fn.length < 2 || fn.length > 50) errors.push('First Name must be 2-50 characters');
    else if (!/^[A-Za-z\s.]+$/.test(fn)) errors.push('First Name: letters and spaces only');

    const ln = formData.lastName?.trim() || '';
    if (ln && (ln.length < 2 || ln.length > 50)) errors.push('Last Name must be 2-50 characters');
    if (ln && !/^[A-Za-z\s.]+$/.test(ln)) errors.push('Last Name: letters and spaces only');

    if (!formData.divisionRo?.trim()) errors.push('Division/RO is required');

    // Age: DB column is varchar(2), max 99
    if (formData.age < 0 || formData.age > 99) errors.push('Age must be between 0 and 99');

    // Aadhar: exactly 12 digits
    const aadhar = formData.aadharNo?.trim() || '';
    if (aadhar && !/^\d{12}$/.test(aadhar)) errors.push('Aadhar No must be exactly 12 digits');

    // PAN: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
    const pan = formData.panCardNo?.trim().toUpperCase() || '';
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) errors.push('PAN must be 10 chars: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)');

    // Mobile: exactly 10 digits, starts with 6-9
    const mobile = formData.mobileNumber?.trim() || '';
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) errors.push('Mobile must be 10 digits starting with 6-9');

    // Email
    const email = formData.email?.trim() || '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');

    // Date validations
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (dob > new Date()) errors.push('Date of Birth cannot be in the future');
    }
    if (formData.retirementDate && formData.dateOfBirth) {
      if (new Date(formData.retirementDate) <= new Date(formData.dateOfBirth)) errors.push('Retirement Date must be after Date of Birth');
    }

    // Insurance
    if (formData.isInsured) {
      const insAmt = parseFloat(formData.amountOfInsurance);
      if (!insAmt || insAmt <= 0) errors.push('Insurance amount required when insured');
      if (insAmt > 99999) errors.push('Insurance amount max ₹99,999');
    }

    // Numeric range checks
    const numChecks: [string, string, number, number][] = [
      ['basicPay', 'Basic Pay', 0, 9999999],
      ['shareAmt', 'Share Amount', 0, 9999999],
      ['monthlyContribution', 'Monthly Contribution', 0, 99999],
      ['compulsatoryDeposit', 'Compulsory Deposit', 0, 99999],
    ];
    for (const [field, label, min, max] of numChecks) {
      const val = Number(formData[field as keyof typeof formData]);
      if (val && isNaN(val)) errors.push(`${label} must be a valid number`);
      if (val < min) errors.push(`${label} cannot be negative`);
      if (val > max) errors.push(`${label} max ₹${max.toLocaleString('en-IN')}`);
    }

    // Length checks
    const srNo = formData.srNoEpfPfNo?.trim() || '';
    if (srNo && srNo.length > 10) errors.push('Sr.No/EPF/P.NO max 10 characters');
    const frs = formData.frsNumber?.trim() || '';
    if (frs && frs.length > 20) errors.push('F.R.S. Number max 20 characters');
    const brms = formData.branchMsNo?.trim() || '';
    if (brms && brms.length > 50) errors.push('Branch MS No max 50 characters');
    const dept = formData.department?.trim() || '';
    if (dept && dept.length > 50) errors.push('Department max 50 characters');

    return errors;
  };

  const handleSave = async () => {

    try {
      setIsSaving(true);

      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        await showErrorDialog('Please Fix The Following Errors', validationErrors.join('\n'));
        return;
      }

      const memberDataToSave = { ...formData };
      const isNewMember = !formData.memberNumber;

      // BUG FIX 1: Removed pre-generation of member number from frontend.
      // The old code called GET /members/generate/member-number (increment #1) then sent
      // mbno:'auto' to save-member which called generateNextMemberNumber() again (increment #2).
      // This orphaned one sequence slot per create and the saved mbno differed from what
      // the user saw. Now we send mbno:'auto' and let the backend generate exactly once.
      // The generated number is read back from the RETURNING * response.
      const endpoint = '/members/save-member';
      const method = 'POST';

      // Map frontend form fields to legacy member_master column names
      // BUG FIX 3: present_address/permanent_address were mapped from non-existent
      //   'presentAddress'/'address' keys → always ''. Now uses formData.homeAddress.
      // BUG FIX 4: declare_date was mapped from 'declareDate' (typo) → always null.
      //   Correct field name is 'declarationDate'.
      // BUG FIX 5: nominee_relation was mapped from 'nomineeRelation' → always ''.
      //   Correct field name is 'relationWithNominee'.
      // BUG FIX 6: age used `formData.age || ''` — falsy for 0 → '' saved. Now uses String().
      // BUG FIX 9: wingno/officeno were mapped from non-existent wingNo/officeNo fields.
      //   Now derived from divisionRo (e.g. "1-BHILAI" → officeno=1, wingno="BHILAI").
      // BUG FIX 13: officeno was derived from `divisionRo`, whose dropdown has exactly one
      //   possible option ("1-BHILAI") — every member got officeno=1 regardless of which of
      //   the 6 real offices was picked in the "Branch" dropdown (which correctly lists all
      //   office_master rows, e.g. "6-MECON-BHILAI-90"). officeno is now derived from `branch`
      //   instead, falling back to divisionRo only if branch wasn't set.
      // wingno is intentionally left as-is: neither field's option strings encode a value that
      // corresponds to any real wing_master row (wing_master currently only has codes '1'/'50',
      // unrelated to these office names) — deriving it from `branch` would just be a different
      // wrong guess. Needs real wing reference data before this can be fixed correctly.
      const officeSource = formData.branch || formData.divisionRo;
      const [, ...divisionRest] = formData.divisionRo.split('-');
      const parsedOfficeNo = parseInt(officeSource.split('-')[0] || '', 10) || 0;
      const parsedWingNo = divisionRest.join('-').substring(0, 6) || formData.divisionRo.substring(0, 6) || '';

      const memberPayload: any = {
        mbno: isNewMember ? 'auto' : formData.memberNumber,
        prefix: formData.title || '',
        f_name: formData.firstName || '',
        m_name: formData.middleName || '',
        l_name: formData.lastName || '',
        sex: formData.gender === 'female' ? 'F' : 'M',
        desig: formData.designation || '',
        present_address: formData.homeAddress || '',        // BUG FIX 3
        permanent_address: formData.homeAddress || '',      // BUG FIX 3
        wingno: parsedWingNo,                               // BUG FIX 9
        officeno: parsedOfficeNo,                           // BUG FIX 9
        age: String(formData.age),                          // BUG FIX 6: was `formData.age || ''` (0 → '')
        dob: formData.dateOfBirth || null,
        dor: formData.retirementDate || null,
        supanuationdate: formData.dateOfWithdrawRetire || null,
        gross_salary: parseFloat(formData.monthlyContribution) || 0,
        basic_pay: parseFloat(formData.basicPay) || 0,
        compulsory_deposit: parseFloat(formData.compulsatoryDeposit) || 0,
        // Only meaningful for a new member — RD auto-starts using the
        // Compulsory Deposit amount as the monthly RD contribution unless
        // unchecked (see the checkbox next to that field).
        startRd: formData.startRd,
        username: (() => {
          try { return JSON.parse(localStorage.getItem('user') || '{}')?.username || 'system'; }
          catch { return 'system'; }
        })(),
        share_amount: parseFloat(formData.shareAmt) || 0,
        cast_category: formData.castCategory || '',
        nominee_name: formData.nomineeName || '',
        nominee_address: formData.nomineeAddress || '',
        nominee_relation: formData.relationWithNominee || '',  // BUG FIX 5
        declare_date: formData.declarationDate || null,        // BUG FIX 4
        memb_date: formData.membershipDate || null,
        pfno: formData.srNoEpfPfNo || '',
        lfno: '',
        flg_incometax: 'N',
        flg_insured: formData.isInsured ? 'Y' : 'N',
        insureamt: parseFloat(formData.amountOfInsurance) || 0,
        remarks: (formData.remarks || '').substring(0, 100), // BUG FIX 12: DB varchar(100)
        dept_name: formData.department || '',
        isactive: formData.isActive !== false ? 'Y' : 'N',
        flg_retire: formData.status === 'Retire' ? 'Y' : 'N',
        aadharno: formData.aadharNo || '',
        phoneno: formData.mobileNumber || '',
        pan_no: formData.panCardNo || '',
        frs_no: formData.frsNumber || '',
        fathers_name: formData.fatherName || '',
        // BUG FIX 14: branchMsNo (free-text, unvalidated) was taking priority over branch
        //   (the structured dropdown matching real office_master rows), so any stray text
        //   typed into "Branch MS No" silently overrode a correct "Branch" selection.
        //   branch now wins; branchMsNo is only used as a fallback when branch is empty.
        branchmsno: formData.branch || formData.branchMsNo || '',
        email: formData.email || '',
      };

      const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(memberPayload),
      });

      if (response.ok) {
        const result = await response.json();

        // TransformInterceptor wraps all responses: { success, data: <controller_return> }.
        // saveMemberMaster service also wraps: { success, data: <pg_row> }.
        // Double-nested: result.data.data = the actual PostgreSQL RETURNING row.
        const savedDetails = result?.data?.data || result?.data || result;

        // Helper to get value from multiple possible keys (already defined in scope if we want, or just redefine)
        const getVal = (d: any, keys: string[]) => {
          for (const k of keys) {
            if (d[k] !== undefined && d[k] !== null) return d[k];
          }
          return undefined;
        };

        if (savedDetails) {
          setFormValues({
            memberNumber: getVal(savedDetails, ['memberNumber', 'member_no', 'memberNo', 'mbno']) || memberDataToSave.memberNumber,
            title: getVal(savedDetails, ['title', 'prefix']) || formData.title,
            firstName: getVal(savedDetails, ['firstName', 'first_name', 'f_name', 'memberName']) || formData.firstName,
            middleName: getVal(savedDetails, ['middleName', 'middle_name', 'm_name']) || formData.middleName,
            lastName: getVal(savedDetails, ['lastName', 'last_name', 'l_name']) || formData.lastName,
            fatherName: getVal(savedDetails, ['fatherName', 'father_name', 'f_name_father', 'fathers_name']) || formData.fatherName,
            gender: getVal(savedDetails, ['gender', 'sex'])?.toLowerCase() === 'f' ? 'female' : 'male',
            dateOfBirth: getVal(savedDetails, ['dateOfBirth', 'date_of_birth', 'dob']) || formData.dateOfBirth,
            age: getVal(savedDetails, ['age', 'memberAge']) || formData.age,
            designation: getVal(savedDetails, ['designation', 'designation_name', 'desig']) || formData.designation,
            membershipDate: getVal(savedDetails, ['membershipDate', 'membership_date', 'join_date', 'memb_date']) || formData.membershipDate,
            department: getVal(savedDetails, ['department', 'dept_name', 'dept']) || formData.department,
            panCardNo: getVal(savedDetails, ['panCardNo', 'pan_card_no', 'pan_no']) || formData.panCardNo,
            frsNumber: getVal(savedDetails, ['frsNumber', 'frs_number', 'frs_no']) || formData.frsNumber,
            srNoEpfPfNo: getVal(savedDetails, ['srNoEpfPfNo', 'sr_no', 'pf_no', 'epf_no', 'pfno']) || formData.srNoEpfPfNo,
            basicPay: getVal(savedDetails, ['basicPay', 'basic_pay', 'pay']) || formData.basicPay,
            shareAmt: getVal(savedDetails, ['shareAmt', 'share_amt', 'share_amount']) || formData.shareAmt,
            retirementDate: getVal(savedDetails, ['retirementDate', 'retirement_date', 'date_of_retirement', 'retired_date', 'date_of_retire', 'dor']) || formData.retirementDate,
            aadharNo: getVal(savedDetails, ['aadharNo', 'aadhar_no', 'uid_no', 'aadharno']) || formData.aadharNo,
            branchMsNo: getVal(savedDetails, ['branchMsNo', 'branch_ms_no', 'ms_no', 'branchmsno']) || formData.branchMsNo,
            monthlyContribution: getVal(savedDetails, ['monthlyContribution', 'monthly_contribution', 'contri']) || formData.monthlyContribution,
            compulsatoryDeposit: getVal(savedDetails, ['compulsatoryDeposit', 'compulsatory_deposit', 'comp_dep']) || formData.compulsatoryDeposit,
            isInsured: getVal(savedDetails, ['isInsured', 'is_insured', 'insured', 'flg_insured']) === 'Y' || getVal(savedDetails, ['isInsured', 'is_insured', 'insured', 'flg_insured']) === true,
            amountOfInsurance: getVal(savedDetails, ['amountOfInsurance', 'amount_of_insurance', 'insurance_amount', 'insureamt']) || formData.amountOfInsurance,
            mobileNumber: getVal(savedDetails, ['mobileNumber', 'mobile_no', 'cell_no', 'phoneno']) || formData.mobileNumber,
            email: getVal(savedDetails, ['email', 'email_id']) || formData.email,
            phoneNumber: getVal(savedDetails, ['phoneNumber', 'phone_no', 'tel_no', 'phoneno']) || formData.phoneNumber,
            homeAddress: getVal(savedDetails, ['homeAddress', 'home_address', 'address', 'present_address']) || formData.homeAddress,
            status: getVal(savedDetails, ['status', 'member_status', 'isactive']) === 'Y' && getVal(savedDetails, ['flg_retire']) === 'N' ? 'Regular' : (getVal(savedDetails, ['flg_retire']) === 'Y' ? 'Retire' : (getVal(savedDetails, ['status', 'member_status']) || formData.status)),
            castCategory: getVal(savedDetails, ['castCategory', 'cast_category', 'category', 'cat']) || formData.castCategory,
            dateOfWithdrawRetire: getVal(savedDetails, ['dateOfWithdrawRetire', 'withdraw_date', 'date_of_withdraw_retire', 'exit_date']) || formData.dateOfWithdrawRetire,
            memberType: getVal(savedDetails, ['memberType', 'member_type', 'type']) || formData.memberType,
            divisionRo: getVal(savedDetails, ['divisionRo', 'division_ro', 'office_name', 'office_no']) || formData.divisionRo,
            branch: getVal(savedDetails, ['branch', 'branch_name']) || formData.branch,
            nomineeName: getVal(savedDetails, ['nomineeName', 'nominee_name']) || formData.nomineeName,
            nomineeAddress: getVal(savedDetails, ['nomineeAddress', 'nominee_address']) || formData.nomineeAddress,
            relationWithNominee: getVal(savedDetails, ['relationWithNominee', 'relation_with_nominee', 'relation', 'nominee_relation']) || formData.relationWithNominee,
            declarationDate: getVal(savedDetails, ['declarationDate', 'declaration_date', 'declare_date']) || formData.declarationDate,
            remarks: getVal(savedDetails, ['remarks', 'remark']) || formData.remarks,
            isActive: getVal(savedDetails, ['isActive', 'is_active', 'active', 'isactive']) === 'Y' || getVal(savedDetails, ['isActive', 'is_active', 'active', 'isactive']) === true,
          });
        }

        const finalMemberNo = String(getVal(savedDetails, ['memberNumber', 'member_no', 'memberNo', 'mbno']) || (isNewMember ? memberDataToSave.memberNumber : formData.memberNumber));
        // Upload queued photos + signature now that we have the mbno
        if (finalMemberNo) await uploadQueuedMedia(finalMemberNo);
        const fullName = [memberPayload.prefix, memberPayload.f_name, memberPayload.m_name, memberPayload.l_name].filter(Boolean).join(' ');
        const fmtAmt = (v: any) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
        const fmtDate = (v: any) => v ? new Date(v).toLocaleDateString('en-IN') : '—';
        const actionLabel = isNewMember ? 'REGISTRATION' : 'UPDATE';

        const detailText =
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `MEMBER NO.        : ${finalMemberNo || '—'}\n` +
          `NAME              : ${fullName || '—'}\n` +
          `GENDER            : ${memberPayload.sex === 'F' ? 'Female' : 'Male'}\n` +
          `AGE               : ${memberPayload.age || '—'}\n` +
          `DATE OF BIRTH     : ${fmtDate(memberPayload.dob)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `DESIGNATION       : ${memberPayload.desig || '—'}\n` +
          `DEPARTMENT        : ${memberPayload.dept_name || '—'}\n` +
          `DIVISION/RO       : ${formData.divisionRo || '—'}\n` +
          `WING / OFFICE NO. : ${memberPayload.wingno || '—'} / ${memberPayload.officeno ?? '—'}\n` +
          `BRANCH            : ${memberPayload.branchmsno || '—'}\n` +
          `PF / SR NO.       : ${memberPayload.pfno || '—'}\n` +
          `FRS NO.           : ${memberPayload.frs_no || '—'}\n` +
          `FATHER NAME       : ${memberPayload.fathers_name || '—'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `BASIC PAY         : ${fmtAmt(memberPayload.basic_pay)}\n` +
          `MONTHLY CONTRIB.  : ${fmtAmt(memberPayload.gross_salary)}\n` +
          `COMPULSORY DEP.   : ${fmtAmt(memberPayload.compulsory_deposit)}\n` +
          `SHARE AMOUNT      : ${fmtAmt(memberPayload.share_amount)}\n` +
          `CAST CATEGORY     : ${memberPayload.cast_category || '—'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `INSURED           : ${memberPayload.flg_insured} | AMT: ${fmtAmt(memberPayload.insureamt)}\n` +
          `MOBILE            : ${memberPayload.phoneno || '—'}\n` +
          `EMAIL             : ${memberPayload.email || '—'}\n` +
          `AADHAR NO.        : ${memberPayload.aadharno || '—'}\n` +
          `PAN NO.           : ${memberPayload.pan_no || '—'}\n` +
          `ADDRESS           : ${memberPayload.present_address || '—'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `NOMINEE NAME      : ${memberPayload.nominee_name || '—'}\n` +
          `NOMINEE ADDRESS   : ${memberPayload.nominee_address || '—'}\n` +
          `RELATION          : ${memberPayload.nominee_relation || '—'}\n` +
          `DECLARATION DATE  : ${fmtDate(memberPayload.declare_date)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `MEMBERSHIP DATE   : ${fmtDate(memberPayload.memb_date)}\n` +
          `RETIREMENT DATE   : ${fmtDate(memberPayload.dor)}\n` +
          `WITHDRAWAL DATE   : ${fmtDate(memberPayload.supanuationdate)}\n` +
          `STATUS            : ${memberPayload.isactive === 'Y' ? 'Active' : 'Inactive'}\n` +
          `RETIRE FLAG       : ${memberPayload.flg_retire === 'Y' ? 'Yes' : 'No'}\n` +
          `REMARKS           : ${memberPayload.remarks || '—'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Member ${actionLabel.toLowerCase()} saved to member_master`;

        if (window.electronAPI?.showMessageBox) {
          await window.electronAPI.showMessageBox({
            type: 'info',
            title: 'electron-react-ts',
            message: `Member ${actionLabel} Successful!`,
            detail: detailText,
            buttons: ['OK'],
          });
        } else {
          showNotification('success', isNewMember ? 'Member registered successfully!' : 'Member updated successfully!');
        }
      } else {
        const error = await response.json();
        await showErrorDialog('Failed To Save Member', Array.isArray(error.message) ? error.message.join('\n') : (error.message || 'Unknown error'));
      }
    } catch (error) {
      await showErrorDialog('Error Saving Member', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    resetForm();
  };

  const handleMemberSelect = async (memberNo: string) => {
    setShowLookupModal(false);
    setIsLoadingMember(true);

    try {
      showNotification('info', `Loading member details for ${memberNo}...`);

      const response = await fetch(`${await getApiBaseUrl()}/members/details/${memberNo}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }
      });

      if (response.ok) {
        const responseData = await response.json();
        const memberDetails = responseData.data || responseData;

        // Helper to get value from multiple possible keys
        const getVal = (d: any, keys: string[]) => {
          for (const k of keys) {
            if (d[k] !== undefined && d[k] !== null) return d[k];
          }
          return undefined;
        };

        // Helper to format date value to yyyy-MM-dd for date inputs
        // Handles both plain 'YYYY-MM-DD' strings and ISO timestamps
        const fmtDate = (val: any): string => {
          if (!val) return '';
          try {
            // If already a plain date string YYYY-MM-DD, return as-is
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
            // For ISO timestamps, extract date part directly without timezone conversion
            if (typeof val === 'string' && val.includes('T')) {
              return val.split('T')[0] || '';
            }
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          } catch { return ''; }
        };

        // Use setFormValues to update all fields at once
        setFormValues({
          memberNumber: (getVal(memberDetails, ['memberNumber', 'member_no', 'memberNo', 'mbno']) || memberNo) as string,
          title: getVal(memberDetails, ['title', 'prefix']) || 'Mr',
          firstName: getVal(memberDetails, ['firstName', 'first_name', 'f_name', 'memberName']) || '',
          middleName: getVal(memberDetails, ['middleName', 'middle_name', 'm_name']) || '',
          lastName: getVal(memberDetails, ['lastName', 'last_name', 'l_name']) || '',
          fatherName: getVal(memberDetails, ['fatherName', 'father_name', 'f_name_father', 'fathers_name']) || '',
          gender: getVal(memberDetails, ['gender', 'sex'])?.toLowerCase() === 'f' ? 'female' : 'male',
          dateOfBirth: fmtDate(getVal(memberDetails, ['dateOfBirth', 'date_of_birth', 'dob'])),
          age: getVal(memberDetails, ['age', 'memberAge']) || 0,
          designation: getVal(memberDetails, ['designation', 'designation_name', 'desig']) || '',
          membershipDate: fmtDate(getVal(memberDetails, ['membershipDate', 'membership_date', 'join_date', 'memb_date'])),
          department: getVal(memberDetails, ['department', 'dept_name', 'dept']) || '',
          panCardNo: getVal(memberDetails, ['panCardNo', 'pan_card_no', 'pan_no']) || '',
          frsNumber: getVal(memberDetails, ['frsNumber', 'frs_number', 'frs_no']) || '',
          srNoEpfPfNo: getVal(memberDetails, ['srNoEpfPfNo', 'sr_no', 'pf_no', 'epf_no', 'pfno']) || '',
          basicPay: getVal(memberDetails, ['basicPay', 'basic_pay', 'pay']) || '0',
          shareAmt: getVal(memberDetails, ['shareAmt', 'share_amt', 'share_amount']) || '0',
          retirementDate: fmtDate(getVal(memberDetails, ['retirementDate', 'retirement_date', 'date_of_retirement', 'retired_date', 'date_of_retire', 'dor'])),
          aadharNo: getVal(memberDetails, ['aadharNo', 'aadhar_no', 'uid_no', 'aadharno']) || '',
          branchMsNo: getVal(memberDetails, ['branchMsNo', 'branch_ms_no', 'ms_no', 'branchmsno']) || '',
          monthlyContribution: String(getVal(memberDetails, ['monthlyContribution', 'monthly_contribution', 'gross_salary']) || '0'),
          compulsatoryDeposit: String(getVal(memberDetails, ['compulsatoryDeposit', 'compulsatory_deposit', 'compulsory_deposit']) || '0'),
          isInsured: getVal(memberDetails, ['isInsured', 'is_insured', 'insured', 'flg_insured']) === 'Y' || getVal(memberDetails, ['isInsured', 'is_insured', 'insured', 'flg_insured']) === true,
          amountOfInsurance: getVal(memberDetails, ['amountOfInsurance', 'amount_of_insurance', 'insurance_amount', 'insureamt']) || '0',
          mobileNumber: getVal(memberDetails, ['mobileNumber', 'mobile_no', 'cell_no', 'phoneno']) || '',
          phoneNumber: getVal(memberDetails, ['phoneNumber', 'phone_no', 'tel_no']) || '',
          email: getVal(memberDetails, ['email', 'email_id']) || '',
          homeAddress: getVal(memberDetails, ['homeAddress', 'home_address', 'address', 'present_address']) || '',
          status: getVal(memberDetails, ['status', 'member_status', 'isactive']) === 'Y' && getVal(memberDetails, ['flg_retire']) === 'N' ? 'Regular' : (getVal(memberDetails, ['flg_retire']) === 'Y' ? 'Retire' : (getVal(memberDetails, ['status', 'member_status']) || 'Regular')),
          castCategory: getVal(memberDetails, ['castCategory', 'cast_category', 'category', 'cat']) || 'General',
          dateOfWithdrawRetire: fmtDate(getVal(memberDetails, ['dateOfWithdrawRetire', 'withdraw_date', 'supanuationdate', 'date_of_withdraw_retire', 'exit_date'])),
          declarationDate: fmtDate(getVal(memberDetails, ['declarationDate', 'declaration_date', 'declare_date'])),
          memberType: getVal(memberDetails, ['memberType', 'member_type', 'type']) || 'Regular',
          // Reconstruct dropdown value from officeno+wingno stored in DB (e.g. 3+"RISALI" → "3-RISALI")
          divisionRo: (() => {
            const off = memberDetails.officeno;
            const wing = memberDetails.wingno;
            if (off && wing) return `${off}-${wing}`;
            return getVal(memberDetails, ['divisionRo', 'division_ro', 'office_name']) || '';
          })(),
          branch: getVal(memberDetails, ['branch', 'branch_name', 'branchmsno']) || '',
          nomineeName: getVal(memberDetails, ['nomineeName', 'nominee_name']) || '',
          nomineeAddress: getVal(memberDetails, ['nomineeAddress', 'nominee_address']) || '',
          relationWithNominee: getVal(memberDetails, ['relationWithNominee', 'relation_with_nominee', 'relation', 'nominee_relation']) || '',
          remarks: getVal(memberDetails, ['remarks', 'remark']) || '',
          isActive: getVal(memberDetails, ['isActive', 'is_active', 'active', 'isactive']) === 'Y' || getVal(memberDetails, ['isActive', 'is_active', 'active', 'isactive']) === true,
        });

        showNotification('success', `Member details loaded successfully for ${memberNo}`);
        loadMemberMedia(memberNo);
        loadKycDocuments(memberNo);
      } else {
        const errorText = await response.text();
        await showErrorDialog('Failed To Fetch Member Details', errorText);
      }
    } catch (error) {
      await showErrorDialog('Error Fetching Member Details', (error as Error).message);
    } finally {
      setIsLoadingMember(false);
    }
  };

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: isSaving ? 'Saving…' : formData.memberNumber ? 'Update' : 'Create',
    saveEnabled: !isSaving,
  });

  return (
    <div className="mm-form h-screen flex flex-col overflow-auto bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center justify-between shrink-0 shadow-lg border-b border-white/5">
        <h1 className="fz-caption font-black text-white tracking-tight uppercase">Member Master</h1>
        <button
          type="button"
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center gap-1 px-2 py-1 rounded-md border border-white/15 text-white/80 hover:text-white hover:bg-white/10 transition-colors fz-tiny font-semibold uppercase tracking-wide"
        >
          {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          <span>{isDarkMode ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-3 rounded-lg shadow-xl border ${notification.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-violet-50 border-violet-200 text-violet-800'
          }`} style={{ minWidth: 320, maxWidth: 420 }}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className={`font-black fz-body uppercase tracking-wide ${notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' : 'text-violet-800'
                }`}>
                {notification.type === 'success' ? '✅ ' : notification.type === 'error' ? '❌ ' : 'ℹ️ '}
                {notification.message}
              </div>
              {/* Structured detail card for create-success */}
              {notification.detail && (
                <div className="mt-2 bg-white rounded-md p-2 border border-green-200 space-y-1">
                  {Object.entries(notification.detail).map(([k, v]) => (
                    <div key={k} className="flex gap-2 fz-label">
                      <span className="text-gray-500 font-semibold w-28 shrink-0">{k}:</span>
                      <span className={`font-black ${k === 'Member No' ? 'text-blue-700 fz-body' : 'text-gray-800'}`}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {!notification.detail && (
                <div className="fz-label mt-1 whitespace-pre-line">
                  {notification.message}
                </div>
              )}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-1 overflow-auto bg-slate-50">
        <div className="mx-auto" style={{ minWidth: 700 }}>
          {/* Identity Card */}
          <div className="border border-slate-200 rounded-lg p-2.5 bg-white shadow-sm mb-2">
            {/* Top Row: Avatar, Member Number, Search, Active */}
            <div className="flex flex-row flex-wrap items-center gap-2 mb-2">
              {/* Circular profile photo (with initials-avatar fallback) */}
              <div className="relative group shrink-0">
                <input id="photo-profile-header" type="file" accept="image/jpeg,image/png" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect('profile', f); e.target.value = ''; }} />
                {(mediaPreviews.profile || mediaSavedUrls.profile) ? (
                  <img
                    src={mediaPreviews.profile || mediaSavedUrls.profile}
                    alt="Profile"
                    onClick={() => document.getElementById('photo-profile-header')?.click()}
                    onError={() => { if (!mediaQueue.profile) setMediaSavedUrls(p => { const n = { ...p }; delete n.profile; return n; }); }}
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm cursor-pointer transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div
                    onClick={() => document.getElementById('photo-profile-header')?.click()}
                    className="w-11 h-11 rounded-full border border-slate-200 shadow-sm cursor-pointer bg-violet-600 flex items-center justify-center text-white font-black text-sm uppercase transition-transform group-hover:scale-105"
                  >
                    {((formData.firstName?.[0] || '') + (formData.lastName?.[0] || '')) || <User size={18} />}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                  <Camera size={13} className="text-white" />
                </div>
                {mediaQueue.profile && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 fz-nano font-black text-amber-600 bg-white px-1 rounded whitespace-nowrap shadow">on save</span>}
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-slate-500 fz-tiny font-semibold whitespace-nowrap uppercase tracking-wide">Member No</label>
                <input
                  type="text"
                  value={formData.memberNumber}
                  onChange={(e) => handleInputChange('memberNumber', e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium w-24"
                  placeholder="Auto"
                />
                <button
                  onClick={handleSearchClick}
                  disabled={isLoadingMember}
                  className="px-2 py-1 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md fz-caption font-semibold transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                >
                  {isLoadingMember ? (
                    <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  <span>{isLoadingMember ? 'Load' : 'Search'}</span>
                </button>
                <button
                  onClick={() => document.getElementById('kyc-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="px-2 py-1 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md fz-caption font-semibold transition-colors flex items-center gap-1 uppercase tracking-wide"
                  title="Jump to KYC Documents"
                >
                  <UploadIcon className="w-3 h-3" /> <span>KYC Docs</span>
                </button>
              </div>

              <span className={`fz-tiny font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${formData.memberNumber
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-violet-50 text-violet-700 border border-violet-200'
                }`}>
                {formData.memberNumber ? '📝 Edit' : '🆕 New'}
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                <div
                  onClick={() => handleInputChange('isActive', !formData.isActive)}
                  role="checkbox"
                  aria-checked={formData.isActive}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer select-none transition-colors ${formData.isActive
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-slate-300 bg-white text-slate-500'
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${formData.isActive ? 'bg-green-600' : 'bg-slate-400'}`} />
                  <span className="fz-caption font-bold uppercase tracking-wide">{formData.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-md shadow-sm transition-colors fz-caption uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" /> <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-md shadow-sm transition-colors fz-caption uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isSaving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>{isSaving ? 'Saving…' : formData.memberNumber ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </div>

            {/* Name Fields Row */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Title</label>
                <select
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Smt.">Smt.</option>
                  <option value="Dr">Dr</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="Enter first name"
                />
              </div>
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange('middleName', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="Enter middle name"
                />
              </div>
              <div className="col-span-4">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="Enter last name"
                />
              </div>
            </div>
            {/* Father's Name Row */}
            <div className="grid grid-cols-12 gap-2 mt-2">
              <div className="col-span-12">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Father's Name</label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="Enter father's name"
                />
              </div>
            </div>
          </div>

          {/* Personal & Employment Details Card */}
          <div className="border border-slate-200 rounded-lg p-2.5 bg-white shadow-sm mb-2">
            <span className="inline-block bg-violet-50 text-violet-700 fz-tiny font-bold uppercase tracking-wide px-2 py-1 rounded mb-2">Personal &amp; Employment</span>

            {/* Row 1: Gender, DOB, Age, Monthly Contribution, Compulsary Deposit */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-1 uppercase tracking-wide">Gender</label>
                <div className="flex gap-1.5">
                  <div
                    onClick={() => handleInputChange('gender', 'male')}
                    className={`flex-1 text-center px-1.5 py-1 rounded-md fz-tiny font-bold cursor-pointer uppercase border transition-colors ${formData.gender === 'male'
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-300 bg-white text-slate-500'
                      }`}
                  >
                    Male
                  </div>
                  <div
                    onClick={() => handleInputChange('gender', 'female')}
                    className={`flex-1 text-center px-1.5 py-1 rounded-md fz-tiny font-bold cursor-pointer uppercase border transition-colors ${formData.gender === 'female'
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-300 bg-white text-slate-500'
                      }`}
                  >
                    Female
                  </div>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Date Of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => {
                    const dob = e.target.value;
                    handleInputChange('dateOfBirth', dob);

                    // Auto-calculate age when DOB changes
                    if (dob) {
                      const today = new Date();
                      const birthDate = new Date(dob);
                      let age = today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();

                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                      }

                      handleInputChange('age', age);
                    }
                  }}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
              <div className="col-span-1">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-slate-50 text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="Auto"
                  title="Age is auto-calculated from Date of Birth"
                />
              </div>
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Monthly Contrib.</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyContribution}
                  onChange={(e) => handleInputChange('monthlyContribution', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-4">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Compulsary Dep.</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.compulsatoryDeposit}
                  onChange={(e) => handleInputChange('compulsatoryDeposit', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="0.00"
                />
                {/* RD starts automatically for a new member using this amount
                    as their monthly RD contribution — defaults to the
                    configured RD minimum, editable, and skippable via this
                    checkbox for a member who shouldn't have RD started yet. */}
                <label className="flex items-center gap-1 mt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.startRd}
                    onChange={(e) => handleInputChange('startRd', e.target.checked)}
                    className="accent-violet-600"
                  />
                  <span className="text-slate-500 fz-tiny font-medium">Start RD for this member</span>
                </label>
              </div>
            </div>

            {/* Row 2: Sr.No, Designation, Basic Pay, ShareAmt, Insurance */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Sr.No/EPF/P.NO</label>
                <input
                  type="text"
                  value={formData.srNoEpfPfNo}
                  onChange={(e) => handleInputChange('srNoEpfPfNo', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Designation</label>
                <select
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                >
                  <option value="">Select...</option>
                  <option value="A./M.">A./M.</option>
                  <option value="A./ASST">A./ASST</option>
                  <option value="T.A.">T.A.</option>
                  <option value="CHEMIST">CHEMIST</option>
                  <option value="A./MAN">A./MAN</option>
                  <option value="A./MGR">A./MGR</option>
                  <option value="A./T.A.">A./T.A.</option>
                  <option value="C.O">C.O</option>
                  <option value="A.C.T.">A.C.T.</option>
                  <option value="A.C.T.A.">A.C.T.A.</option>
                  <option value="C.T.(P)">C.T.(P)</option>
                  <option value="A.G.M.">A.G.M.</option>
                  <option value="A.M.">A.M.</option>
                  <option value="A.M.(BOE)">A.M.(BOE)</option>
                  <option value="A.MGR">A.MGR</option>
                  <option value="A.MGR.">A.MGR.</option>
                  {/* BUG FIX 10: Removed duplicate A.M.(BOE) option that was here */}
                  <option value="A.SSTT.">A.SSTT.</option>
                  <option value="A.T">A.T</option>
                  <option value="A.TYP">A.TYP</option>
                  <option value="A.TY.">A.TY.</option>
                  <option value="ACO">ACO</option>
                  <option value="ACJSA">ACJSA</option>
                  <option value="ACT">ACT</option>
                  <option value="ACT (BO)">ACT (BO)</option>
                  <option value="ACT (T)">ACT (T)</option>
                  <option value="ACT-SB">ACT-SB</option>
                  <option value="ACT-S-3">ACT-S-3</option>
                  <option value="ACT(T)">ACT(T)</option>
                  <option value="ACTT">ACTT</option>
                  <option value="ACTTA">ACTTA</option>
                  <option value="ADD. CMO">ADD. CMO</option>
                  <option value="AFSO">AFSO</option>
                  <option value="AG">AG</option>
                  <option value="AGM">AGM</option>
                  <option value="AM">AM</option>
                  <option value="AMGR">AMGR</option>
                  <option value="ASST">ASST</option>
                  <option value="ASST - MANAGER">ASST - MANAGER</option>
                  <option value="ASST MGR">ASST MGR</option>
                  <option value="ASST MANAGER">ASST MANAGER</option>
                  <option value="ASST. MANAGER">ASST. MANAGER</option>
                  <option value="ASST. NURSING">ASST. NURSING</option>
                  <option value="ASSTT">ASSTT</option>
                  <option value="ASSTT MANAGER">ASSTT MANAGER</option>
                  <option value="ASSTT TEACHER">ASSTT TEACHER</option>
                  <option value="ASSTT. MANAGER">ASSTT. MANAGER</option>
                  <option value="ASSTT. TYPIST">ASSTT. TYPIST</option>
                  <option value="ASTT MGR">ASTT MGR</option>
                  <option value="ATDDT">ATDDT</option>
                  <option value="ATDTT">ATDTT</option>
                  <option value="ATT">ATT</option>
                  <option value="ATT.">ATT.</option>
                  <option value="ATTDD">ATTDD</option>
                  <option value="ATTDT">ATTDT</option>
                  <option value="ATTDIT">ATTDIT</option>
                  <option value="ATTSDT">ATTSDT</option>
                  <option value="AV.OPR/SR.TECH">AV.OPR/SR.TECH</option>
                  <option value="BLASTER">BLASTER</option>
                  <option value="BR.MGR">BR.MGR</option>
                  <option value="BURNER">BURNER</option>
                  <option value="C MAN">C MAN</option>
                  <option value="C MA">C MA</option>
                  <option value="C OPR">C OPR</option>
                  <option value="EC R OPERATOR">EC R OPERATOR</option>
                  <option value="C/ATTDT">C/ATTDT</option>
                  <option value="C/A">C/A</option>
                  <option value="C.M.">C.M.</option>
                  <option value="C.M OPR.">C.M OPR.</option>
                  <option value="C.M. TECH">C.M. TECH</option>
                  <option value="C.M.O">C.M.O</option>
                  <option value="C.MAN">C.MAN</option>
                  <option value="C.MAN M-TECH">C.MAN M-TECH</option>
                  <option value="C.MAN/M.TECH">C.MAN/M.TECH</option>
                  <option value="C.MAN,SR.TECH">C.MAN,SR.TECH</option>
                  <option value="C.OPR.">C.OPR.</option>
                  <option value="C.R.OPERATOR">C.R.OPERATOR</option>
                  <option value="C.T.T.">C.T.T.</option>
                  <option value="CASTE">CASTE</option>
                  <option value="CASTER">CASTER</option>
                  <option value="CHARGE MAN">CHARGE MAN</option>
                  <option value="CHARGEMAN">CHARGEMAN</option>
                  <option value="CHEKAR">CHEKAR</option>
                  <option value="CHIF MEDIGAL OFFIC">CHIF MEDIGAL OFFIC</option>
                  <option value="HM">HM</option>
                  <option value="CHOUK">CHOUK</option>
                  <option value="CHOWKIDAR">CHOWKIDAR</option>
                  <option value="CHR">CHR</option>
                  <option value="F MASTER OP">F MASTER OP</option>
                  <option value="CLEARK">CLEARK</option>
                  <option value="CLERK">CLERK</option>
                  <option value="CM">CM</option>
                  <option value="CM OPERATOR">CM OPERATOR</option>
                  <option value="CM OPRATOR">CM OPRATOR</option>
                  <option value="CM/SOPT">CM/SOPT</option>
                  <option value="CMO">CMO</option>
                  <option value="CO-ORD">CO-ORD</option>
                  <option value="COGGER">COGGER</option>
                  <option value="CORD">CORD</option>
                  <option value="CONT.CO CC">CONT.CO CC</option>
                  <option value="D DE">D DE</option>
                  <option value="DEPUTY MANAGER">DEPUTY MANAGER</option>
                  <option value="DERING">DERING</option>
                  <option value="DGM">DGM</option>
                  <option value="DOOR FITTER">DOOR FITTER</option>
                  <option value="DP MGR.">DP MGR.</option>
                  <option value="DPR">DPR</option>
                  <option value="DREBER">DREBER</option>
                  <option value="DRIVER">DRIVER</option>
                  <option value="D/P">D/P</option>
                  <option value="D.P.C.">D.P.C.</option>
                  <option value="D.P.R.">D.P.R.</option>
                  <option value="DY. MGR">DY. MGR</option>
                  <option value="E/HAND">E/HAND</option>
                  <option value="ELE. FITTER">ELE. FITTER</option>
                  <option value="ELE./FITT.">ELE./FITT.</option>
                  <option value="ELEC">ELEC</option>
                  <option value="ELECT">ELECT</option>
                  <option value="ELECT.">ELECT.</option>
                  <option value="ELECTRICIAN">ELECTRICIAN</option>
                  <option value="EME OPR.">EME OPR.</option>
                  <option value="F MAN">F MAN</option>
                  <option value="F/MAN">F/MAN</option>
                  <option value="F/A">F/A</option>
                  <option value="FARRASH">FARRASH</option>
                  <option value="FED">FED</option>
                  <option value="FIRE MAN">FIRE MAN</option>
                  <option value="FIRE OFFICER">FIRE OFFICER</option>
                  <option value="FITTER">FITTER</option>
                  <option value="FM-FED">FM-FED</option>
                  <option value="FORMINST">FORMINST</option>
                  <option value="FSOG MAN">FSOG MAN</option>
                  <option value="G/MAN">G/MAN</option>
                  <option value="GENERAL MANAGER">GENERAL MANAGER</option>
                  <option value="GM">GM</option>
                  <option value="GR.">GR.</option>
                  <option value="H/A">H/A</option>
                  <option value="H.A.">H.A.</option>
                  <option value="H.ATTDT">H.ATTDT</option>
                  <option value="H.B.">H.B.</option>
                  <option value="H.E.Z.A.">H.E.Z.A.</option>
                  <option value="H.MAN">H.MAN</option>
                  <option value="H.S.K.">H.S.K.</option>
                  <option value="HA">HA</option>
                  <option value="HA NURSING">HA NURSING</option>
                  <option value="HATTDT">HATTDT</option>
                  <option value="HELPER">HELPER</option>
                  <option value="HOSPITAL ATTDT">HOSPITAL ATTDT</option>
                  <option value="I TECH.">I TECH.</option>
                  <option value="INSPECTOR">INSPECTOR</option>
                  <option value="INST/TECH">INST/TECH</option>
                  <option value="INST. TECH">INST. TECH</option>
                  <option value="JE.MGR">JE.MGR</option>
                  <option value="JGR">JGR</option>
                  <option value="JMT - LAB">JMT - LAB</option>
                  <option value="JR.ASST">JR.ASST</option>
                  <option value="JR.MGR">JR.MGR</option>
                  <option value="JR.OPR">JR.OPR</option>
                  <option value="JR.PLANNER">JR.PLANNER</option>
                  <option value="JR.STAFF">JR.STAFF</option>
                  <option value="JSN(T)">JSN(T)</option>
                  <option value="JSA">JSA</option>
                  <option value="KHALASI">KHALASI</option>
                  <option value="KHALSI">KHALSI</option>
                  <option value="LAB ASSTT">LAB ASSTT</option>
                  <option value="LAB ATTD.">LAB ATTD.</option>
                  <option value="LAB TECH">LAB TECH</option>
                  <option value="LECTURER">LECTURER</option>
                  <option value="LFM">LFM</option>
                  <option value="LOCO OPR">LOCO OPR</option>
                  <option value="L/MAN">L/MAN</option>
                  <option value="L/FM">L/FM</option>
                  <option value="MAG.">MAG.</option>
                  <option value="MALI">MALI</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="MASTER OPR">MASTER OPR</option>
                  <option value="MAZDOOR">MAZDOOR</option>
                  <option value="MEDICAL TECHNOLO">MEDICAL TECHNOLO</option>
                  <option value="ME">ME</option>
                  <option value="MESON">MESON</option>
                  <option value="MGR">MGR</option>
                  <option value="MINING MATE">MINING MATE</option>
                  <option value="MLO/OCI">MLO/OCI</option>
                  <option value="MOCT">MOCT</option>
                  <option value="MOPR">MOPR</option>
                  <option value="MT">MT</option>
                  <option value="MTA">MTA</option>
                  <option value="MTO">MTO</option>
                  <option value="N/S">N/S</option>
                  <option value="N.S.S">N.S.S</option>
                  <option value="NURSE STAFF">NURSE STAFF</option>
                  <option value="NURSING ATTND">NURSING ATTND</option>
                  <option value="NURSING SISTER">NURSING SISTER</option>
                  <option value="O.A.">O.A.</option>
                  <option value="O.C.M">O.C.M</option>
                  <option value="O.C.T">O.C.T</option>
                  <option value="O.C.T.(T)">O.C.T.(T)</option>
                  <option value="O.OPR.">O.OPR.</option>
                  <option value="OCT">OCT</option>
                  <option value="OCT (T)">OCT (T)</option>
                  <option value="OPER.">OPER.</option>
                  <option value="OPERATO">OPERATO</option>
                  <option value="OPR">OPR</option>
                  <option value="OPR.">OPR.</option>
                  <option value="OPTV">OPTV</option>
                  <option value="P.A">P.A</option>
                  <option value="P.ATTD">P.ATTD</option>
                  <option value="P.CHOW">P.CHOW</option>
                  <option value="P.G ASSTT">P.G ASSTT</option>
                  <option value="P/MARKAR">P/MARKAR</option>
                  <option value="PECN">PECN</option>
                  <option value="PEON">PEON</option>
                  <option value="PHARM">PHARM</option>
                  <option value="PHARMACIST">PHARMACIST</option>
                  <option value="PLANNER">PLANNER</option>
                  <option value="PLANT ATTDT">PLANT ATTDT</option>
                  <option value="PLUMBER">PLUMBER</option>
                  <option value="R ASSTT">R ASSTT</option>
                  <option value="RAIL/PROSE">RAIL/PROSE</option>
                  <option value="RECORDER">RECORDER</option>
                  <option value="RIGGER">RIGGER</option>
                  <option value="RMI">RMI</option>
                  <option value="ROOM BOY">ROOM BOY</option>
                  <option value="S/A">S/A</option>
                  <option value="S/ASST">S/ASST</option>
                  <option value="S/ATTDT">S/ATTDT</option>
                  <option value="S.C">S.C</option>
                  <option value="S.K">S.K</option>
                  <option value="S MANAGER">S MANAGER</option>
                  <option value="S OCT">S OCT</option>
                  <option value="S/TECH">S/TECH</option>
                  <option value="SAPULAR">SAPULAR</option>
                  <option value="SCHOOL ATTDT">SCHOOL ATTDT</option>
                  <option value="SEC.OFFICER">SEC.OFFICER</option>
                  <option value="SEC INCH.">SEC INCH.</option>
                  <option value="SECTION OFFICER">SECTION OFFICER</option>
                  <option value="SEMPLER">SEMPLER</option>
                  <option value="SHIPPER">SHIPPER</option>
                  <option value="SMS II">SMS II</option>
                  <option value="SO">SO</option>
                  <option value="SOT">SOT</option>
                  <option value="SPORTS COORDINATOR">SPORTS COORDINATOR</option>
                  <option value="SR A S">SR A S</option>
                  <option value="SR ASTT">SR ASTT</option>
                  <option value="SR LOCO OPR">SR LOCO OPR</option>
                  <option value="SR MANAGER">SR MANAGER</option>
                  <option value="SR OPR">SR OPR</option>
                  <option value="SR TECH">SR TECH</option>
                  <option value="STAFF NURSE">STAFF NURSE</option>
                  <option value="STORE KEEPAR">STORE KEEPAR</option>
                  <option value="SUPERVISAR">SUPERVISAR</option>
                  <option value="SURVEYOR">SURVEYOR</option>
                  <option value="SWEEPER">SWEEPER</option>
                  <option value="T MAN">T MAN</option>
                  <option value="T/MAN">T/MAN</option>
                  <option value="T.O.T">T.O.T</option>
                  <option value="T.O.T.">T.O.T.</option>
                  <option value="TTP">TTP</option>
                  <option value="TECH">TECH</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="TO">TO</option>
                  <option value="TT">TT</option>
                  <option value="R MAN">R MAN</option>
                  <option value="TURNER">TURNER</option>
                  <option value="V.A">V.A</option>
                  <option value="V.OPERATOR">V.OPERATOR</option>
                  <option value="V/ATTDT">V/ATTDT</option>
                  <option value="V/OPR">V/OPR</option>
                  <option value="V.I.P">V.I.P</option>
                  <option value="W/G">W/G</option>
                  <option value="WAP">WAP</option>
                  <option value="WELDER">WELDER</option>
                  <option value="WG">WG</option>
                  <option value="WGC">WGC</option>
                  <option value="W./ATTDT">W./ATTDT</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Basic Pay</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basicPay}
                  onChange={(e) => handleInputChange('basicPay', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">ShareAmt</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.shareAmt}
                  onChange={(e) => handleInputChange('shareAmt', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2 flex items-end">
                <div
                  onClick={() => {
                    const isInsured = !formData.isInsured;
                    handleInputChange('isInsured', isInsured);
                    if (!isInsured) {
                      handleInputChange('amountOfInsurance', '0');
                    }
                  }}
                  role="checkbox"
                  aria-checked={formData.isInsured}
                  className="flex items-center gap-1.5 py-1 cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center fz-nano font-black text-white ${formData.isInsured ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white'
                    }`}>
                    {formData.isInsured && '✓'}
                  </div>
                  <span className="text-slate-500 fz-tiny font-semibold uppercase tracking-wide">Insured</span>
                </div>
              </div>
              <div className="col-span-2">
                <label className={`fz-tiny font-semibold block mb-0.5 uppercase tracking-wide ${formData.isInsured ? 'text-slate-500' : 'text-slate-300'
                  }`}>
                  Insurance Amt {formData.isInsured && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amountOfInsurance}
                  onChange={(e) => handleInputChange('amountOfInsurance', e.target.value)}
                  disabled={!formData.isInsured}
                  className={`w-full px-1.5 py-1 border rounded-md focus:outline-none fz-caption font-medium transition-colors ${formData.isInsured
                    ? 'border-slate-300 bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    }`}
                  placeholder={formData.isInsured ? "0.00" : "Check 'Insured'"}
                  title={formData.isInsured ? "Enter the insurance amount" : "Please check 'Insured' checkbox first"}
                />
                {!formData.isInsured && (
                  <p className="fz-mini text-slate-400 mt-0.5">
                    💡 Check "Insured" to enable
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Membership Date, Retirement Date, Department */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Membership Date</label>
                <input
                  type="date"
                  value={formData.membershipDate}
                  onChange={(e) => handleInputChange('membershipDate', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Retirement Date</label>
                <input
                  type="date"
                  value={formData.retirementDate}
                  onChange={(e) => handleInputChange('retirementDate', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
            </div>

            {/* Row 4: PanCard, Aadhar, Phone, FRS, BranchMS */}
            <div className="grid grid-cols-12 gap-2 mt-2">
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">PanCard No</label>
                <input
                  type="text"
                  value={formData.panCardNo}
                  onChange={(e) => handleInputChange('panCardNo', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Aadhar No</label>
                <input
                  type="text"
                  value={formData.aadharNo}
                  onChange={(e) => handleInputChange('aadharNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="12 digits"
                  maxLength={12}
                />
              </div>
              {/* BUG FIX 15: removed the "Phone Number" (landline/STD) field — it was captured
                  and validated but had no matching column in member_master, so it was silently
                  discarded on every save. No landline column exists to wire it to; adding one
                  needs a deliberate decision, not a silent schema change. */}
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">F.R.S. Number</label>
                <input
                  type="text"
                  value={formData.frsNumber}
                  onChange={(e) => handleInputChange('frsNumber', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="FRS No"
                />
              </div>
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Branch MS No</label>
                <input
                  type="text"
                  value={formData.branchMsNo}
                  onChange={(e) => handleInputChange('branchMsNo', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="Branch MS"
                />
              </div>
            </div>
          </div>

          {/* Address & Status Details Card */}
          <div className="border border-slate-200 rounded-lg p-2.5 bg-white shadow-sm mb-2">
            <span className="inline-block bg-violet-50 text-violet-700 fz-tiny font-bold uppercase tracking-wide px-2 py-1 rounded mb-2">Address &amp; Status</span>

            {/* Row 1: Home Address, Status, Date Withdrawl/Retire */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-6">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Home Address</label>
                <textarea
                  value={formData.homeAddress}
                  onChange={(e) => handleInputChange('homeAddress', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium h-16 resize-none"
                  placeholder="Enter complete home address..."
                />
              </div>
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                >
                  <option value="Regular">Regular</option>
                  <option value="Retire">Retire</option>
                  <option value="Withdrawl">Withdrawl</option>
                  <option value="Expire">Expire</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Date Withdrawl/Retire</label>
                <input
                  type="date"
                  value={formData.dateOfWithdrawRetire}
                  onChange={(e) => handleInputChange('dateOfWithdrawRetire', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
            </div>

            {/* Row 2: Cast Category and Member Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Cast Category</label>
                <select
                  value={formData.castCategory}
                  onChange={(e) => handleInputChange('castCategory', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                >
                  {/* The loaded member's own category is kept even if it's since been
                      removed from the master list, so editing doesn't silently blank it. */}
                  {(formData.castCategory && !castCategoryList.includes(formData.castCategory)
                    ? [formData.castCategory, ...castCategoryList]
                    : castCategoryList
                  ).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Member Type</label>
                <select
                  value={formData.memberType}
                  onChange={(e) => handleInputChange('memberType', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                >
                  <option value="Regular">Regular</option>
                  <option value="Other">Other</option>
                  <option value="Nominal">Nominal</option>
                  <option value="Co-Op Member">Co-Op Member</option>
                  <option value="Well Wisher Member">Well Wisher Member</option>
                </select>
              </div>
            </div>
          </div>

          {/* Organization & Nominee Details Card */}
          <div className="border border-slate-200 rounded-lg p-2.5 bg-white shadow-sm mb-2">
            <span className="inline-block bg-violet-50 text-violet-700 fz-tiny font-bold uppercase tracking-wide px-2 py-1 rounded mb-2">Organization &amp; Nominee</span>

            {/* Division/RO and Branch */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Division/RO *</label>
                <select
                  value={formData.divisionRo}
                  onChange={(e) => handleInputChange('divisionRo', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                >
                  <option value="1-BHILAI">BHILAI</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Branch</label>
                <select
                  value={formData.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                >
                  <option value="">Select...</option>
                  <option value="1-BHILAI-BHILAI-61">1-BHILAI-BHILAI-61</option>
                  <option value="2-POWER HOUSE-POWER HOUSE-94">2-POWER HOUSE-POWER HOUSE-94</option>
                  <option value="3-RISALI-RISALI-99">3-RISALI-RISALI-99</option>
                  <option value="4-NANDINI-NANDINI-13">4-NANDINI-NANDINI-13</option>
                  <option value="5-DALLI RAJHRA-DALLI RAJHRA-03">5-DALLI RAJHRA-DALLI RAJHRA-03</option>
                  <option value="6-MECON-BHILAI-90">6-MECON-BHILAI-90</option>
                </select>
              </div>
            </div>

            {/* Nominee Section */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Nominee's Name</label>
                <input
                  type="text"
                  value={formData.nomineeName}
                  onChange={(e) => handleInputChange('nomineeName', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
              <div className="col-span-3">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Nominee Address</label>
                <input
                  type="text"
                  value={formData.nomineeAddress}
                  onChange={(e) => handleInputChange('nomineeAddress', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Relation</label>
                <select
                  value={formData.relationWithNominee}
                  onChange={(e) => handleInputChange('relationWithNominee', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                >
                  <option value="">Select...</option>
                  <option value="Wife">Wife</option>
                  <option value="Husband">Husband</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Nephew">Nephew</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Declaration Date</label>
                <input
                  type="date"
                  value={formData.declarationDate}
                  onChange={(e) => handleInputChange('declarationDate', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                />
              </div>
            </div>

          </div>

          {/* Documents & Media Card */}
          <div className="border border-slate-200 rounded-lg p-2.5 bg-white shadow-sm mb-2">
            <span className="inline-block bg-violet-50 text-violet-700 fz-tiny font-bold uppercase tracking-wide px-2 py-1 rounded mb-2">Documents &amp; Media</span>

            {/* Mobile + Email */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Mobile No</label>
                <input type="tel" value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="10 digits (starts 6-9)"
                  maxLength={10} />
              </div>
              <div>
                <label className="text-slate-500 fz-tiny font-semibold block mb-0.5 uppercase tracking-wide">Email Address</label>
                <input type="email" value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-1.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 fz-caption font-medium"
                  placeholder="member@example.com" />
              </div>
            </div>

            {/* ID Photos — Front / Back (profile photo is now in the header avatar) */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(['doc_front', 'doc_back'] as const).map((type) => {
                const labels: Record<string, string> = { profile: 'Profile Photo', doc_front: 'ID — Front', doc_back: 'ID — Back' };
                const preview = mediaPreviews[type] || mediaSavedUrls[type] || '';
                return (
                  <div key={type} className="border border-slate-200 rounded-lg bg-white p-1.5 flex flex-col items-center gap-1">
                    <span className="fz-mini font-bold text-slate-500 uppercase tracking-wide">{labels[type]}</span>
                    {preview ? (
                      <div className="relative">
                        <img src={preview} alt={labels[type]}
                          className="w-20 h-20 object-cover rounded-md border border-slate-200"
                          onError={() => {
                            // 404 = no file saved yet — clear saved URL so placeholder shows
                            if (!mediaQueue[type]) {
                              setMediaSavedUrls(p => { const n = {...p}; delete n[type]; return n; });
                            }
                          }} />
                        <button onClick={() => { setMediaQueue(p => { const n = {...p}; delete n[type]; return n; }); setMediaPreviews(p => { const n = {...p}; delete n[type]; return n; }); }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-600">
                          <XIcon size={8} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 border border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:border-violet-400 hover:bg-violet-50"
                        onClick={() => document.getElementById(`photo-${type}`)?.click()}>
                        <UploadIcon size={16} />
                        <span className="fz-micro mt-0.5">Click to upload</span>
                      </div>
                    )}
                    <input id={`photo-${type}`} type="file" accept="image/jpeg,image/png" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(type, f); e.target.value = ''; }} />
                    <button onClick={() => document.getElementById(`photo-${type}`)?.click()}
                      className="fz-micro font-bold text-violet-600 hover:text-violet-800 uppercase tracking-wide px-2 py-0.5 border border-slate-300 rounded-md hover:bg-violet-50">
                      {preview ? 'Change' : 'Browse'}
                    </button>
                    {mediaQueue[type] && <span className="fz-nano text-amber-600 font-black">⏳ Will upload on save</span>}
                  </div>
                );
              })}
            </div>

            {/* KYC Documents — typed, multi-upload */}
            <div id="kyc-section" className="border border-slate-200 rounded-lg bg-white p-2 mb-2">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
                <span className="fz-tiny font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  KYC Documents
                  {kycDocuments.length > 0 && <span className="bg-violet-50 text-violet-700 px-1.5 rounded-full fz-mini">{kycDocuments.length}</span>}
                </span>
                <div className="flex items-center gap-1.5">
                  <select value={kycDocType} onChange={(e) => setKycDocType(e.target.value)}
                    className="px-1.5 py-1 border border-slate-300 rounded-md bg-white fz-caption font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                    {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input id="kyc-file" type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleKycUpload(f); e.target.value = ''; }} />
                  <button onClick={() => document.getElementById('kyc-file')?.click()} disabled={kycUploading || !formData.memberNumber}
                    className="fz-tiny font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-2.5 py-1 rounded-md uppercase tracking-wide flex items-center gap-1 transition-colors">
                    <UploadIcon size={10} /> {kycUploading ? 'Uploading…' : 'Add Document'}
                  </button>
                </div>
              </div>
              {!formData.memberNumber && (
                <p className="fz-mini text-amber-600 font-semibold mb-1">💡 Save the member first to attach KYC documents.</p>
              )}
              {kycDocuments.length === 0 ? (
                <p className="fz-mini text-slate-400 font-semibold text-center py-2 uppercase tracking-wide">No documents uploaded</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {kycDocuments.map((doc) => (
                    <div key={doc.id} className="border border-violet-100 rounded-full bg-violet-50 px-2.5 py-1 flex items-center justify-between gap-1.5">
                      <a href={`${getApiBaseUrlSync()}/members/master/${formData.memberNumber}/document/${doc.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                        <span className="block fz-mini font-bold text-violet-700 uppercase truncate">{doc.docType}</span>
                        <span className="block fz-micro text-violet-400 truncate" title={doc.fileName}>{doc.fileName || 'View'}</span>
                      </a>
                      <button onClick={() => handleKycDelete(doc.id)}
                        className="bg-white text-violet-400 rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-500 hover:text-white shrink-0 transition-colors">
                        <XIcon size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature */}
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
              <div className="bg-violet-600 px-2 py-0.5 flex items-center justify-between">
                <span className="fz-mini font-black text-white uppercase tracking-wide flex items-center gap-1"><PenTool size={9} /> Signature</span>
                <div className="flex gap-1">
                  {(['draw', 'upload'] as const).map(m => (
                    <button key={m} onClick={() => setSigMode(m)}
                      className={`fz-micro font-black px-2 py-0.5 rounded uppercase tracking-wide transition-all ${sigMode === m ? 'bg-white text-violet-700' : 'text-violet-200 hover:text-white'}`}>
                      {m === 'draw' ? '✏ Draw' : '⬆ Upload'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draw tab */}
              {sigMode === 'draw' && (
                <div>
                  <div className="relative bg-white">
                    <canvas ref={canvasRef} width={600} height={120}
                      className="w-full cursor-crosshair border-b border-violet-100 select-none"
                      style={{ touchAction: 'none', display: 'block', height: 140 }}
                      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
                    {!hasDrawing && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="fz-mini font-black text-slate-300 uppercase tracking-widest">Sign here with mouse or touch</span>
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1 bg-slate-50 flex items-center justify-between border-t border-slate-200">
                    <button onClick={clearCanvas} disabled={!hasDrawing}
                      className="fz-micro font-bold px-2 py-0.5 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 uppercase">
                      Clear
                    </button>
                    <div className="flex items-center gap-2">
                      {sigQueue && <span className="fz-nano text-amber-600 font-black">⏳ Will upload on save</span>}
                      {savedSigUrl && !sigQueue && (
                        <span className="fz-nano text-emerald-600 font-black flex items-center gap-0.5"><CheckCircle2 size={8} /> Saved</span>
                      )}
                      <button onClick={queueDrawing} disabled={!hasDrawing}
                        className="fz-micro font-bold px-3 py-0.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 text-white rounded-md uppercase tracking-wide">
                        Use This Signature
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload tab */}
              {sigMode === 'upload' && (
                <div className="p-2">
                  <div className="border border-dashed border-slate-300 rounded-md p-4 flex flex-col items-center gap-1 cursor-pointer hover:border-violet-500 hover:bg-violet-50"
                    onClick={() => document.getElementById('sig-upload')?.click()}>
                    <UploadIcon size={20} className="text-slate-300" />
                    <span className="fz-mini font-bold text-slate-500 uppercase">Click to upload signature (JPG/PNG)</span>
                    {sigQueue && <span className="fz-micro text-amber-600 font-black">⏳ {sigQueue.name} — will upload on save</span>}
                  </div>
                  <input id="sig-upload" type="file" accept="image/jpeg,image/png" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSigQueue(f); } e.target.value = ''; }} />
                </div>
              )}

              {/* Saved signature preview */}
              {savedSigUrl && !sigQueue && (
                <div className="border-t border-slate-200 px-2 py-1 bg-emerald-50 flex items-center gap-2">
                  <CheckCircle2 size={10} className="text-emerald-600" />
                  <span className="fz-micro font-black text-emerald-700 uppercase">Saved Signature:</span>
                  <img src={savedSigUrl} alt="Saved signature"
                    className="max-h-10 max-w-32 object-contain bg-white border border-emerald-200 rounded p-0.5"
                    onError={() => setSavedSigUrl('')} />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {/* Member Lookup Modal */}
      <Modal
        open={showLookupModal}
        onCancel={() => setShowLookupModal(false)}
        footer={null}
        width={800}
        bodyStyle={{ padding: 0 }}
        closable={false}
        destroyOnClose
      >
        <MemberLookup
          isModal={true}
          onSelect={(member) => {
            handleMemberSelect(member.memberNo);
            setShowLookupModal(false);
          }}
          onClose={() => setShowLookupModal(false)}
        />
      </Modal>

      {/* Scoped polish — most of the previous rainbow-scheme dark-mode overrides
          are gone: the page now uses plain neutral slate and violet utility
          classes, which ThemeProvider's global html.dark rules already repaint.
          Only the slate-300 input border isn't covered by those global rules,
          so it gets one here. */}
      <style>{`
        /* ── Subtle entrance animation for each section card ── */
        @keyframes mmCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .mm-form input, .mm-form select, .mm-form textarea { transition: border-color .15s, box-shadow .15s, background-color .15s; }
        .mm-form button { transition: transform .12s ease, background-color .15s, box-shadow .15s; }
        .mm-form button:active { transform: scale(.96); }

        html.dark .mm-form .border-slate-300 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .mm-form select option { background: #151A21; color: #E6E9EF; }
        html.dark .mm-form input::placeholder,
        html.dark .mm-form textarea::placeholder { color: #71717a !important; }
      `}</style>

    </div>
  );
};

export default MemberMaster;