import React, { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import SplashScreen from '../components/SplashScreen';
import { Spin } from 'antd';
import { AuthProvider } from '../auth/context/AuthContext';
import ThemeProvider from '../components/shared/ThemeProvider';
import { ProtectedRoute } from '../auth/components';
import { AnalyticsErrorBoundary } from '../components/analytics/AnalyticsErrorBoundary';
import { LicenseProvider } from '../components/license/LicenseContext';
import LicenseGate from '../components/license/LicenseGate';
import LicenseWarningBanner from '../components/license/LicenseWarningBanner';
import ServerSetup from '../pages/setup/ServerSetup';
import { applyAppFont, FONT_STORAGE_KEY, FONT_SYNC_CHANNEL } from '../config/fontOptions';

const FloatingChatBot = lazy(() => import('../components/chat/FloatingChatBot'));

// Lazy load pages
const LoginPage = lazy(() => import('../pages/LoginPage'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const MainLayout = lazy(() => import('../components/layout/MainLayout'));

// Lazy load administration components
const LoanApplication = lazy(() => import('../service/Administration/loan/Loan Application/page/LoanApplication'));
const MemberLookup = lazy(() => import('../components/shared/MemberLookup/MemberLookup'));
const ChangeLoanSurety = lazy(() => import('../service/Administration/loan/Change Loan Surety/pages/ChangeLoanSurety'));
const InterestCalculationPosting = lazy(() => import('../service/Administration/loan/Interest Calculation Posting/page/InterestCalculationPosting'));
const DayEnd = lazy(() => import('../service/Administration/DayEnd/page/DayEnd'));
const InterestCalculation = lazy(() => import('../service/Administration/InterestCalculation/page/InterestCalculation'));
const DepositLoanSlab = lazy(() => import('../service/Administration/DepositLoanSlab/page/DepositLoanSlab'));
const HeadAdditionModification = lazy(() => import('../service/Administration/HeadAdditionModification/page/HeadAdditionModification'));
const HeadOpeningBalance = lazy(() => import('../service/Administration/HeadOpeningBalance/page/HeadOpeningBalance'));


const NotFound = lazy(() => import('../components/NotFound'));

// Loading component
const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);
// Lazy load security components
const UserManagement = lazy(() => import('../service/Administration/Security/CreateModifyUsers/page/CreateModifyUsers'));
const RoleManagement = lazy(() => import('../service/Administration/Security/RoleManagement/page/RoleManagement'));
const ChangePassword = lazy(() => import('../service/Administration/Security/ChangePassword/page/ChangePassword'));
const LogoutUser = lazy(() => import('../service/Administration/Security/LogoutUser/page/LogoutUser'));

// Lazy load financial year components
const TransferEntriesForClosing = lazy(() => import('../service/Administration/FinancialYear/TransferEntriesForClosing/page/TransferEntriesForClosing'));
const FinancialYearClosing = lazy(() => import('../service/Administration/FinancialYear/FinancialYearClosing/page/FinancialYearClosing'));
const BalanceTransfer = lazy(() => import('../service/Administration/FinancialYear/BalanceTransfer/page/BalanceTransfer'));
const PLYearEndProcess = lazy(() => import('../service/Administration/FinancialYear/PLYearEndProcess/page/PLYearEndProcess'));

// Lazy load other administration components
const ModifyBusinessRules = lazy(() => import('../service/Administration/ModifyBusinessRules/page/ModifyBusinessRules'));
const DemandPrintOrder = lazy(() => import('../service/Administration/DemandPrintOrder/page/DemandPrintOrder'));
const SaakhScore = lazy(() => import('../service/Administration/SaakhScore/page/SaakhScore'));
// Lazy load certificate setting components
const CertificateParameterSetting = lazy(() => import('../service/Administration/CertificateSettingAndPrinting/CertificateParameterSetting/page/CertificateParameterSetting'));
const FixedDepositCertificatePrinting = lazy(() => import('../service/Administration/CertificateSettingAndPrinting/FixedDepositCertificatePrinting/page/FixedDepositCertificatePrinting'));
const ShareCertificatePrinting = lazy(() => import('../service/Administration/CertificateSettingAndPrinting/ShareCertificatePrinting/page/ShareCertificatePrinting'));
const PassbookParameterSetting = lazy(() => import('../service/Administration/CertificateSettingAndPrinting/PassbookParameterSetting/page/PassbookParameterSetting'));

// Lazy load master components
const MemberMaster = lazy(() => import('../service/Masters/MemberMaster/page/MemberMaster'));
const SignatureScanning = lazy(() => import('../service/Masters/SignatureScanning/page/SignatureScanning'));
const RdAccountOpening = lazy(() => import('../service/Masters/RdAccount/RdAccountOpening/page/RdAccountOpening'));
const PassRdAccount = lazy(() => import('../service/Masters/RdAccount/PassRdAccount/page/PassRdAccount'));
const SavingAccountOpening = lazy(() => import('../service/Masters/SavingAccountOpening/page/SavingAccountOpening'));
const WingOfficeMaster = lazy(() => import('../service/Masters/WingOfficeMaster/page/WingOfficeMaster'));
// Lazy load more master components
const ModifyFdAccount = lazy(() => import('../service/Masters/ModifyFdAccount/page/ModifyFdAccount'));
const ModifyMemberBalance = lazy(() => import('../service/Masters/ModifyMemberBalance/page/ModifyMemberBalance'));
const CastCategory = lazy(() => import('../service/Masters/CastCategory/page/CastCategory'));
const DesignationMaster = lazy(() => import('../service/Masters/DesignationMaster/page/DesignationMaster'));
const FdRdSbEntry = lazy(() => import('../service/Masters/DataEntry/FdRdSbEntry/page/FdRdSbEntry'));
const LoanEntry = lazy(() => import('../service/Masters/DataEntry/LoanEntry/page/LoanEntry'));

// Lazy load transaction components
const PaymentVoucherCreation = lazy(() => import('../service/Transaction/Receipt&Payment/PaymentVoucherCreation/page/PaymentVoucherCreation'));
const VoucherPayment = lazy(() => import('../service/Transaction/Receipt&Payment/VoucherPayment/page/VoucherPayment'));
// Lazy load more transaction components
const Receipt = lazy(() => import('../service/Transaction/Receipt&Payment/Receipt/page/Receipt'));
const DividendPayment = lazy(() => import('../service/Transaction/Receipt&Payment/DividendPayment/page/DividendPayment'));

// Lazy load fixed deposit components
const FixedDepositReceipt = lazy(() => import('../service/Transaction/FixedDeposit/FixedDepositReceipt/page/FixedDepositReceipt'));
const FDInterestVoucherPosting = lazy(() => import('../service/Transaction/FixedDeposit/FDInterestVoucherPosting/page/FDInterestVoucherPosting'));
const FDWithdrawalInterestPayment = lazy(() => import('../service/Transaction/FixedDeposit/FDWithdrawalInterestPayment/page/FDWithdrawalInterestPayment'));

// Lazy load report components
const MemberLedgerReport = lazy(() => import('../service/Reports/MemberLedgerReport/page/page/MemberLedgerReport'));
const GeneralLedger = lazy(() => import('../service/Reports/GeneralLedger/page/GeneralLedger'));
const MemberDetailLedger = lazy(() => import('../service/Reports/MemberDetailLedger/page/MemberDetailLedger'));
// Lazy load more report components
const AccountBalance = lazy(() => import('../service/Reports/AccountBalance/page/AccountBalance'));
const SuretyRegisterReport = lazy(() => import('../service/Reports/MemberStatement/SuretyRegisterReport/page/SuretyRegisterReport'));
const DepositDueDateRegister = lazy(() => import('../service/Reports/DepositDueDateRegister/page/DepositDueDateRegister'));
const PassBookPrinting = lazy(() => import('../service/Reports/PassBookPrinting/page/PassBookPrinting'));

// Lazy load daily report components
const CashBookReceiptwiseRough = lazy(() => import('../service/Reports/Daily/CashBookReceiptwiseRough/page/CashBookReceiptwiseRough'));
// Lazy load more daily report components
const CashBook = lazy(() => import('../service/Reports/Daily/CashBook/page/CashBook'));
const CashBook2 = lazy(() => import('../service/Reports/Daily/CashBook2/page/CashBook2'));
const DayBook = lazy(() => import('../service/Reports/Daily/DayBook/page/DayBook'));
const DayBookSB = lazy(() => import('../service/Reports/Daily/DayBookSB/page/DayBookSB'));
const ConsolidationOfDailyAccount = lazy(() => import('../service/Reports/Daily/ConsolidationOfDailyAccount/page/ConsolidationOfDailyAccount'));

// Lazy load monthly report components
const CashBookMonthly = lazy(() => import('../service/Reports/Monthly/CashBookMonthly/page/CashBookMonthly'));

// Lazy load yearly report components
const DetailLedger = lazy(() => import('../service/Reports/Monthly/DetailLedger/page/DetailLedger'));
const BankDetailLedger = lazy(() => import('../service/Reports/Monthly/BankDetailLedger/page/BankDetailLedger'));
const DefaulterList = lazy(() => import('../service/Reports/Monthly/DefaulterList/page/DefaulterList'));
// Lazy load more monthly report components
const NewLoanDisbursed = lazy(() => import('../service/Reports/Monthly/NewLoanDisbursed/page/NewLoanDisbursed'));
const MemberLoanLedger = lazy(() => import('../service/Reports/Monthly/MemberLoanLedger/page/MemberLoanLedger'));
const LoanStatement = lazy(() => import('../service/Reports/AccountReports/LoanStatement/page/LoanStatement'));

// Lazy load print voucher components
const ReceiptPaymentVoucher = lazy(() => import('../service/Reports/Monthly/PrintVouchers/ReceiptPaymentVoucher/page/ReceiptPaymentVoucher'));
const JournalTransferVoucher = lazy(() => import('../service/Reports/Monthly/PrintVouchers/JournalTransferVoucher/page/JournalTransferVoucher'));

// Lazy load yearly report components
const PLBalanceSheet = lazy(() => import('../service/Reports/Yearly/PLBalanceSheet/page/PLBalanceSheet'));
const VotersWithdrawalList = lazy(() => import('../service/Reports/Yearly/MembersList/VotersWithdrawalList/page/VotersWithdrawalList'));
// Lazy load more yearly report components
const DividendReport = lazy(() => import('../service/Reports/Yearly/InterestList/DividendReport/page/DividendReport'));
const DividendPaid = lazy(() => import('../service/Reports/Yearly/InterestList/DividendPaid/page/DividendPaid'));
const InterestListCDMDSHRt = lazy(() => import('../service/Reports/Yearly/InterestList/InterestListCDMDSHRt/page/InterestListCDMDSHRt'));
const DividendWarrant = lazy(() => import('../service/Reports/Yearly/InterestList/DividendWarrant/page/DividendWarrant'));
const MemberLoanDetail = lazy(() => import('../service/Reports/Yearly/MemberLoanDetail/page/MemberLoanDetail'));
const ShareWarrantPrinting = lazy(() => import('../service/Reports/Yearly/ShareWarrantPrinting/page/ShareWarrantPrinting'));
const AnnualMemberStatement = lazy(() => import('../service/Reports/Yearly/AnnualMemberStatement/page/AnnualMemberStatement'));
const YearlyMemberStatement = lazy(() => import('../service/Reports/Yearly/YearlyMemberStatement/page/YearlyMemberStatement'));
const MemberLedger = lazy(() => import('../service/Reports/Yearly/MemberLedger/page/MemberLedger'));

// Lazy load Member Statement components
const MemberStatement = lazy(() => import('../service/Reports/MemberStatement/MemberStatement/page/MemberStatement'));
const SavingStatement = lazy(() => import('../service/Reports/MemberStatement/SavingStatement/page/SavingStatement'));
const RDStatement = lazy(() => import('../service/Reports/MemberStatement/RDStatement/page/RDStatement'));
const FDStatement = lazy(() => import('../service/Reports/MemberStatement/FDStatement/page/FDStatement'));
const NewShareCertificate = lazy(() => import('../service/Reports/MemberStatement/NewShareCertificate/page/NewShareCertificate'));
const InterestCertificate = lazy(() => import('../service/Reports/MemberStatement/InterestCertificate/page/InterestCertificate'));
const LoanNilCertificate = lazy(() => import('../service/Reports/MemberStatement/LoanNilCertificate/page/LoanNilCertificate'));

// Lazy load Account Reports components
const AccountClosingRegister = lazy(() => import('../service/Reports/AccountReports/AccountClosingRegister/page/AccountClosingRegister'));
const FixedDepositCertificate = lazy(() => import('../service/Reports/AccountReports/FixedDepositCertificate/page/FixedDepositCertificate'));
const ShareCertificate = lazy(() => import('../service/Reports/AccountReports/ShareCertificate/page/ShareCertificate'));
const RecurringDetails = lazy(() => import('../service/Reports/AccountReports/RecurringDetails/page/RecurringDetails'));
const RecoveryDetails = lazy(() => import('../service/Reports/AccountReports/RecoveryDetails/page/RecoveryDetails'));
const LoanContributionsRegister = lazy(() => import('../service/Reports/AccountReports/LoanContributionsRegister/page/LoanContributionsRegister'));
const LienAccountInformation = lazy(() => import('../service/Reports/AccountReports/LienAccountInformation/page/LienAccountInformation'));

// Lazy load Utility components
const PrematureInformationRD = lazy(() => import('../service/Utility/PrematureInformation/RD/page/PrematureInformationRD'));
const PrematureInformationSB = lazy(() => import('../service/Utility/PrematureInformation/SB/page/PrematureInformationSB'));
const Calculator = lazy(() => import('../service/Utility/Calculator/page/Calculator'));
const Find = lazy(() => import('../service/Utility/Find/page/Find'));
const MemberBalance = lazy(() => import('../service/Utility/MemberBalance/page/MemberBalance'));
const EMIChart = lazy(() => import('../service/Utility/EMIChart/page/EMIChart'));
const DatabaseBackup = lazy(() => import('../service/Utility/DatabaseBackup/page/DatabaseBackup'));
const UpdateSavingInterest = lazy(() => import('../service/Utility/UpdateSavingInterest/page/UpdateSavingInterest'));
const InterestReceivableReceivedStatement = lazy(() => import('../service/Utility/InterestReceivableReceivedStatement/page/InterestReceivableReceivedStatement'));
const CommunicationCenter = lazy(() => import('../service/Utility/CommunicationCenter/page/CommunicationCenter'));

// Lazy load Help components
const About = lazy(() => import('../service/Help/About/page/About'));
const Contents = lazy(() => import('../service/Help/Contents/page/Contents'));

// Lazy load Exit components
const ExitOption1 = lazy(() => import('../service/Exit/ExitOption1/page/ExitOption1'));

// Lazy load Settings component
const SettingsPage = lazy(() => import('../components/settings/SettingsPage'));

// Lazy load Analytics components
const FullScreenAnalytics = lazy(() => import('../service/Administration/FullScreenAnalytics/page/FullScreenAnalytics'));
const AnalyticsDashboard = lazy(() => import('../service/Administration/AnalyticsDashboard/page/AnalyticsDashboard'));
const MyProfile = lazy(() => import('../service/Administration/Security/MyProfile/page/MyProfile'));

// Lazy load Transaction components
const Saving = lazy(() => import('../service/Transaction/Saving/page/Saving'));
const JournalTransferEntry = lazy(() => import('../service/Transaction/JournalTransferEntry/page/JournalTransferEntry'));
const LoanPayment = lazy(() => import('../service/Transaction/LoanPayment/page/LoanPayment'));
const LoanRepayment = lazy(() => import('../service/Transaction/LoanRepayment/page/LoanRepaymentPage'));
const LoanEarlyClosure = lazy(() => import('../service/Transaction/LoanEarlyClosure/page/LoanEarlyClosurePage'));
const LoanSanction = lazy(() => import('../service/Transaction/LoanSanction/page/LoanSanction'));
const CompulsoryDepositTransaction = lazy(() => import('../service/Transaction/CompulsoryDepositTransaction/page/CompulsoryDepositTransaction'));
const MemberBalanceTransfer = lazy(() => import('../service/Transaction/MemberBalanceTransfer/page/MemberBalanceTransfer'));
const PassTransactions = lazy(() => import('../service/Transaction/PassTransactions/page/PassTransactions'));

// Lazy load Demand & Recovery components
const ImportDemandList = lazy(() => import('../service/Transaction/Demand&RecoveryList/ImportDemandList/page/ImportDemandList'));
const Generate = lazy(() => import('../service/Transaction/Demand&RecoveryList/Generate/page/Generate'));
const UpdationLedgerPosting = lazy(() => import('../service/Transaction/Demand&RecoveryList/UpdationLedgerPosting/page/UpdationLedgerPosting'));
const PrintMembersDemandList = lazy(() => import('../service/Transaction/Demand&RecoveryList/PrintMembersDemandList/page/PrintMembersDemandList'));
const ChangeMemberOffice = lazy(() => import('../service/Transaction/Demand&RecoveryList/ChangeMemberOffice/page/ChangeMemberOffice'));
const ModifyShortRecovery = lazy(() => import('../service/Transaction/Demand&RecoveryList/ModifyShortRecovery/page/ModifyShortRecovery'));

// ─── Server-config guard (LAN deployment) ─────────────────────────────────
// In dev this resolves instantly (localhost, always configured).
// On a client PC, if server-config.json doesn't exist yet the user sees
// the ServerSetup screen instead of the normal app.
type ConfigState = 'checking' | 'configured' | 'unconfigured';

const App: React.FC = () => {
  const [configState, setConfigState] = useState<ConfigState>('checking');

  // Show splash ONLY on the main dashboard window, never on sub-windows.
  // Sub-windows open at specific routes (e.g. #/transaction/...) so we check
  // the hash before deciding. sessionStorage is per-window, so we also gate
  // on it to ensure the splash plays just once per app launch.
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    const hash = window.location.hash;
    const isMainWindow = hash === '' || hash === '#/' || hash === '#/dashboard';
    return isMainWindow && !sessionStorage.getItem('fibe_splash_shown');
  });

  // Apply saved font size on load, then keep in sync with Settings window
  useEffect(() => {
    const saved = localStorage.getItem('lms-font-size');
    if (saved) document.documentElement.style.setProperty('--fz-base', saved);

    const bc = new BroadcastChannel('lms_font_size');
    bc.onmessage = (e) => {
      if (e.data?.fontBase) {
        document.documentElement.style.setProperty('--fz-base', e.data.fontBase);
        localStorage.setItem('lms-font-size', e.data.fontBase);
      }
    };
    return () => bc.close();
  }, []);

  // Apply saved font style on load, then keep in sync with Settings window
  useEffect(() => {
    const saved = localStorage.getItem(FONT_STORAGE_KEY);
    if (saved) applyAppFont(saved);

    const bc = new BroadcastChannel(FONT_SYNC_CHANNEL);
    bc.onmessage = (e) => {
      if (e.data?.fontFamily) {
        applyAppFont(e.data.fontFamily);
        localStorage.setItem(FONT_STORAGE_KEY, e.data.fontFamily);
      }
    };
    return () => bc.close();
  }, []);

  // Apply saved bold text mode on load, then keep in sync with Settings window
  useEffect(() => {
    const saved = localStorage.getItem('lms-bold-text');
    document.documentElement.classList.toggle('bold-text', saved === '1');

    const bc = new BroadcastChannel('lms_bold_text');
    bc.onmessage = (e) => {
      if (typeof e.data?.boldText === 'boolean') {
        document.documentElement.classList.toggle('bold-text', e.data.boldText);
        localStorage.setItem('lms-bold-text', e.data.boldText ? '1' : '0');
      }
    };
    return () => bc.close();
  }, []);

  // Global hotkeys — F2: Find & Search, F3: Member Balance (legacy parity)
  useEffect(() => {
    const eAPI = (window as any).electronAPI;
    if (!eAPI?.openNewWindow) return;

    const handler = (e: KeyboardEvent) => {
      // Don't fire when the user is typing in an input / textarea / select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'F2') {
        e.preventDefault();
        eAPI.openNewWindow('/utility/find');
      } else if (e.key === 'F3') {
        e.preventDefault();
        eAPI.openNewWindow('/utility/member-balance');
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const eAPI = (window as any).electronAPI;
    if (!eAPI?.getServerUrl) {
      // Running in a plain browser / no Electron — skip guard
      setConfigState('configured');
      return;
    }
    eAPI.getServerUrl().then((result: { url: string | null; configured: boolean }) => {
      setConfigState(result?.configured ? 'configured' : 'unconfigured');
    }).catch(() => setConfigState('configured')); // fail-safe: let the app open
  }, []);

  if (configState === 'checking') return <Loading />;
  if (configState === 'unconfigured') return <ServerSetup />;

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    <AnalyticsErrorBoundary componentName="App">
      <LicenseProvider>
        <LicenseGate>
          <AuthProvider>
            <ThemeProvider>
              <LicenseWarningBanner />
              <Router>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Root Redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Dashboard Route - EXPLICITLY separate from root to prevent catch-all behavior */}
                <Route path="/dashboard" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                </Route>

                {/* Standalone Routes - Wrapped only in ProtectedRoute (No MainLayout) */}
                <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                  {/* Administration Routes */}
                  <Route path="/loan-application" element={<LoanApplication />} />
                  <Route path="/common/member-lookup" element={<MemberLookup />} />
                  <Route path="/change-loan-surety" element={<ChangeLoanSurety />} />
                  <Route path="/interest-calculation-posting" element={<InterestCalculationPosting />} />
                  <Route path="/day-end" element={<DayEnd />} />
                  <Route path="/interest-calculation" element={<InterestCalculation />} />
                  <Route path="/deposit-loan-slab" element={<DepositLoanSlab />} />
                  <Route path="/head-addition-modification" element={<HeadAdditionModification />} />
                  <Route path="/head-opening-balance" element={<HeadOpeningBalance />} />
                  <Route path="/user-management" element={<UserManagement />} />
                  <Route path="/role-management" element={<RoleManagement />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/logout-user" element={<LogoutUser />} />
                  <Route path="/financial-year/transfer-entries" element={<TransferEntriesForClosing />} />
                  <Route path="/financial-year/closing" element={<FinancialYearClosing />} />
                  <Route path="/financial-year/balance-transfer" element={<BalanceTransfer />} />
                  <Route path="/financial-year/pl-process" element={<PLYearEndProcess />} />
                  <Route path="/saakh-score" element={<SaakhScore />} />
                  <Route path="/modify-business-rules" element={<ModifyBusinessRules />} />
                  <Route path="/demand-print-order" element={<DemandPrintOrder />} />
                  <Route path="/certificate/parameter-setting" element={<CertificateParameterSetting />} />
                  <Route path="/certificate/fd-printing" element={<FixedDepositCertificatePrinting />} />
                  <Route path="/certificate/share-printing" element={<ShareCertificatePrinting />} />
                  <Route path="/certificate/passbook-parameter" element={<PassbookParameterSetting />} />

                  {/* Reports - Member Statement */}
                  <Route path="/reports/yearly/member-statement" element={<MemberStatement />} />
                  <Route path="/reports/yearly/member-statement/saving-statement" element={<SavingStatement />} />
                  <Route path="/reports/yearly/member-statement/rd-statement" element={<RDStatement />} />
                  <Route path="/reports/yearly/member-statement/fd-statement" element={<FDStatement />} />
                  <Route path="/reports/yearly/member-statement/new-share-certificate" element={<NewShareCertificate />} />
                  <Route path="/reports/yearly/member-statement/interest-certificate" element={<InterestCertificate />} />
                  <Route path="/reports/yearly/member-statement/loan-nil-certificate" element={<LoanNilCertificate />} />

                  {/* Reports - Member Statement (Duplicate paths kept for compatibility) */}
                  <Route path="/reports/member-statement/member-statement" element={<MemberStatement />} />
                  <Route path="/reports/member-statement/saving-statement" element={<SavingStatement />} />
                  <Route path="/reports/member-statement/rd-statement" element={<RDStatement />} />
                  <Route path="/reports/member-statement/fd-statement" element={<FDStatement />} />
                  <Route path="/reports/member-statement/new-share-certificate" element={<NewShareCertificate />} />
                  <Route path="/reports/member-statement/interest-certificate" element={<InterestCertificate />} />
                  <Route path="/reports/member-statement/loan-nil-certificate" element={<LoanNilCertificate />} />

                  {/* Reports - General */}
                  <Route path="/reports/member-ledger" element={<MemberLedgerReport />} />
                  <Route path='/common/member-lookup' element={<MemberLookup />} />
                  <Route path="/reports/general-ledger" element={<GeneralLedger />} />
                  <Route path="/reports/member-detail-ledger" element={<MemberDetailLedger />} />
                  <Route path="/reports/account-balance" element={<AccountBalance />} />
                  <Route path="/reports/surety-register" element={<SuretyRegisterReport />} />
                  <Route path="/reports/deposit-due-date-register" element={<DepositDueDateRegister />} />

                  {/* Reports - Account Reports */}
                  <Route path="/reports/account-reports/account-closing-register" element={<AccountClosingRegister />} />
                  <Route path="/reports/account-reports/fixed-deposit-certificate" element={<FixedDepositCertificate />} />
                  <Route path="/reports/account-reports/share-certificate" element={<ShareCertificate />} />
                  <Route path="/reports/account-reports/recurring-details" element={<RecurringDetails />} />
                  <Route path="/reports/account-reports/recovery-details" element={<RecoveryDetails />} />
                  <Route path="/reports/account-reports/loan-contributions-register" element={<LoanContributionsRegister />} />
                  <Route path="/reports/account-reports/lien-account-information" element={<LienAccountInformation />} />

                  {/* Reports - Pass Book */}
                  <Route path="/reports/pass-book-printing" element={<PassBookPrinting />} />

                  {/* Reports - Daily */}
                  <Route path="/reports/daily/cash-book-receiptwise" element={<CashBookReceiptwiseRough />} />
                  <Route path="/reports/daily/cash-book" element={<CashBook2 />} />
                  <Route path="/reports/daily/cash-book-old" element={<CashBook />} />
                  <Route path="/reports/daily/day-book" element={<DayBook />} />
                  <Route path="/reports/daily/day-book-sb" element={<DayBookSB />} />
                  <Route path="/reports/daily/consolidation" element={<ConsolidationOfDailyAccount />} />

                  {/* Reports - Monthly */}
                  <Route path="/reports/monthly/cash-book-monthly" element={<CashBookMonthly />} />
                  <Route path="/reports/monthly/detail-ledger" element={<DetailLedger />} />
                  <Route path="/reports/monthly/bank-detail-ledger" element={<BankDetailLedger />} />
                  <Route path="/reports/monthly/defaulter-list" element={<DefaulterList />} />
                  <Route path="/reports/monthly/new-loan-disbursed" element={<NewLoanDisbursed />} />
                  <Route path="/reports/monthly/member-loan-ledger" element={<MemberLoanLedger />} />
                  <Route path="/reports/account-reports/loan-statement" element={<LoanStatement />} />

                  {/* Reports - Print Vouchers */}
                  <Route path="/reports/monthly/print-vouchers/receipt-payment" element={<ReceiptPaymentVoucher />} />
                  <Route path="/reports/monthly/print-vouchers/journal-transfer" element={<JournalTransferVoucher />} />

                  {/* Reports - Yearly */}
                  <Route path="/reports/yearly/pl-balance-sheet" element={<PLBalanceSheet />} />
                  <Route path="/reports/yearly/members/voters-withdrawal-list" element={<VotersWithdrawalList />} />
                  <Route path="/reports/yearly/interest-list/dividend-report" element={<DividendReport />} />
                  <Route path="/reports/yearly/interest-list/dividend-paid" element={<DividendPaid />} />
                  <Route path="/reports/yearly/interest-list/cd-md-shrt" element={<InterestListCDMDSHRt />} />
                  <Route path="/reports/yearly/interest-list/dividend-warrant" element={<DividendWarrant />} />

                  <Route path="/reports/yearly/member-loan-detail" element={<MemberLoanDetail />} />
                  <Route path="/reports/yearly/share-warrant-printing" element={<ShareWarrantPrinting />} />
                  <Route path="/reports/yearly/annual-member-statement" element={<AnnualMemberStatement />} />
                  <Route path="/reports/yearly/yearly-member-statement" element={<YearlyMemberStatement />} />
                  <Route path="/reports/yearly/member-ledger" element={<MemberLedger />} />

                  {/* Utility Routes */}
                  <Route path="/utility/premature-information/rd" element={<PrematureInformationRD />} />
                  <Route path="/utility/premature-information/sb" element={<PrematureInformationSB />} />
                  <Route path="/utility/calculator" element={<Calculator />} />
                  <Route path="/utility/find" element={<Find />} />
                  <Route path="/utility/member-balance" element={<MemberBalance />} />
                  <Route path='/common/member-lookup' element={<MemberLookup />} />
                  <Route path="/utility/emi-chart" element={<EMIChart />} />
                  <Route path="/utility/database-backup" element={<DatabaseBackup />} />
                  <Route path="/utility/update-saving-interest" element={<UpdateSavingInterest />} />
                  <Route path="/utility/interest-receivable-received-statement" element={<InterestReceivableReceivedStatement />} />
                  <Route path="/utility/communication-center" element={<CommunicationCenter />} />

                  {/* Help Routes */}
                  <Route path="/help/about" element={<About />} />
                  <Route path="/help/contents" element={<Contents />} />

                  {/* Exit Routes */}
                  <Route path="/exit/option1" element={<ExitOption1 />} />

                  {/* Settings Route */}
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Analytics Routes */}
                  <Route path="/analytics-dashboard" element={<AnalyticsDashboard />} />
                  <Route path="/analytics-realtime" element={<FullScreenAnalytics />} />
                  <Route path="/my-profile" element={<MyProfile />} />
                  {/* Masters Routes */}
                  <Route path="/masters/member" element={<MemberMaster />} />
                  <Route path="/masters/signature-scanning" element={<SignatureScanning />} />
                  <Route path="/masters/rd-account/opening" element={<RdAccountOpening />} />
                  <Route path="/masters/rd-account/pass" element={<PassRdAccount />} />
                  <Route path="/masters/saving-account-opening" element={<SavingAccountOpening />} />
                  <Route path="/masters/wing-office" element={<WingOfficeMaster />} />
                  <Route path="/masters/modify-fd-account" element={<ModifyFdAccount />} />
                  <Route path="/masters/modify-member-balance" element={<ModifyMemberBalance />} />
                  <Route path="/masters/cast-category" element={<CastCategory />} />
                  <Route path="/masters/designation" element={<DesignationMaster />} />

                  {/* Data Entry */}
                  <Route path="/masters/data-entry/fd-rd-sb" element={<FdRdSbEntry />} />
                  <Route path="/masters/data-entry/loan" element={<LoanEntry />} />

                  {/* Transaction - Receipt & Payment */}
                  <Route path="/transaction/receipt-payment/payment-voucher-creation" element={<PaymentVoucherCreation />} />
                  <Route path="/transaction/receipt-payment/voucher-payment" element={<VoucherPayment />} />
                  <Route path="/transaction/receipt-payment/receipt" element={<Receipt />} />
                  <Route path="/transaction/receipt-payment/dividend-payment" element={<DividendPayment />} />

                  {/* Transaction - Fixed Deposit */}
                  <Route path="/transaction/fixed-deposit/receipt" element={<FixedDepositReceipt />} />
                  <Route path="/transaction/fixed-deposit/interest-voucher-posting" element={<FDInterestVoucherPosting />} />
                  <Route path="/transaction/fixed-deposit/withdrawal-interest-payment" element={<FDWithdrawalInterestPayment />} />

                  {/* Transaction - Other Types */}
                  <Route path="/transaction/saving" element={<Saving />} />
                  <Route path="/transaction/journal-transfer" element={<JournalTransferEntry />} />
                  <Route path="/transaction/loan-payment" element={<LoanPayment />} />
                  <Route path="/transaction/loan-repayment" element={<LoanRepayment />} />
                  <Route path="/transaction/loan-early-closure" element={<LoanEarlyClosure />} />
                  <Route path="/loan-sanction" element={<LoanSanction />} />
                  <Route path="/transaction/compulsory-deposit" element={<CompulsoryDepositTransaction />} />
                  <Route path="/transaction/member-balance-transfer" element={<MemberBalanceTransfer />} />
                  <Route path="/transaction/pass-transactions" element={<PassTransactions />} />

                  {/* Transaction - Demand & Recovery */}
                  <Route path="/transaction/demand-recovery/import-demand-list" element={<ImportDemandList />} />
                  <Route path="/transaction/demand-recovery/generate" element={<Generate />} />
                  <Route path="/transaction/demand-recovery/updation-ledger-posting" element={<UpdationLedgerPosting />} />
                  <Route path="/transaction/demand-recovery/print-members-demand-list" element={<PrintMembersDemandList />} />
                  <Route path="/transaction/demand-recovery/change-member-office" element={<ChangeMemberOffice />} />
                  <Route path="/transaction/demand-recovery/modify-short-recovery" element={<ModifyShortRecovery />} />

                  {/* Fallback 404 - Matches any route not defined above */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </Router>
            </ThemeProvider>
          </AuthProvider>
        </LicenseGate>
      </LicenseProvider>
    </AnalyticsErrorBoundary>
    </>
  );
};

export default App;
