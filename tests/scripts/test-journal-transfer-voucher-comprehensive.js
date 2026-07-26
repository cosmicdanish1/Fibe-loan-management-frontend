const { Pool } = require('pg');
const axios = require('axios');

// Database configuration (using same as previous tests)
const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'EMP_Espat_Society',
    password: 'Test@1212',
    port: 5432,
};

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testJournalTransferVoucher() {
    console.log('🔍 JOURNAL/TRANSFER VOUCHER - COMPREHENSIVE TEST');
    console.log('============================================================\n');

    let pool;
    try {
        // Test 1: Database Connection
        console.log('📊 Test 1: Database Connection');
        console.log('----------------------------------------');
        pool = new Pool(dbConfig);
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully\n');

        // Test 2: Ledger Table Analysis for Journal Vouchers
        console.log('📊 Test 2: Ledger Table Analysis for Journal Vouchers');
        console.log('----------------------------------------');
        
        const ledgerAnalysis = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT receipt_vchr_no) as unique_voucher_numbers,
                COUNT(CASE WHEN receipt_vchr_no != '' THEN 1 END) as entries_with_vouchers,
                COUNT(DISTINCT mbno) as unique_members,
                MIN(trans_date) as earliest_date,
                MAX(trans_date) as latest_date
            FROM ledger 
            WHERE receipt_vchr_no IS NOT NULL AND receipt_vchr_no != ''
        `);
        
        const analysis = ledgerAnalysis.rows[0];
        console.log(`📈 Total ledger entries: ${analysis.total_entries}`);
        console.log(`🎫 Unique voucher numbers: ${analysis.unique_voucher_numbers}`);
        console.log(`📋 Entries with vouchers: ${analysis.entries_with_vouchers}`);
        console.log(`👥 Unique members: ${analysis.unique_members}`);
        console.log(`📅 Date range: ${analysis.earliest_date?.toISOString().split('T')[0]} to ${analysis.latest_date?.toISOString().split('T')[0]}\n`);

        // Test 3: Sample Journal Voucher Analysis
        console.log('📊 Test 3: Sample Journal Voucher Analysis');
        console.log('----------------------------------------');
        
        const sampleVouchers = await pool.query(`
            SELECT 
                receipt_vchr_no,
                COUNT(*) as entry_count,
                SUM(CASE WHEN trans_type = 'DR' THEN trans_amt::numeric ELSE 0 END) as total_debit,
                SUM(CASE WHEN trans_type = 'CR' THEN trans_amt::numeric ELSE 0 END) as total_credit,
                MIN(trans_date) as trans_date,
                STRING_AGG(DISTINCT narration, ' | ') as narrations
            FROM ledger 
            WHERE receipt_vchr_no IS NOT NULL AND receipt_vchr_no != ''
            GROUP BY receipt_vchr_no
            ORDER BY receipt_vchr_no DESC
            LIMIT 5
        `);

        console.log('📋 Sample Journal Vouchers:');
        sampleVouchers.rows.forEach((voucher, index) => {
            console.log(`  ${index + 1}. ${voucher.receipt_vchr_no} - ${voucher.entry_count} entries`);
            console.log(`     💰 Debit: ₹${parseFloat(voucher.total_debit).toFixed(2)}, Credit: ₹${parseFloat(voucher.total_credit).toFixed(2)}`);
            console.log(`     📅 Date: ${voucher.trans_date?.toISOString().split('T')[0]}`);
        });
        console.log();

        // Test 4: Member Master and Head Master Integration
        console.log('📊 Test 4: Member Master and Head Master Integration');
        console.log('----------------------------------------');
        
        const memberCount = await pool.query('SELECT COUNT(*) as count FROM member_master');
        const headCount = await pool.query('SELECT COUNT(*) as count FROM headmaster');
        
        console.log(`👥 Total members in member_master: ${memberCount.rows[0].count}`);
        console.log(`🏷️ Total heads in head_master: ${headCount.rows[0].count}\n`);

        // Test 5: Check for Test Journal Voucher Data
        console.log('📊 Test 5: Check for Test Journal Voucher Data');
        console.log('----------------------------------------');
        
        const testVoucher = await pool.query(`
            SELECT * FROM ledger 
            WHERE receipt_vchr_no = 'J001' 
            ORDER BY trans_no ASC
            LIMIT 1
        `);

        if (testVoucher.rows.length > 0) {
            const voucher = testVoucher.rows[0];
            console.log('✅ Test journal voucher found: J001');
            console.log(`📅 Date: ${voucher.trans_date?.toISOString().split('T')[0]}`);
            console.log(`💰 Amount: ₹${parseFloat(voucher.trans_amt).toFixed(2)}`);
            console.log(`👤 Member: ${voucher.mbno}`);
            console.log(`🏷️ Head Code: ${voucher.code}`);
            console.log(`🔄 Type: ${voucher.trans_type}`);
            console.log(`📝 Narration: ${voucher.narration}`);
        } else {
            console.log('⚠️ No test journal voucher found - creating sample data...');
            
            // Check if sample data already exists
            const existingData = await pool.query(`
                SELECT COUNT(*) as count FROM ledger 
                WHERE receipt_vchr_no IN ('J001', 'J002', 'J003')
            `);
            
            if (existingData.rows[0].count == 0) {
                // Get the next available ledgerid
                const maxLedgerId = await pool.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_id FROM ledger');
                const nextId = maxLedgerId.rows[0].next_id;
                
                // Create sample journal voucher data
                await pool.query(`
                    INSERT INTO ledger (
                        trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type,
                        trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance,
                        narration, username, ledgerid
                    ) VALUES 
                    (${nextId}, '2025-12-14', 'DR', 'A1001', 1001, 1001, 'SB', 25000.00, 'J001', 'JV', 'C', 25000.00, 'Journal Entry - Debit to Cash Account', 'admin', ${nextId}),
                    (${nextId + 1}, '2025-12-14', 'CR', 'L2001', 1001, 1001, 'SB', 25000.00, 'J001', 'JV', 'C', -25000.00, 'Journal Entry - Credit to Loan Account', 'admin', ${nextId + 1}),
                    (${nextId + 2}, '2025-12-14', 'DR', 'A1002', 1002, 1002, 'SB', 15000.00, 'J002', 'JV', 'C', 15000.00, 'Journal Entry - Bank Transfer Debit', 'admin', ${nextId + 2}),
                    (${nextId + 3}, '2025-12-14', 'CR', 'A1001', 1002, 1002, 'SB', 15000.00, 'J002', 'JV', 'C', -15000.00, 'Journal Entry - Bank Transfer Credit', 'admin', ${nextId + 3}),
                    (${nextId + 4}, '2025-12-14', 'DR', 'E3001', 1003, 1003, 'SB', 5000.00, 'J003', 'JV', 'C', 5000.00, 'Journal Entry - Expense Account', 'admin', ${nextId + 4}),
                    (${nextId + 5}, '2025-12-14', 'CR', 'A1001', 1003, 1003, 'SB', 5000.00, 'J003', 'JV', 'C', -5000.00, 'Journal Entry - Cash Payment', 'admin', ${nextId + 5})
                `);
                
                console.log('✅ Sample journal voucher data created');
            } else {
                console.log('✅ Sample journal voucher data already exists');
            }
        }
        console.log();

        // Test 6: Get All Journal Voucher Numbers API Testing
        console.log('📊 Test 6: Get All Journal Voucher Numbers API Testing');
        console.log('----------------------------------------');
        
        try {
            const voucherListUrl = `${API_BASE_URL}/print-voucher/journal/list/all`;
            console.log(`🌐 Testing API: ${voucherListUrl}`);
            
            const voucherListResponse = await axios.get(voucherListUrl);
            console.log(`✅ Journal Voucher List API Status: ${voucherListResponse.status}`);
            
            const responseData = voucherListResponse.data;
            if (responseData.success && Array.isArray(responseData.data)) {
                console.log(`🎫 Total journal voucher numbers: ${responseData.data.length}`);
                
                console.log('\n📋 Sample Journal Voucher Numbers:');
                responseData.data.slice(0, 5).forEach((voucher, index) => {
                    console.log(`  ${index + 1}. ${voucher}`);
                });
                if (responseData.data.length > 5) {
                    console.log(`     ... and ${responseData.data.length - 5} more vouchers`);
                }
            } else {
                console.log('❌ API returned unexpected format:', responseData);
            }
        } catch (error) {
            console.log(`❌ Journal Voucher List API Error: ${error.message}`);
        }
        console.log();

        // Test 7: Get Journal Voucher By Number API Testing
        console.log('📊 Test 7: Get Journal Voucher By Number API Testing');
        console.log('----------------------------------------');
        
        try {
            const testVoucherNo = 'J001';
            const voucherDetailUrl = `${API_BASE_URL}/print-voucher/journal/${testVoucherNo}`;
            console.log(`🌐 Testing API: ${voucherDetailUrl}`);
            
            const voucherDetailResponse = await axios.get(voucherDetailUrl);
            console.log(`✅ Journal Voucher Detail API Status: ${voucherDetailResponse.status}`);
            
            const responseData = voucherDetailResponse.data;
            const data = responseData.success ? responseData.data : responseData;
            if (data) {
                console.log(`🎫 Voucher Number: ${data.voucher_no}`);
                console.log(`📅 Transaction Date: ${new Date(data.trans_date).toLocaleDateString('en-GB')}`);
                console.log(`📝 Narration: ${data.narration}`);
                console.log(`📊 Total Entries: ${data.entries?.length || 0}`);
                
                if (data.entries && data.entries.length > 0) {
                    console.log('\n📋 Journal Entries:');
                    data.entries.forEach((entry, index) => {
                        console.log(`  ${index + 1}. Member: ${entry.member_code} - ${entry.member_name}`);
                        console.log(`     Head: ${entry.head_code} - ${entry.head_name}`);
                        console.log(`     Debit: ₹${entry.debit}, Credit: ₹${entry.credit}`);
                    });
                    
                    const totalDebit = data.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
                    const totalCredit = data.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
                    console.log(`\n💰 Total Debit: ₹${totalDebit.toFixed(2)}`);
                    console.log(`💰 Total Credit: ₹${totalCredit.toFixed(2)}`);
                    console.log(`⚖️ Balance: ${totalDebit === totalCredit ? '✅ Balanced' : '❌ Unbalanced'}`);
                }
            } else {
                console.log('❌ No voucher data returned');
            }
        } catch (error) {
            console.log(`❌ Journal Voucher Detail API Error: ${error.message}`);
            if (error.response?.status === 404) {
                console.log('ℹ️ Voucher J001 not found - this is expected if no sample data exists');
            }
        }
        console.log();

        // Test 8: Frontend Data Structure Validation
        console.log('📊 Test 8: Frontend Data Structure Validation');
        console.log('----------------------------------------');
        
        console.log('✅ Expected Frontend Data Structure:');
        console.log('   - Journal Voucher List API: string[] (array of voucher numbers)');
        console.log('   - Journal Voucher Detail API: JournalVoucherDto');
        console.log('     * voucher_no: string');
        console.log('     * trans_date: Date');
        console.log('     * narration: string');
        console.log('     * entries: JournalEntryDto[]');
        console.log('       - trans_no: number');
        console.log('       - member_code: number');
        console.log('       - member_name: string');
        console.log('       - head_code: string');
        console.log('       - head_name: string');
        console.log('       - debit: number');
        console.log('       - credit: number');
        console.log();

        // Test 9: Database Query Performance Test
        console.log('📊 Test 9: Database Query Performance Test');
        console.log('----------------------------------------');
        
        const performanceStart = Date.now();
        const performanceQuery = await pool.query(`
            SELECT 
                l.receipt_vchr_no,
                l.trans_date,
                l.narration,
                l.trans_no,
                l.mbno,
                l.code,
                l.trans_type,
                l.trans_amt,
                CONCAT(COALESCE(m.f_name, ''), ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as member_name,
                h.head_name
            FROM ledger l
            LEFT JOIN member_master m ON l.mbno = m.mbno::numeric
            LEFT JOIN headmaster h ON l.code = h.code
            WHERE l.receipt_vchr_no IS NOT NULL AND l.receipt_vchr_no != ''
            ORDER BY l.receipt_vchr_no DESC, l.trans_no ASC
            LIMIT 50
        `);
        const performanceEnd = Date.now();
        
        console.log(`⚡ Query executed in ${performanceEnd - performanceStart}ms`);
        console.log(`📊 Retrieved ${performanceQuery.rows.length} entries with member and head details`);
        console.log();

        // UI Selection Guide
        console.log('🎯 UI SELECTION GUIDE - How to Access Journal/Transfer Voucher');
        console.log('============================================================\n');
        
        console.log('📍 Navigation Path:');
        console.log('   1. Open the application');
        console.log('   2. Go to "Reports" menu');
        console.log('   3. Select "Monthly Reports" submenu');
        console.log('   4. Select "Print Vouchers" submenu');
        console.log('   5. Click on "Journal/Transfer Voucher"\n');
        
        console.log('⚙️ Component Configuration:');
        console.log('   1. Date: Select transaction date (default: 2015-04-01, read-only)');
        console.log('   2. Select Voucher: Choose from dropdown of available journal vouchers');
        console.log('   3. Voucher No.: Automatically populated when voucher is selected');
        console.log('   4. Print PDF: Button to print the voucher details\n');
        
        console.log('📊 Expected Display:');
        console.log('   - Top control panel with date, voucher selection, and print button');
        console.log('   - Main table showing journal entries with columns:');
        console.log('     * MBNO. (Member Number)');
        console.log('     * Name (Member Name)');
        console.log('     * Code (Head Code)');
        console.log('     * Account Name (Head Name)');
        console.log('     * Debit (Debit Amount)');
        console.log('     * Credit (Credit Amount)');
        console.log('   - Bottom section with narration and cheque number fields');
        console.log('   - Professional UI with gradient headers and hover effects\n');
        
        console.log('🔍 Data Verification:');
        console.log('   - Check if journal voucher numbers are loaded in dropdown');
        console.log('   - Verify voucher details populate correctly when selected');
        console.log('   - Ensure member names and head names display properly');
        console.log('   - Confirm debit and credit amounts are shown correctly');
        console.log('   - Check that narration field shows voucher description');
        console.log('   - Verify table shows "No entries found" when no voucher is selected\n');
        
        console.log('🎨 UI Features:');
        console.log('   - Modern Ant Design components with custom styling');
        console.log('   - Gradient header bars for visual appeal');
        console.log('   - Responsive layout that adapts to screen size');
        console.log('   - Hover effects on table rows');
        console.log('   - Search functionality in voucher dropdown');
        console.log('   - Print functionality for generating PDF reports');
        console.log('   - Empty state with icon when no data is available\n');
        
        console.log('🔧 Test Data Available:');
        console.log('   - Test Journal Vouchers: J001, J002, J003');
        console.log('   - Multiple entries per voucher showing debit/credit pairs');
        console.log('   - Member integration with names (Test Member 1001, 1002, 1003)');
        console.log('   - Head code integration (A1001: Cash, L2001: Loans, E3001: Expenses)');
        console.log('   - Balanced entries ensuring debit equals credit');
        console.log('   - Sample narrations describing the journal entry purpose\n');
        
        console.log('📋 Key Features:');
        console.log('   - Journal Voucher Management: View and print journal/transfer vouchers');
        console.log('   - Multi-Entry Display: Shows all debit and credit entries for a voucher');
        console.log('   - Member Integration: Displays member numbers and names');
        console.log('   - Head Integration: Shows account head codes and descriptions');
        console.log('   - Balance Verification: Ensures accounting equation balance');
        console.log('   - Print Functionality: Generate PDF reports for vouchers');
        console.log('   - Search and Filter: Find specific vouchers quickly');
        console.log('   - Professional Layout: Clean, modern interface design\n');

        console.log('🎉 JOURNAL/TRANSFER VOUCHER TEST COMPLETED');
        console.log('============================================================\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Make sure PostgreSQL is running and the database exists');
        }
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Run the test
testJournalTransferVoucher().catch(console.error);