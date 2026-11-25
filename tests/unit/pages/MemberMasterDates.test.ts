// Member Master date rules (ES-382): the legacy placeholder date, age at the membership date, automatic retirement date.
import { describe, it, expect } from 'vitest';
import { isPlaceholderDate, cleanDate, ageOn, retirementDateFor, dateProblems } from '../../../src/service/Masters/MemberMaster/utils/memberDates';

describe('placeholder date', () => {
  it.each([['1900-01-01', true], ['1900-01-01T00:00:00.000Z', true], ['1899-12-31', true], ['1901-01-01', false], ['2018-01-01', false], ['', false], [null, false], [undefined, false]])(
    '%j -> %j', (v, want) => expect(isPlaceholderDate(v)).toBe(want));
  it('cleanDate empties the placeholder and keeps real dates', () => {
    expect(cleanDate('1900-01-01')).toBe('');
    expect(cleanDate('2018-01-01')).toBe('2018-01-01');
    expect(cleanDate(null)).toBe('');
  });
});

describe('age at the membership date (the legacy rule)', () => {
  it.each([
    ['1981-11-14', '2026-11-14', 45], ['1964-08-21', '1988-05-12', 23], ['1960-01-01', '1988-05-12', 28],
    ['1990-05-01', '1990-05-01', 0], ['1990-05-02', '1990-05-01', null], ['', '2026-01-01', null],
  ])('born %s, member on %s -> %s', (dob, on, want) => expect(ageOn(dob, on)).toBe(want));
  it('with no membership date it is the age today', () => {
    const y = new Date().getFullYear() - 30;
    const a = ageOn(`${y}-01-01`);
    expect(a === 30 || a === 29).toBe(true);
  });
  it('the day before the birthday is one year less', () => {
    expect(ageOn('2000-06-15', '2026-06-14')).toBe(25);
    expect(ageOn('2000-06-15', '2026-06-15')).toBe(26);
  });
});

describe('retirement date: last day of the month of the 60th birthday (as the legacy fills it)', () => {
  it.each([
    ['1964-08-21', '2024-08-31'], ['1981-11-14', '2041-11-30'], ['1988-05-12', '2048-05-31'], ['1960-02-10', '2020-02-29'],
    ['1963-02-10', '2023-02-28'], ['1970-12-31', '2030-12-31'],
  ])('%s -> %s', (dob, want) => expect(retirementDateFor(dob)).toBe(want));
  it('no or bad birth date gives nothing', () => {
    expect(retirementDateFor('')).toBe('');
    expect(retirementDateFor('abc')).toBe('');
  });
  it('another retirement age', () => expect(retirementDateFor('1970-03-05', 58)).toBe('2028-03-31'));
});

describe('date problems on the form', () => {
  it('membership before birth is refused', () => {
    expect(dateProblems({ dateOfBirth: '1990-05-01', membershipDate: '1988-05-12' })).toEqual(['Membership Date cannot be before the Date of Birth']);
  });
  it('membership on the birth day is fine; either date missing is fine', () => {
    expect(dateProblems({ dateOfBirth: '1990-05-01', membershipDate: '1990-05-01' })).toEqual([]);
    expect(dateProblems({ dateOfBirth: '1990-05-01' })).toEqual([]);
    expect(dateProblems({ membershipDate: '1990-05-01' })).toEqual([]);
  });
  it('retirement must be after birth; the placeholder never counts as a retirement date', () => {
    expect(dateProblems({ dateOfBirth: '1960-01-01', retirementDate: '1959-01-01' })).toEqual(['Retirement Date must be after Date of Birth']);
    expect(dateProblems({ dateOfBirth: '1960-01-01', retirementDate: '1900-01-01' })).toEqual([]);
    expect(dateProblems({ dateOfBirth: '1960-01-01', retirementDate: '2020-01-31' })).toEqual([]);
  });
  it('both problems are reported together', () => {
    expect(dateProblems({ dateOfBirth: '1990-05-01', membershipDate: '1980-01-01', retirementDate: '1985-01-01' })).toHaveLength(2);
  });
});
