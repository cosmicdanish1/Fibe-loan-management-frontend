// Dashboard bento layout: rows of cards, each card with a width weight and each
// row with an optional fixed height. Weights are relative, so when one card is
// widened its neighbours in the row shrink and the row always fills the window.

export interface CardLayout { id: string; w: number }
export interface RowLayout { id: string; h?: number; cards: CardLayout[] }

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
] as const;

export type WidgetKey = typeof CARD_IDS[number];
export type WidgetConfig = Record<WidgetKey, boolean>;

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = Object.fromEntries(
  CARD_IDS.map(id => [id, true]),
) as WidgetConfig;

const defaultRows = (): RowLayout[] => [
  { id: 'row-banner', cards: [{ id: 'fyBanner', w: 1 }] },
  { id: 'row-actions', cards: [{ id: 'quickActions', w: 1 }] },
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
    if (cards.length) {
      const next: RowLayout = { id: row.id, cards };
      if (typeof row.h === 'number' && row.h > 0) next.h = row.h;
      rows.push(next);
    }
  }
  // Cards missing from the saved layout are added four to a row, the same compact size as the rest.
  const missing = CARD_IDS.filter(id => !seen.has(id));
  for (let i = 0; i < missing.length; i += 4) {
    rows.push({ id: `row-new-${i / 4}-${missing[i]}`, cards: missing.slice(i, i + 4).map(id => ({ id, w: 1 })) });
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
