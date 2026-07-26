const fs = require('fs');
const path = 'f:/company/main project/Frontend/src/services/api.ts';
let content = fs.readFileSync(path, 'utf8');

// Remove duplicates if any
const duplicateStart = `  async updateDepositLoanSlab(id: number, slabData: Partial<Omit<DepositLoanSlabData, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<DepositLoanSlabData>> {`;
const idx = content.indexOf(duplicateStart);
if (idx !== -1) {
    const secondIdx = content.indexOf(duplicateStart, idx + 1);
    if (secondIdx !== -1) {
        // Found duplicate, truncate file before the second occurrence
        // But wait, the previous edit appended a huge block.
        // We should find where the duplication starts.
        // The duplication likely started after `getGeneralLedgerHeadMasters`

        const marker = `  async getGeneralLedgerHeadMasters(): Promise<ApiResponse> {
    return this.request('/general-ledger/head-masters');
  }`;

        const markerIdx = content.indexOf(marker);
        if (markerIdx !== -1) {
            // Find the end of this method
            const endOfMethod = content.indexOf('}', markerIdx) + 1;

            // Keep everything up to endOfMethod
            let newContent = content.substring(0, endOfMethod);

            // Append the new methods only once
            newContent += `

  // Print Voucher methods
  async getVoucherByNo(voucherNo: string): Promise<ApiResponse> {
    return this.request(\`/print-voucher/\${voucherNo}\`);
  }

  async getAllVoucherNos(): Promise<ApiResponse<string[]>> {
    return this.request('/print-voucher/list/all');
  }

  async getAllJournalVoucherNos(): Promise<ApiResponse<string[]>> {
    return this.request('/print-voucher/journal/list/all');
  }

  async getJournalVoucherByNo(voucherNo: string): Promise<ApiResponse> {
    return this.request(\`/print-voucher/journal/\${voucherNo}\`);
  }
}

export const apiService = new ApiService();
export default apiService;`;

            fs.writeFileSync(path, newContent, 'utf8');
            console.log('Success');
        } else {
            console.log('Marker not found');
        }
    } else {
        console.log('No duplicate found');
    }
} else {
    console.log('Start not found');
}
