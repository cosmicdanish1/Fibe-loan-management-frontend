const axios = require('axios');

/**
 * Test Member Detail Ledger Print Data Verification
 * This script verifies that all data retrieved from the API is properly displayed in the print output
 */

const BASE_URL = 'http://localhost:3001/api/v1';

// Test members with known data
const TEST_MEMBERS = [
    { memberNo: '610023352', name: 'SSS MURTHY' },
    { memberNo: '610016572', name: 'SINGH DALBIR' },
    { memberNo: '610026281', name: 'SANJAY KUMAR VARMA' },
    { memberNo: '1001', name: 'Member1001 Kumar Singh' }
];

async function testMemberDetailLedgerData() {
    console.log('🔍 Testing Member Detail Ledger Print Data Verification...\n');

    for (const member of TEST_MEMBERS) {
        console.log(`\n📊 Testing Member: ${member.name} (${member.memberNo})`);
        console.log('=' .repeat(60));

        try {
            // Test API endpoint
            const response = await axios.get(`${BASE_URL}/member-ledger/detail-report`, {
                params: {
                    memberNumber: member.memberNo,
                    fromDate: '2014-11-01',
                    toDate: '2025-12-28',
                    outputType: 'screen'
                }
            });

            if (response.data.success) {
                const data = response.data.data.data || response.data.data;
                
                console.log('✅ API Response Status:', response.data.success);
                console.log('📈 Total Entries:', data.entries?.length || 0);
                console.log('💰 Total Debits:', data.totalDebits || 0);
                console.log('💰 Total Credits:', data.totalCredits || 0);
                console.log('👤 Member Name from API:', data.memberName || 'Not provided');

                if (data.entries && data.entries.length > 0) {
                    console.log('\n📋 Sample Entries (First 3):');
                    data.entries.slice(0, 3).forEach((entry, index) => {
                        console.log(`  ${index + 1}. Date: ${entry.date}`);
                        console.log(`     Account Head: ${entry.accountHead}`);
                        console.log(`     Particulars: ${entry.particulars}`);
                        console.log(`     Voucher No: ${entry.voucherNo}`);
                        console.log(`     Debit: ${entry.debit || 0}`);
                        console.log(`     Credit: ${entry.credit || 0}`);
                        console.log('     ---');
                    });

                    // Verify data integrity
                    console.log('\n🔍 Data Integrity Check:');
                    
                    // Check for required fields
                    const missingFields = [];
                    data.entries.forEach((entry, index) => {
                        if (!entry.date) missingFields.push(`Entry ${index + 1}: Missing date`);
                        if (!entry.accountHead) missingFields.push(`Entry ${index + 1}: Missing accountHead`);
                        if (!entry.particulars) missingFields.push(`Entry ${index + 1}: Missing particulars`);
                        if (!entry.voucherNo) missingFields.push(`Entry ${index + 1}: Missing voucherNo`);
                        if (entry.debit === undefined && entry.credit === undefined) {
                            missingFields.push(`Entry ${index + 1}: Missing both debit and credit`);
                        }
                    });

                    if (missingFields.length === 0) {
                        console.log('✅ All entries have required fields');
                    } else {
                        console.log('⚠️ Missing fields found:');
                        missingFields.forEach(field => console.log(`   - ${field}`));
                    }

                    // Check totals calculation
                    const calculatedDebits = data.entries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);
                    const calculatedCredits = data.entries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);
                    
                    console.log('\n🧮 Totals Verification:');
                    console.log(`   API Debits: ${data.totalDebits}`);
                    console.log(`   Calculated Debits: ${calculatedDebits.toFixed(2)}`);
                    console.log(`   API Credits: ${data.totalCredits}`);
                    console.log(`   Calculated Credits: ${calculatedCredits.toFixed(2)}`);
                    
                    if (Math.abs(data.totalDebits - calculatedDebits) < 0.01 && 
                        Math.abs(data.totalCredits - calculatedCredits) < 0.01) {
                        console.log('✅ Totals match calculated values');
                    } else {
                        console.log('⚠️ Totals do not match calculated values');
                    }

                    // Print data structure for frontend
                    console.log('\n📄 Print Data Structure:');
                    console.log('   Data available for print:');
                    console.log(`   - Member Name: ${data.memberName || member.name}`);
                    console.log(`   - Member Number: ${member.memberNo}`);
                    console.log(`   - Date Range: 01/11/2014 to 28/12/2025`);
                    console.log(`   - Transaction Count: ${data.entries.length}`);
                    console.log(`   - Total Debits: ₹ ${data.totalDebits.toFixed(2)}`);
                    console.log(`   - Total Credits: ₹ ${data.totalCredits.toFixed(2)}`);

                    // Check for potential print issues
                    console.log('\n🖨️ Print Compatibility Check:');
                    
                    // Check for long text that might cause layout issues
                    const longAccountHeads = data.entries.filter(entry => entry.accountHead && entry.accountHead.length > 25);
                    const longParticulars = data.entries.filter(entry => entry.particulars && entry.particulars.length > 30);
                    
                    if (longAccountHeads.length > 0) {
                        console.log(`   ⚠️ ${longAccountHeads.length} entries have long account heads (>25 chars)`);
                        console.log(`      Example: "${longAccountHeads[0].accountHead}"`);
                    } else {
                        console.log('   ✅ All account heads are reasonable length');
                    }
                    
                    if (longParticulars.length > 0) {
                        console.log(`   ⚠️ ${longParticulars.length} entries have long particulars (>30 chars)`);
                        console.log(`      Example: "${longParticulars[0].particulars}"`);
                    } else {
                        console.log('   ✅ All particulars are reasonable length');
                    }

                } else {
                    console.log('⚠️ No transaction entries found for this member');
                }

            } else {
                console.log('❌ API Error:', response.data.error || 'Unknown error');
            }

        } catch (error) {
            console.log('❌ Request failed:', error.message);
            if (error.response) {
                console.log('   Status:', error.response.status);
                console.log('   Data:', error.response.data);
            }
        }
    }

    // Test mock data functionality
    console.log('\n\n🧪 Testing Mock Data (Member 123)');
    console.log('=' .repeat(60));
    console.log('Mock data should include:');
    console.log('1. SAVING BANK A/C - CASH DEPOSIT - V-001 - Credit: 5000');
    console.log('2. LOAN REPAYMENT - MONTHLY INST. - V-045 - Debit: 1200');
    console.log('3. SHARE CAPITAL - SHARE PURCHASE - V-098 - Credit: 2500');
    console.log('Total Debits: 1200, Total Credits: 7500');
    console.log('Member Name: TEST USER (MOCK DATA)');

    console.log('\n\n📋 Print Verification Checklist:');
    console.log('=' .repeat(60));
    console.log('When testing print functionality, verify:');
    console.log('✓ Header: "MEMBER DETAIL LEDGER" appears');
    console.log('✓ Member info: Name and number displayed correctly');
    console.log('✓ Date range: Shows selected from/to dates');
    console.log('✓ Table headers: All 6 columns visible (Date, Account Head, Particulars, Voucher No., Debit, Credit)');
    console.log('✓ All transaction rows: Every entry from API appears in print');
    console.log('✓ Data formatting: Dates as DD/MM/YYYY, amounts with ₹ symbol');
    console.log('✓ Total row: Shows correct calculated totals');
    console.log('✓ Footer: "Printed from Banking System" appears');
    console.log('✓ Layout: No horizontal scrollbar, all columns fit on page');
    console.log('✓ Borders: Clean, professional appearance');

    console.log('\n\n🎯 To verify print data completeness:');
    console.log('1. Generate report for a member with data (e.g., 610023352)');
    console.log('2. Count entries in screen view');
    console.log('3. Click Print and count entries in print preview');
    console.log('4. Verify totals match between screen and print');
    console.log('5. Check that all columns are readable and properly aligned');
}

// Run the test
if (require.main === module) {
    testMemberDetailLedgerData().catch(console.error);
}

module.exports = { testMemberDetailLedgerData };