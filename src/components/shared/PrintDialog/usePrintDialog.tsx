import { useCallback, useState } from 'react';
import { Modal, Select, InputNumber, message } from 'antd';
import { Printer } from 'lucide-react';

interface PrinterInfo {
    name: string;
    displayName: string;
    isDefault: boolean;
}

/**
 * Replaces window.print() with a custom printer picker that calls
 * electronAPI.printWindowSilent() directly — window.print() opens Windows'
 * native print dialog, whose preview pane depends on the selected printer's
 * driver class and shows "This app doesn't support print preview" for many
 * generic/IPP drivers. That's a Windows limitation, not fixable once shown,
 * and hits different users on different printers unpredictably. Never
 * showing that dialog avoids it entirely, for every printer.
 */
export function usePrintDialog() {
    const [open, setOpen] = useState(false);
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string | undefined>();
    const [copies, setCopies] = useState(1);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);

    const openPrintDialog = useCallback(async () => {
        setOpen(true);
        setLoading(true);
        try {
            const list = await (window as any).electronAPI?.getPrinters?.();
            const printerList: PrinterInfo[] = Array.isArray(list) ? list : [];
            setPrinters(printerList);
            const preferred = printerList.find(p => p.isDefault) || printerList[0];
            setSelectedPrinter(preferred?.name);
        } catch {
            message.error('Could not load printers.');
        } finally {
            setLoading(false);
        }
    }, []);

    const closePrintDialog = useCallback(() => setOpen(false), []);

    const confirmPrint = useCallback(async () => {
        if (!selectedPrinter) {
            message.error('Please select a printer.');
            return;
        }
        setPrinting(true);
        // Close the picker BEFORE printing, not after — the print job
        // captures whatever's on screen at that moment, and this dialog
        // itself (with its dark overlay) would otherwise end up in the
        // printed output. The short pause lets React actually remove it
        // from the DOM before the print snapshot is taken.
        setOpen(false);
        await new Promise(resolve => setTimeout(resolve, 120));
        try {
            const result = await (window as any).electronAPI?.printWindowSilent?.({
                deviceName: selectedPrinter,
                copies,
            });
            if (result?.success) {
                message.success('Sent to printer.');
            } else {
                message.error(result?.error || 'Print failed.');
            }
        } catch (err: any) {
            message.error(err?.message || 'Print failed.');
        } finally {
            setPrinting(false);
        }
    }, [selectedPrinter, copies]);

    const PrintDialog = (
        <Modal
            title={
                <span className="flex items-center gap-2">
                    <Printer size={14} /> Print
                </span>
            }
            open={open}
            onCancel={closePrintDialog}
            onOk={confirmPrint}
            okText="Print"
            confirmLoading={printing}
            okButtonProps={{ disabled: !selectedPrinter }}
            destroyOnClose
        >
            <div className="space-y-3 py-2">
                <div>
                    <label className="block fz-label font-medium mb-1">Printer</label>
                    <Select
                        className="w-full"
                        loading={loading}
                        value={selectedPrinter}
                        onChange={setSelectedPrinter}
                        options={printers.map(p => ({ value: p.name, label: p.displayName || p.name }))}
                        placeholder="Select a printer"
                        notFoundContent={loading ? 'Loading printers...' : 'No printers found'}
                    />
                </div>
                <div>
                    <label className="block fz-label font-medium mb-1">Copies</label>
                    <InputNumber
                        min={1}
                        max={99}
                        value={copies}
                        onChange={(v) => setCopies(v || 1)}
                        className="w-full"
                    />
                </div>
            </div>
        </Modal>
    );

    return { openPrintDialog, closePrintDialog, PrintDialog };
}
