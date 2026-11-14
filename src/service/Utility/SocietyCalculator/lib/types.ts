// Shapes returned by the backend society-calculator module (backend/src/modules/society-calculator).

export type LoanTypeCode = 'RLN' | 'ALN' | 'ELN';
export type RoundingMode = 'NONE' | 'NEAREST' | 'UP' | 'DOWN';

export interface LoanTypeRules {
  code: LoanTypeCode;
  name: string;
  rate: number;
  penalRate: number;
  graceDays: number;
  smPct: number;
  smDiv: number;
  maxAmount: number;
  maxInstallments: number;
}

export interface CalculatorRules {
  asOf: string;
  loanTypes: Record<LoanTypeCode, LoanTypeRules>;
  slot: { startDay: number; endDay: number; slot1DelayMonths: number; slot2DelayMonths: number };
  roundingMode: RoundingMode;
  penaltyEnabled: boolean;
  eligibility: {
    maxLimit: number; rdPct: number; sharePct: number;
    shortfallMode: 'DEDUCT' | 'BLOCK' | 'IGNORE'; limitCalc: 'OUTSTANDING_PLUS_NEW' | 'NEW_ONLY'; shareMinBalance: number;
  };
  rd: { rate: number; minBalanceAfterWithdrawal: number };
  loanAgainstRd: { pct: number; ceiling: number };
  oldEmiFlagTolerance: number;
}

export interface ScheduleRow {
  no: number;
  dueMonth: string;
  dueDate: string | null;
  openingBalance: number;
  principal: number;
  interest: number;
  installment: number;
  closingBalance: number;
}

export interface LoanEmiResult {
  inputs: {
    loanAmount: number; annualRate: number; installments: number; applicationDate: string; disbursementDate: string;
    roundingMode: RoundingMode; carriedInterest: number;
  };
  slot: { slot: 1 | 2; subSlot: 'EARLY_MONTH' | 'LATE_MONTH' | null; label: string; interestDelayMonths: number; firstDueDelayMonths: number };
  monthlyRate: number;
  monthlyPrincipal: number;
  totalRbInterest: number;
  delayInterest: number;
  carriedInterest: number;
  totalInterestForEmi: number;
  monthlyInterestUnrounded: number;
  monthlyInterest: number;
  emi: number;
  totalPayable: number;
  totalInterestPaid: number;
  firstDueMonth: string;
  lastDueMonth: string;
  schedule: ScheduleRow[];
  rbSchedule: Array<{ no: number; openingBalance: number; rbInterest: number; principal: number; closingBalance: number }>;
  bankStyle: { emi: number; totalPayable: number; totalInterest: number; emiDifference: number };
  steps: string[];
}

// ── generic result model (penalty, deposits, member-money tabs) ──
export type CellKind = 'money' | 'text' | 'int' | 'pct' | 'num';
export interface GenericKpi { label: string; value: number | string; kind?: CellKind; tone?: 'info' | 'success' | 'warning' | 'danger'; sub?: string }
export interface GenericTable {
  title: string;
  columns: Array<{ key: string; label: string; kind?: CellKind }>;
  rows: Array<Record<string, any>>;
  totals?: Record<string, any>;
}
export interface GenericResult { kpis: GenericKpi[]; tables: GenericTable[]; steps: string[]; notes: string[] }

// ── early closure ──
export interface NrRow {
  month: string; dueDate: string; duePrincipal: number; paidPrincipal: number; unpaidPrincipal: number; interestDue: number;
  tier: 0 | 1 | 2; monthsOverdue: number; penalty: number; monthTotal: number;
}
export interface ClosureResult {
  inputs: { loanAmount: number; annualRate: number; installments: number; closureDate: string; roundingMode: RoundingMode; graceDay: number; penalRate: number; loanType: LoanTypeCode };
  emi: { monthlyPrincipal: number; monthlyInterest: number; installment: number; slot: 1 | 2; subSlot: string | null };
  outstandingPrincipal: number; paidInstallments: number; startedInstallments: number; futureInstallments: number; graceInstallment: string | null;
  register: NrRow[];
  registerTotals: { duePrincipal: number; paidPrincipal: number; unpaidPrincipal: number; interestDue: number; penalty: number; monthTotal: number };
  nrPrincipal: number; nrInterest: number; nrCount: number; averageRemainingPrincipal: number; averageRbInterest: number;
  apInterest: number; closureInterest: number; penalInterest: number;
  adjustment: number; principalAdjustment: number; interestAdjustment: number;
  finalClosureAmount: number;
  rdShare: { rdBalance: number; shareBalance: number; rdAvailable: number; shareAvailable: number; appliedFromRdShare: number; fromRd: number; fromShare: number; payableByMember: number };
  remainingEmis: number; remainingEmiTotal: number; interestSaved: number;
  steps: string[]; notes: string[];
}
