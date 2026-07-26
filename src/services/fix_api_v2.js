const fs = require('fs');
const path = 'f:/company/main project/Frontend/src/services/api.ts';
let content = fs.readFileSync(path, 'utf8');

// The duplication starts at line 565 in the view_file output.
// We need to find the FIRST occurrence of `async updateDepositLoanSlab` and keep it,
// but delete everything from the SECOND occurrence onwards until the end of the class.

const methodSignature = `async updateDepositLoanSlab(id: number, slabData: Partial<Omit<DepositLoanSlabData, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<DepositLoanSlabData>> {`;

const firstIdx = content.indexOf(methodSignature);
if (firstIdx !== -1) {
    const secondIdx = content.indexOf(methodSignature, firstIdx + 1);

    if (secondIdx !== -1) {
        console.log('Found duplicate starting at index:', secondIdx);

        // We want to keep content up to secondIdx, but we need to be careful.
        // The previous replace_file_content appended a huge block starting from `updateDepositLoanSlab`.
        // So we can just cut off at secondIdx.

        // However, we need to make sure we append the NEW methods that were supposed to be added.
        // The new methods were: getAllJournalVoucherNos, getJournalVoucherByNo.
        // And we need to close the class.

        let newContent = content.substring(0, secondIdx);

        // Now append the missing methods and close the class
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
        console.log('No duplicate found (second occurrence missing)');
    }
} else {
    console.log('Method signature not found');
}
