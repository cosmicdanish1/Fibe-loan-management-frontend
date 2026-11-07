import { describe, it, expect } from 'vitest';
import { friendlyError, problemText, describeHttpFailure, NETWORK_MESSAGE } from '../../src/utils/friendlyError';

// ES-467: failures are shown in plain words; technical text is never shown.

describe('friendlyError', () => {
  it('cannot reach the server', () => {
    const fe = friendlyError({ network: true, message: 'whatever' }, 'save the loan');
    expect(fe.kind).toBe('network');
    expect(fe.headline).toBe('Could not save the loan');
    expect(fe.lines).toEqual([NETWORK_MESSAGE]);
  });

  it('browser words like "Failed to fetch" are turned into the network sentence even without the flag', () => {
    const fe = friendlyError({ message: 'Failed to fetch' });
    expect(fe.kind).toBe('network');
    expect(fe.lines[0]).not.toMatch(/fetch/i);
  });

  it('a timeout', () => {
    expect(friendlyError({ message: 'Request timed out after 30s.' }).lines[0]).toMatch(/too long/);
  });

  it('field problems become one sentence each, with the text per field for the form', () => {
    const fe = friendlyError({
      status: 400, code: 'VALIDATION_FAILED',
      errors: [
        { field: 'firstName', label: 'First name', code: 'FIELD_REQUIRED', message: 'First name is required.' },
        { field: 'rate', label: 'Rate', code: 'FIELD_MAX', message: 'Rate cannot be more than 100.', params: { max: 100 } },
      ],
    }, 'save the member');
    expect(fe.kind).toBe('validation');
    expect(fe.headline).toBe('Please correct the following:');
    expect(fe.lines).toEqual(['First name is required.', 'Rate cannot be more than 100.']);
    expect(fe.byField).toEqual({ firstName: 'First name is required.', rate: 'Rate cannot be more than 100.' });
  });

  it('the same problem twice is shown once', () => {
    const p = { field: 'x', code: 'FIELD_REQUIRED', label: 'X', message: 'X is required.' };
    expect(friendlyError({ status: 400, errors: [p, p] }).lines).toEqual(['X is required.']);
  });

  it.each([
    [401, 'session', /sign in again/],
    [403, 'permission', /right to do this/],
    [404, 'notfound', /was not found|not found/i],
    [409, 'conflict', /already exists or is in use/],
    [413, 'toolarge', /too large/],
    [429, 'busy', /Too many requests/],
  ])('status %i without a useful server text', (status, kind, text) => {
    const fe = friendlyError({ status });
    expect(fe.kind).toBe(kind);
    expect(fe.lines[0]).toMatch(text as RegExp);
  });

  it('a readable server sentence is kept', () => {
    expect(friendlyError({ status: 404, message: 'Member 1999999999 not found' }).lines).toEqual(['Member 1999999999 not found']);
    expect(friendlyError({ status: 400, message: 'Amount must be a number greater than 0.' }).lines).toEqual(['Amount must be a number greater than 0.']);
  });

  it.each([
    'HTTP 500: Internal Server Error',
    'Database operation failed',
    "Cannot read properties of undefined (reading 'length')",
    'null value in column "trans_amt" of relation "ledger" violates not-null constraint',
    'Unexpected token < in JSON at position 0',
  ])('technical text "%s" is never shown', (raw) => {
    const fe = friendlyError({ status: 500, message: raw });
    expect(fe.kind).toBe('server');
    expect(fe.lines.join(' ')).not.toMatch(/HTTP 500|column|relation|Cannot read|Unexpected token|Database operation/);
  });

  it('the reference id is kept apart, and removed from the sentence', () => {
    const fe = friendlyError({ status: 500, requestId: 'web-abc-123', message: 'Something went wrong on the server while handling this request (reference web-abc-123). Please check what you entered and try again.' });
    expect(fe.reference).toBe('web-abc-123');
    expect(fe.lines[0]).not.toContain('reference web-abc-123');
  });

  it('no response at all still gives words', () => {
    expect(friendlyError(undefined).lines[0]).toMatch(/Something went wrong/);
    expect(friendlyError(null, 'load the report').headline).toBe('Could not load the report');
  });

  it('translates through t() when given, using the English text as the key', () => {
    const t = (k: string) => `[hi] ${k}`;
    const fe = friendlyError({ status: 401 }, 'save', t);
    expect(fe.lines[0]).toBe('[hi] Your session has ended. Please sign in again.');
    expect(fe.headline).toBe('[hi] Could not save');
  });
});

describe('problemText', () => {
  it('uses the server sentence when there is no translator', () => {
    expect(problemText({ field: 'a', code: 'FIELD_MIN', message: 'A cannot be less than 0.', params: { min: 0 } })).toBe('A cannot be less than 0.');
  });
  it('fills a translated template from the code and params', () => {
    const t = (k: string, o?: any) => (k === 'Rate' ? 'दर' : k === '{{label}} cannot be more than {{max}}.' ? '{{label}} {{max}} से अधिक नहीं हो सकती.' : (o?.defaultValue ?? k));
    expect(problemText({ field: 'rate', label: 'Rate', code: 'FIELD_MAX', message: 'x', params: { max: 100 } }, t)).toBe('दर 100 से अधिक नहीं हो सकती.');
  });
  it('an unknown code falls back to the server sentence', () => {
    expect(problemText({ field: 'a', code: 'SOMETHING_NEW', message: 'Server says so.' }, (k) => k)).toBe('Server says so.');
  });
});

describe('describeHttpFailure (used by the API client when the server gives no sentence)', () => {
  it('never says "HTTP 500"', () => {
    expect(describeHttpFailure(500)).toMatch(/Something went wrong on the server/);
    expect(describeHttpFailure(502)).not.toMatch(/HTTP/);
    expect(describeHttpFailure(401)).toMatch(/sign in again/);
  });
});

// ES-286: the Hindi file carries the new messages and every {{placeholder}} survives translation
import hi from '../../src/locales/hi.json';
import { PROBLEM_TEMPLATES } from '../../src/utils/friendlyError';

describe('Hindi translation of the error messages', () => {
  const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
  it.each(Object.values(PROBLEM_TEMPLATES))('"%s" is translated and keeps its placeholders', (template) => {
    const translated = (hi as Record<string, string>)[template];
    expect(translated, `missing Hindi text for ${template}`).toBeTruthy();
    expect(placeholders(translated!)).toBe(placeholders(template));
  });
  it.each([
    'Your session has ended. Please sign in again.',
    'Cannot reach the server. Check the network connection and that the server is running, then try again.',
    'Something went wrong on the server. Please try again; if it keeps happening, tell support.',
    'Please correct the following:',
  ])('sentence "%s" is translated', (s) => expect((hi as Record<string, string>)[s]).toBeTruthy());
  it('problemText uses the real Hindi template', () => {
    const t = (k: string, o?: any) => (hi as Record<string, string>)[k] ?? o?.defaultValue ?? k;
    expect(problemText({ field: 'rate', label: 'Rate', code: 'FIELD_MAX', message: 'x', params: { max: 100 } }, t)).toContain('100 से अधिक नहीं हो सकता');
  });
});
