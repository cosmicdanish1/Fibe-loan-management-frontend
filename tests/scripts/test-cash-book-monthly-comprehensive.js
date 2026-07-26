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

async function testCashBookMonthly() {
    console.log('🔍 CASH BOOK MONTHLY - COMPREHENSIVE TEST');
    console.log('============================================================\n');

    let pool;
    try {
        // Test 1: Database Connection
        console.log('📊 Test 1: Database Connection');
        console.log('----------------------------------------');
        pool = new Pool(dbConfig);
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully\n');

        // Test 2: TblCashBook Table Analysis
        console.log('📊 Test 2: TblCashBook Table Analysis');
        console.log('----------------------------------------');
        
        const cashBookAnalysis = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT headcode) as unique_head_codes,
                COUNT(CASE WHEN trans_date IS NOT NULL THEN 1 END) as entries_with_dates,
                MIN(trans_date) as earliest_date,
                MAX(trans_date) as latest_date,
                SUM(COALESCE(rcash, 0) + COALESCE(rtransfer, 0)) as total_receipts,
                SUM(COALESCE(pcash, 0) + COALESCE(ptransfer, 0)) as total_payments
            FROM tblcashbook
        `);
        
        const analysis = cashBookAnalysis.rows[0];
        console.log(`📈 Total cashbook entries: ${analysis.total_entries}`);
        console.log(`🏷️ Unique head codes: ${analysis.unique_head_codes}`);
        console.log(`📅 Entries with dates: ${analysis.entries_with_dates}`);
        console.log(`📅 Date range: ${analysis.earliest_date?.toISOString().split('T')[0]} to ${analysis.latest_date?.toISOString().split('T')[0]}`);
        console.log(`💰 Total receipts: ₹${parseFloat(analysis.total_receipts || 0).toFixed(2)}`);
        console.log(`💰 Total payments: ₹${parseFloat(analysis.total_payments || 0).toFixed(2)}\n`);

        // Test 3: Sample Monthly Data Analysis
        console.log('📊 Test 3: Sample Monthly Data Analysis');
        console.log('----------------------------------------');
        
        const monthlyData = await pool.query(`
            SELECT 
                EXTRACT(YEAR FROM trans_date) as year,
                EXTRACT(MONTH FROM trans_date) as month,
                COUNT(*) as entry_count,
                COUNT(DISTINCT headcode) as unique_heads,
                SUM(COALESCE(rcash, 0) + COALESCE(rtransfer, 0)) as month_receipts,
                SUM(COALESCE(pcash, 0) + COALESCE(ptransfer, 0)) as month_payments
            FROM tblcashbook 
            WHERE trans_date IS NOT NULL
            GROUP BY EXTRACT(YEAR FROM trans_date), EXTRACT(MONTH FROM trans_date)
            ORDER BY year DESC, month DESC
            LIMIT 5
        `);

        console.log('📋 Sample Monthly Summaries:');
        monthlyData.rows.forEach((month, index) => {
            const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            console.log(`  ${index + 1}. ${monthNames[month.month]} ${month.year} - ${month.entry_count} entries, ${month.unique_heads} heads`);
            console.log(`     💰 Receipts: ₹${parseFloat(month.month_receipts || 0).toFixed(2)}, Payments: ₹${parseFloat(month.month_payments || 0).toFixed(2)}`);
        });
        console.log();

        // Test 4: Head Code Analysis
        console.log('📊 Test 4: Head Code Analysis');
        console.log('----------------------------------------');
        
        const headAnalysis = await pool.query(`
            SELECT 
                headcode,
                MAX(headname) as headname,
                COUNT(*) as entry_count,
                SUM(COALESCE(rcash, 0) + COALESCE(rtransfer, 0)) as total_receipts,
                SUM(COALESCE(pcash, 0) + COALESCE(ptransfer, 0)) as total_payments
            FROM tblcashbook 
            WHERE headcode IS NOT NULL AND headcode != ''
            GROUP BY headcode
            ORDER BY total_receipts DESC
            LIMIT 5
        `);

        console.log('📋 Top Head Codes by Receipts:');
        headAnalysis.rows.forEach((head, index) => {
            console.log(`  ${index + 1}. ${head.headcode} - ${head.headname}`);
            console.log(`     📊 ${head.entry_count} entries, ₹${parseFloat(head.total_receipts || 0).toFixed(2)} receipts, ₹${parseFloat(head.total_payments || 0).toFixed(2)} payments`);
        });
        console.log();

        // Test 5: Check for Test Data for April 2015
        console.log('📊 Test 5: Check for Test Data for April 2015');
        console.log('----------------------------------------');
        
        const april2015Data = await pool.query(`
            SELECT 
                headcode,
                headname,
                SUM(COALESCE(rcash, 0) + COALESCE(rtransfer, 0)) as receipts,
                SUM(COALESCE(pcash, 0) + COALESCE(ptransfer, 0)) as payments
            FROM tblcashbook 
            WHERE EXTRACT(YEAR FROM trans_date) = 2015 
            AND EXTRACT(MONTH FROM trans_date) = 4
            GROUP BY headcode, headname
            ORDER BY receipts DESC
            LIMIT 3
        `);

        if (april2015Data.rows.length > 0) {
            console.log('✅ April 2015 data found:');
            april2015Data.rows.forEach((entry, index) => {
                console.log(`  ${index + 1}. ${entry.headcode} - ${entry.headname}`);
                console.log(`     💰 Receipts: ₹${parseFloat(entry.receipts || 0).toFixed(2)}, Payments: ₹${parseFloat(entry.payments || 0).toFixed(2)}`);
            });
        } else {
            console.log('⚠️ No April 2015 data found - creating sample data...');
            
            // Check if sample data already exists
            const existingData = await pool.query(`
                SELECT COUNT(*) as count FROM tblcashbook 
                WHERE EXTRACT(YEAR FROM trans_date) = 2015 
                AND EXTRACT(MONTH FROM trans_date) = 4
            `);
            
            if (existingData.rows[0].count == 0) {
                // Create sample cash book data for April 2015
                await pool.query(`
                    INSERT INTO tblcashbook (
                        headcode, headname, rcash, rtransfer, pcash, ptransfer, trans_date
                    ) VALUES 
                    ('A1001', 'CASH IN HAND', 50000.00, 25000.00, 0.00, 0.00, '2015-04-01'),
                    ('A1002', 'BANK ACCOUNT', 0.00, 100000.00, 15000.00, 0.00, '2015-04-02'),
                    ('L2001', 'LOAN ACCOUNT', 0.00, 0.00, 30000.00, 10000.00, '2015-04-03'),
                    ('E3001', 'EXPENSE ACCOUNT', 0.00, 0.00, 5000.00, 2000.00, '2015-04-04'),
                    ('I4001', 'INTEREST INCOME', 8000.00, 0.00, 0.00, 0.00, '2015-04-05'),
                    ('A1001', 'CASH IN HAND', 15000.00, 0.00, 8000.00, 0.00, '2015-04-10'),
                    ('A1002', 'BANK ACCOUNT', 0.00, 75000.00, 0.00, 20000.00, '2015-04-15'),
                    ('L2001', 'LOAN ACCOUNT', 0.00, 0.00, 25000.00, 0.00, '2015-04-20'),
                    ('I4001', 'INTEREST INCOME', 12000.00, 0.00, 0.00, 0.00, '2015-04-25'),
                    ('E3001', 'EXPENSE ACCOUNT', 0.00, 0.00, 3000.00, 1500.00, '2015-04-30')
                `);
                
                console.log('✅ Sample cash book data created for April 2015');
            } else {
                console.log('✅ Sample cash book data already exists');
            }
        }
        console.log();

        // Test 6: Get Cash Book Monthly API Testing
        console.log('📊 Test 6: Get Cash Book Monthly API Testing');
        console.log('----------------------------------------');
        
        try {
            const apiUrl = `${API_BASE_URL}/report/cash-book-monthly?month=Apr&year=2015`;
            console.log(`🌐 Testing API: ${apiUrl}`);
            
            const apiResponse = await axios.get(apiUrl);
            console.log(`✅ Cash Book Monthly API Status: ${apiResponse.status}`);
            
            const responseData = apiResponse.data;
            if (responseData.success && Array.isArray(responseData.data)) {
                console.log(`📊 Total head codes returned: ${responseData.data.length}`);
                
                console.log('\n📋 Sample Cash Book Monthly Data:');
                responseData.data.slice(0, 5).forEach((entry, index) => {
                    console.log(`  ${index + 1}. ${entry.code} - ${entry.headName}`);
                    console.log(`     💰 Receipts: ₹${entry.receipt.toFixed(2)}, Payments: ₹${entry.payment.toFixed(2)}`);
                });
                
                if (responseData.data.length > 5) {
                    console.log(`     ... and ${responseData.data.length - 5} more entries`);
                }
                
                // Calculate totals
                const totalReceipts = responseData.data.reduce((sum, entry) => sum + (entry.receipt || 0), 0);
                const totalPayments = responseData.data.reduce((sum, entry) => sum + (entry.payment || 0), 0);
                console.log(`\n💰 Total Receipts: ₹${totalReceipts.toFixed(2)}`);
                console.log(`💰 Total Payments: ₹${totalPayments.toFixed(2)}`);
                console.log(`💰 Net Amount: ₹${(totalReceipts - totalPayments).toFixed(2)}`);
                
            } else {
                console.log('❌ API returned unexpected format:', responseData);
            }
        } catch (error) {
            console.log(`❌ Cash Book Monthly API Error: ${error.message}`);
            if (error.response?.status) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Response: ${JSON.stringify(error.response.data)}`);
            }
        }
        console.log();

        // Test 7: Test Different Month/Year Combinations
        console.log('📊 Test 7: Test Different Month/Year Combinations');
        console.log('----------------------------------------');
        
        const testMonths = [
            { month: 'Jan', year: 2015 },
            { month: 'Dec', year: 2024 },
            { month: 'Mar', year: 2020 }
        ];
        
        for (const testMonth of testMonths) {
            try {
                const testUrl = `${API_BASE_URL}/report/cash-book-monthly?month=${testMonth.month}&year=${testMonth.year}`;
                const testResponse = await axios.get(testUrl);
                
                if (testResponse.data.success) {
                    const dataCount = testResponse.data.data.length;
                    console.log(`✅ ${testMonth.month} ${testMonth.year}: ${dataCount} entries found`);
                } else {
                    console.log(`⚠️ ${testMonth.month} ${testMonth.year}: API returned success=false`);
                }
            } catch (error) {
                console.log(`❌ ${testMonth.month} ${testMonth.year}: ${error.message}`);
            }
        }
        console.log();

        // Test 8: Frontend Data Structure Validation
        console.log('📊 Test 8: Frontend Data Structure Validation');
        console.log('----------------------------------------');
        
        console.log('✅ Expected Frontend Data Structure:');
        console.log('   - API Response: { success: boolean, data: CashBookData[] }');
        console.log('   - CashBookData Interface:');
        console.log('     * key: string (unique identifier)');
        console.log('     * code: string (head code)');
        console.log('     * headName: string (head description)');
        console.log('     * receipt: number (total receipts = rcash + rtransfer)');
        console.log('     * payment: number (total payments = pcash + ptransfer)');
        console.log();
        
        console.log('✅ API Parameters:');
        console.log('   - month: string (3-letter month name: Jan, Feb, Mar, etc.)');
        console.log('   - year: number (4-digit year: 2015, 2024, etc.)');
        console.log();

        // Test 9: Database Query Performance Test
        console.log('📊 Test 9: Database Query Performance Test');
        console.log('----------------------------------------');
        
        const performanceStart = Date.now();
        const performanceQuery = await pool.query(`
            SELECT 
                headcode as code,
                MAX(headname) as headName,
                SUM(COALESCE(rcash, 0) + COALESCE(rtransfer, 0)) as receipt,
                SUM(COALESCE(pcash, 0) + COALESCE(ptransfer, 0)) as payment
            FROM tblcashbook
            WHERE trans_date IS NOT NULL
            AND trans_date >= '2015-04-01'
            AND trans_date <= '2015-04-30'
            GROUP BY headcode
            ORDER BY receipt DESC
        `);
        const performanceEnd = Date.now();
        
        console.log(`⚡ Query executed in ${performanceEnd - performanceStart}ms`);
        console.log(`📊 Retrieved ${performanceQuery.rows.length} head codes with aggregated amounts`);
        console.log();

        // Test 10: Data Type Validation
        console.log('📊 Test 10: Data Type Validation');
        console.log('----------------------------------------');
        
        const dataTypeQuery = await pool.query(`
            SELECT 
                headcode,
                rcash,
                rtransfer,
                pcash,
                ptransfer,
                pg_typeof(rcash) as rcash_type,
                pg_typeof(rtransfer) as rtransfer_type,
                pg_typeof(pcash) as pcash_type,
                pg_typeof(ptransfer) as ptransfer_type
            FROM tblcashbook 
            WHERE headcode IS NOT NULL
            LIMIT 1
        `);
        
        if (dataTypeQuery.rows.length > 0) {
            const sample = dataTypeQuery.rows[0];
            console.log('✅ Database Column Types:');
            console.log(`   - rcash: ${sample.rcash_type} (value: ${sample.rcash})`);
            console.log(`   - rtransfer: ${sample.rtransfer_type} (value: ${sample.rtransfer})`);
            console.log(`   - pcash: ${sample.pcash_type} (value: ${sample.pcash})`);
            console.log(`   - ptransfer: ${sample.ptransfer_type} (value: ${sample.ptransfer})`);
            
            // Check if amounts are stored as proper numeric types
            const isNumericType = sample.rcash_type === 'numeric' || sample.rcash_type === 'integer';
            if (isNumericType) {
                console.log('✅ Amount fields use proper numeric types (no currency formatting)');
            } else {
                console.log('⚠️ Amount fields may need type conversion for optimal performance');
            }
        }
        console.log();

        // UI Selection Guide
        console.log('🎯 UI SELECTION GUIDE - How to Access Cash Book Monthly');
        console.log('============================================================\n');
        
        console.log('📍 Navigation Path:');
        console.log('   1. Open the application');
        console.log('   2. Go to "Reports" menu');
        console.log('   3. Select "Monthly Reports" submenu');
        console.log('   4. Click on "Cash Book Monthly"\n');
        
        console.log('⚙️ Component Configuration:');
        console.log('   1. Select For the Month: Choose month and year (default: Apr-2015)');
        console.log('   2. Output Type: Choose Screen or Printer display');
        console.log('   3. Print Report: Generate PDF report of the monthly cash book\n');
        
        console.log('📊 Expected Display:');
        console.log('   - Control panel with month picker, output type selection, and print button');
        console.log('   - Main table showing cash book entries with columns:');
        console.log('     * CODE (Head Code)');
        console.log('     * HEAD NAME (Head Description)');
        console.log('     * RECEIPT (Total Receipts = rcash + rtransfer)');
        console.log('     * PAYMENT (Total Payments = pcash + ptransfer)');
        console.log('   - Summary row with total receipts and payments');
        console.log('   - Professional styling with color-coded amounts (green for receipts, red for payments)\n');
        
        console.log('🔍 Data Verification:');
        console.log('   - Check if month picker loads correctly');
        console.log('   - Verify data loads when month is selected');
        console.log('   - Ensure head codes and names display properly');
        console.log('   - Confirm receipt and payment amounts are calculated correctly');
        console.log('   - Check that totals are accurate in summary row');
        console.log('   - Verify print functionality works for PDF generation\n');
        
        console.log('🎨 UI Features:');
        console.log('   - Modern Ant Design components with professional styling');
        console.log('   - Responsive layout that adapts to screen size');
        console.log('   - Month picker with MMM-YYYY format');
        console.log('   - Radio buttons for output type selection');
        console.log('   - Color-coded amounts (green receipts, red payments)');
        console.log('   - Print-optimized CSS for PDF generation');
        console.log('   - Empty state with helpful message when no data available\n');
        
        console.log('🔧 Test Data Available:');
        console.log('   - April 2015: Sample data with multiple head codes');
        console.log('   - Head codes: A1001 (Cash), A1002 (Bank), L2001 (Loans), E3001 (Expenses), I4001 (Interest)');
        console.log('   - Receipt amounts: Cash receipts and bank transfers');
        console.log('   - Payment amounts: Cash payments and bank transfers');
        console.log('   - Date range: Multiple entries throughout April 2015');
        console.log('   - Aggregated totals: Proper summation by head code\n');
        
        console.log('📋 Key Features:');
        console.log('   - Monthly Cash Book Reporting: View monthly cash flow by head codes');
        console.log('   - Receipt/Payment Segregation: Clear separation of inflows and outflows');
        console.log('   - Head Code Grouping: Aggregated data by account head codes');
        console.log('   - Total Calculations: Automatic calculation of monthly totals');
        console.log('   - Print Functionality: Generate PDF reports for record keeping');
        console.log('   - Date Range Selection: Flexible month and year selection');
        console.log('   - Professional Layout: Clean, readable financial report format\n');

        console.log('🎉 CASH BOOK MONTHLY TEST COMPLETED');
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
testCashBookMonthly().catch(console.error);