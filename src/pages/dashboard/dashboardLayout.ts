// Dashboard bento layout: rows of cards, each card with a width weight. Weights are relative, so when
// one card is widened its neighbour in the row shrinks and the row always fills the window. A row's
// height always comes from its content: fixed row heights let cards run into the row below, so a
// height stored by an older version is dropped when the layout is loaded.

export interface CardLayout { id: string; w: number }
export interface RowLayout { id: string; cards: CardLayout[] }

// v2: the default now puts every widget in the compact four-to-a-row size; older saved layouts are dropped once.
const STORAGE_KEY = 'lms-dashboard-layout-v2';

// Every dashboard card. This is the single list: Settings → Dashboard shows a switch for each
// of these, and the Dashboard draws the ones that are switched on.
export const CARD_IDS = [
  'fyBanner', 'quickActions', 'noticeBoard', 'shortcuts',
  'activeMembers', 'sanctionedLoans', 'monthEndOutstanding', 'balanceDistribution',
  'pendingVouchers', 'cashPosition', 'dayEndStatus', 'demandRecovery',
  'depositsSummary', 'upcomingMaturities', 'loanApplications',
  'overdueLoans', 'retiringMembers', 'newMembers',
  'waitingApproval', 'todayCashFlow', 'rdDues',
  'topDefaulters', 'disbursedThisMonth', 'lastBackup',
] as const;

export type WidgetKey = typeof CARD_IDS[number];

// Names shown in Customize mode (the "add a widget" list). English keys; pass through t().
export const CARD_LABELS: Record<WidgetKey, string> = {
  fyBanner: 'Financial Year', quickActions: 'Quick Actions', noticeBoard: 'Notice Board', shortcuts: 'Keyboard Shortcuts',
  activeMembers: 'Active Members', sanctionedLoans: 'Sanctioned Loans', monthEndOutstanding: 'Loan Outstanding',
  balanceDistribution: 'Member Balance Distribution', pendingVouchers: 'Vouchers To Pass', cashPosition: 'Cash Position',
  dayEndStatus: 'Day-End Status', demandRecovery: 'Demand vs Recovery', depositsSummary: 'Deposits Summary',
  upcomingMaturities: 'Upcoming Maturities', loanApplications: 'Loan Applications', overdueLoans: 'Overdue Loans',
  retiringMembers: 'Retiring Members', newMembers: 'New Members',
  waitingApproval: 'Waiting For Approval', todayCashFlow: "Today's Receipts vs Payments", rdDues: 'RD Instalments',
  topDefaulters: 'Top Defaulters', disbursedThisMonth: 'Loans Disbursed', lastBackup: 'Last Database Backup',
};
export type WidgetConfig = Record<WidgetKey, boolean>;

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = Object.fromEntries(
  CARD_IDS.map(id => [id, true]),
) as WidgetConfig;

const defaultRows = (): RowLayout[] => [
  { id: 'row-top', cards: [{ id: 'quickActions', w: 1.6 }, { id: 'fyBanner', w: 1 }] },
  {
    id: 'row-today',
    cards: [
      { id: 'pendingVouchers', w: 1 }, { id: 'cashPosition', w: 1 },
      { id: 'dayEndStatus', w: 1 }, { id: 'demandRecovery', w: 1 },
    ],
  },
  { id: 'row-notice', cards: [{ id: 'noticeBoard', w: 2 }, { id: 'shortcuts', w: 1 }] },
  {
    id: 'row-members',
    cards: [
      { id: 'activeMembers', w: 1 }, { id: 'newMembers', w: 1 },
      { id: 'sanctionedLoans', w: 1 }, { id: 'monthEndOutstanding', w: 1 },
    ],
  },
  {
    id: 'row-money',
    cards: [
      { id: 'balanceDistribution', w: 1 }, { id: 'depositsSummary', w: 1 },
      { id: 'upcomingMaturities', w: 1 }, { id: 'loanApplications', w: 1 },
    ],
  },
  { id: 'row-risk', cards: [{ id: 'overdueLoans', w: 1 }, { id: 'retiringMembers', w: 1 }] },
  { id: 'row-work', cards: [{ id: 'waitingApproval', w: 1 }, { id: 'todayCashFlow', w: 1 }, { id: 'rdDues', w: 1 }] },
  { id: 'row-lists', cards: [{ id: 'topDefaulters', w: 1 }, { id: 'disbursedThisMonth', w: 1 }, { id: 'lastBackup', w: 1 }] },
];

export const DEFAULT_ROWS = defaultRows;

// Keep the saved layout valid: known cards only, each exactly once; cards that
// are missing from it (for example a widget added later) get their own row.
export const normalizeLayout = (input: RowLayout[]): RowLayout[] => {
  const known = new Set<string>(CARD_IDS);
  const seen = new Set<string>();
  const rows: RowLayout[] = [];
  for (const row of input) {
    const cards = row.cards.filter(c => {
      if (!known.has(c.id) || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    }).map(c => ({ id: c.id, w: Number.isFinite(c.w) && c.w > 0 ? c.w : 1 }));
    if (cards.length) rows.push({ id: row.id, cards });
  }
  // Cards missing from the saved layout (widgets added in a later version) are added three to a row at the end.
  const missing = CARD_IDS.filter(id => !seen.has(id));
  for (let i = 0; i < missing.length; i += 3) {
    rows.push({ id: `row-new-${i / 3}-${missing[i]}`, cards: missing.slice(i, i + 3).map(id => ({ id, w: 1 })) });
  }
  return rows;
};

export const loadLayout = (): RowLayout[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRows();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeLayout(parsed) : defaultRows();
  } catch {
    return defaultRows();
  }
};

export const saveLayout = (rows: RowLayout[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch { /* storage unavailable */ }
};

export const clearLayout = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
};
