import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Save, RotateCcw, PenTool, Upload as UploadIcon, X as XIcon, CheckCircle2, User, Camera, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import apiService from '../../../../services/api';
import { getApiBaseUrlSync } from '../../../../services/apiVersionConfig';
import { useMemberForm } from '../Hook/useMemberForm';
import { Select as AntSelect } from 'antd';
import MemberLookupDialog from '../../../../components/shared/kit/MemberLookupDialog';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import type { RootState } from '../../../../store';
import { useTranslation } from 'react-i18next';
import MobileAccessBadge from '../components/MobileAccessBadge';

type MemberSelectProps = {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
  searchable?: boolean;
  className?: string;
};

// Keep the existing option values while using the app's animated, keyboard-accessible popup.
const MemberSelect: React.FC<MemberSelectProps> = ({ value, onChange, children, ariaLabel, searchable = false, className = '' }) => {
  const options = React.Children.toArray(children)
    .filter((child): child is React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>> => React.isValidElement(child))
    .map((child) => ({ value: String(child.props.value ?? ''), label: child.props.children }));

  return (
    <AntSelect
      className={`aw-select ${className}`.trim()}
      popupClassName="aw-select-popup"
      aria-label={ariaLabel}
      value={value}
      onChange={onChange}
      options={options}
      showSearch={searchable}
      optionFilterProp="label"
      virtual={options.length > 30}
    />
  );
};

const MemberMaster: React.FC = () => {
  const { t } = useTranslation();
  const { formData, handleInputChange, resetForm, setFormValues } = useMemberForm();
  const interfaceMode = useSelector((s: RootState) => s.theme.interfaceMode);
  const isDarkMode = interfaceMode === 'dark';
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
        title: t('Input Validation Error'),
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
    if (url) mediaObjectUrlsRef.current[key] = url;
    else delete mediaObjectUrlsRef.current[key];
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
  // isCurrent lets a caller drop a response that arrives after the user already picked another member.
  const loadProtectedImage = useCallback(async (key: MediaKey, endpoint: string, isCurrent?: () => boolean) => {
    try {
      const blob = await apiService.fetchProtectedFile(endpoint);
      if (isCurrent && !isCurrent()) return;
      setMediaObjectUrl(key, blob ? URL.createObjectURL(blob) : '');
    } catch {
      if (isCurrent && !isCurrent()) return;
      setMediaObjectUrl(key, '');
    }
  }, [setMediaObjectUrl]);

  // Bumped on every member selection; late responses from an older selection are ignored.
  const memberSelectSeqRef = useRef(0);

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
    const onTS = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; if (!t) return; isDrawingRef.current = true; lastPosRef.current = scaled(t.clientX, t.clientY); };
    const onTM = (e: TouchEvent) => {
      e.preventDefault(); if (!isDrawingRef.current) return;
      const t = e.touches[0]; if (!t) return;
      const p = scaled(t.clientX, t.clientY);
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
  // Returns a human-readable line for every upload that failed; failed items stay queued so
  // the user can retry with Save (successful ones are removed from the queue).
  const uploadQueuedMedia = useCallback(async (mbno: string): Promise<string[]> => {
    const PHOTO_LABELS: Record<PhotoType, string> = { profile: 'Profile photo', doc_front: 'ID document (front)', doc_back: 'ID document (back)' };
    const failed: string[] = [];
    const uploadedPhotos: PhotoType[] = [];
    let signatureUploaded = false;
    const queuedSig = sigQueue;
    const uploads: Promise<void>[] = [];
    for (const [type, file] of Object.entries(mediaQueue) as [PhotoType, File][]) {
      uploads.push((async () => {
        try {
          const res = await apiService.uploadMemberPhotoMaster(mbno, type, file);
          if (!res.success) throw new Error(res.message || res.error || 'Upload failed');
          uploadedPhotos.push(type);
          await loadProtectedImage(type, `/members/master/${mbno}/photo/${type}`);
        } catch (e: any) {
          failed.push(`${PHOTO_LABELS[type]}: ${e?.message || 'Upload failed'}`);
        }
      })());
    }
    if (queuedSig) {
      uploads.push((async () => {
        try {
          const res = await apiService.uploadMemberSignatureMaster(mbno, queuedSig);
          if (!res.success) throw new Error(res.message || res.error || 'Upload failed');
          signatureUploaded = true;
          await loadProtectedImage('signature', `/members/master/${mbno}/signature`);
          clearCanvas();
        } catch (e: any) {
          failed.push(`Signature: ${e?.message || 'Upload failed'}`);
        }
      })());
    }
    await Promise.all(uploads);
    setMediaQueue(prev => {
      const next = { ...prev };
      uploadedPhotos.forEach(t => { delete next[t]; });
      return next;
    });
    if (signatureUploaded) setSigQueue(prev => (prev === queuedSig ? null : prev));
    return failed;
  }, [mediaQueue, sigQueue, clearCanvas, loadProtectedImage]);

  // Load saved media when an existing member is loaded
  const loadMemberMedia = useCallback((mbno: string, isCurrent?: () => boolean) => {
    loadProtectedImage('signature', `/members/master/${mbno}/signature`, isCurrent);
    (['profile', 'doc_front', 'doc_back'] as PhotoType[]).forEach(type =>
      loadProtectedImage(type, `/members/master/${mbno}/photo/${type}`, isCurrent)
    );
    setMediaQueue({}); setMediaPreviews({}); setSigQueue(null); clearCanvas();
  }, [clearCanvas, loadProtectedImage]);

  // ── KYC Documents handlers ────────────────────────────────────────────────
  const loadKycDocuments = useCallback(async (mbno: string, isCurrent?: () => boolean) => {
    try {
      const res = await apiService.getMemberDocuments(mbno);
      if (isCurrent && !isCurrent()) return;
      const docs = Array.isArray(res.data) ? res.data : ((res.data as any)?.data || []);
      setKycDocuments(Array.isArray(docs) ? docs : []);
    } catch { if (!isCurrent || isCurrent()) setKycDocuments([]); }
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
      else await showErrorDialog('Document Delete Failed', res.message || res.error || 'The document could not be removed.');
    } catch (e: any) { await showErrorDialog('Document Delete Failed', e?.message || 'The document could not be removed.'); }
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
      // ES-492: member_master.wingno holds the wing CODE ("1"), not the wing name ("BHILAI") — every migrated member
      // has wingno '1' and the wing/office joins match on it. The Division/RO option value is "<wing code>-<name>",
      // so the code is the part before the first dash.
      void divisionRest;
      const parsedWingNo = (formData.divisionRo.split('-')[0] || '').trim();

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

      // Shared apiService: adds auth, refreshes the token on 401 and copes with non-JSON error bodies.
      const response = await apiService.request(endpoint, {
        method,
        body: JSON.stringify(memberPayload),
      });

      if (response.success) {
        // TransformInterceptor wraps all responses: { success, data: <controller_return> }.
        // saveMemberMaster service also wraps: { success, data: <pg_row> }.
        // apiService.request already strips the outer envelope, so response.data.data
        // is the actual PostgreSQL RETURNING row.
        const savedDetails = (response.data as any)?.data || response.data;

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
        const failedUploads = finalMemberNo ? await uploadQueuedMedia(finalMemberNo) : [];
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

        if (failedUploads.length > 0) {
          await showErrorDialog(
            'Member Saved - Some Uploads Failed',
            `The member record was saved, but these uploads failed:\n\n${failedUploads.join('\n')}\n\nThey are still queued - press Save again to retry.`
          );
        }
      } else {
        await showErrorDialog('Failed To Save Member', response.message || response.error || 'Unknown error');
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
    const seq = ++memberSelectSeqRef.current;
    const isCurrent = () => seq === memberSelectSeqRef.current;

    try {
      showNotification('info', `Loading member details for ${memberNo}...`);

      const response = await apiService.request(`/members/details/${encodeURIComponent(memberNo)}`);
      if (!isCurrent()) return; // user picked another member meanwhile

      if (response.success) {
        const memberDetails = (response.data || {}) as any;

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
            // ES-492: wingno is the wing code ('1'); older rows saved by the screen hold the name ('BHILAI').
            // The only Division/RO option is "1-BHILAI".
            if (wing === '1' || String(wing).toUpperCase() === 'BHILAI') return '1-BHILAI';
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
        loadMemberMedia(memberNo, isCurrent);
        loadKycDocuments(memberNo, isCurrent);
      } else {
        await showErrorDialog('Failed To Fetch Member Details', response.message || response.error || 'Unknown error');
      }
    } catch (error) {
      if (isCurrent()) await showErrorDialog('Error Fetching Member Details', (error as Error).message);
    } finally {
      if (isCurrent()) setIsLoadingMember(false);
    }
  };

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: isSaving ? 'Saving…' : formData.memberNumber ? 'Update' : 'Create',
    saveEnabled: !isSaving,
  });

  return (
    <div className="app-window mm-form">
      {/* Header */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Member Master')}</h1>
          <p className="aw-desc">{t('Create and manage member information.')}</p>
        </div>
        {formData.memberNumber ? <MobileAccessBadge memberNo={String(formData.memberNumber)} /> : null}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mm-toast aw-alert aw-fade-in ${notification.type === 'success' ? 'aw-alert-success' : notification.type === 'error' ? 'aw-alert-danger' : 'aw-alert-info'}`} role="status">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="aw-strong" style={{ color: 'inherit' }}>{notification.message}</div>
              {/* Structured detail card for create-success */}
              {notification.detail && (
                <div className="aw-panel mt-2 space-y-1">
                  {Object.entries(notification.detail).map(([k, v]) => (
                    <div key={k} className="flex gap-2 fz-label">
                      <span className="aw-meta w-28 shrink-0">{k}:</span>
                      <span className={`aw-strong ${k === 'Member No' ? 'mm-accent-text' : ''}`}>{v}</span>
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
              className="aw-icon-btn is-sm" aria-label={t('Close')}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="aw-content">
        <div className="mm-content-inner aw-stack">
          {/* Identity Card */}
          <div className="mm-section aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon mm-section-number" aria-hidden="true">01</span>
              <h2 className="aw-card-title">{t('Member identity')}</h2>
            </div>
            {/* Top Row: Avatar, Member Number, Search, Active */}
            <div className="mm-record-toolbar flex flex-row flex-wrap items-center gap-2 mb-2">
              {/* Circular profile photo (with initials-avatar fallback) */}
              <div className="relative group shrink-0">
                <input id="photo-profile-header" type="file" accept="image/jpeg,image/png" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect('profile', f); e.target.value = ''; }} />
                {(mediaPreviews.profile || mediaSavedUrls.profile) ? (
                  <img
                    src={mediaPreviews.profile || mediaSavedUrls.profile}
                    alt={t('Profile')}
                    onClick={() => document.getElementById('photo-profile-header')?.click()}
                    onError={() => { if (!mediaQueue.profile) setMediaSavedUrls(p => { const n = { ...p }; delete n.profile; return n; }); }}
                    className="mm-avatar w-11 h-11 rounded-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div
                    onClick={() => document.getElementById('photo-profile-header')?.click()}
                    className="mm-avatar mm-avatar-initials w-11 h-11 rounded-full cursor-pointer flex items-center justify-center uppercase transition-transform group-hover:scale-105"
                  >
                    {((formData.firstName?.[0] || '') + (formData.lastName?.[0] || '')) || <User size={18} />}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                  <Camera size={13} />
                </div>
                {mediaQueue.profile && <span className="mm-queued mm-queued-badge absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 rounded whitespace-nowrap">{t('on save')}</span>}
              </div>

              <div className="flex items-center gap-1.5">
                <label className="aw-label mm-inline-label">{t('Member No')}</label>
                <input
                  type="text"
                  value={formData.memberNumber}
                  onChange={(e) => handleInputChange('memberNumber', e.target.value)}
                  className="aw-input mm-memberno"
                  placeholder={t('Auto')}
                />
                <button
                  onClick={handleSearchClick}
                  disabled={isLoadingMember}
                  className="aw-btn aw-btn-secondary"
                >
                  {isLoadingMember ? (
                    <RefreshCw size={12} className="aw-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  <span>{isLoadingMember ? t('Load') : t('Search')}</span>
                </button>
                <button
                  onClick={() => document.getElementById('kyc-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="aw-btn aw-btn-secondary"
                  data-tip={t('Jump to KYC Documents')} data-tip-pos="bottom"
                >
                  <UploadIcon className="w-3 h-3" /> <span>{t('KYC Docs')}</span>
                </button>
              </div>

              <span className={`mm-record-mode aw-pill ${formData.memberNumber ? 'tone-success' : ''}`}>
                {formData.memberNumber ? t('Editing member') : t('New member')}
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                <div
                  onClick={() => handleInputChange('isActive', !formData.isActive)}
                  role="checkbox"
                  aria-checked={formData.isActive}
                  className={`mm-active-toggle ${formData.isActive ? 'is-on' : ''}`} tabIndex={0} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleInputChange('isActive', !formData.isActive); } }}
                >
                  <span className="mm-dot" aria-hidden="true" />
                  <span className="mm-active-label">{formData.isActive ? t('Active') : t('Inactive')}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="aw-btn aw-btn-secondary"
                >
                  <RotateCcw className="w-3 h-3" /> <span>{t('Reset')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="aw-btn aw-btn-primary"
                >
                  {isSaving ? <RefreshCw size={12} className="aw-spin" /> : <Save className="w-3 h-3" />}
                  <span>{isSaving ? t('Saving…') : formData.memberNumber ? t('Update') : t('Create')}</span>
                </button>
              </div>
            </div>

            {/* Name Fields Row */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <label className="aw-label">{t('Title')}</label>
                <MemberSelect
                  ariaLabel="Title"
                  value={formData.title}
                  onChange={(value) => handleInputChange('title', value)}
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">{t('Mrs')}</option>
                  <option value="Ms">Ms</option>
                  <option value="Smt.">{t('Smt.')}</option>
                  <option value="Dr">Dr</option>
                </MemberSelect>
              </div>
              <div className="col-span-3">
                <label className="aw-label">{t('First Name *')}</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="aw-input"
                  placeholder={t('Enter first name')}
                />
              </div>
              <div className="col-span-3">
                <label className="aw-label">{t('Middle Name')}</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange('middleName', e.target.value)}
                  className="aw-input"
                  placeholder={t('Enter middle name')}
                />
              </div>
              <div className="col-span-4">
                <label className="aw-label">{t('Last Name *')}</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="aw-input"
                  placeholder={t('Enter last name')}
                />
              </div>
            </div>
            {/* Father's Name Row */}
            <div className="grid grid-cols-12 gap-2 mt-2">
              <div className="col-span-12">
                <label className="aw-label">{t("Father's Name")}</label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  className="aw-input"
                  placeholder={t("Enter father's name")}
                />
              </div>
            </div>
          </div>

          {/* Personal & Employment Details Card */}
          <div className="mm-section aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon mm-section-number" aria-hidden="true">02</span>
              <h2 className="aw-card-title">{t('Personal & employment')}</h2>
            </div>

            {/* Row 1: Gender, DOB, Age, Monthly Contribution, Compulsary Deposit */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-2">
                <label className="aw-label">{t('Gender')}</label>
                <div className="flex gap-1.5" role="radiogroup" aria-label={t('Gender')}>
                  <div
                    role="radio" tabIndex={0} aria-checked={formData.gender === 'male'}
                    onClick={() => handleInputChange('gender', 'male')}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleInputChange('gender', 'male'); } }}
                    className="aw-chip mm-gender-option flex-1 justify-center"
                  >
                    {t('Male')}
                  </div>
                  <div
                    role="radio" tabIndex={0} aria-checked={formData.gender === 'female'}
                    onClick={() => handleInputChange('gender', 'female')}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleInputChange('gender', 'female'); } }}
                    className="aw-chip mm-gender-option flex-1 justify-center"
                  >
                    {t('Female')}
                  </div>
                </div>
              </div>
              <div className="col-span-2">
                <label className="aw-label">{t('Date Of Birth')}</label>
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
                  className="aw-input"
                />
              </div>
              <div className="col-span-1">
                <label className="aw-label">{t('Age')}</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                  className="aw-input mm-auto"
                  placeholder={t('Auto')}
                  title={t('Age is auto-calculated from Date of Birth')}
                />
              </div>
              <div className="col-span-3">
                <label className="aw-label">{t('Monthly Contrib.')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyContribution}
                  onChange={(e) => handleInputChange('monthlyContribution', e.target.value)}
                  className="aw-input"
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-4">
                <label className="aw-label">{t('Compulsary Dep.')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.compulsatoryDeposit}
                  onChange={(e) => handleInputChange('compulsatoryDeposit', e.target.value)}
                  className="aw-input"
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
                    style={{ accentColor: 'var(--aw-accent)' }}
                  />
                  <span className="aw-meta">{t('Start RD for this member')}</span>
                </label>
              </div>
            </div>

            {/* Row 2: Sr.No, Designation, Basic Pay, ShareAmt, Insurance */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-2">
                <label className="aw-label">{t('Sr.No/EPF/P.NO')}</label>
                <input
                  type="text"
                  value={formData.srNoEpfPfNo}
                  onChange={(e) => handleInputChange('srNoEpfPfNo', e.target.value)}
                  className="aw-input"
                />
              </div>
              <div className="col-span-2">
                <label className="aw-label">{t('Designation')}</label>
                <MemberSelect
                  ariaLabel="Designation"
                  searchable
                  value={formData.designation}
                  onChange={(value) => handleInputChange('designation', value)}
                >
                  <option value="">{t('Select...')}</option>
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
                </MemberSelect>
              </div>
              <div className="col-span-2">
                <label className="aw-label">{t('Basic Pay')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basicPay}
                  onChange={(e) => handleInputChange('basicPay', e.target.value)}
                  className="aw-input"
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <label className="aw-label">{t('ShareAmt')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.shareAmt}
                  onChange={(e) => handleInputChange('shareAmt', e.target.value)}
                  className="aw-input"
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
                  <div className={`mm-check ${formData.isInsured ? 'is-on' : ''}`}>
                    {formData.isInsured && '✓'}
                  </div>
                  <span className="aw-meta">{t('Insured')}</span>
                </div>
              </div>
              <div className="col-span-2">
                <label className="aw-label" style={formData.isInsured ? undefined : { opacity: 0.55 }}>
                  {t('Insurance Amt')} {formData.isInsured && <span style={{ color: 'var(--aw-danger)' }}>*</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amountOfInsurance}
                  onChange={(e) => handleInputChange('amountOfInsurance', e.target.value)}
                  disabled={!formData.isInsured}
                  className="aw-input"
                  placeholder={formData.isInsured ? "0.00" : t("Check 'Insured'")}
                  title={formData.isInsured ? t('Enter the insurance amount') : t("Please check 'Insured' checkbox first")}
                />
                {!formData.isInsured && (
                  <p className="aw-meta mt-0.5">
                    {t('Check "Insured" to enable')}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Membership Date, Retirement Date, Department */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="aw-label">{t('Membership Date')}</label>
                <input
                  type="date"
                  value={formData.membershipDate}
                  onChange={(e) => handleInputChange('membershipDate', e.target.value)}
                  className="aw-input"
                />
              </div>
              <div>
                <label className="aw-label">{t('Retirement Date')}</label>
                <input
                  type="date"
                  value={formData.retirementDate}
                  onChange={(e) => handleInputChange('retirementDate', e.target.value)}
                  className="aw-input"
                />
              </div>
              <div>
                <label className="aw-label">{t('Department')}</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="aw-input"
                />
              </div>
            </div>

            {/* Row 4: PanCard, Aadhar, Phone, FRS, BranchMS */}
            <div className="grid grid-cols-12 gap-2 mt-2">
              <div className="col-span-2">
                <label className="aw-label">{t('PanCard No')}</label>
                <input
                  type="text"
                  value={formData.panCardNo}
                  onChange={(e) => handleInputChange('panCardNo', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  className="aw-input"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
              <div className="col-span-3">
                <label className="aw-label">{t('Aadhar No')}</label>
                <input
                  type="text"
                  value={formData.aadharNo}
                  onChange={(e) => handleInputChange('aadharNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="aw-input"
                  placeholder={'12 ' + t('digits')}
                  maxLength={12}
                />
              </div>
              {/* BUG FIX 15: removed the "Phone Number" (landline/STD) field — it was captured
                  and validated but had no matching column in member_master, so it was silently
                  discarded on every save. No landline column exists to wire it to; adding one
                  needs a deliberate decision, not a silent schema change. */}
              <div className="col-span-2">
                <label className="aw-label">{t('F.R.S. Number')}</label>
                <input
                  type="text"
                  value={formData.frsNumber}
                  onChange={(e) => handleInputChange('frsNumber', e.target.value)}
                  className="aw-input"
                  placeholder={t('FRS No')}
                />
              </div>
              <div className="col-span-3">
                <label className="aw-label">{t('Branch MS No')}</label>
                <input
                  type="text"
                  value={formData.branchMsNo}
                  onChange={(e) => handleInputChange('branchMsNo', e.target.value)}
                  className="aw-input"
                  placeholder={t('Branch MS')}
                />
              </div>
            </div>
          </div>

          {/* Address & Status Details Card */}
          <div className="mm-section aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon mm-section-number" aria-hidden="true">03</span>
              <h2 className="aw-card-title">{t('Address & status')}</h2>
            </div>

            {/* Row 1: Home Address, Status, Date Withdrawl/Retire */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-6">
                <label className="aw-label">{t('Home Address')}</label>
                <textarea
                  value={formData.homeAddress}
                  onChange={(e) => handleInputChange('homeAddress', e.target.value)}
                  className="aw-input mm-textarea"
                  placeholder={t('Enter complete home address...')}
                />
              </div>
              <div className="col-span-3">
                <label className="aw-label">{t('Status')}</label>
                <MemberSelect
                  ariaLabel="Status"
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                >
                  <option value="Regular">{t('Regular')}</option>
                  <option value="Retire">{t('Retire')}</option>
                  <option value="Withdrawl">{t('Withdrawl')}</option>
                  <option value="Expire">{t('Expire')}</option>
                </MemberSelect>
              </div>
              <div className="col-span-3">
                <label className="aw-label">{t('Date Withdrawl/Retire')}</label>
                <input
                  type="date"
                  value={formData.dateOfWithdrawRetire}
                  onChange={(e) => handleInputChange('dateOfWithdrawRetire', e.target.value)}
                  className="aw-input"
                />
              </div>
            </div>

            {/* Row 2: Cast Category and Member Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="aw-label">{t('Cast Category')}</label>
                <MemberSelect
                  ariaLabel="Cast Category"
                  value={formData.castCategory}
                  onChange={(value) => handleInputChange('castCategory', value)}
                >
                  {/* The loaded member's own category is kept even if it's since been
                      removed from the master list, so editing doesn't silently blank it. */}
                  {(formData.castCategory && !castCategoryList.includes(formData.castCategory)
                    ? [formData.castCategory, ...castCategoryList]
                    : castCategoryList
                  ).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </MemberSelect>
              </div>
              <div>
                <label className="aw-label">{t('Member Type')}</label>
                <MemberSelect
                  ariaLabel="Member Type"
                  value={formData.memberType}
                  onChange={(value) => handleInputChange('memberType', value)}
                >
                  <option value="Regular">{t('Regular')}</option>
                  <option value="Other">{t('Other')}</option>
                  <option value="Nominal">{t('Nominal')}</option>
                  <option value="Co-Op Member">{t('Co-Op Member')}</option>
                  <option value="Well Wisher Member">{t('Well Wisher Member')}</option>
                </MemberSelect>
              </div>
            </div>
          </div>

          {/* Organization & Nominee Details Card */}
          <div className="mm-section aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon mm-section-number" aria-hidden="true">04</span>
              <h2 className="aw-card-title">{t('Organization & nominee')}</h2>
            </div>

            {/* Division/RO and Branch */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="aw-label">{t('Division/RO *')}</label>
                <MemberSelect
                  ariaLabel="Division/RO"
                  value={formData.divisionRo}
                  onChange={(value) => handleInputChange('divisionRo', value)}
                >
                  <option value="1-BHILAI">BHILAI</option>
                </MemberSelect>
              </div>
              <div>
                <label className="aw-label">{t('Branch')}</label>
                <MemberSelect
                  ariaLabel="Branch"
                  value={formData.branch}
                  onChange={(value) => handleInputChange('branch', value)}
                >
                  <option value="">{t('Select...')}</option>
                  <option value="1-BHILAI-BHILAI-61">1-BHILAI-BHILAI-61</option>
                  <option value="2-POWER HOUSE-POWER HOUSE-94">2-POWER HOUSE-POWER HOUSE-94</option>
                  <option value="3-RISALI-RISALI-99">3-RISALI-RISALI-99</option>
                  <option value="4-NANDINI-NANDINI-13">4-NANDINI-NANDINI-13</option>
                  <option value="5-DALLI RAJHRA-DALLI RAJHRA-03">5-DALLI RAJHRA-DALLI RAJHRA-03</option>
                  <option value="6-MECON-BHILAI-90">6-MECON-BHILAI-90</option>
                </MemberSelect>
              </div>
            </div>

            {/* Nominee Section */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <label className="aw-label">{t("Nominee's Name")}</label>
                <input
                  type="text"
                  value={formData.nomineeName}
                  onChange={(e) => handleInputChange('nomineeName', e.target.value)}
                  className="aw-input"
                />
              </div>
              <div className="col-span-3">
                <label className="aw-label">{t('Nominee Address')}</label>
                <input
                  type="text"
                  value={formData.nomineeAddress}
                  onChange={(e) => handleInputChange('nomineeAddress', e.target.value)}
                  className="aw-input"
                />
              </div>
              <div className="col-span-2">
                <label className="aw-label">{t('Relation')}</label>
                <MemberSelect
                  ariaLabel="Relation"
                  value={formData.relationWithNominee}
                  onChange={(value) => handleInputChange('relationWithNominee', value)}
                >
                  <option value="">{t('Select...')}</option>
                  <option value="Wife">{t('Wife')}</option>
                  <option value="Husband">{t('Husband')}</option>
                  <option value="Spouse">{t('Spouse')}</option>
                  <option value="Son">{t('Son')}</option>
                  <option value="Daughter">{t('Daughter')}</option>
                  <option value="Father">{t('Father')}</option>
                  <option value="Mother">{t('Mother')}</option>
                  <option value="Brother">{t('Brother')}</option>
                  <option value="Sister">{t('Sister')}</option>
                  <option value="Nephew">{t('Nephew')}</option>
                </MemberSelect>
              </div>
              <div className="col-span-2">
                <label className="aw-label">{t('Declaration Date')}</label>
                <input
                  type="date"
                  value={formData.declarationDate}
                  onChange={(e) => handleInputChange('declarationDate', e.target.value)}
                  className="aw-input"
                />
              </div>
              <div className="col-span-2">
                <label className="aw-label">{t('Remarks')}</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  className="aw-input"
                />
              </div>
            </div>

          </div>

          {/* Documents & Media Card */}
          <div className="mm-section aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon mm-section-number" aria-hidden="true">05</span>
              <h2 className="aw-card-title">{t('Documents & media')}</h2>
            </div>

            {/* Mobile + Email */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="aw-label">{t('Mobile No')}</label>
                <input type="tel" value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="aw-input"
                  placeholder={'10 ' + t('digits (starts 6-9)')}
                  maxLength={10} />
              </div>
              <div>
                <label className="aw-label">{t('Email Address')}</label>
                <input type="email" value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="aw-input"
                  placeholder={t('member@example.com')} />
              </div>
            </div>

            {/* ID Photos — Front / Back (profile photo is now in the header avatar) */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(['doc_front', 'doc_back'] as const).map((type) => {
                const labels: Record<string, string> = { profile: 'Profile Photo', doc_front: 'ID — Front', doc_back: 'ID — Back' };
                const preview = mediaPreviews[type] || mediaSavedUrls[type] || '';
                return (
                  <div key={type} className="mm-subcard flex flex-col items-center gap-1">
                    <span className="aw-label" style={{ margin: 0 }}>{labels[type]}</span>
                    {preview ? (
                      <div className="relative">
                        <img src={preview} alt={labels[type]}
                          className="mm-thumb w-20 h-20 object-cover"
                          onError={() => {
                            // 404 = no file saved yet — clear saved URL so placeholder shows
                            if (!mediaQueue[type]) {
                              setMediaSavedUrls(p => { const n = {...p}; delete n[type]; return n; });
                            }
                          }} />
                        <button onClick={() => { setMediaQueue(p => { const n = {...p}; delete n[type]; return n; }); setMediaPreviews(p => { const n = {...p}; delete n[type]; return n; }); }}
                          className="mm-x mm-x-danger absolute -top-1 -right-1" aria-label={t('Remove')}>
                          <XIcon size={8} />
                        </button>
                      </div>
                    ) : (
                      <div className="mm-drop w-20 h-20 flex flex-col items-center justify-center cursor-pointer"
                        onClick={() => document.getElementById(`photo-${type}`)?.click()}>
                        <UploadIcon size={16} />
                        <span className="fz-micro mt-0.5">{t('Click to upload')}</span>
                      </div>
                    )}
                    <input id={`photo-${type}`} type="file" accept="image/jpeg,image/png" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(type, f); e.target.value = ''; }} />
                    <button onClick={() => document.getElementById(`photo-${type}`)?.click()}
                      className="aw-btn aw-btn-secondary aw-btn-sm">
                      {preview ? t('Change') : t('Browse')}
                    </button>
                    {mediaQueue[type] && <span className="mm-queued">{t('Will upload on save')}</span>}
                  </div>
                );
              })}
            </div>

            {/* KYC Documents — typed, multi-upload */}
            <div id="kyc-section" className="mm-subcard mb-2">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
                <span className="aw-label flex items-center gap-1" style={{ margin: 0 }}>
                  {t('KYC Documents')}
                  {kycDocuments.length > 0 && <span className="aw-pill">{kycDocuments.length}</span>}
                </span>
                <div className="flex items-center gap-1.5">
                  <MemberSelect ariaLabel="KYC document type" value={kycDocType} onChange={setKycDocType} className="mm-kyc-select">
                    {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </MemberSelect>
                  <input id="kyc-file" type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleKycUpload(f); e.target.value = ''; }} />
                  <button onClick={() => document.getElementById('kyc-file')?.click()} disabled={kycUploading || !formData.memberNumber}
                    className="aw-btn aw-btn-primary aw-btn-sm">
                    <UploadIcon size={10} /> {kycUploading ? t('Uploading…') : t('Add Document')}
                  </button>
                </div>
              </div>
              {!formData.memberNumber && (
                <p className="aw-meta mb-1" style={{ color: 'var(--aw-warning)' }}>{t('Save the member first to attach KYC documents.')}</p>
              )}
              {kycDocuments.length === 0 ? (
                <p className="aw-meta text-center py-2">{t('No documents uploaded')}</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {kycDocuments.map((doc) => (
                    <div key={doc.id} className="mm-chip flex items-center justify-between gap-1.5">
                      <a href={`${getApiBaseUrlSync()}/members/master/${formData.memberNumber}/document/${doc.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                        <span className="block aw-strong truncate" style={{ color: 'var(--aw-accent)' }}>{doc.docType}</span>
                        <span className="block aw-meta truncate" title={doc.fileName}>{doc.fileName || t('View')}</span>
                      </a>
                      <button onClick={() => handleKycDelete(doc.id)}
                        className="mm-x mm-x-danger shrink-0" aria-label={t('Remove')}>
                        <XIcon size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature */}
            <div className="mm-subcard mm-sign">
              <div className="mm-sign-head flex items-center justify-between">
                <span className="aw-label flex items-center gap-1" style={{ margin: 0 }}><PenTool size={11} /> {t('Signature')}</span>
                <div className="flex gap-1">
                  {(['draw', 'upload'] as const).map(m => (
                    <button key={m} onClick={() => setSigMode(m)}
                      role="radio" aria-checked={sigMode === m} className="aw-chip mm-sign-mode">
                      {m === 'draw' ? '✏ ' + t('Draw') : '⬆ ' + t('Upload')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draw tab */}
              {sigMode === 'draw' && (
                <div>
                  <div className="mm-sign-pad relative">
                    <canvas ref={canvasRef} width={600} height={120}
                      className="mm-sign-canvas w-full cursor-crosshair select-none"
                      style={{ touchAction: 'none', display: 'block', height: 140 }}
                      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
                    {!hasDrawing && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="aw-meta">{t('Sign here with mouse or touch')}</span>
                      </div>
                    )}
                  </div>
                  <div className="mm-sign-foot flex items-center justify-between">
                    <button onClick={clearCanvas} disabled={!hasDrawing}
                      className="aw-btn aw-btn-secondary aw-btn-sm">
                      {t('Clear')}
                    </button>
                    <div className="flex items-center gap-2">
                      {sigQueue && <span className="mm-queued">{t('Will upload on save')}</span>}
                      {savedSigUrl && !sigQueue && (
                        <span className="mm-saved flex items-center gap-0.5"><CheckCircle2 size={10} /> {t('Saved')}</span>
                      )}
                      <button onClick={queueDrawing} disabled={!hasDrawing}
                        className="aw-btn aw-btn-primary aw-btn-sm">
                        {t('Use This Signature')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload tab */}
              {sigMode === 'upload' && (
                <div className="p-2">
                  <div className="mm-drop p-4 flex flex-col items-center gap-1 cursor-pointer"
                    onClick={() => document.getElementById('sig-upload')?.click()}>
                    <UploadIcon size={20} />
                    <span className="aw-meta">{t('Click to upload signature (JPG/PNG)')}</span>
                    {sigQueue && <span className="mm-queued">{t('{{1}} — will upload on save', { 1: sigQueue.name })}</span>}
                  </div>
                  <input id="sig-upload" type="file" accept="image/jpeg,image/png" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSigQueue(f); } e.target.value = ''; }} />
                </div>
              )}

              {/* Saved signature preview */}
              {savedSigUrl && !sigQueue && (
                <div className="mm-sign-saved flex items-center gap-2">
                  <CheckCircle2 size={12} className="mm-saved" />
                  <span className="mm-saved">{t('Saved Signature:')}</span>
                  <img src={savedSigUrl} alt={t('Saved signature')}
                    className="mm-sign-img max-h-10 max-w-32 object-contain"
                    onError={() => setSavedSigUrl('')} />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {/* Member Lookup */}
      <MemberLookupDialog
        open={showLookupModal}
        onClose={() => setShowLookupModal(false)}
        onSelect={(member) => handleMemberSelect(member.memberNo)}
      />

      {/* Member Master layout. Controls, cards, buttons, chips and colours come from the shared window kit
          (aw-*), so every Settings option applies here without a local copy. Only the things the kit does not
          have are defined below: the form grid spacing, the photo / KYC / signature pieces and the Active switch. */}
      <style>{`
        .mm-content-inner { max-width: 1440px; width: 100%; margin: 0 auto; }
        .mm-form .mm-section > .grid { column-gap: calc(13px * var(--ui-density, 1)); row-gap: calc(11px * var(--ui-density, 1)); margin-bottom: 0; }
        .mm-form .mm-section > .grid + .grid { margin-top: calc(11px * var(--ui-density, 1)); }
        .mm-form .mm-textarea { height: auto; min-height: 64px; padding-top: 7px; resize: none; }
        .mm-form .mm-auto { background: var(--aw-surface-muted); color: var(--aw-muted); }
        .mm-form .mm-kyc-select { min-width: 160px; }
        .mm-form .mm-accent-text { color: var(--aw-accent); }

        /* Record bar: photo, member no, search, mode, Active, Reset, Save */
        .mm-record-toolbar { padding-bottom: 11px; margin-bottom: 12px; border-bottom: 1px solid var(--aw-border); gap: 8px; }
        .mm-form .mm-inline-label { margin: 0; white-space: nowrap; }
        .mm-form .mm-memberno { width: 110px; }
        .mm-form .mm-avatar { border: 1px solid var(--aw-border); box-shadow: var(--aw-shadow); }
        .mm-form .mm-avatar-initials { background: var(--aw-accent); color: #fff; font-weight: 700; font-size: calc(var(--type-body-size) - 1px); }
        .mm-form .mm-queued { color: var(--aw-warning); font-size: calc(var(--type-label-size) + 1px); font-weight: 700; }
        .mm-form .mm-queued::before { content: '↑ '; }
        .mm-form .mm-queued-badge { background: var(--aw-surface); box-shadow: var(--aw-shadow); }
        .mm-form .mm-saved { color: var(--aw-success); font-size: calc(var(--type-label-size) + 1px); font-weight: 700; }
        .mm-form .mm-active-toggle {
          display: inline-flex; align-items: center; gap: 7px; min-height: calc(var(--aw-control-h) - 2px); padding: 0 13px; border-radius: 999px; cursor: pointer; user-select: none;
          border: 1px solid var(--aw-border-strong); background: var(--aw-surface-muted); color: var(--aw-muted); font-size: var(--type-label-size); font-weight: 700;
          transition: background-color .2s var(--aw-ease), border-color .2s var(--aw-ease), color .2s var(--aw-ease) !important; transition-duration: .2s !important;
        }
        .mm-form .mm-active-toggle .mm-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--aw-muted); }
        .mm-form .mm-active-toggle.is-on { color: var(--aw-success); border-color: color-mix(in srgb, var(--aw-success) 35%, transparent); background: color-mix(in srgb, var(--aw-success) 10%, var(--aw-surface)); }
        .mm-form .mm-active-toggle.is-on .mm-dot { background: var(--aw-success); }
        .mm-form .mm-active-toggle:focus-visible { outline: 3px solid var(--aw-focus); outline-offset: 2px; }
        .mm-form .mm-gender-option { min-height: calc(var(--aw-control-h) - 2px); }

        /* Insured box */
        .mm-form .mm-check { width: 18px; height: 18px; flex: none; display: inline-flex; align-items: center; justify-content: center; border-radius: 5px; border: 1px solid var(--aw-border-strong); background: var(--aw-surface-muted); color: #fff; font-size: 12px; font-weight: 700; }
        .mm-form .mm-check.is-on { background: var(--aw-accent); border-color: var(--aw-accent); }

        /* Photos, KYC and signature */
        .mm-form .mm-subcard { padding: 10px; border-radius: calc(var(--aw-radius) * 1.4); border: 1px solid var(--aw-border); background: var(--aw-surface-muted); }
        .mm-form .mm-thumb { border-radius: var(--aw-radius); border: 1px solid var(--aw-border); }
        .mm-form .mm-drop { border-radius: var(--aw-radius); border: 1px dashed var(--aw-border-strong); color: var(--aw-muted); background: var(--aw-surface); transition: border-color .2s var(--aw-ease), background-color .2s var(--aw-ease) !important; transition-duration: .2s !important; }
        .mm-form .mm-drop:hover { border-color: var(--aw-accent); background: var(--aw-accent-soft); color: var(--aw-accent); }
        .mm-form .mm-x { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 50%; cursor: pointer; background: var(--aw-surface); color: var(--aw-muted); box-shadow: var(--aw-shadow); }
        .mm-form .mm-x-danger:hover { background: var(--aw-danger); color: #fff; }
        .mm-form .mm-chip { padding: 5px 12px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--aw-accent) 25%, transparent); background: var(--aw-accent-soft); }
        .mm-form .mm-sign { padding: 0; overflow: hidden; }
        .mm-form .mm-sign-head { padding: 7px 10px; border-bottom: 1px solid var(--aw-border); }
        .mm-form .mm-sign-mode { min-height: 24px; padding: 0 10px; font-size: calc(var(--type-label-size) + 1px); }
        .mm-form .mm-sign-pad { background: var(--aw-surface); }
        .mm-form .mm-sign-canvas { border-bottom: 1px solid var(--aw-border); }
        .mm-form .mm-sign-foot { padding: 7px 10px; background: var(--aw-surface-muted); }
        .mm-form .mm-sign-saved { padding: 7px 10px; border-top: 1px solid var(--aw-border); background: color-mix(in srgb, var(--aw-success) 8%, var(--aw-surface)); }
        .mm-form .mm-sign-img { background: var(--aw-surface); border: 1px solid var(--aw-border); border-radius: 6px; padding: 2px; }

        /* Message after Create / Update / Load: top-right, above everything */
        .mm-form .mm-toast { position: fixed; top: 16px; right: 16px; z-index: 50; min-width: 320px; max-width: 420px; margin: 0; box-shadow: var(--aw-shadow-pop); }

        @media (max-width: 1050px) { .mm-record-toolbar { gap: 6px; } }
        @media (max-width: 720px) {
          .mm-section > .grid.grid-cols-12 > div { grid-column: span 6 / span 6; }
          .mm-section > .grid.grid-cols-12 > .col-span-12, .mm-section > .grid.grid-cols-12 > .col-span-6 { grid-column: span 12 / span 12; }
          .mm-section > .grid.grid-cols-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) {
          .mm-section > .grid.grid-cols-12 > div { grid-column: span 12 / span 12; }
          .mm-section > .grid.grid-cols-2, .mm-section > .grid.grid-cols-3 { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>

    </div>
  );
};

export default MemberMaster;
