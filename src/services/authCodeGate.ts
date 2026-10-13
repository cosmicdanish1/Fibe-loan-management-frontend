/**
 * Authenticator-code gate (ES-116).
 *
 * When an administrator switches on "needs authenticator code" for a window (Early Loan
 * Closure, Pass/Reverse Transactions, ...), the backend answers the action with
 * 403 + code AUTH_CODE_REQUIRED. This module turns that into a prompt and an automatic retry
 * carrying the code in the X-Auth-Code header, so no window needs its own code-entry UI.
 * With the switch OFF the backend never answers this way and nothing here runs.
 */
export interface AuthCodeAsk { label: string; note: string }

type Prompter = (ask: AuthCodeAsk) => Promise<string | null>;
let prompter: Prompter | null = null;

/** Registered once by <AuthCodeDialogHost/>. */
export function registerAuthCodePrompter(p: Prompter | null): void {
  prompter = p;
}

const MAX_TRIES = 5;

const isCodeAnswer = (info: any) => !!info && (info.code === 'AUTH_CODE_REQUIRED' || info.code === 'AUTH_CODE_INVALID');
const readInfo = async (r: Response) => (r.status === 403 ? await r.clone().json().catch(() => null) : null);

/**
 * If `first` is an AUTH_CODE_REQUIRED / AUTH_CODE_INVALID answer, asks the user for their code and
 * calls `send` again with the X-Auth-Code header until it is accepted, refused for another reason,
 * or the user cancels. Otherwise returns `first` untouched.
 */
export async function retryWithAuthCode(
  first: Response,
  send: (extraHeaders: Record<string, string>) => Promise<Response>,
): Promise<Response> {
  let res = first;
  let info = await readInfo(res);
  if (!isCodeAnswer(info) || !prompter) return res;

  for (let i = 0; i < MAX_TRIES; i++) {
    const code = await prompter({
      label: info.authLabel || 'this action',
      note: info.code === 'AUTH_CODE_INVALID' ? String(info.message || '') : '',
    });
    if (!code) return res; // cancelled: the caller shows the original message
    res = await send({ 'X-Auth-Code': code });
    info = await readInfo(res);
    if (!isCodeAnswer(info)) return res;
  }
  return res;
}
