// Member Master: Division / RO and Branch come from the database (Wing / Office Master); Branch MS No is its own box.
import { describe, it, expect } from 'vitest';
import {
  officeLabel, wingLabel, officesForWing, resolveWingCode, parseOfficeNo, officeCode, orgProblems, branchBelongsToWing, cleanBranchMsNo,
} from '../../../src/service/Masters/MemberMaster/utils/memberBranch';
import { memberTypeOptions } from '../../../src/service/Masters/MemberMaster/interface/interface';

const WINGS = [{ wingId: '1', wingName: 'BHILAI' }, { wingId: '2', wingName: 'RAIPUR' }];
const OFFICES = [
  { officeId: 1, officeName: 'BHILAI', wingId: '1' }, { officeId: 5, officeName: 'DALLI RAJHRA', wingId: '1' },
  { officeId: 7, officeName: 'NEW BRANCH', wingId: '2' },
];

describe('lists built from the database rows', () => {
  it('labels', () => {
    expect(officeLabel(OFFICES[1]!)).toBe('5 - DALLI RAJHRA');
    expect(wingLabel(WINGS[0]!)).toBe('BHILAI');
    expect(wingLabel({ wingId: '9', wingName: '  ' })).toBe('9');
  });
  it('the Branch box shows only the offices of the chosen wing; with no wing, all of them', () => {
    expect(officesForWing(OFFICES, '1').map((o) => o.officeId)).toEqual([1, 5]);
    expect(officesForWing(OFFICES, '2').map((o) => o.officeId)).toEqual([7]);
    expect(officesForWing(OFFICES, '').map((o) => o.officeId)).toEqual([1, 5, 7]);
    expect(officesForWing(OFFICES, '99')).toEqual([]);
  });
  it('a branch added in Office Master appears (no fixed list of six)', () => {
    const more = [...OFFICES, { officeId: 8, officeName: 'ANOTHER', wingId: '1' }];
    expect(officesForWing(more, '1').map((o) => o.officeId)).toEqual([1, 5, 8]);
  });
});

describe('wing code of a stored member', () => {
  it('a code that exists is kept', () => expect(resolveWingCode('1', WINGS)).toBe('1'));
  it('a wing NAME saved by an older version becomes its code, in any letter case', () => {
    expect(resolveWingCode('BHILAI', WINGS)).toBe('1');
    expect(resolveWingCode('raipur', WINGS)).toBe('2');
  });
  it('something unknown stays visible; empty stays empty', () => {
    expect(resolveWingCode('50', WINGS)).toBe('50');
    expect(resolveWingCode(null, WINGS)).toBe('');
    expect(resolveWingCode('', WINGS)).toBe('');
  });
  it('before the wing list is loaded the stored value is kept', () => expect(resolveWingCode('1', [])).toBe('1'));
});

describe('office number', () => {
  it.each([['5', 5], [' 7 ', 7], ['0', null], ['-1', null], ['abc', null], ['', null], [null, null], [undefined, null], ['5x', null]])('parse %j -> %s', (v, want) => expect(parseOfficeNo(v)).toBe(want));
  it.each([[5, '5'], ['05', '5'], [0, ''], [null, ''], ['x', '']])('stored %j -> box %j', (v, want) => expect(officeCode(v)).toBe(want));
});

describe('checks', () => {
  it('Division/RO and Branch are both required', () => {
    expect(orgProblems('1', '5')).toEqual([]);
    expect(orgProblems('', '5')).toEqual(['Division/RO is required']);
    expect(orgProblems('1', '')).toEqual(['Branch is required']);
    expect(orgProblems(' ', 'x')).toEqual(['Division/RO is required', 'Branch is required']);
  });
  it('the Branch must belong to the chosen Division/RO', () => {
    expect(branchBelongsToWing('5', '1', OFFICES)).toBe(true);
    expect(branchBelongsToWing('5', '2', OFFICES)).toBe(false);
    expect(branchBelongsToWing('99', '1', OFFICES)).toBe(false);
    expect(branchBelongsToWing('', '1', OFFICES)).toBe(false);
  });
});

describe('Branch MS No box', () => {
  it('a real MS number is kept, spaces trimmed; empty stays empty', () => {
    expect(cleanBranchMsNo('33230')).toBe('33230');
    expect(cleanBranchMsNo('  asd ')).toBe('asd');
    expect(cleanBranchMsNo(null)).toBe('');
    expect(cleanBranchMsNo('')).toBe('');
  });
  it('a branch text that an earlier save put here is not shown as an MS number', () => {
    for (const b of ['5-DALLI RAJHRA-DALLI RAJHRA-03', '1-BHILAI-BHILAI-61', '3-RISALI-RISALI-99']) expect(cleanBranchMsNo(b)).toBe('');
  });
});

describe('member type options (as the legacy)', () => {
  it('Regular, Other Nominal, Co-Op Member, Well Wisher Member', () => {
    expect(memberTypeOptions.map((o) => o.value)).toEqual(['Regular', 'Other Nominal', 'Co-Op Member', 'Well Wisher Member']);
  });
});
