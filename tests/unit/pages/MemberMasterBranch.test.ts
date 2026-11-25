// Member Master: Branch dropdown comes from the office number; Branch MS No is its own box.
import { describe, it, expect } from 'vitest';
import { branchForOffice, cleanBranchMsNo, BRANCH_OPTIONS } from '../../../src/service/Masters/MemberMaster/utils/memberBranch';
import { memberTypeOptions } from '../../../src/service/Masters/MemberMaster/interface/interface';

describe('branch from the office number', () => {
  it.each([[5, '5-DALLI RAJHRA-DALLI RAJHRA-03'], ['3', '3-RISALI-RISALI-99'], ['01', '1-BHILAI-BHILAI-61'], [6, '6-MECON-BHILAI-90']])('%j -> %s', (o, want) => expect(branchForOffice(o)).toBe(want));
  it.each([[0], [7], [99], [null], [undefined], [''], ['abc'], ['5x']])('%j has no option', (o) => expect(branchForOffice(o)).toBe(''));
  it('every option can be found again from its own number', () => {
    for (const b of BRANCH_OPTIONS) expect(branchForOffice(b.split('-')[0])).toBe(b);
  });
});

describe('Branch MS No box', () => {
  it('a real MS number is kept, spaces trimmed', () => {
    expect(cleanBranchMsNo('33230')).toBe('33230');
    expect(cleanBranchMsNo('  asd ')).toBe('asd');
  });
  it('empty stays empty', () => {
    expect(cleanBranchMsNo(null)).toBe('');
    expect(cleanBranchMsNo(undefined)).toBe('');
    expect(cleanBranchMsNo('')).toBe('');
  });
  it('a branch text that an earlier save put here is not shown as an MS number', () => {
    for (const b of BRANCH_OPTIONS) expect(cleanBranchMsNo(b)).toBe('');
  });
});

describe('member type options (as the legacy)', () => {
  it('Regular, Other Nominal, Co-Op Member, Well Wisher Member', () => {
    expect(memberTypeOptions.map((o) => o.value)).toEqual(['Regular', 'Other Nominal', 'Co-Op Member', 'Well Wisher Member']);
  });
});
