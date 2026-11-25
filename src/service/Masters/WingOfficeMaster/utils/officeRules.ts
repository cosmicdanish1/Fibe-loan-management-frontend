// Rules of the Wing / Office Master window (legacy: Office Master and Wing Master). Pure functions, no React.

export const WING_CODE_MAX = 6;
export const WING_NAME_MAX = 45;
export const CITY_MAX = 20;
export const STATE_MESSAGE = 'Invalid State. Use 1 (In State) or 0 (Out State).';

/** The legacy accepts only 1 (In State) or 0 (Out State) for a wing. */
export function isValidState(state: unknown): boolean {
  return String(state ?? '').trim() === '0' || String(state ?? '').trim() === '1';
}

/** The state as shown on the screen: the server sends a number, an old record may send text; anything else is In State. */
export function stateText(state: unknown): '0' | '1' {
  return String(state ?? '').trim() === '0' ? '0' : '1';
}

/** Branch No: blank means a new branch (the server gives the number); otherwise a whole number of 1 or more. */
export function parseBranchNo(text: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = String(text ?? '').trim();
  if (t === '') return { ok: true, value: null };
  if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > 2147483647) {
    return { ok: false, message: 'Branch No must be a whole number of 1 or more. Leave it blank for a new branch.' };
  }
  return { ok: true, value: Number(t) };
}

export interface OfficeForm { branchNo: string; name: string; wingId: string; divisionNo: string; address: string; city: string }

/** Problems with the office form as plain messages (empty = fine). */
export function officeProblems(f: OfficeForm): string[] {
  const out: string[] = [];
  const b = parseBranchNo(f.branchNo);
  if (!b.ok) out.push(b.message);
  if (!f.name.trim()) out.push('Office name is required.');
  if (!f.wingId.trim()) out.push('Division / RO is required. Choose a wing (use the "..." button to add one).');
  if (f.city.trim().length > CITY_MAX) out.push(`City can have at most ${CITY_MAX} characters.`);
  if (f.divisionNo.trim() !== '' && !/^\d+$/.test(f.divisionNo.trim())) out.push('Division No must be a number.');
  return out;
}

/** What is sent to the server: a blank Branch No is left out (new branch), a blank Division No too (the server uses the branch number). */
export function buildOfficePayload(f: OfficeForm): Record<string, unknown> {
  const b = parseBranchNo(f.branchNo);
  const payload: Record<string, unknown> = {
    officeName: f.name.trim(),
    wingId: f.wingId.trim(),
    address: f.address.trim(),
    city: f.city.trim(),
  };
  if (b.ok && b.value !== null) payload.officeId = b.value;
  if (f.divisionNo.trim() !== '') payload.division = Number(f.divisionNo.trim());
  return payload;
}

/** "1 - BHILAI": how a wing is listed in the Division / RO box. */
export function wingLabel(w: { wingId?: string; wingName?: string }): string {
  const code = String(w.wingId ?? '').trim();
  const name = String(w.wingName ?? '').trim();
  return name ? `${name} (${code})` : code;
}

/** The sentence added to the saved message when the office moved to another wing. */
export function movedText(count: unknown): string {
  const n = Number(count) || 0;
  return n > 0 ? `${n} active member${n === 1 ? '' : 's'} of this office moved to the new wing.` : '';
}
