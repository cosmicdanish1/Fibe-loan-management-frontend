// Only options with backend support are listed here.
// member_range and office_wise require backend service extensions.
export const interestCalculationOptions = [
  { id: 'all_members',         name: 'All Members' },
  { id: 'specific_member',     name: 'Specific Member' },
  { id: 'yearly_fund_process', name: 'Yearly Fund Process' },
];

export const accountTypeOptions = [
  { id: 'SB', name: 'SB — Savings Account',   head: 'A1001' },
  { id: 'FD', name: 'FD — Fixed Deposit',     head: 'A1003' },
];

export const accountHeadMap: Record<string, string> = {
  SB: 'A1001',
  FD: 'A1003',
};
