import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfileMenu } from '../UserProfileMenu';
import { ONBOARDING_CHECKLIST_EVENT, ONBOARDING_REPLAY_EVENT, ONBOARDING_SLIDES_EVENT, ONBOARDING_WHATSNEW_EVENT, markWindowOpened } from '../../features/onboarding/onboardingApi';
import { AlertCircle, X, ShieldCheck, Users, ArrowLeftRight, FileText, Wrench, HelpCircle, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';
import { GlobalSearch, type SearchItem } from '../topbar/GlobalSearch';
import { apiService } from '../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { ACTION_ROUTE_MAP, isActionAllowed } from '../../config/menuActions';
import { useTranslation } from 'react-i18next';
import i18n, { tLabel } from '../../i18n';

interface MenuItem {
  title: string;
  action?: string;
  shortcut?: string;
  submenu?: MenuItem[];
}

interface NavItem {
  id: string;
  title: string;
  items: MenuItem[];
  action?: string;
}

const navConfig: NavItem[] = [
  {
    id: 'file',
    title: tLabel('File'),
    items: [
      { title: tLabel('Save'), shortcut: 'Ctrl+S', action: 'SAVE' },
      { title: tLabel('Cancel'), shortcut: 'Ctrl+C', action: 'CANCEL' },
      { title: tLabel('Delete'), shortcut: 'Ctrl+D', action: 'DELETE' },
      { title: tLabel('Refresh'), shortcut: 'Ctrl+R', action: 'REFRESH' },
      { title: tLabel('Print'), shortcut: 'Ctrl+P', action: 'PRINT' },
      { title: tLabel('Find'), shortcut: 'Ctrl+F', action: 'FIND' },
      { title: tLabel('Exit'), shortcut: 'Ctrl+X', action: 'EXIT' },
    ],
  },
  {
    id: 'admin',
    title: tLabel('Administration'),
    items: [
      {
        title: tLabel('Loan'),
        submenu: [
          { title: tLabel('Loan Application'), action: 'LOAN_APP' },
          { title: tLabel('Change Loan Surety'), action: 'CHANGE_LOAN_SURETY' },
          { title: tLabel('Interest Calculation / Posting'), action: 'INTEREST_CALC_POST' },
        ]
      },
      { title: tLabel('DayEnd'), action: 'DAY_END' },
      { title: tLabel('Interest Calculation'), action: 'INTEREST_CALC' },
      { title: tLabel('Group Insurance'), action: 'GROUP_INSURANCE' },
      { title: tLabel('Deposite/Loan Slab'), action: 'DEPOSIT_LOAN_SLAB' },
      { title: tLabel('Head Addition / Modification'), action: 'HEAD_ADD_MOD' },
      { title: tLabel('Head Opening Balance'), action: 'HEAD_OPEN_BAL' },

      {
        title: tLabel('Security'),
        submenu: [
          { title: tLabel('Create / Modify Users'), action: 'USER_MANAGEMENT' },
          { title: tLabel('Configure UserLevel Default Rights'), action: 'ROLE_MANAGEMENT' },
          { title: tLabel('Change Password'), action: 'CHANGE_PASSWORD' },
          { title: tLabel('LogOut User'), action: 'LOGOUT_USER' },
          { title: tLabel('Two-Factor & Approvals'), action: 'TWOFA_SETTINGS' },
          { title: tLabel('Mobile Control Center'), action: 'MOBILE_CONTROL_CENTER' },
        ]
      },
      {
        title: tLabel('Financial Year'),
        submenu: [
          { title: '1 ' + tLabel('Transfer Entries For Closing'), action: 'FIN_YEAR_TRANSFER' },
          { title: '2 ' + tLabel('Financial Year Closing'), action: 'FIN_YEAR_CLOSING' },
          { title: '3 ' + tLabel('Balance Transfer'), action: 'FIN_YEAR_BALANCE_TRANSFER' },
          { title: '4 ' + tLabel('P and L Year End Process'), action: 'FIN_YEAR_PL_PROCESS' },
        ]
      },
      { title: tLabel('Saakh Score — Member Health'), action: 'SAAKH_SCORE' },
      { title: tLabel('Modify Business Rules'), action: 'MODIFY_BIZ_RULES' },
      { title: tLabel('RD Financial Year Closing'), action: 'RD_FY_CLOSING' },
      { title: tLabel('Dividend Calculation'), action: 'DIVIDEND_CALCULATION' },
      { title: tLabel('Dividend Credit'), action: 'DIVIDEND_CREDIT' },
      { title: tLabel('Demand Print Order'), action: 'DEMAND_PRINT_ORDER' },
      {
        title: tLabel('Certificate Setting and Printing'),
        submenu: [
          { title: tLabel('Certificate Parameter Setting'), action: 'CERT_PARAM_SETTING' },
          { title: tLabel('Share Certificate Printing'), action: 'SHARE_CERT_PRINT' },
          { title: tLabel('Passbook parameter setting'), action: 'PASSBOOK_PARAM_SETTING' },
        ]
      },
    ]
  },
  {
    id: 'masters',
    title: tLabel('Masters'),
    items: [
      { title: tLabel('Member Master'), action: 'MEMBER_MASTER' },
      { title: tLabel('Member Status (Retired / Inactive)'), action: 'MEMBER_STATUS' },
      { title: tLabel('Signature Scanning'), action: 'SIGNATURE_SCANNING' },
      { title: tLabel('Saving A/c Opening'), action: 'SAVING_AC_OPENING' },
      { title: tLabel('Wing / Office Master'), action: 'WING_OFFICE_MASTER' },
      { title: tLabel('Modify Member Balance'), action: 'MODIFY_MEMBER_BAL' },
      { title: tLabel('RD Member Setup'), action: 'RD_MEMBER_SETUP' },
      { title: tLabel('RD Withdrawal'), action: 'RD_WITHDRAWAL' },
      { title: tLabel('RD Repayment'), action: 'RD_REPAYMENT' },
      { title: tLabel('Cast Category'), action: 'CAST_CATEGORY' },
      { title: tLabel('Designation Master'), action: 'DESIGNATION_MASTER' },
      // Hidden: legacy Data Entry windows not used in current app
      // {
      //   title: 'Data Entry',
      //   submenu: [
      //     { title: 'FD/RD/SB Entry', action: 'FD_RD_SB_ENTRY' },
      //     { title: 'Loan Entry', action: 'LOAN_ENTRY' },
      //   ]
      // },
    ]
  },
  {
    id: 'transaction',
    title: tLabel('Transaction'),
    items: [
      {
        title: tLabel('Receipt & Payment'),
        submenu: [
          { title: tLabel('Payment Voucher Creation'), action: 'RECEIPT_PAYMENT_VOUCHER_CREATION' },
          { title: tLabel('Voucher Payment'), action: 'VOUCHER_PAYMENT' },
          { title: tLabel('Receipt'), action: 'RECEIPT_PAYMENT' },
          { title: tLabel('Dividend Payment'), action: 'RECEIPT_DIVIDEND_PAYMENT' },
        ]
      },
      { title: tLabel('Saving [Receipt -- Payment]'), action: 'SAVING_RECEIPT_PAYMENT' },
      { title: tLabel('Journal / Transfer Entry'), action: 'JOURNAL_TRANSFER_ENTRY' },
      { title: tLabel('Loan Payment'), action: 'LOAN_PAYMENT' },
      { title: tLabel('Loan Repayment'), action: 'LOAN_REPAYMENT' },
      { title: tLabel('Loan Early Closure'), action: 'LOAN_EARLY_CLOSURE' },
      { title: tLabel('Loan Re-agreement'), action: 'LOAN_REAGREEMENT' },
      { title: tLabel('Compulsory Deposit Transaction'), action: 'COMPULSORY_DEPOSIT_TRANSACTION' },
      { title: tLabel('Member Balance Transfer'), action: 'MEMBER_BALANCE_TRANSFER' },
      { title: tLabel('Pass Transactions'), action: 'PASS_TRANSACTIONS' },
      {
        title: tLabel('Demand / Recovery List'),
        submenu: [
          { title: tLabel('Import Demand List'), action: 'IMPORT_DEMAND_LIST' },
          { title: tLabel('Generate'), action: 'GENERATE' },
          { title: tLabel('Updation / Ledger Posting'), action: 'UPDATION_LEDGER_POSTING' },
          { title: tLabel('Print Members Demand List'), action: 'PRINT_MEMBERS_DEMAND_LIST' },
          { title: tLabel('Change Member Office'), action: 'CHANGE_MEMBER_OFFICE' },
          { title: tLabel('Modify Short Recovery'), action: 'MODIFY_SHORT_RECOVERY' },
        ]
      },
    ]
  },
  {
    id: 'reports',
    title: tLabel('Reports'),
    items: [
      {
        title: '1. ' + tLabel('Daily'),
        submenu: [
          { title: '1.1 ' + tLabel('Cash-Book (Receiptwise Rough)'), action: 'CASH_BOOK_RECEIPTWISE' },
          { title: '1.2 ' + tLabel('Cash-Book'), action: 'CASH_BOOK' },
          { title: '1.3 ' + tLabel('Day-Book'), action: 'DAY_BOOK' },
          { title: '1.4 ' + tLabel('Day-Book [CD]'), action: 'DAY_BOOK_CD' },
          { title: '1.5 ' + tLabel('Consolidation Of Daily A/c'), action: 'CONSOLIDATION_DAILY_AC' },
        ]
      },
      { title: '2. ' + tLabel('Member Ledger Report'), action: 'MEMBER_LEDGER_REPORT' },
      { title: '3. ' + tLabel('General Ledger'), action: 'GENERAL_LEDGER' },
      {
        title: '4. ' + tLabel('Monthly'),
        submenu: [
          {
            title: '4.1 ' + tLabel('Print Vouchers'),
            submenu: [
              { title: '4.1.1 ' + tLabel('Receipt/Payment Voucher'), action: 'RECEIPT_PAYMENT_VOUCHER' },
              { title: '4.1.2. ' + tLabel('Journal/Transfer Voucher'), action: 'JOURNAL_TRANSFER_VOUCHER' },
            ]
          },
          { title: '4.2 ' + tLabel('Cash Book Monthly'), action: 'CASH_BOOK_MONTHLY' },
          { title: '4.3 ' + tLabel('Detail Ledger'), action: 'DETAIL_LEDGER' },
          { title: '4.4 ' + tLabel('Bank Detail Ledger'), action: 'BANK_DETAIL_LEDGER' },
          { title: '4.5 ' + tLabel('Defaulter List'), action: 'DEFAULTER_LIST' },
          { title: '4.6 ' + tLabel('New Loan Disbursed'), action: 'NEW_LOAN_DISBURSED' },
          { title: '4.7 ' + tLabel('Member Loan Ledger'), action: 'MEMBER_LOAN_LEDGER' },
          { title: '4.8 ' + tLabel('Loan Account Statement'), action: 'LOAN_ACCOUNT_STATEMENT' },
        ]
      },
      {
        title: '5. ' + tLabel('Yearly'),
        submenu: [
          { title: '5.1 ' + tLabel('P & L/ Balance Sheet'), action: 'P_L_BALANCE_SHEET' },
          {
            title: '5.2 ' + tLabel('Members List'),
            submenu: [
              { title: '5.2.1 ' + tLabel('Voters/Withdrawl List'), action: 'VOTERS_WITHDRAWL_LIST' },
            ]
          },
          {
            title: '5.3 ' + tLabel('Interest List'),
            submenu: [
              { title: '5.3.1 ' + tLabel('Dividend Report'), action: 'DIVIDEND_REPORT' },
              { title: '5.3.2 ' + tLabel('Dividend Paid'), action: 'DIVIDEND_PAID' },
              { title: '5.3.3 ' + tLabel('Int. List CD/MD/SHRt'), action: 'INT_LIST_CD_MD_SHRt' },
              { title: '5.3.4 ' + tLabel('Dividend Warrant'), action: 'DIVIDEND_WARRANT' },
            ]
          },
          { title: '5.5 ' + tLabel('Member Loan Detail'), action: 'MEMBER_LOAN_DETAIL' },
          { title: '5.6 ' + tLabel('Share Warrent Printing'), action: 'SHARE_WARRANT_PRINTING' },
          { title: '5.7 ' + tLabel('Annual Member Statement'), action: 'ANNUAL_MEMBER_STATEMENT' },
          { title: '5.8 ' + tLabel('Yearly Member Statement'), action: 'YEARLY_MEMBER_STATEMENT' },
          { title: '5.9 ' + tLabel('Member Ledger'), action: 'MEMBER_LEDGER' },
          { title: '5.10 ' + tLabel('Member Statement'), action: 'MEMBER_STATEMENT' },
        ]
      },
      { title: '6. ' + tLabel('Member Detail Ledger'), action: 'MEMBER_DETAIL_LEDGER' },
      { title: '8. ' + tLabel('Account Balance'), action: 'ACCOUNT_BALANCE' },
      {
        title: '9. ' + tLabel('Member Statement'),
        submenu: [
          { title: '9.1 ' + tLabel('Saving Statement'), action: 'SAVING_STATEMENT' },
          { title: '9.2 ' + tLabel('RD Statement'), action: 'RD_STATEMENT' },
          { title: '9.4 ' + tLabel('Member Statement'), action: 'MEMBER_STATEMENT' },
          { title: '9.5 ' + tLabel('New Share Certificate'), action: 'NEW_SHARE_CERTIFICATE' },
          { title: '9.6 ' + tLabel('Interest Certificate'), action: 'INTEREST_CERTIFICATE' },
          { title: '9.7 ' + tLabel('Loan Nil Certificate'), action: 'LOAN_NIL_CERTIFICATE' },
        ]
      },
      { title: '10. ' + tLabel('Surety Register'), action: 'SURETY_REGISTER' },
      { title: '11. ' + tLabel('Deposit Due Date Register'), action: 'DEPOSIT_DUE_DATE_REGISTER' },
      {
        title: '12. ' + tLabel('Account Reports'),
        submenu: [
          { title: '1. ' + tLabel('Account Closing Register'), action: 'ACCOUNT_CLOSING_REGISTER' },
          { title: '3. ' + tLabel('Share Certificate'), action: 'SHARE_CERTIFICATE' },
          { title: '4. ' + tLabel('Recurring Details'), action: 'RECURRING_DETAILS' },
          { title: '5. ' + tLabel('Recovery Details'), action: 'RECOVERY_DETAILS' },
          { title: '6. ' + tLabel('Loan Contributions Register'), action: 'LOAN_CONTRIBUTIONS_REGISTER' },
          { title: '7. ' + tLabel('Lien Account Information'), action: 'LIEN_ACCOUNT_INFORMATION' },
          { title: '8. ' + tLabel('Loan Consolidation Chain'), action: 'LOAN_CONSOLIDATION_CHAIN' },
          { title: '9. ' + tLabel('Loan Re-agreement History'), action: 'LOAN_REAGREEMENT_HISTORY' },
        ]
      },
      { title: '13. ' + tLabel('Pass Book Printing'), action: 'PASS_BOOK_PRINTING' },
      { title: '14. ' + tLabel('Report Head Order'), action: 'REPORT_HEAD_ORDER' },
      {
        title: tLabel('Report Pro'),
        submenu: [
          { title: tLabel('Legacy Report Workspace'), action: 'REPORT_PRO' },
        ]
      },
    ]
  },
  {
    id: 'utility',
    title: tLabel('Utility'),
    items: [
      { title: tLabel('Premature Information Of Intt. (SB A/c)'), action: 'PREMATURE_SB_AC' },
      { title: tLabel('Calculator'), action: 'CALCULATOR' },
      { title: tLabel('Find'), action: 'FIND' },
      { title: tLabel('Member Balance'), action: 'MEMBER_BALANCE' },
      { title: tLabel('EMI Chart'), action: 'EMI_CHART' },
      { title: tLabel('Database BackUp'), action: 'DATABASE_BACKUP' },
      { title: tLabel('Update Saving Intt.'), action: 'UPDATE_SAVING_INTT' },
      { title: tLabel('Interest Receivable/Received Statement'), action: 'INTEREST_RECEIVABLE_RECEIVED_STATEMENT' },
      { title: tLabel('Communication Hub'), action: 'COMMUNICATION_HUB' },
      { title: tLabel('Notification Centre'), action: 'NOTIFICATION_CENTRE' },
      { title: tLabel('Support Desk'), action: 'SUPPORT_DESK' },
      { title: tLabel('System Update'), action: 'SYSTEM_UPDATE' },
    ]
  },
  {
    id: 'help',
    title: tLabel('Help'),
    items: [
      { title: tLabel('About'), action: 'ABOUT' },
      { title: tLabel('Contents ..'), action: 'CONTENTS' },
      { title: tLabel('Replay Tour'), action: 'REPLAY_TOUR' },
      { title: tLabel('How It Works'), action: 'HOW_IT_WORKS' },
      { title: tLabel('Getting Started'), action: 'GETTING_STARTED' },
      { title: tLabel("What's New"), action: 'WHATS_NEW' },
    ]
  },
  {
    id: 'exit',
    title: tLabel('Exit'),
    items: [],
    action: 'EXIT'
  },
  {
    id: 'settings',
    title: tLabel('Settings'),
    items: [],
    action: 'SETTINGS'
  }
];



/* Exit Confirmation Modal Component */
interface ExitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-[400px] overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#2d1b4e] px-4 py-2 flex justify-between items-center">
          <span className="text-white font-medium text-sm flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            </div>
            {t('Exit Application')}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">{t('Exit Application')}</h3>
          <p className="text-gray-600 text-sm mb-8 max-w-[80%] leading-relaxed">
            {t('Are you sure you want to exit Paper White Technology - LMS?')}
          </p>

          <div className="flex gap-4 w-full justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm transition-colors min-w-[100px]"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-sm shadow-md shadow-red-200 transition-all hover:shadow-lg min-w-[100px]"
            >
              {t('Exit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Keeps a menu item only if its own action is allowed, or (for a submenu) it
// still has at least one allowed item underneath after filtering — so a role
// with no rights in a whole section (e.g. Security) doesn't see an empty
// "Security" submenu with nothing clickable inside it.
function filterMenuItems(items: MenuItem[], allowedActions: string[] | null | undefined): MenuItem[] {
  return items.reduce<MenuItem[]>((acc, item) => {
    if (item.submenu) {
      const filteredSubmenu = filterMenuItems(item.submenu, allowedActions);
      if (filteredSubmenu.length > 0) acc.push({ ...item, submenu: filteredSubmenu });
    } else if (isActionAllowed(allowedActions, item.action)) {
      acc.push(item);
    }
    return acc;
  }, []);
}

function filterNavConfig(config: NavItem[], allowedActions: string[] | null | undefined): NavItem[] {
  return config.reduce<NavItem[]>((acc, navItem) => {
    if (navItem.items.length === 0) {
      // Top-level items with no dropdown (Exit, Settings) act on navItem.action directly.
      if (isActionAllowed(allowedActions, navItem.action)) acc.push(navItem);
      return acc;
    }
    const filteredItems = filterMenuItems(navItem.items, allowedActions);
    if (filteredItems.length > 0) acc.push({ ...navItem, items: filteredItems });
    return acc;
  }, []);
}

// Extra words so people find a window by what they call it, not only its menu title.
const SEARCH_KEYWORDS: Record<string, string> = {
  INTEREST_CALC: 'interest int accrual posting savings rd fd',
  INTEREST_CALC_POST: 'interest int loan posting',
  DAY_END: 'dayend close day eod end of day',
  LOAN_APP: 'new loan apply application',
  LOAN_PAYMENT: 'disburse disbursement pay out',
  LOAN_REPAYMENT: 'emi recovery installment repay',
  LOAN_EARLY_CLOSURE: 'foreclose close loan settle',
  DATABASE_BACKUP: 'backup restore database data safe',
  USER_MANAGEMENT: 'users create modify password staff login',
  ROLE_MANAGEMENT: 'rights permissions roles access',
  CHANGE_PASSWORD: 'password security',
  MEMBER_MASTER: 'member customer kyc add edit',
  SAVING_AC_OPENING: 'sb savings account open',
  SETTINGS: 'theme dark mode appearance font colour color notifications search glass',
  NOTIFICATION_CENTRE: 'alerts bell inbox',
  COMMUNICATION_HUB: 'sms email whatsapp message send',
  SUPPORT_DESK: 'help bug issue ticket report problem',
  CALCULATOR: 'calc',
  MEMBER_LEDGER_REPORT: 'ledger statement',
  DEFAULTER_LIST: 'overdue npa arrears',
};
const SEARCH_SUGGESTED = new Set(['MEMBER_MASTER', 'LOAN_REPAYMENT', 'DAY_END', 'INTEREST_CALC', 'LOAN_APP', 'MEMBER_LEDGER_REPORT']);
const SECTION_ICON: Record<string, React.ReactNode> = {
  admin: <ShieldCheck size={15} />, masters: <Users size={15} />, transaction: <ArrowLeftRight size={15} />,
  reports: <FileText size={15} />, utility: <Wrench size={15} />, help: <HelpCircle size={15} />, settings: <SettingsIcon size={15} />,
};

function flattenForSearch(config: NavItem[], run: (action: string) => void): SearchItem[] {
  const out: SearchItem[] = [];
  const walk = (items: MenuItem[], trail: string[], icon: React.ReactNode) => {
    items.forEach(item => {
      if (item.submenu) { walk(item.submenu, [...trail, tLabel(item.title)], icon); return; }
      if (!item.action) return;
      const action = item.action;
      out.push({
        id: action,
        title: tLabel(item.title),
        path: trail.join(' › '),
        keywords: SEARCH_KEYWORDS[action],
        suggest: SEARCH_SUGGESTED.has(action),
        icon,
        run: () => run(action),
      });
    });
  };
  config.forEach(nav => {
    // File and Exit are window actions (Save, Print…), not places to go.
    if (nav.id === 'file' || nav.id === 'exit') return;
    const icon = SECTION_ICON[nav.id];
    if (nav.items.length === 0 && nav.action) {
      const action = nav.action;
      out.push({ id: action, title: tLabel(nav.title), path: tLabel('Application'), keywords: SEARCH_KEYWORDS[action], icon, run: () => run(action) });
    } else {
      walk(nav.items, [tLabel(nav.title)], icon);
    }
  });
  return out;
}

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const visibleNavConfig = useMemo(
    () => filterNavConfig(navConfig, user?.allowedActions),
    [user?.allowedActions],
  );

  const [menuState, setMenuState] = useState<{ activeMenu: string | null, activeSubmenus: Record<string, boolean> }>({ activeMenu: null, activeSubmenus: {} });
  const [showExitModal, setShowExitModal] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);

  const [connStatus, setConnStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  useEffect(() => {
    const check = async () => {
      try {
        const r = await apiService.getAppInfo();
        setConnStatus(r.success ? 'connected' : 'disconnected');
      } catch {
        setConnStatus('disconnected');
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const handleMenuClick = (menuId: string) => {
    setMenuState(prev => ({
      activeMenu: prev.activeMenu === menuId ? null : menuId,
      activeSubmenus: {}
    }));
  };

  const handleSubmenuClick = (e: React.MouseEvent, submenuId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuState(prev => ({
      ...prev,
      activeSubmenus: { ...prev.activeSubmenus, [submenuId]: !prev.activeSubmenus[submenuId] }
    }));
  };

  const handleSubmenuHover = (submenuId: string) => {
    setMenuState(prev => ({
      ...prev,
      activeSubmenus: { ...prev.activeSubmenus, [submenuId]: true }
    }));
  };

  const handleSubmenuLeave = (submenuId: string) => {
    setMenuState(prev => ({
      ...prev,
      activeSubmenus: { ...prev.activeSubmenus, [submenuId]: false }
    }));
  };

  const handleMenuItemClick = (action: string) => {
    console.log(`[DEBUG] Menu item clicked: ${action}`);

    // Intercept Exit actions
    if (action === 'EXIT' || action === 'EXIT_OPTION_1') {
      setShowExitModal(true);
      setMenuState({ activeMenu: null, activeSubmenus: {} });
      return;
    }

    // In-window action: no separate window, just ask the walkthrough host to start.
    if (action === 'REPLAY_TOUR') {
      window.dispatchEvent(new Event(ONBOARDING_REPLAY_EVENT));
      setMenuState({ activeMenu: null, activeSubmenus: {} });
      return;
    }

    if (action === 'WHATS_NEW') {
      window.dispatchEvent(new Event(ONBOARDING_WHATSNEW_EVENT));
      setMenuState({ activeMenu: null, activeSubmenus: {} });
      return;
    }

    if (action === 'GETTING_STARTED') {
      window.dispatchEvent(new Event(ONBOARDING_CHECKLIST_EVENT));
      setMenuState({ activeMenu: null, activeSubmenus: {} });
      return;
    }

    if (action === 'HOW_IT_WORKS') {
      window.dispatchEvent(new Event(ONBOARDING_SLIDES_EVENT));
      setMenuState({ activeMenu: null, activeSubmenus: {} });
      return;
    }

    const serviceMap = ACTION_ROUTE_MAP;

    const service = serviceMap[action];
    if (service) {
      markWindowOpened(action); // counts towards the getting-started checklist
      const { route, electronMethod } = service;
      console.log(`[DEBUG] Found service mapping for ${action}:`, { route, electronMethod });

      if (window.electronAPI && window.electronAPI[electronMethod]) {
        console.log(`[DEBUG] Calling electronAPI.${electronMethod}('${route}')`);
        try {
          window.electronAPI[electronMethod](route);
          console.log(`[DEBUG] Successfully initiated window creation for ${action}`);
        } catch (error) {
          console.error(`[ERROR] Error calling electronAPI.${electronMethod}:`, error);
        }
      } else {
        console.error(`[ERROR] Electron API method '${electronMethod}' not available`);
        console.log('[DEBUG] Available electronAPI methods:', Object.keys(window.electronAPI || {}));
      }
    } else {
      console.error(`[ERROR] No service mapping found for action: ${action}`);
      console.log('[DEBUG] Available actions in serviceMap:', Object.keys(serviceMap));
    }

    setMenuState({ activeMenu: null, activeSubmenus: {} });
  };

  const searchItems = useMemo<SearchItem[]>(() => {
    const items = flattenForSearch(visibleNavConfig, handleMenuItemClick);
    items.push({
      id: 'MY_PROFILE', title: tLabel('My Profile'), path: tLabel('Account'), keywords: 'account me profile details',
      icon: <UserIcon size={15} />,
      run: () => { if (window.electronAPI?.openNewWindow) window.electronAPI.openNewWindow('/my-profile'); else window.location.hash = '#/my-profile'; },
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNavConfig, i18n.language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setMenuState({ activeMenu: null, activeSubmenus: {} });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderMenuItems = (items: MenuItem[]) => {
    return items.map(item => {
      if (item.submenu) {
        const isSubmenuOpen = menuState.activeSubmenus[item.title];
        return (
          <li
            key={item.title}
            className="relative"
            onMouseEnter={() => handleSubmenuHover(item.title)}
            onMouseLeave={() => handleSubmenuLeave(item.title)}
          >
            <a
              href="#"
              onClick={(e) => handleSubmenuClick(e, item.title)}
              className="flex justify-between items-center w-full px-4 py-2 text-gray-800 whitespace-nowrap hover:bg-gray-50 no-underline"
            >
              {tLabel(item.title)}
              <span className={`ml-4 transform transition-transform duration-200 ${isSubmenuOpen ? 'rotate-90' : ''}`}>›</span>
            </a>
            {isSubmenuOpen && (
              <ul className="absolute left-full top-0 min-w-52 bg-white border border-gray-200 rounded shadow-lg py-1 m-0 list-none z-50">
                {renderMenuItems(item.submenu)}
              </ul>
            )}
          </li>
        );
      }
      return (
        <li key={item.title}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (item.action) handleMenuItemClick(item.action);
            }}
            className="flex justify-between items-center w-full px-4 py-2 text-gray-800 whitespace-nowrap hover:bg-gray-50 no-underline"
          >
            {tLabel(item.title)}
            {item.shortcut && <span className='ml-8 text-gray-500 text-sm opacity-80'>{item.shortcut}</span>}
          </a>
        </li>
      );
    });
  };

  const confirmExit = () => {
    if (window.electronAPI && window.electronAPI.quitApp) {
      window.electronAPI.quitApp();
    } else {
      console.warn('Electron API not available, cannot quit app');
    }
    setShowExitModal(false);
  };

  return (
    <>
    {/* ── Bottom-left app watermark ── */}
    <div className="fixed bottom-3 left-3 z-40 pointer-events-none select-none">
      <p
        className="fz-caption font-black tracking-tight leading-none"
        style={{ color: 'rgba(15,23,42,0.18)' }}
      >
        {t('Fibe')}
      </p>
      <p
        className="fz-micro font-bold uppercase tracking-widest leading-none mt-0.5"
        style={{ color: 'rgba(15,23,42,0.12)' }}
      >
        {t('Loan Management')}
      </p>
    </div>

    <nav ref={navbarRef} className="bg-white border-b border-gray-200 shadow-sm relative z-50">
      <div className="w-full mx-auto flex items-center h-11 relative px-3 gap-2">

        {/* Menu items — NO overflow:auto here; it clips absolute dropdowns */}
        <div className="flex flex-1 min-w-0">
          <ul className="list-none m-0 p-0 flex gap-0">
            {visibleNavConfig.map(navItem => (
              <li key={navItem.id} className="relative" data-tour={`menu-${navItem.id}`}>
                <a
                  href="#"
                  className="no-underline text-gray-700 font-semibold px-3.5 py-2 fz-body transition-all duration-150 whitespace-nowrap flex items-center hover:text-blue-700 hover:bg-blue-50 rounded"
                  onClick={(e) => {
                    e.preventDefault();
                    if (navItem.items.length === 0 && navItem.action) {
                      handleMenuItemClick(navItem.action);
                    } else {
                      handleMenuClick(navItem.id);
                    }
                  }}
                >
                  {tLabel(navItem.title)}
                </a>
                {menuState.activeMenu === navItem.id && (
                  <ul className="absolute top-full left-0 min-w-52 bg-white border border-gray-200 rounded shadow-lg py-1 m-0 list-none z-[9999]">
                    {renderMenuItems(navItem.items)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Global search */}
        <GlobalSearch items={searchItems} />

        {/* Right side — compact status dot + user profile */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-gray-100">
          {/* Compact connection dot with tooltip-style label */}
          <div
            data-tour="connection"
            title={connStatus === 'connected' ? t('Backend: Connected') : connStatus === 'disconnected' ? t('Backend: Disconnected') : t('Checking connection…')}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border fz-tiny font-bold transition-all cursor-default select-none"
            style={{
              backgroundColor: connStatus === 'connected' ? '#f0fdf4' : connStatus === 'disconnected' ? '#fef2f2' : '#fefce8',
              borderColor:     connStatus === 'connected' ? '#bbf7d0' : connStatus === 'disconnected' ? '#fecaca' : '#fef08a',
              color:           connStatus === 'connected' ? '#16a34a' : connStatus === 'disconnected' ? '#dc2626' : '#ca8a04',
            }}>
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${connStatus === 'connected' ? 'bg-green-500 animate-pulse' : connStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'}`} />
            <span className="hidden sm:inline">{connStatus === 'connected' ? 'OK' : connStatus === 'disconnected' ? t('Off') : '…'}</span>
          </div>
          <UserProfileMenu />
        </div>
      </div>
      <ExitConfirmationModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={confirmExit}
      />
    </nav>
    </>
  );
};

export default Navbar;
