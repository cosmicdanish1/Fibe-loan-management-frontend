// Day End > Date settings, the Day End tab bar, and the Loan Application date field.
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const { api, dialog } = vi.hoisted(() => ({
  api: {
    getDatePolicy: vi.fn(), saveDatePolicy: vi.fn(), exportDatePolicy: vi.fn(),
    previewDatePolicyImport: vi.fn(), importDatePolicy: vi.fn(), getDatePolicyHistory: vi.fn(),
  },
  dialog: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('@/utils/dialog', () => ({ showDialog4: dialog, showDialog3: dialog }));

import DateSettings from '../../../src/service/Administration/DayEnd/components/DateSettings';
import FormField from '../../../src/service/Administration/loan/Loan Application/components/tabs/FormField';

const ROWS = [
  { key: 'RECEIPT_PAYMENT', label: 'Receipt (Receipt / General / Demand)', area: 'Receipt & Payment', kind: 'posts', wired: true, mode: 'WORKING', changedBy: null, changedAt: null },
  { key: 'LOAN_APP', label: 'Loan Application (application date)', area: 'Loan', kind: 'stores', wired: true, mode: 'SYSTEM', changedBy: 'admin', changedAt: '2026-11-23T10:00:00.000Z' },
  { key: 'LOAN_PAYMENT', label: 'Loan Payment (disbursement)', area: 'Loan', kind: 'posts', wired: false, mode: 'WORKING', changedBy: null, changedAt: null },
];

const seg = (key: string) => within(screen.getByTestId(`row-${key}`)).getAllByRole('radio');
const selected = (key: string) => seg(key).find((b) => b.getAttribute('aria-checked') === 'true')!.textContent;

describe('Day End > Date settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialog.mockResolvedValue(undefined);
    api.getDatePolicy.mockResolvedValue({ success: true, data: { windows: ROWS } });
    api.saveDatePolicy.mockResolvedValue({ success: true, data: { changed: 1 } });
    api.getDatePolicyHistory.mockResolvedValue({ success: true, data: { history: [
      { windowKey: 'LOAN_APP', from: 'WORKING', to: 'SYSTEM', changedBy: 'admin', changedAt: '2026-11-23T10:00:00.000Z', source: 'screen' },
    ] } });
  });

  it('lists every window by area with the mode saved for it (working date by default)', async () => {
    render(<DateSettings />);
    expect(await screen.findByText('Receipt (Receipt / General / Demand)')).toBeInTheDocument();
    expect(screen.getByText('Receipt & Payment')).toBeInTheDocument();
    expect(screen.getByText('Loan')).toBeInTheDocument();
    expect(selected('RECEIPT_PAYMENT')).toBe('Working date');
    expect(selected('LOAN_APP')).toBe('System date');
    expect(screen.getByText(/^admin, 23 Nov 2026/)).toBeInTheDocument();
  });

  it('says plainly that the default is the working date and warns about mixing dates', async () => {
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    expect(screen.getByText(/By default every window dates its entries on the Day-End working date/)).toBeInTheDocument();
    expect(screen.getByText(/mixing the two can make the day book and cash book disagree/)).toBeInTheDocument();
    expect(screen.getByText(/window\(s\) on System date/)).toBeInTheDocument();
  });

  it('a window that is not connected yet cannot be switched and says so', async () => {
    render(<DateSettings />);
    await screen.findByText('Loan Payment (disbursement)');
    for (const b of seg('LOAN_PAYMENT')) expect(b).toBeDisabled();
    expect(within(screen.getByTestId('row-LOAN_PAYMENT')).getByText('Not connected yet')).toBeInTheDocument();
    expect(within(screen.getByTestId('row-RECEIPT_PAYMENT')).getByText('Connected')).toBeInTheDocument();
  });

  it('choosing a mode marks the window unsaved and enables Save and Discard', async () => {
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled();
    fireEvent.click(seg('RECEIPT_PAYMENT')[1]!);
    expect(selected('RECEIPT_PAYMENT')).toBe('System date');
    expect(within(screen.getByTestId('row-RECEIPT_PAYMENT')).getByText('unsaved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save changes \(1\)/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
  });

  it('choosing the saved mode again is not a change', async () => {
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    fireEvent.click(seg('RECEIPT_PAYMENT')[1]!);
    fireEvent.click(seg('RECEIPT_PAYMENT')[0]!);
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled();
  });

  it('Save sends only the changed windows, then reloads', async () => {
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    fireEvent.click(seg('RECEIPT_PAYMENT')[1]!);     // WORKING -> SYSTEM
    fireEvent.click(seg('LOAN_APP')[0]!);            // SYSTEM -> WORKING
    fireEvent.click(screen.getByRole('button', { name: /Save changes \(2\)/ }));
    await waitFor(() => expect(api.saveDatePolicy).toHaveBeenCalledTimes(1));
    expect(api.saveDatePolicy).toHaveBeenCalledWith([
      { windowKey: 'RECEIPT_PAYMENT', mode: 'SYSTEM' }, { windowKey: 'LOAN_APP', mode: 'WORKING' },
    ]);
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('info', 'electron-react-ts', 'Date settings saved', '2 window(s) saved.'));
    expect(api.getDatePolicy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('a refused save says why and keeps the unsaved choices', async () => {
    api.saveDatePolicy.mockResolvedValue({ success: false, message: 'Unknown window "X".' });
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    fireEvent.click(seg('RECEIPT_PAYMENT')[1]!);
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'electron-react-ts', 'Date settings not saved', 'Unknown window "X".'));
    expect(selected('RECEIPT_PAYMENT')).toBe('System date');
  });

  it('Discard puts every choice back', async () => {
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    fireEvent.click(seg('RECEIPT_PAYMENT')[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(selected('RECEIPT_PAYMENT')).toBe('Working date');
    expect(api.saveDatePolicy).not.toHaveBeenCalled();
  });

  it('search and the filter narrow the list', async () => {
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    fireEvent.change(screen.getByLabelText('Search windows'), { target: { value: 'loan pay' } });
    expect(screen.queryByText('Receipt (Receipt / General / Demand)')).not.toBeInTheDocument();
    expect(screen.getByText('Loan Payment (disbursement)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search windows'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'system' } });
    expect(screen.queryByText('Loan Payment (disbursement)')).not.toBeInTheDocument();
    expect(screen.getByText('Loan Application (application date)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'stores' } });
    expect(screen.queryByText('Receipt (Receipt / General / Demand)')).not.toBeInTheDocument();
  });

  it('Export downloads the settings as a JSON file', async () => {
    api.exportDatePolicy.mockResolvedValue({ success: true, data: { format: 'espat-date-policy', version: 1, windows: { LOAN_APP: 'SYSTEM' } } });
    const created: Blob[] = [];
    (URL as any).createObjectURL = vi.fn((b: Blob) => { created.push(b); return 'blob:x'; });
    (URL as any).revokeObjectURL = vi.fn();
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    fireEvent.click(screen.getByRole('button', { name: /Export/ }));
    await waitFor(() => expect(created).toHaveLength(1));
    const text: string = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsText(created[0]!); });
    expect(JSON.parse(text)).toMatchObject({ format: 'espat-date-policy', windows: { LOAN_APP: 'SYSTEM' } });
  });

  it('Import shows what the file would change and applies it only after Apply', async () => {
    api.previewDatePolicyImport.mockResolvedValue({ success: true, data: { willChange: [{ windowKey: 'RECEIPT_PAYMENT', label: 'Receipt (Receipt / General / Demand)', from: 'WORKING', to: 'SYSTEM' }], unchanged: 1 } });
    api.importDatePolicy.mockResolvedValue({ success: true, data: { changed: 1 } });
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    const file = new File([JSON.stringify({ format: 'espat-date-policy', version: 1, windows: { RECEIPT_PAYMENT: 'SYSTEM' } })], 'd.json', { type: 'application/json' });
    fireEvent.change(screen.getByTestId('date-policy-file'), { target: { files: [file] } });
    expect(await screen.findByText(/This file would change/)).toBeInTheDocument();
    expect(api.importDatePolicy).not.toHaveBeenCalled();           // preview writes nothing
    fireEvent.click(screen.getByRole('button', { name: 'Apply file' }));
    await waitFor(() => expect(api.importDatePolicy).toHaveBeenCalledTimes(1));
    expect(api.importDatePolicy.mock.calls[0][0]).toMatchObject({ format: 'espat-date-policy' });
  });

  it('a file that is not JSON, or that the server refuses, is rejected with a message', async () => {
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    fireEvent.change(screen.getByTestId('date-policy-file'), { target: { files: [new File(['not json'], 'x.json')] } });
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'electron-react-ts', 'File not accepted', 'This is not a valid JSON file.'));
    api.previewDatePolicyImport.mockResolvedValue({ success: false, message: 'Unknown window "NOPE".' });
    fireEvent.change(screen.getByTestId('date-policy-file'), { target: { files: [new File(['{"a":1}'], 'y.json')] } });
    await waitFor(() => expect(dialog).toHaveBeenCalledWith('error', 'electron-react-ts', 'File not accepted', 'Unknown window "NOPE".'));
    expect(api.importDatePolicy).not.toHaveBeenCalled();
  });

  it('a file that matches the current settings says nothing would change and cannot be applied', async () => {
    api.previewDatePolicyImport.mockResolvedValue({ success: true, data: { willChange: [], unchanged: 3 } });
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    fireEvent.change(screen.getByTestId('date-policy-file'), { target: { files: [new File(['{"a":1}'], 'z.json')] } });
    expect(await screen.findByText(/Nothing would change/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply file' })).toBeDisabled();
  });

  it('shows who changed what in the history, loaded only when asked', async () => {
    render(<DateSettings />);
    await screen.findByText('Receipt (Receipt / General / Demand)');
    expect(api.getDatePolicyHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Show change history/ }));
    await waitFor(() => expect(api.getDatePolicyHistory).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Screen')).toBeInTheDocument();
  });

  it('a load failure shows the message and Retry loads again', async () => {
    api.getDatePolicy.mockResolvedValueOnce({ success: false, message: 'Forbidden' });
    render(<DateSettings />);
    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Receipt (Receipt / General / Demand)')).toBeInTheDocument();
  });
});

describe('Loan Application: the application date field', () => {
  it('a read-only date field can not be edited', () => {
    render(<FormField label="Appl Date" name="applDate" type="date" value="2026-11-14" onChange={vi.fn()} readOnly />);
    const input = document.getElementById('applDate') as HTMLInputElement;
    expect(input).toHaveValue('2026-11-14');
    expect(input).toBeDisabled();
  });
  it('a normal date field is still editable', () => {
    const onChange = vi.fn();
    render(<FormField label="Date" name="d" type="date" value="2026-11-14" onChange={onChange} />);
    const input = document.getElementById('d') as HTMLInputElement;
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: '2026-11-15' } });
    expect(onChange).toHaveBeenCalledWith('2026-11-15');
  });
});
