import apiService from '../../services/api';

/**
 * ES-616: the dashboard used to fire ~16 requests at once. The browser only opens 6 connections per server, the
 * 30 s request timeout started before a request had a connection, and a few slow reports (overdue loans, cash book)
 * kept the connections busy, so cheap cards timed out without ever being sent.
 *
 * `dashApi` is `apiService` with three safeguards, used by the dashboard widgets only:
 *  - a small gate: at most MAX_ACTIVE requests run together and only one heavy report, quick calls go first, so the
 *    request timeout starts when the request really goes out;
 *  - the same read made by several cards (pending vouchers, the defaulter list) is made once and shared for a short while;
 *  - a failed read caused by a busy server or network (timeout, 5xx, 429, no answer) is retried twice with a pause.
 */
const MAX_ACTIVE = 4;
const MAX_HEAVY = 1;
const SHARE_MS = 30_000;
const RETRY_PAUSES_MS = [2000, 5000];

/** Reports that scan a lot of data: they wait behind the quick calls. */
const HEAVY = new Set(['getDefaulterList', 'getMemberBalanceRangeReport', 'getCashBookReport', 'getMonthEndLoanReport', 'getNewLoanDisbursed', 'getBackupList']);
/** Reads several cards make with the same arguments: one call, shared. */
const SHARED = new Set(['getPendingVouchers', 'getDefaulterList']);

type Job = { heavy: boolean; start: () => void };
const quick: Job[] = [];
const heavy: Job[] = [];
let active = 0;
let activeHeavy = 0;

const pump = () => {
  while (active < MAX_ACTIVE) {
    const job = quick.shift() ?? (activeHeavy < MAX_HEAVY ? heavy.shift() : undefined);
    if (!job) return;
    active++;
    if (job.heavy) activeHeavy++;
    job.start();
  }
};

const gated = <T>(isHeavy: boolean, run: () => Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    (isHeavy ? heavy : quick).push({
      heavy: isHeavy,
      start: () => {
        run().then(resolve, reject).finally(() => {
          active--;
          if (isHeavy) activeHeavy--;
          pump();
        });
      },
    });
    pump();
  });

const worthRetrying = (res: any): boolean => {
  if (!res || res.success !== false) return false;
  if (res.network) return true;
  const status = Number(res.status);
  return !status || status >= 500 || status === 429 || status === 408;
};

const withRetry = async (call: () => Promise<any>): Promise<any> => {
  let last: any;
  for (let attempt = 0; attempt <= RETRY_PAUSES_MS.length; attempt++) {
    try {
      last = await call();
      if (!worthRetrying(last)) return last;
    } catch (err) {
      last = undefined;
      if (attempt === RETRY_PAUSES_MS.length) throw err;
    }
    if (attempt < RETRY_PAUSES_MS.length) await new Promise(r => setTimeout(r, RETRY_PAUSES_MS[attempt]));
  }
  return last;
};

const shared = new Map<string, { at: number; promise: Promise<any> }>();

export const dashApi: typeof apiService = new Proxy(apiService, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value !== 'function' || typeof prop !== 'string') return value;
    return (...args: any[]) => {
      const call = () => gated(HEAVY.has(prop), () => withRetry(() => value.apply(target, args)));
      if (!SHARED.has(prop)) return call();
      const key = `${prop}:${JSON.stringify(args)}`;
      const hit = shared.get(key);
      if (hit && Date.now() - hit.at < SHARE_MS) return hit.promise;
      const promise = call();
      shared.set(key, { at: Date.now(), promise });
      // a failed read must not be handed to the next card
      promise.then(r => { if (!r || r.success === false) shared.delete(key); }, () => shared.delete(key));
      return promise;
    };
  },
});

export default dashApi;
