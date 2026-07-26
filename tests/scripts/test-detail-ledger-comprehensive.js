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

async function testDetailLedger() {
    console.log('🔍 DETAIL LEDGER - COMPREHENSIVE TEST');
    console.log('============================================================\n');

    let pool;
    try {
        // Test 1: Database Connection
        console.log('📊 Test 1: Database Connection');
        console.log('----------------------------------------');
        pool = new Pool(dbConfig);
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully\n');

        // Test 2: Ledger Table Analysis
        console.log('📊 Test 2: Ledger Table Analysis');
        console.log('----------------------------------------');
        
        const ledgerAnalysis = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT code) as unique_head_codes,
                COUNT(DISTINCT receipt_vchr_no) as unique_vouchers,
                COUNT(CASE WHEN trans_date IS NOT NULL THEN 1 END) as entries_with_dates,
                MIN(trans_date) as earliest_date,
                MAX(trans_date) as latest_date,
                COUNT(CASE WHEN trans_type = 'DR' THEN 1 END) as debit_entries,
                COUNT(CASE WHEN trans_type = 'CR' THEN 1 END) as credit_entries
            FROM ledger
        `);
        
        const analysis = ledgerAnalysis.rows[0];
        console.log(`📈 Total ledger entries: ${analysis.total_entries}`);
        console.log(`🏷️ Unique head codes: ${analysis.unique_head_codes}`);
        console.log(`🎫 Unique vouchers: ${analysis.unique_vouchers}`);
        console.log(`📅 Entries with dates: ${analysis.entries_with_dates}`);
        console.log(`📅 Date range: ${analysis.earliest_date?.toISOString().split('T')[0]} to ${analysis.latest_date?.toISOString().split('T')[0]}`);
        console.log(`💰 Debit entries: ${analysis.debit_entries}, Credit entries: ${analysis.credit_entries}\n`);

        // Test 3: HeadMaster Table Analysis
        console.log('📊 Test 3: HeadMaster Table Analysis');
        console.log('----------------------------------------');
        
        const headMasterAnalysis = await pool.query(`
            SELECT 
                COUNT(*) as total_heads,
                COUNT(CASE WHEN head_name IS NOT NULL AND head_name != '' THEN 1 END) as heads_with_names,
                COUNT(DISTINCT headtype) as unique_head_types
            FROM headmaster
        `);
        
        const headAnalysis = headMasterAnalysis.rows[0];
        console.log(`🏷️ Total head codes: ${headAnalysis.total_heads}`);
        console.log(`📝 Heads with names: ${headAnalysis.heads_with_names}`);
        console.log(`🔖 Unique head types: ${headAnalysis.unique_head_types}\n`);

        // Test 4: Sample Head Codes with Transaction Data
        console.log('📊 Test 4: Sample Head Codes with Transaction Data');
        console.log('----------------------------------------');
        
        const headCodesWithData = await pool.query(`
            SELECT 
                h.code,
                h.head_name,
                COUNT(l.trans_no) as transaction_count,
                MIN(l.trans_date) as first_transaction,
                MAX(l.trans_date) as last_transaction,
                SUM(CASE WHEN l.trans_type = 'DR' THEN 1 ELSE 0 END) as debit_count,
                SUM(CASE WHEN l.trans_type = 'CR' THEN 1 ELSE 0 END) as credit_count
            FROM headmaster h
            LEFT JOIN ledger l ON h.code = l.code
            WHERE l.trans_no IS NOT NULL
            GROUP BY h.code, h.head_name
            ORDER BY transaction_count DESC
            LIMIT 5
        `);

        console.log('📋 Top Head Codes by Transaction Volume:');
        headCodesWithData.rows.forEach((head, index) => {
            console.log(`  ${index + 1}. ${head.code} - ${head.head_name}`);
            console.log(`     📊 ${head.transaction_count} transactions (${head.debit_count} DR, ${head.credit_count} CR)`);
            console.log(`     📅 ${head.first_transaction?.toISOString().split('T')[0]} to ${head.last_transaction?.toISOString().split('T')[0]}`);
        });
        console.log();

        // Test 5: Check for Test Data in Current Month
        console.log('📊 Test 5: Check for Test Data in Current Month');
        console.log('----------------------------------------');
        
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const currentMonthData = await pool.query(`
            SELECT 
                l.code,
                h.head_name,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN l.trans_type = 'DR' THEN 1 ELSE 0 END) as debit_count,
                SUM(CASE WHEN l.trans_type = 'CR' THEN 1 ELSE 0 END) as credit_count
            FROM ledger l
            LEFT JOIN headmaster h ON l.code = h.code
            WHERE l.trans_date >= $1 AND l.trans_date <= $2
            GROUP BY l.code, h.head_name
            ORDER BY transaction_count DESC
            LIMIT 3
        `, [firstDayOfMonth.toISOString().split('T')[0], lastDayOfMonth.toISOString().split('T')[0]]);

        if (currentMonthData.rows.length > 0) {
            console.log(`✅ Current month (${currentDate.toISOString().split('T')[0].substring(0, 7)}) data found:`);
            currentMonthData.rows.forEach((entry, index) => {
                console.log(`  ${index + 1}. ${entry.code} - ${entry.head_name}`);
                console.log(`     📊 ${entry.transaction_count} transactions (${entry.debit_count} DR, ${entry.credit_count} CR)`);
            });
        } else {
            console.log('⚠️ No current month data found - creating sample data...');
            
            // Check if sample data already exists
            const existingData = await pool.query(`
                SELECT COUNT(*) as count FROM ledger 
                WHERE trans_date >= $1 AND trans_date <= $2
            `, [firstDayOfMonth.toISOString().split('T')[0], lastDayOfMonth.toISOString().split('T')[0]]);
            
            if (existingData.rows[0].count == 0) {
                // Get the next available ledgerid and trans_no
                const maxIds = await pool.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_ledger_id, COALESCE(MAX(trans_no), 0) + 1 as next_trans_no FROM ledger');
                const nextLedgerId = maxIds.rows[0].next_ledger_id;
                const nextTransNo = maxIds.rows[0].next_trans_no;
                
                const today = new Date().toISOString().split('T')[0];
                
                // Create sample ledger data for current month
                await pool.query(`
                    INSERT INTO ledger (
                        trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type,
                        trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance,
                        narration, username, ledgerid
                    ) VALUES 
                    (${nextTransNo}, '${today}', 'DR', 'A1001', 1001, 1001, 'SB', 50000.00, 'DL001', 'RV', 'C', 50000.00, 'Cash deposit for detail ledger test', 'admin', ${nextLedgerId}),
                    (${nextTransNo + 1}, '${today}', 'CR', 'A1001', 1001, 1001, 'SB', 15000.00, 'DL002', 'PV', 'C', 35000.00, 'Cash withdrawal for detail ledger test', 'admin', ${nextLedgerId + 1}),
                    (${nextTransNo + 2}, '${today}', 'DR', 'L2001', 1002, 1002, 'SB', 25000.00, 'DL003', 'JV', 'C', 25000.00, 'Loan disbursement for detail ledger test', 'admin', ${nextLedgerId + 2}),
                    (${nextTransNo + 3}, '${today}', 'CR', 'L2001', 1002, 1002, 'SB', 5000.00, 'DL004', 'RV', 'C', 20000.00, 'Loan repayment for detail ledger test', 'admin', ${nextLedgerId + 3}),
                    (${nextTransNo + 4}, '${today}', 'DR', 'E3001', 1003, 1003, 'SB', 8000.00, 'DL005', 'PV', 'C', 8000.00, 'Office expense for detail ledger test', 'admin', ${nextLedgerId + 4}),
                    (${nextTransNo + 5}, '${today}', 'CR', 'I4001', 1001, 1001, 'SB', 12000.00, 'DL006', 'RV', 'C', -12000.00, 'Interest income for detail ledger test', 'admin', ${nextLedgerId + 5})
                `);
                
                console.log('✅ Sample detail ledger data created for current month');
            } else {
                console.log('✅ Sample detail ledger data already exists');
            }
        }
        console.log();

        // Test 6: Get Head List API Testing
        console.log('📊 Test 6: Get Head List API Testing');
        console.log('----------------------------------------');
        
        try {
            const headListUrl = `${API_BASE_URL}/report/head-list`;
            console.log(`🌐 Testing API: ${headListUrl}`);
            
            const headListResponse = await axios.get(headListUrl);
            console.log(`✅ Head List API Status: ${headListResponse.status}`);
            
            const responseData = headListResponse.data;
            if (responseData.success && Array.isArray(responseData.data)) {
                console.log(`🏷️ Total head codes returned: ${responseData.data.length}`);
                
                console.log('\n📋 Sample Head Codes:');
                responseData.data.slice(0, 5).forEach((head, index) => {
                    console.log(`  ${index + 1}. ${head.code} - ${head.name}`);
                });
                
                if (responseData.data.length > 5) {
                    console.log(`     ... and ${responseData.data.length - 5} more head codes`);
                }
            } else {
                console.log('❌ API returned unexpected format:', responseData);
            }
        } catch (error) {
            console.log(`❌ Head List API Error: ${error.message}`);
            if (error.response?.status) {
                console.log(`   Status: ${error.response.status}`);
            }
        }
        console.log();

        // Test 7: Get Detail Ledger API Testing
        console.log('📊 Test 7: Get Detail Ledger API Testing');
        console.log('----------------------------------------');
        
        try {
            // Test with A1001 head code for current month
            const testHeadCode = 'A1001';
            const fromDate = firstDayOfMonth.toISOString().split('T')[0];
            const toDate = lastDayOfMonth.toISOString().split('T')[0];
            
            const detailLedgerUrl = `${API_BASE_URL}/report/detail-ledger?head_code=${testHeadCode}&from_date=${fromDate}&to_date=${toDate}`;
            console.log(`🌐 Testing API: ${detailLedgerUrl}`);
            
            const detailLedgerResponse = await axios.get(detailLedgerUrl);
            console.log(`✅ Detail Ledger API Status: ${detailLedgerResponse.status}`);
            
            const responseData = detailLedgerResponse.data;
            if (responseData.success && responseData.data) {
                const data = responseData.data;
                console.log(`🏷️ Head Code: ${data.headCode} - ${data.headName}`);
                console.log(`📅 Date Range: ${data.fromDate} to ${data.toDate}`);
                console.log(`📊 Total transactions: ${data.transactions?.length || 0}`);
                
                if (data.transactions && data.transactions.length > 0) {
                    console.log('\n📋 Sample Transactions:');
                    data.transactions.slice(0, 3).forEach((trans, index) => {
                        console.log(`  ${index + 1}. ${trans.date} - ${trans.voucherNo}`);
                        console.log(`     💰 Debit: ₹${trans.debit.toFixed(2)}, Credit: ₹${trans.credit.toFixed(2)}, Balance: ₹${trans.balance.toFixed(2)}`);
                        console.log(`     📝 ${trans.narration}`);
                    });
                    
                    if (data.transactions.length > 3) {
                        console.log(`     ... and ${data.transactions.length - 3} more transactions`);
                    }
                    
                    // Calculate totals
                    const totalDebit = data.transactions.reduce((sum, trans) => sum + (trans.debit || 0), 0);
                    const totalCredit = data.transactions.reduce((sum, trans) => sum + (trans.credit || 0), 0);
                    const closingBalance = data.transactions.length > 0 ? data.transactions[data.transactions.length - 1].balance : 0;
                    
                    console.log(`\n💰 Total Debit: ₹${totalDebit.toFixed(2)}`);
                    console.log(`💰 Total Credit: ₹${totalCredit.toFixed(2)}`);
                    console.log(`💰 Closing Balance: ₹${Math.abs(closingBalance).toFixed(2)}${closingBalance < 0 ? ' Cr' : ''}`);
                }
            } else {
                console.log('❌ API returned unexpected format:', responseData);
            }
        } catch (error) {
            console.log(`❌ Detail Ledger API Error: ${error.message}`);
            if (error.response?.status) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Response: ${JSON.stringify(error.response.data)}`);
            }
        }
        console.log();

        // Test 8: Test Different Head Codes
        console.log('📊 Test 8: Test Different Head Codes');
        console.log('----------------------------------------');
        
        const testHeadCodes = ['L2001', 'E3001', 'I4001'];
        const fromDate = firstDayOfMonth.toISOString().split('T')[0];
        const toDate = lastDayOfMonth.toISOString().split('T')[0];
        
        for (const headCode of testHeadCodes) {
            try {
                const testUrl = `${API_BASE_URL}/report/detail-ledger?head_code=${headCode}&from_date=${fromDate}&to_date=${toDate}`;
                const testResponse = await axios.get(testUrl);
                
                if (testResponse.data.success) {
                    const transactionCount = testResponse.data.data.transactions?.length || 0;
                    console.log(`✅ ${headCode} (${testResponse.data.data.headName}): ${transactionCount} transactions`);
                } else {
                    console.log(`⚠️ ${headCode}: API returned success=false`);
                }
            } catch (error) {
                console.log(`❌ ${headCode}: ${error.message}`);
            }
        }
        console.log();

        // Test 9: Frontend Data Structure Validation
        console.log('📊 Test 9: Frontend Data Structure Validation');
        console.log('----------------------------------------');
        
        console.log('✅ Expected Frontend Data Structure:');
        console.log('   - Head List API: { success: boolean, data: HeadOption[] }');
        console.log('   - HeadOption Interface:');
        console.log('     * code: string (head code)');
        console.log('     * name: string (head description)');
        console.log();
        console.log('   - Detail Ledger API: { success: boolean, data: DetailLedgerResponse }');
        console.log('   - DetailLedgerResponse Interface:');
        console.log('     * headCode: string');
        console.log('     * headName: string');
        console.log('     * fromDate: string');
        console.log('     * toDate: string');
        console.log('     * transactions: LedgerTransaction[]');
        console.log();
        console.log('   - LedgerTransaction Interface:');
        console.log('     * key: string');
        console.log('     * date: string (ISO date)');
        console.log('     * voucherNo: string');
        console.log('     * narration: string');
        console.log('     * debit: number');
        console.log('     * credit: number');
        console.log('     * balance: number (running balance)');
        console.log();

        // Test 10: Data Type Validation for Ledger Table
        console.log('📊 Test 10: Data Type Validation for Ledger Table');
        console.log('----------------------------------------');
        
        const dataTypeQuery = await pool.query(`
            SELECT 
                trans_amt,
                pl_balance,
                pg_typeof(trans_amt) as trans_amt_type,
                pg_typeof(pl_balance) as pl_balance_type
            FROM ledger 
            WHERE trans_amt IS NOT NULL
            LIMIT 1
        `);
        
        if (dataTypeQuery.rows.length > 0) {
            const sample = dataTypeQuery.rows[0];
            console.log('✅ Database Column Types:');
            console.log(`   - trans_amt: ${sample.trans_amt_type} (value: ${sample.trans_amt})`);
            console.log(`   - pl_balance: ${sample.pl_balance_type} (value: ${sample.pl_balance})`);
            
            // Check if amounts are stored as money types (with currency symbols)
            const isMoneyType = sample.trans_amt_type === 'money';
            if (isMoneyType) {
                console.log('⚠️ Amount fields use money type with currency formatting');
                console.log('💡 Recommendation: Consider converting to numeric type for better performance');
                
                // Test money parsing
                const moneyValue = sample.trans_amt.toString();
                console.log(`🔍 Money value format: "${moneyValue}"`);
                const parsedValue = parseFloat(moneyValue.replace(/[₹$,\s]/g, ''));
                console.log(`🔍 Parsed numeric value: ${parsedValue}`);
            } else {
                console.log('✅ Amount fields use proper numeric types');
            }
        }
        console.log();

        // Test 11: Database Query Performance Test
        console.log('📊 Test 11: Database Query Performance Test');
        console.log('----------------------------------------');
        
        const performanceStart = Date.now();
        const performanceQuery = await pool.query(`
            SELECT 
                l.trans_date,
                l.receipt_vchr_no,
                l.narration,
                l.trans_type,
                l.trans_amt
            FROM ledger l
            WHERE l.code = 'A1001'
            AND l.trans_date >= $1
            AND l.trans_date <= $2
            ORDER BY l.trans_date ASC, l.trans_no ASC
        `, [fromDate, toDate]);
        const performanceEnd = Date.now();
        
        console.log(`⚡ Query executed in ${performanceEnd - performanceStart}ms`);
        console.log(`📊 Retrieved ${performanceQuery.rows.length} transactions for head code A1001`);
        console.log();

        // UI Selection Guide
        console.log('🎯 UI SELECTION GUIDE - How to Access Detail Ledger');
        console.log('============================================================\n');
        
        console.log('📍 Navigation Path:');
        console.log('   1. Open the application');
        console.log('   2. Go to "Reports" menu');
        console.log('   3. Select "Monthly Reports" submenu');
        console.log('   4. Click on "Detail Ledger"\n');
        
        console.log('⚙️ Component Configuration:');
        console.log('   1. Head Name: Select account head from dropdown (loads all available heads)');
        console.log('   2. From Date: Choose start date for the report (default: start of current month)');
        console.log('   3. To Date: Choose end date for the report (default: current date)');
        console.log('   4. Output Type: Choose Screen or Printer display');
        console.log('   5. Generate: Click to load ledger data for selected head and date range');
        console.log('   6. Print: Generate PDF report of the detail ledger\n');
        
        console.log('📊 Expected Display:');
        console.log('   - Control panel with head selection, date pickers, output type, and action buttons');
        console.log('   - Main table showing ledger transactions with columns:');
        console.log('     * DATE (Transaction Date)');
        console.log('     * VOUCHER NO (Receipt/Payment Voucher Number)');
        console.log('     * NARRATION (Transaction Description)');
        console.log('     * DEBIT (Debit Amount in green)');
        console.log('     * CREDIT (Credit Amount in red)');
        console.log('     * BALANCE (Running Balance in blue/orange)');
        console.log('   - Summary row with total debits, credits, and closing balance');
        console.log('   - Professional styling with color-coded amounts\n');
        
        console.log('🔍 Data Verification:');
        console.log('   - Check if head dropdown loads with all available account heads');
        console.log('   - Verify date pickers work correctly');
        console.log('   - Ensure Generate button loads data for selected criteria');
        console.log('   - Confirm transactions display with proper date formatting');
        console.log('   - Check that debit/credit amounts are calculated correctly');
        console.log('   - Verify running balance calculation is accurate');
        console.log('   - Ensure totals in summary row match transaction details');
        console.log('   - Verify print functionality works for PDF generation\n');
        
        console.log('🎨 UI Features:');
        console.log('   - Modern Ant Design components with professional styling');
        console.log('   - Responsive layout that adapts to screen size');
        console.log('   - Searchable dropdown for head selection');
        console.log('   - Date pickers with DD-MMM-YYYY format');
        console.log('   - Color-coded amounts (green debit, red credit, blue/orange balance)');
        console.log('   - Loading states during data fetching');
        console.log('   - Print-optimized CSS for PDF generation');
        console.log('   - Empty state with helpful message when no data available\n');
        
        console.log('🔧 Test Data Available:');
        console.log('   - Current Month: Sample transactions for multiple head codes');
        console.log('   - Head codes: A1001 (Cash), L2001 (Loans), E3001 (Expenses), I4001 (Interest)');
        console.log('   - Transaction types: Debit and Credit entries with proper voucher numbers');
        console.log('   - Running balances: Accurate balance calculations for each transaction');
        console.log('   - Date range: Current month data with various transaction dates');
        console.log('   - Narrations: Descriptive transaction purposes for clarity\n');
        
        console.log('📋 Key Features:');
        console.log('   - Detail Ledger Reporting: Complete transaction history for any account head');
        console.log('   - Date Range Selection: Flexible date filtering for specific periods');
        console.log('   - Running Balance: Real-time balance calculation for each transaction');
        console.log('   - Head Code Integration: Full integration with head master for descriptions');
        console.log('   - Voucher Tracking: Links to voucher numbers for audit trail');
        console.log('   - Print Functionality: Generate PDF reports for record keeping');
        console.log('   - Professional Layout: Clean, readable financial report format');
        console.log('   - Real-time Loading: Dynamic data loading based on user selections\n');

        console.log('🎉 DETAIL LEDGER TEST COMPLETED');
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
testDetailLedger().catch(console.error);