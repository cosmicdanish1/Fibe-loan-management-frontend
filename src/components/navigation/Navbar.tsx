import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfileMenu } from '../UserProfileMenu';
import { AlertCircle, X } from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { ACTION_ROUTE_MAP, isActionAllowed } from '../../config/menuActions';

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
    title: 'File',
    items: [
      { title: 'Save', shortcut: 'Ctrl+S', action: 'SAVE' },
      { title: 'Cancel', shortcut: 'Ctrl+C', action: 'CANCEL' },
      { title: 'Delete', shortcut: 'Ctrl+D', action: 'DELETE' },
      { title: 'Refresh', shortcut: 'Ctrl+R', action: 'REFRESH' },
      { title: 'Print', shortcut: 'Ctrl+P', action: 'PRINT' },
      { title: 'Find', shortcut: 'Ctrl+F', action: 'FIND' },
      { title: 'Exit', shortcut: 'Ctrl+X', action: 'EXIT' },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    items: [
      {
        title: 'Loan',
        submenu: [
          { title: 'Loan Application', action: 'LOAN_APP' },
          { title: 'Change Loan Surety', action: 'CHANGE_LOAN_SURETY' },
          { title: 'Interest Calculation / Posting', action: 'INTEREST_CALC_POST' },
        ]
      },
      { title: 'DayEnd', action: 'DAY_END' },
      { title: 'Interest Calculation', action: 'INTEREST_CALC' },
      { title: 'Deposite/Loan Slab', action: 'DEPOSIT_LOAN_SLAB' },
      { title: 'Head Addition / Modification', action: 'HEAD_ADD_MOD' },
      { title: 'Head Opening Balance', action: 'HEAD_OPEN_BAL' },

      {
        title: 'Security',
        submenu: [
          { title: 'Create / Modify Users', action: 'USER_MANAGEMENT' },
          { title: 'Configure UserLevel Default Rights', action: 'ROLE_MANAGEMENT' },
          { title: 'Change Password', action: 'CHANGE_PASSWORD' },
          { title: 'LogOut User', action: 'LOGOUT_USER' },
        ]
      },
      {
        title: 'Financial Year',
        submenu: [
          { title: '1 Transfer Entries For Closing', action: 'FIN_YEAR_TRANSFER' },
          { title: '2 Financial Year Closing', action: 'FIN_YEAR_CLOSING' },
          { title: '3 Balance Transfer', action: 'FIN_YEAR_BALANCE_TRANSFER' },
          { title: '4 P and L Year End Process', action: 'FIN_YEAR_PL_PROCESS' },
        ]
      },
      { title: 'Saakh Score — Member Health', action: 'SAAKH_SCORE' },
      { title: 'Modify Business Rules', action: 'MODIFY_BIZ_RULES' },
      { title: 'RD Financial Year Closing', action: 'RD_FY_CLOSING' },
      { title: 'Dividend Calculation', action: 'DIVIDEND_CALCULATION' },
      { title: 'Dividend Credit', action: 'DIVIDEND_CREDIT' },
      { title: 'Demand Print Order', action: 'DEMAND_PRINT_ORDER' },
      {
        title: 'Certificate Setting and Printing',
        submenu: [
          { title: 'Certificate Parameter Setting', action: 'CERT_PARAM_SETTING' },
          { title: 'Share Certificate Printing', action: 'SHARE_CERT_PRINT' },
          { title: 'Passbook parameter setting', action: 'PASSBOOK_PARAM_SETTING' },
        ]
      },
    ]
  },
  {
    id: 'masters',
    title: 'Masters',
    items: [
      { title: 'Member Master', action: 'MEMBER_MASTER' },
      { title: 'Signature Scanning', action: 'SIGNATURE_SCANNING' },
      { title: 'Saving A/c Opening', action: 'SAVING_AC_OPENING' },
      { title: 'Wing / Office Master', action: 'WING_OFFICE_MASTER' },
      { title: 'Modify Member Balance', action: 'MODIFY_MEMBER_BAL' },
      { title: 'RD Member Setup', action: 'RD_MEMBER_SETUP' },
      { title: 'RD Withdrawal', action: 'RD_WITHDRAWAL' },
      { title: 'RD Repayment', action: 'RD_REPAYMENT' },
      { title: 'Cast Category', action: 'CAST_CATEGORY' },
      { title: 'Designation Master', action: 'DESIGNATION_MASTER' },
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
    title: 'Transaction',
    items: [
      {
        title: 'Receipt & Payment',
        submenu: [
          { title: 'Payment Voucher Creation', action: 'RECEIPT_PAYMENT_VOUCHER_CREATION' },
          { title: 'Voucher Payment', action: 'VOUCHER_PAYMENT' },
          { title: 'Receipt', action: 'RECEIPT_PAYMENT' },
          { title: 'Dividend Payment', action: 'RECEIPT_DIVIDEND_PAYMENT' },
        ]
      },
      { title: 'Saving [Receipt -- Payment]', action: 'SAVING_RECEIPT_PAYMENT' },
      { title: 'Journal / Transfer Entry', action: 'JOURNAL_TRANSFER_ENTRY' },
      { title: 'Loan Payment', action: 'LOAN_PAYMENT' },
      { title: 'Loan Repayment', action: 'LOAN_REPAYMENT' },
      { title: 'Loan Early Closure', action: 'LOAN_EARLY_CLOSURE' },
      { title: 'Compulsory Deposit Transaction', action: 'COMPULSORY_DEPOSIT_TRANSACTION' },
      { title: 'Member Balance Transfer', action: 'MEMBER_BALANCE_TRANSFER' },
      { title: 'Pass Transactions', action: 'PASS_TRANSACTIONS' },
      {
        title: 'Demand / Recovery List',
        submenu: [
          { title: 'Import Demand List', action: 'IMPORT_DEMAND_LIST' },
          { title: 'Generate', action: 'GENERATE' },
          { title: 'Updation / Ledger Posting', action: 'UPDATION_LEDGER_POSTING' },
          { title: 'Print Members Demand List', action: 'PRINT_MEMBERS_DEMAND_LIST' },
          { title: 'Change Member Office', action: 'CHANGE_MEMBER_OFFICE' },
          { title: 'Modify Short Recovery', action: 'MODIFY_SHORT_RECOVERY' },
        ]
      },
    ]
  },
  {
    id: 'reports',
    title: 'Reports',
    items: [
      {
        title: '1. Daily',
        submenu: [
          { title: '1.1 Cash-Book (Receiptwise Rough)', action: 'CASH_BOOK_RECEIPTWISE' },
          { title: '1.2 Cash-Book', action: 'CASH_BOOK' },
          { title: '1.3 Day-Book', action: 'DAY_BOOK' },
          { title: '1.4 Day-Book [SB]', action: 'DAY_BOOK_SB' },
          { title: '1.5 Consolidation Of Daily A/c', action: 'CONSOLIDATION_DAILY_AC' },
        ]
      },
      { title: '2. Member Ledger Report', action: 'MEMBER_LEDGER_REPORT' },
      { title: '3. General Ledger', action: 'GENERAL_LEDGER' },
      {
        title: '4. Monthly',
        submenu: [
          {
            title: '4.1 Print Vouchers',
            submenu: [
              { title: '4.1.1 Receipt/Payment Voucher', action: 'RECEIPT_PAYMENT_VOUCHER' },
              { title: '4.1.2. Journal/Transfer Voucher', action: 'JOURNAL_TRANSFER_VOUCHER' },
            ]
          },
          { title: '4.2 Cash Book Monthly', action: 'CASH_BOOK_MONTHLY' },
          { title: '4.3 Detail Ledger', action: 'DETAIL_LEDGER' },
          { title: '4.4 Bank Detail Ledger', action: 'BANK_DETAIL_LEDGER' },
          { title: '4.5 Defaulter List', action: 'DEFAULTER_LIST' },
          { title: '4.6 New Loan Disbursed', action: 'NEW_LOAN_DISBURSED' },
          { title: '4.7 Member Loan Ledger', action: 'MEMBER_LOAN_LEDGER' },
          { title: '4.8 Loan Account Statement', action: 'LOAN_ACCOUNT_STATEMENT' },
        ]
      },
      {
        title: '5. Yearly',
        submenu: [
          { title: '5.1 P & L/ Balance Sheet', action: 'P_L_BALANCE_SHEET' },
          {
            title: '5.2 Members List',
            submenu: [
              { title: '5.2.1 Voters/Withdrawl List', action: 'VOTERS_WITHDRAWL_LIST' },
            ]
          },
          {
            title: '5.3 Interest List',
            submenu: [
              { title: '5.3.1 Dividend Report', action: 'DIVIDEND_REPORT' },
              { title: '5.3.2 Dividend Paid', action: 'DIVIDEND_PAID' },
              { title: '5.3.3 Int. List CD/MD/SHRt', action: 'INT_LIST_CD_MD_SHRt' },
              { title: '5.3.4 Dividend Warrant', action: 'DIVIDEND_WARRANT' },
            ]
          },
          { title: '5.5 Member Loan Detail', action: 'MEMBER_LOAN_DETAIL' },
          { title: '5.6 Share Warrent Printing', action: 'SHARE_WARRANT_PRINTING' },
          { title: '5.7 Annual Member Statement', action: 'ANNUAL_MEMBER_STATEMENT' },
          { title: '5.8 Yearly Member Statement', action: 'YEARLY_MEMBER_STATEMENT' },
          { title: '5.9 Member Ledger', action: 'MEMBER_LEDGER' },
          { title: '5.10 Member Statement', action: 'MEMBER_STATEMENT' },
        ]
      },
      { title: '6. Member Detail Ledger', action: 'MEMBER_DETAIL_LEDGER' },
      { title: '8. Account Balance', action: 'ACCOUNT_BALANCE' },
      {
        title: '9. Member Statement',
        submenu: [
          { title: '9.1 Saving Statement', action: 'SAVING_STATEMENT' },
          { title: '9.2 RD Statement', action: 'RD_STATEMENT' },
          { title: '9.4 Member Statement', action: 'MEMBER_STATEMENT' },
          { title: '9.5 New Share Certificate', action: 'NEW_SHARE_CERTIFICATE' },
          { title: '9.6 Interest Certificate', action: 'INTEREST_CERTIFICATE' },
          { title: '9.7 Loan Nil Certificate', action: 'LOAN_NIL_CERTIFICATE' },
        ]
      },
      { title: '10. Surety Register', action: 'SURETY_REGISTER' },
      { title: '11. Deposit Due Date Register', action: 'DEPOSIT_DUE_DATE_REGISTER' },
      {
        title: '12. Account Reports',
        submenu: [
          { title: '1. Account Closing Register', action: 'ACCOUNT_CLOSING_REGISTER' },
          { title: '3. Share Certificate', action: 'SHARE_CERTIFICATE' },
          { title: '4. Recurring Details', action: 'RECURRING_DETAILS' },
          { title: '5. Recovery Details', action: 'RECOVERY_DETAILS' },
          { title: '6. Loan Contributions Register', action: 'LOAN_CONTRIBUTIONS_REGISTER' },
          { title: '7. Lien Account Information', action: 'LIEN_ACCOUNT_INFORMATION' },
        ]
      },
      { title: '13. Pass Book Printing', action: 'PASS_BOOK_PRINTING' },
    ]
  },
  {
    id: 'utility',
    title: 'Utility',
    items: [
      { title: 'Premature Information Of Intt. (SB A/c)', action: 'PREMATURE_SB_AC' },
      { title: 'Calculator', action: 'CALCULATOR' },
      { title: 'Find', action: 'FIND' },
      { title: 'Member Balance', action: 'MEMBER_BALANCE' },
      { title: 'EMI Chart', action: 'EMI_CHART' },
      { title: 'Database BackUp', action: 'DATABASE_BACKUP' },
      { title: 'Update Saving Intt.', action: 'UPDATE_SAVING_INTT' },
      { title: 'Interest Receivable/Received Statement', action: 'INTEREST_RECEIVABLE_RECEIVED_STATEMENT' },
      { title: 'Communication Hub', action: 'COMMUNICATION_HUB' },
    ]
  },
  {
    id: 'help',
    title: 'Help',
    items: [
      { title: 'About', action: 'ABOUT' },
      { title: 'Contents ..', action: 'CONTENTS' },
    ]
  },
  {
    id: 'exit',
    title: 'Exit',
    items: [],
    action: 'EXIT'
  },
  {
    id: 'settings',
    title: 'Settings',
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
            Exit Application
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

          <h3 className="text-xl font-bold text-gray-800 mb-2">Exit Application</h3>
          <p className="text-gray-600 text-sm mb-8 max-w-[80%] leading-relaxed">
            Are you sure you want to exit Paper White Technology LMS?
          </p>

          <div className="flex gap-4 w-full justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm transition-colors min-w-[100px]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-sm shadow-md shadow-red-200 transition-all hover:shadow-lg min-w-[100px]"
            >
              Exit
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

const Navbar: React.FC = () => {
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

    const serviceMap = ACTION_ROUTE_MAP;

    const service = serviceMap[action];
    if (service) {
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
              {item.title}
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
            {item.title}
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
        Fibe
      </p>
      <p
        className="fz-micro font-bold uppercase tracking-widest leading-none mt-0.5"
        style={{ color: 'rgba(15,23,42,0.12)' }}
      >
        Loan Management
      </p>
    </div>

    <nav ref={navbarRef} className="bg-white border-b border-gray-200 shadow-sm relative z-50">
      <div className="w-full mx-auto flex items-center h-11 relative px-3 gap-2">

        {/* Menu items — NO overflow:auto here; it clips absolute dropdowns */}
        <div className="flex flex-1 min-w-0">
          <ul className="list-none m-0 p-0 flex gap-0">
            {visibleNavConfig.map(navItem => (
              <li key={navItem.id} className="relative">
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
                  {navItem.title}
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

        {/* Right side — compact status dot + user profile */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-gray-100">
          {/* Compact connection dot with tooltip-style label */}
          <div
            title={connStatus === 'connected' ? 'Backend: Connected' : connStatus === 'disconnected' ? 'Backend: Disconnected' : 'Checking connection…'}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border fz-tiny font-bold transition-all cursor-default select-none"
            style={{
              backgroundColor: connStatus === 'connected' ? '#f0fdf4' : connStatus === 'disconnected' ? '#fef2f2' : '#fefce8',
              borderColor:     connStatus === 'connected' ? '#bbf7d0' : connStatus === 'disconnected' ? '#fecaca' : '#fef08a',
              color:           connStatus === 'connected' ? '#16a34a' : connStatus === 'disconnected' ? '#dc2626' : '#ca8a04',
            }}>
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${connStatus === 'connected' ? 'bg-green-500 animate-pulse' : connStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'}`} />
            <span className="hidden sm:inline">{connStatus === 'connected' ? 'OK' : connStatus === 'disconnected' ? 'Off' : '…'}</span>
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
