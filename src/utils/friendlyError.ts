/**
 * Turns a failed API response into words a person can act on (ES-467).
 *
 * The API client (services/api.ts) returns { success:false, error, message, status, code, errors, requestId, network }.
 * `friendlyError` never shows raw technical text ("HTTP 500: Internal Server Error", "Failed to fetch", database or
 * JavaScript messages); it says what failed and what to do, and keeps the technical reference id apart so the screen can
 * show it in small grey text for support (it matches the server log line).
 */
export type ErrorKind = 'network' | 'validation' | 'session' | 'permission' | 'notfound' | 'conflict' | 'toolarge' | 'busy' | 'server' | 'other';

export interface FieldProblem { field: string; label?: string | undefined; code?: string | undefined; message: string; params?: Record<string, string | number> | undefined }

export interface ApiFailure {
  error?: string | undefined; message?: string | undefined; status?: number | undefined; code?: string | undefined;
  errors?: FieldProblem[] | undefined; requestId?: string | undefined; network?: boolean | undefined;
}

export interface FriendlyError {
  kind: ErrorKind;
  /** one short line: what failed */
  headline: string;
  /** what is wrong / what to do, one sentence per line */
  lines: string[];
  /** technical reference id for support (small grey text) */
  reference?: string | undefined;
  code?: string | undefined;
  status?: number | undefined;
  /** field name -> sentence, so a form can show the text next to the right box */
  byField: Record<string, string>;
}

export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Text only a developer can read. Never shown. */
const TECHNICAL = /^HTTP \d{3}\b|Failed to fetch|NetworkError|Load failed|Unexpected token|is not valid JSON|Cannot read propert|is not a function|is not iterable|undefined|null value in column|violates|relation "|invalid input syntax|ECONN|ETIMEDOUT|Database operation failed|Internal server error|Internal Server Error/i;

const SENTENCES = {
  network: 'Cannot reach the server. Check the network connection and that the server is running, then try again.',
  timeout: 'The server took too long to answer. Try again; if it keeps happening, check the network or tell support.',
  session: 'Your session has ended. Please sign in again.',
  permission: 'You do not have the right to do this. Ask an administrator to give you the right.',
  notfound: 'It was not found. It may have been removed, or the number is wrong.',
  conflict: 'This already exists or is in use, so it cannot be changed this way.',
  toolarge: 'The file or the data is too large.',
  busy: 'Too many requests at once. Wait a moment and try again.',
  server: 'Something went wrong on the server. Please try again; if it keeps happening, tell support.',
  other: 'Something went wrong. Please check what you entered and try again.',
  correct: 'Please correct the following:',
} as const;

/** English templates for the field problem codes the server sends (stable codes, ES-286); {{x}} are filled from params. */
export const PROBLEM_TEMPLATES: Record<string, string> = {
  FIELD_REQUIRED: '{{label}} is required.',
  FIELD_TEXT: '{{label}} must be text.',
  FIELD_NUMBER: '{{label}} must be a number.',
  FIELD_WHOLE_NUMBER: '{{label}} must be a whole number.',
  FIELD_POSITIVE: '{{label}} must be more than 0.',
  FIELD_NEGATIVE: '{{label}} must be less than 0.',
  FIELD_YES_NO: '{{label}} must be Yes or No.',
  FIELD_LIST: '{{label}} must be a list.',
  FIELD_EMAIL: '{{label}} must be a valid email address.',
  FIELD_DATE: '{{label}} must be a valid date.',
  FIELD_FORMAT: '{{label}} is not in the right format.',
  FIELD_MIN: '{{label}} cannot be less than {{min}}.',
  FIELD_MAX: '{{label}} cannot be more than {{max}}.',
  FIELD_TOO_SHORT: '{{label}} must be at least {{min}} characters.',
  FIELD_TOO_LONG: '{{label}} can be at most {{max}} characters.',
  FIELD_DECIMALS: '{{label}} can have at most {{max}} decimal places.',
  FIELD_UNKNOWN: '{{label}} is not a field this request accepts.',
};

function fill(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(vars[k] ?? ''));
}

/** One field problem as a sentence; translated through `t` when the code is known, else the server's own sentence. */
export function problemText(p: FieldProblem, t?: Translate): string {
  const template = p.code ? PROBLEM_TEMPLATES[p.code] : undefined;
  if (!template || !t) return p.message;
  const label = p.label ? t(p.label, { defaultValue: p.label }) : p.field;
  const translated = t(template, { defaultValue: template, label, ...(p.params ?? {}) });
  return fill(translated, { label, ...(p.params ?? {}) });
}

const stripReference = (text: string) => text.replace(/\s*\(reference [^)]*\)/i, '').trim();
const isTechnical = (text: string) => TECHNICAL.test(text);

export function friendlyError(res: ApiFailure | null | undefined, action?: string, t?: Translate): FriendlyError {
  const tr = (s: string) => (t ? t(s, { defaultValue: s }) : s);
  const r: ApiFailure = res ?? {};
  const status = r.status;
  const raw = stripReference(String(r.message ?? r.error ?? ''));
  const headline = action ? `${tr('Could not')} ${action}` : tr('Something went wrong');
  const byField: Record<string, string> = {};
  const base = { headline, reference: r.requestId, code: r.code, status, byField };

  // 1. cannot reach the server at all
  if (r.network || (status === undefined && /Failed to fetch|NetworkError|Load failed|Cannot reach the server/i.test(raw))) {
    return { kind: 'network', ...base, lines: [tr(SENTENCES.network)] };
  }
  if (status === undefined && /timed out|timeout/i.test(raw)) {
    return { kind: 'network', ...base, lines: [tr(SENTENCES.timeout)] };
  }

  // 2. the server told us exactly which fields are wrong
  if (Array.isArray(r.errors) && r.errors.length > 0) {
    const lines: string[] = [];
    for (const p of r.errors) {
      const text = problemText(p, t);
      if (!lines.includes(text)) lines.push(text);
      if (p.field && !byField[p.field]) byField[p.field] = text;
    }
    return { kind: 'validation', ...base, headline: tr(SENTENCES.correct), lines };
  }

  const clean = (fallbackSentence: string) => (raw && !isTechnical(raw) ? raw : tr(fallbackSentence));

  switch (true) {
    case status === 401: return { kind: 'session', ...base, lines: [tr(SENTENCES.session)] };
    case status === 403: return { kind: 'permission', ...base, lines: [clean(SENTENCES.permission)] };
    case status === 404: return { kind: 'notfound', ...base, lines: [clean(SENTENCES.notfound)] };
    case status === 409: return { kind: 'conflict', ...base, lines: [clean(SENTENCES.conflict)] };
    case status === 413: return { kind: 'toolarge', ...base, lines: [tr(SENTENCES.toolarge)] };
    case status === 429: return { kind: 'busy', ...base, lines: [tr(SENTENCES.busy)] };
    case status !== undefined && status >= 500: return { kind: 'server', ...base, lines: [clean(SENTENCES.server)] };
    case status !== undefined && status >= 400: return { kind: 'other', ...base, lines: [clean(SENTENCES.other)] };
    default: return { kind: 'other', ...base, lines: [clean(SENTENCES.other)] };
  }
}

/** The sentence the API client puts in `error`/`message` when the server could not be reached or sent no reason. */
export function describeHttpFailure(status: number, serverMessage?: string): string {
  const fe = friendlyError({ status, message: serverMessage });
  return fe.lines.join(' ');
}
export const NETWORK_MESSAGE = SENTENCES.network;
export const TIMEOUT_MESSAGE = SENTENCES.timeout;
