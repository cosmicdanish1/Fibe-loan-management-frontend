// The one password rule of the app (the server applies the same, ES-660): 8 to 64 characters with an uppercase letter,
// a lowercase letter and a number, and it must not start with a bcrypt marker ($2a$, $2b$, $2y$), which the server
// refuses (ES-654). The 64 maximum is there because only the first 72 bytes of a password are ever used (ES-657).
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

export type PasswordProblem = 'short' | 'long' | 'upper' | 'lower' | 'digit' | 'hashlike';

export function passwordProblems(password: string): PasswordProblem[] {
  const out: PasswordProblem[] = [];
  if (password.length < PASSWORD_MIN) out.push('short');
  if (password.length > PASSWORD_MAX) out.push('long');
  if (!/[A-Z]/.test(password)) out.push('upper');
  if (!/[a-z]/.test(password)) out.push('lower');
  if (!/\d/.test(password)) out.push('digit');
  if (/^\$2[aby]\$/.test(password)) out.push('hashlike');
  return out;
}
