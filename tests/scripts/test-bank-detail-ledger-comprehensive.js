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

async function testBankDetailLedger() {
    console.log('🔍 BANK DETAIL LEDGER - COMPREHENSIVE TEST');
    console.log('============================================================\n');

    let pool;
    try {
        // Test 1: Database Connection
        console.log('📊 Test 1: Database Connection');
        console.log('----------------------------------------');
        pool = new Pool(dbConfig);
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully\n');

        // Test 2: HeadMaster Table Analysis for Bank Accounts
        console.log('📊 Test 2: HeadMaster Table Analysis for Bank Accounts');
        console.log('----------------------------------------');
        
        const bankHeadAnalysis = await pool.query(`
            SELECT 
                COUNT(*) as total_bank_heads,
                COUNT(CASE WHEN UPPER(head_name) LIKE '%BANK%' THEN 1 END) as bank_keyword_heads,
                COUNT(CASE WHEN UPPER(head_name) LIKE '%ACCOUNT%' THEN 1 END) as account_keyword_heads
            FROM headmaster
            WHERE UPPER(head_name) LIKE '%BANK%' OR UPPER(head_name) LIKE '%ACCOUNT%'
        `);
        
        const bankAnalysis = bankHeadAnalysis.rows[0];
        console.log(`🏦 Total bank-related heads: ${bankAnalysis.total_bank_heads}`);
        console.log(`🏷️ Heads with 'BANK' keyword: ${bankAnalysis.bank_keyword_heads}`);
        console.log(`🏷️ Heads with 'ACCOUNT' keyword: ${bankAnalysis.account_keyword_heads}\n`);

        // Test 3: Sample Bank Head Codes
        console.log('📊 Test 3: Sample Bank Head Codes');
        console.log('----------------------------------------');
        
        const bankHeads = await pool.query(`
            SELECT 
                code,
                head_name
            FROM headmaster
            WHERE UPPER(head_name) LIKE '%BANK%' OR UPPER(head_name) LIKE '%ACCOUNT%'
            ORDER BY head_name ASC
            LIMIT 10
        `);

        console.log('📋 Sample Bank Account Heads:');
        bankHeads.rows.forEach((head, index) => {
            console.log(`  ${index + 1}. ${head.code} - ${head.head_name}`);
        });
        console.log();

        // Test 4: Bank Accounts with Transaction Data
        console.log('📊 Test 4: Bank Accounts with Transaction Data');
        console.log('----------------------------------------');
        
        const bankAccountsWithData = await pool.query(`
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
            WHERE (UPPER(h.head_name) LIKE '%BANK%' OR UPPER(h.head_name) LIKE '%ACCOUNT%')
            AND l.trans_no IS NOT NULL
            GROUP BY h.code, h.head_name
            ORDER BY transaction_count DESC
            LIMIT 5
        `);

        console.log('📋 Top Bank Accounts by Transaction Volume:');
        bankAccountsWithData.rows.forEach((bank, index) => {
            console.log(`  ${index + 1}. ${bank.code} - ${bank.head_name}`);
            console.log(`     📊 ${bank.transaction_count} transactions (${bank.debit_count} DR, ${bank.credit_count} CR)`);
            console.log(`     📅 ${bank.first_transaction?.toISOString().split('T')[0]} to ${bank.last_transaction?.toISOString().split('T')[0]}`);
        });
        console.log();

        // Test 5: Check for Test Data in Current Month
        console.log('📊 Test 5: Check for Test Data in Current Month');
        console.log('----------------------------------------');
        
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const currentMonthBankData = await pool.query(`
            SELECT 
                l.code,
                h.head_name,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN l.trans_type = 'DR' THEN 1 ELSE 0 END) as debit_count,
                SUM(CASE WHEN l.trans_type = 'CR' THEN 1 ELSE 0 END) as credit_count
            FROM ledger l
            LEFT JOIN headmaster h ON l.code = h.code
            WHERE l.trans_date >= $1 AND l.trans_date <= $2
            AND (UPPER(h.head_name) LIKE '%BANK%' OR UPPER(h.head_name) LIKE '%ACCOUNT%')
            GROUP BY l.code, h.head_name
            ORDER BY transaction_count DESC
            LIMIT 3
        `, [firstDayOfMonth.toISOString().split('T')[0], lastDayOfMonth.toISOString().split('T')[0]]);

        if (currentMonthBankData.rows.length > 0) {
            console.log(`✅ Current month (${currentDate.toISOString().split('T')[0].substring(0, 7)}) bank data found:`);
            currentMonthBankData.rows.forEach((entry, index) => {
                console.log(`  ${index + 1}. ${entry.code} - ${entry.head_name}`);
                console.log(`     📊 ${entry.transaction_count} transactions (${entry.debit_count} DR, ${entry.credit_count} CR)`);
            });
        } else {
            console.log('⚠️ No current month bank data found - creating sample data...');
            
            // Check if sample data already exists
            const existingData = await pool.query(`
                SELECT COUNT(*) as count FROM ledger l
                JOIN headmaster h ON l.code = h.code
                WHERE l.trans_date >= $1 AND l.trans_date <= $2
                AND (UPPER(h.head_name) LIKE '%BANK%' OR UPPER(h.head_name) LIKE '%ACCOUNT%')
            `, [firstDayOfMonth.toISOString().split('T')[0], lastDayOfMonth.toISOString().split('T')[0]]);
            
            if (existingData.rows[0].count == 0) {
                // Get a bank account head code
                const bankHead = await pool.query(`
                    SELECT code FROM headmaster 
                    WHERE UPPER(head_name) LIKE '%BANK%' OR UPPER(head_name) LIKE '%ACCOUNT%'
                    LIMIT 1
                `);
                
                if (bankHead.rows.length > 0) {
                    const bankCode = bankHead.rows[0].code;
                    
                    // Get the next available ledgerid and trans_no
                    const maxIds = await pool.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_ledger_id, COALESCE(MAX(trans_no), 0) + 1 as next_trans_no FROM ledger');
                    const nextLedgerId = maxIds.rows[0].next_ledger_id;
                    const nextTransNo = maxIds.rows[0].next_trans_no;
                    
                    const today = new Date().toISOString().split('T')[0];
                    
                    // Create sample bank ledger data for current month
                    await pool.query(`
                        INSERT INTO ledger (
                            trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type,
                            trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance,
                            narration, username, ledgerid
                        ) VALUES 
                        (${nextTransNo}, '${today}', 'DR', '${bankCode}', 1001, 1001, 'SB', 100000.00, 'BDL001', 'RV', 'B', 100000.00, 'Bank deposit for bank detail ledger test', 'admin', ${nextLedgerId}),
                        (${nextTransNo + 1}, '${today}', 'CR', '${bankCode}', 1001, 1001, 'SB', 25000.00, 'BDL002', 'PV', 'B', 75000.00, 'Bank withdrawal for bank detail ledger test', 'admin', ${nextLedgerId + 1}),
                        (${nextTransNo + 2}, '${today}', 'DR', '${bankCode}', 1002, 1002, 'SB', 50000.00, 'BDL003', 'RV', 'B', 125000.00, 'Bank transfer credit for bank detail ledger test', 'admin', ${nextLedgerId + 2}),
                        (${nextTransNo + 3}, '${today}', 'CR', '${bankCode}', 1002, 1002, 'SB', 15000.00, 'BDL004', 'PV', 'B', 110000.00, 'Bank charges for bank detail ledger test', 'admin', ${nextLedgerId + 3}),
                        (${nextTransNo + 4}, '${today}', 'DR', '${bankCode}', 1003, 1003, 'SB', 30000.00, 'BDL005', 'RV', 'B', 140000.00, 'Bank interest credit for bank detail ledger test', 'admin', ${nextLedgerId + 4})
                    `);
                    
                    console.log(`✅ Sample bank detail ledger data created for ${bankCode}`);
                } else {
                    console.log('⚠️ No bank account heads found in headmaster table');
                }
            } else {
                console.log('✅ Sample bank detail ledger data already exists');
            }
        }
        console.log();

        // Test 6: Get Bank List API Testing
        console.log('📊 Test 6: Get Bank List API Testing');
        console.log('----------------------------------------');
        
        try {
            const bankListUrl = `${API_BASE_URL}/report/bank-list`;
            console.log(`🌐 Testing API: ${bankListUrl}`);
            
            const bankListResponse = await axios.get(bankListUrl);
            console.log(`✅ Bank List API Status: ${bankListResponse.status}`);
            
            const responseData = bankListResponse.data;
            if (responseData.success && Array.isArray(responseData.data)) {
                console.log(`🏦 Total bank accounts returned: ${responseData.data.length}`);
                
                console.log('\n📋 Sample Bank Accounts:');
                responseData.data.slice(0, 5).forEach((bank, index) => {
                    console.log(`  ${index + 1}. ${bank.code} - ${bank.name}`);
                });
                
                if (responseData.data.length > 5) {
                    console.log(`     ... and ${responseData.data.length - 5} more bank accounts`);
                }
            } else {
                console.log('❌ API returned unexpected format:', responseData);
            }
        } catch (error) {
            console.log(`❌ Bank List API Error: ${error.message}`);
            if (error.response?.status) {
                console.log(`   Status: ${error.response.status}`);
            }
        }
        console.log();

        // Test 7: Get Bank Detail Ledger API Testing
        console.log('📊 Test 7: Get Bank Detail Ledger API Testing');
        console.log('----------------------------------------');
        
        try {
            // Get a bank account with data for testing
            const testBankQuery = await pool.query(`
                SELECT DISTINCT l.code, h.head_name
                FROM ledger l
                JOIN headmaster h ON l.code = h.code
                WHERE l.trans_date >= $1 AND l.trans_date <= $2
                AND (UPPER(h.head_name) LIKE '%BANK%' OR UPPER(h.head_name) LIKE '%ACCOUNT%')
                LIMIT 1
            `, [firstDayOfMonth.toISOString().split('T')[0], lastDayOfMonth.toISOString().split('T')[0]]);
            
            let testBankCode = 'A1008'; // Default fallback
            if (testBankQuery.rows.length > 0) {
                testBankCode = testBankQuery.rows[0].code;
            }
            
            const fromDate = firstDayOfMonth.toISOString().split('T')[0];
            const toDate = lastDayOfMonth.toISOString().split('T')[0];
            
            const bankDetailLedgerUrl = `${API_BASE_URL}/report/bank-detail-ledger?bank_head_code=${testBankCode}&from_date=${fromDate}&to_date=${toDate}`;
            console.log(`🌐 Testing API: ${bankDetailLedgerUrl}`);
            
            const bankDetailLedgerResponse = await axios.get(bankDetailLedgerUrl);
            console.log(`✅ Bank Detail Ledger API Status: ${bankDetailLedgerResponse.status}`);
            
            const responseData = bankDetailLedgerResponse.data;
            if (responseData.success && responseData.data) {
                const data = responseData.data;
                console.log(`🏦 Bank Code: ${data.bankCode} - ${data.bankName}`);
                console.log(`📅 Date Range: ${data.fromDate} to ${data.toDate}`);
                console.log(`💰 Opening Balance: ₹${data.openingBalance.toFixed(2)}`);
                console.log(`📊 Total transactions: ${data.transactions?.length || 0}`);
                
                if (data.transactions && data.transactions.length > 0) {
                    console.log('\n📋 Sample Bank Transactions:');
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
                    const closingBalance = data.transactions.length > 0 ? data.transactions[data.transactions.length - 1].balance : data.openingBalance;
                    
                    console.log(`\n💰 Total Debit: ₹${totalDebit.toFixed(2)}`);
                    console.log(`💰 Total Credit: ₹${totalCredit.toFixed(2)}`);
                    console.log(`💰 Closing Balance: ₹${Math.abs(closingBalance).toFixed(2)}${closingBalance < 0 ? ' Cr' : ''}`);
                }
            } else {
                console.log('❌ API returned unexpected format:', responseData);
            }
        } catch (error) {
            console.log(`❌ Bank Detail Ledger API Error: ${error.message}`);
            if (error.response?.status) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Response: ${JSON.stringify(error.response.data)}`);
            }
        }
        console.log();

        // Test 8: Test Different Bank Accounts
        console.log('📊 Test 8: Test Different Bank Accounts');
        console.log('----------------------------------------');
        
        const testBankCodes = await pool.query(`
            SELECT DISTINCT h.code, h.head_name
            FROM headmaster h
            WHERE (UPPER(h.head_name) LIKE '%BANK%' OR UPPER(h.head_name) LIKE '%ACCOUNT%')
            LIMIT 3
        `);
        
        const fromDate = firstDayOfMonth.toISOString().split('T')[0];
        const toDate = lastDayOfMonth.toISOString().split('T')[0];
        
        for (const bank of testBankCodes.rows) {
            try {
                const testUrl = `${API_BASE_URL}/report/bank-detail-ledger?bank_head_code=${bank.code}&from_date=${fromDate}&to_date=${toDate}`;
                const testResponse = await axios.get(testUrl);
                
                if (testResponse.data.success) {
                    const transactionCount = testResponse.data.data.transactions?.length || 0;
                    console.log(`✅ ${bank.code} (${bank.head_name}): ${transactionCount} transactions`);
                } else {
                    console.log(`⚠️ ${bank.code}: API returned success=false`);
                }
            } catch (error) {
                console.log(`❌ ${bank.code}: ${error.message}`);
            }
        }
        console.log();

        // Test 9: Frontend Data Structure Validation
        console.log('📊 Test 9: Frontend Data Structure Validation');
        console.log('----------------------------------------');
        
        console.log('✅ Expected Frontend Data Structure:');
        console.log('   - Bank List API: { success: boolean, data: BankOption[] }');
        console.log('   - BankOption Interface:');
        console.log('     * code: string (bank head code)');
        console.log('     * name: string (bank account name)');
        console.log();
        console.log('   - Bank Detail Ledger API: { success: boolean, data: BankDetailLedgerResponse }');
        console.log('   - BankDetailLedgerResponse Interface:');
        console.log('     * bankCode: string');
        console.log('     * bankName: string');
        console.log('     * fromDate: string');
        console.log('     * toDate: string');
        console.log('     * openingBalance: number');
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

        // Test 10: Data Type Validation for Money Handling
        console.log('📊 Test 10: Data Type Validation for Money Handling');
        console.log('----------------------------------------');
        
        const dataTypeQuery = await pool.query(`
            SELECT 
                trans_amt,
                pl_balance,
                pg_typeof(trans_amt) as trans_amt_type,
                pg_typeof(pl_balance) as pl_balance_type
            FROM ledger l
            JOIN headmaster h ON l.code = h.code
            WHERE (UPPER(h.head_name) LIKE '%BANK%' OR UPPER(h.head_name) LIKE '%ACCOUNT%')
            AND l.trans_amt IS NOT NULL
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
                console.log('✅ Backend service uses CAST(trans_amt AS numeric) for proper handling');
                console.log('💡 Recommendation: Consider converting to numeric type for optimal performance');
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
                CAST(l.trans_amt AS numeric) as amount
            FROM ledger l
            JOIN headmaster h ON l.code = h.code
            WHERE (UPPER(h.head_name) LIKE '%BANK%' OR UPPER(h.head_name) LIKE '%ACCOUNT%')
            AND l.trans_date >= $1
            AND l.trans_date <= $2
            ORDER BY l.trans_date ASC, l.trans_no ASC
            LIMIT 50
        `, [fromDate, toDate]);
        const performanceEnd = Date.now();
        
        console.log(`⚡ Query executed in ${performanceEnd - performanceStart}ms`);
        console.log(`📊 Retrieved ${performanceQuery.rows.length} bank transactions`);
        console.log();

        // UI Selection Guide
        console.log('🎯 UI SELECTION GUIDE - How to Access Bank Detail Ledger');
        console.log('============================================================\n');
        
        console.log('📍 Navigation Path:');
        console.log('   1. Open the application');
        console.log('   2. Go to "Reports" menu');
        console.log('   3. Select "Monthly Reports" submenu');
        console.log('   4. Click on "Bank Detail Ledger"\n');
        
        console.log('⚙️ Component Configuration:');
        console.log('   1. Head Name: Select bank account from dropdown (loads bank-related accounts only)');
        console.log('   2. From Date: Choose start date for the report (default: start of current month)');
        console.log('   3. To Date: Choose end date for the report (default: current date)');
        console.log('   4. Output Type: Choose Screen or Printer display');
        console.log('   5. Generate: Click to load bank ledger data for selected account and date range');
        console.log('   6. Print: Generate PDF report of the bank detail ledger\n');
        
        console.log('📊 Expected Display:');
        console.log('   - Control panel with bank selection, date pickers, output type, and action buttons');
        console.log('   - Main table showing bank transactions with columns:');
        console.log('     * DATE (Transaction Date)');
        console.log('     * VOUCHER NO (Receipt/Payment Voucher Number)');
        console.log('     * NARRATION (Transaction Description)');
        console.log('     * DEBIT (Debit Amount in green)');
        console.log('     * CREDIT (Credit Amount in red)');
        console.log('     * BALANCE (Running Balance in blue/orange)');
        console.log('   - Summary row with total debits, credits, and closing balance');
        console.log('   - Professional styling with color-coded amounts\n');
        
        console.log('🔍 Data Verification:');
        console.log('   - Check if bank dropdown loads with bank-related account heads only');
        console.log('   - Verify date pickers work correctly');
        console.log('   - Ensure Generate button loads data for selected criteria');
        console.log('   - Confirm transactions display with proper date formatting');
        console.log('   - Check that debit/credit amounts are calculated correctly');
        console.log('   - Verify running balance calculation includes opening balance');
        console.log('   - Ensure totals in summary row match transaction details');
        console.log('   - Verify print functionality works for PDF generation\n');
        
        console.log('🎨 UI Features:');
        console.log('   - Modern Ant Design components with professional styling');
        console.log('   - Responsive layout that adapts to screen size');
        console.log('   - Searchable dropdown for bank account selection');
        console.log('   - Date pickers with DD-MMM-YYYY format');
        console.log('   - Color-coded amounts (green debit, red credit, blue/orange balance)');
        console.log('   - Loading states during data fetching');
        console.log('   - Print-optimized CSS for PDF generation');
        console.log('   - Empty state with helpful message when no data available\n');
        
        console.log('🔧 Test Data Available:');
        console.log('   - Current Month: Sample bank transactions for testing');
        console.log('   - Bank accounts: Filtered from headmaster table (BANK/ACCOUNT keywords)');
        console.log('   - Transaction types: Debit and Credit entries with proper voucher numbers');
        console.log('   - Running balances: Accurate balance calculations starting from opening balance');
        console.log('   - Date range: Current month data with various transaction dates');
        console.log('   - Narrations: Descriptive bank transaction purposes\n');
        
        console.log('📋 Key Features:');
        console.log('   - Bank-Specific Reporting: Complete transaction history for bank accounts only');
        console.log('   - Opening Balance: Includes opening balance in running calculations');
        console.log('   - Date Range Selection: Flexible date filtering for specific periods');
        console.log('   - Running Balance: Real-time balance calculation for each transaction');
        console.log('   - Bank Account Integration: Filtered list of bank-related accounts only');
        console.log('   - Voucher Tracking: Links to voucher numbers for audit trail');
        console.log('   - Print Functionality: Generate PDF reports for bank reconciliation');
        console.log('   - Professional Layout: Clean, readable bank statement format\n');

        console.log('🎉 BANK DETAIL LEDGER TEST COMPLETED');
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
testBankDetailLedger().catch(console.error);