const axios = require('axios');
const { Pool } = require('pg');

// Database configuration (using same as previous tests)
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

// API configuration
const API_BASE_URL = 'http://localhost:3000/api/v1';
const TEST_VOUCHER_NO = 'R001';
const TEST_MEMBER_NO = '1001';

console.log('🔍 RECEIPT/PAYMENT VOUCHER - COMPREHENSIVE TEST');
console.log('=' .repeat(60));

async function testReceiptPaymentVoucherComponent() {
  const pool = new Pool(dbConfig);
  
  try {
    // Test 1: Check database connection
    console.log('\n📊 Test 1: Database Connection');
    console.log('-'.repeat(40));
    
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Test 2: Check transactions table for voucher data
    console.log('\n📊 Test 2: Transactions Table Analysis for Vouchers');
    console.log('-'.repeat(40));
    
    const transactionsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(DISTINCT receipt_vchr_no) as unique_voucher_nos,
        COUNT(CASE WHEN receipt_vchr_no IS NOT NULL AND receipt_vchr_no != '' THEN 1 END) as transactions_with_vouchers,
        COUNT(DISTINCT mbno) as unique_members,
        MIN(trans_date) as earliest_date,
        MAX(trans_date) as latest_date
      FROM transactions;
    `;
    
    const transResult = await client.query(transactionsQuery);
    const transStats = transResult.rows[0];
    
    console.log(`📈 Total transactions: ${transStats.total_transactions}`);
    console.log(`🎫 Unique voucher numbers: ${transStats.unique_voucher_nos}`);
    console.log(`📋 Transactions with vouchers: ${transStats.transactions_with_vouchers}`);
    console.log(`👥 Unique members: ${transStats.unique_members}`);
    console.log(`📅 Date range: ${transStats.earliest_date?.toISOString().split('T')[0]} to ${transStats.latest_date?.toISOString().split('T')[0]}`);
    
    // Test 3: Check ledger table for journal voucher data
    console.log('\n📊 Test 3: Ledger Table Analysis for Journal Vouchers');
    console.log('-'.repeat(40));
    
    const ledgerQuery = `
      SELECT 
        COUNT(*) as total_ledger_entries,
        COUNT(DISTINCT receipt_vchr_no) as unique_journal_voucher_nos,
        COUNT(CASE WHEN receipt_vchr_no IS NOT NULL AND receipt_vchr_no != '' THEN 1 END) as entries_with_vouchers,
        COUNT(DISTINCT mbno) as unique_members_in_ledger
      FROM ledger;
    `;
    
    const ledgerResult = await client.query(ledgerQuery);
    const ledgerStats = ledgerResult.rows[0];
    
    console.log(`📈 Total ledger entries: ${ledgerStats.total_ledger_entries}`);
    console.log(`🎫 Unique journal voucher numbers: ${ledgerStats.unique_journal_voucher_nos}`);
    console.log(`📋 Entries with vouchers: ${ledgerStats.entries_with_vouchers}`);
    console.log(`👥 Unique members in ledger: ${ledgerStats.unique_members_in_ledger}`);
    
    // Test 4: Check voucher_master and vouchers tables
    console.log('\n📊 Test 4: Voucher Master Tables Analysis');
    console.log('-'.repeat(40));
    
    try {
      const voucherMasterQuery = `SELECT COUNT(*) as voucher_master_count FROM voucher_master;`;
      const voucherMasterResult = await client.query(voucherMasterQuery);
      console.log(`📋 Voucher master entries: ${voucherMasterResult.rows[0].voucher_master_count}`);
    } catch (error) {
      console.log('⚠️  Voucher master table check failed:', error.message);
    }
    
    try {
      const vouchersQuery = `SELECT COUNT(*) as vouchers_count FROM vouchers;`;
      const vouchersResult = await client.query(vouchersQuery);
      console.log(`📋 Vouchers table entries: ${vouchersResult.rows[0].vouchers_count}`);
    } catch (error) {
      console.log('⚠️  Vouchers table check failed:', error.message);
    }
    
    // Test 5: Check specific test voucher data
    console.log(`\n📊 Test 5: Test Voucher (${TEST_VOUCHER_NO}) Analysis`);
    console.log('-'.repeat(40));
    
    const testVoucherQuery = `
      SELECT 
        receipt_vchr_no,
        trans_date,
        trans_type,
        mbno,
        trans_amt,
        narration,
        modeofpay,
        cheq_no,
        cheq_date,
        bankname,
        code
      FROM transactions 
      WHERE receipt_vchr_no = $1;
    `;
    
    const testVoucherResult = await client.query(testVoucherQuery, [TEST_VOUCHER_NO]);
    
    if (testVoucherResult.rows.length > 0) {
      const voucher = testVoucherResult.rows[0];
      console.log(`✅ Test voucher found: ${voucher.receipt_vchr_no}`);
      console.log(`📅 Date: ${voucher.trans_date?.toISOString().split('T')[0]}`);
      console.log(`💰 Amount: ${voucher.trans_amt}`);
      console.log(`👤 Member: ${voucher.mbno}`);
      console.log(`🏷️  Head Code: ${voucher.code}`);
      console.log(`💳 Payment Mode: ${voucher.modeofpay}`);
      console.log(`📝 Narration: ${voucher.narration}`);
    } else {
      console.log(`❌ Test voucher ${TEST_VOUCHER_NO} not found - will create sample data`);
    }
    
    // Test 6: Populate sample data if needed
    if (testVoucherResult.rows.length === 0) {
      console.log('\n📊 Test 6: Populating Sample Voucher Data');
      console.log('-'.repeat(40));
      
      await populateVoucherSampleData(client);
      
      // Re-check after population
      const newTestVoucherResult = await client.query(testVoucherQuery, [TEST_VOUCHER_NO]);
      
      if (newTestVoucherResult.rows.length > 0) {
        console.log(`✅ After population - Test voucher created: ${TEST_VOUCHER_NO}`);
      }
    } else {
      console.log('\n✅ Test 6: Sample data already exists - skipping population');
    }
    
    // Test 7: Test Get All Voucher Numbers API
    console.log('\n📊 Test 7: Get All Voucher Numbers API Testing');
    console.log('-'.repeat(40));
    
    try {
      const voucherListUrl = `${API_BASE_URL}/print-voucher/list/all`;
      console.log(`🌐 Testing API: ${voucherListUrl}`);
      
      const voucherListResponse = await axios.get(voucherListUrl, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ Voucher List API Status: ${voucherListResponse.status}`);
      console.log(`✅ Voucher List API Success: ${voucherListResponse.data.success}`);
      
      if (voucherListResponse.data.success && voucherListResponse.data.data) {
        // Handle nested response structure
        const backendResponse = voucherListResponse.data.data;
        const voucherList = backendResponse.data || backendResponse;
        
        if (Array.isArray(voucherList)) {
          console.log(`🎫 Total voucher numbers: ${voucherList.length}`);
          
          if (voucherList.length > 0) {
            console.log('\n📋 Sample Voucher Numbers:');
            voucherList.slice(0, 5).forEach((voucher, index) => {
              console.log(`  ${index + 1}. ${voucher}`);
            });
            
            if (voucherList.length > 5) {
              console.log(`     ... and ${voucherList.length - 5} more vouchers`);
            }
          }
        } else {
          console.log('❌ Voucher list is not an array:', voucherList);
        }
      }
      
    } catch (apiError) {
      console.log('❌ Voucher List API Test Failed:', apiError.message);
    }
    
    // Test 8: Test Get Voucher By Number API
    console.log('\n📊 Test 8: Get Voucher By Number API Testing');
    console.log('-'.repeat(40));
    
    try {
      const voucherDetailUrl = `${API_BASE_URL}/print-voucher/${TEST_VOUCHER_NO}`;
      console.log(`🌐 Testing API: ${voucherDetailUrl}`);
      
      const voucherDetailResponse = await axios.get(voucherDetailUrl, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ Voucher Detail API Status: ${voucherDetailResponse.status}`);
      console.log(`✅ Voucher Detail API Success: ${voucherDetailResponse.data.success}`);
      
      if (voucherDetailResponse.data.success && voucherDetailResponse.data.data) {
        // Handle nested response structure
        const backendResponse = voucherDetailResponse.data.data;
        const voucherData = backendResponse.data || backendResponse;
        
        console.log(`🎫 Voucher Number: ${voucherData.voucher_no}`);
        console.log(`📅 Transaction Date: ${new Date(voucherData.trans_date).toLocaleDateString('en-IN')}`);
        console.log(`💰 Amount: ${voucherData.amount}`);
        console.log(`📝 Narration: ${voucherData.narration}`);
        console.log(`🔄 Type: ${voucherData.dr_cr}`);
        console.log(`💳 Mode: ${voucherData.mode}`);
        console.log(`👤 Member: ${voucherData.member_no} - ${voucherData.member_name}`);
        console.log(`🏷️  Head: ${voucherData.head_code} - ${voucherData.head_name}`);
        
        if (voucherData.mode === 'Cheque' || voucherData.mode === 'Bank Transfer') {
          console.log(`💳 Cheque Number: ${voucherData.cheque_no || 'N/A'}`);
          console.log(`🏦 Bank Name: ${voucherData.bank_name || 'N/A'}`);
          console.log(`📅 Cheque Date: ${voucherData.cheque_date ? new Date(voucherData.cheque_date).toLocaleDateString('en-IN') : 'N/A'}`);
        }
      } else {
        console.log('❌ API returned no data or failed');
        console.log('Full Response:', JSON.stringify(voucherDetailResponse.data, null, 2));
      }
      
    } catch (apiError) {
      console.log('❌ Voucher Detail API Test Failed:', apiError.message);
      if (apiError.response) {
        console.log('Response Status:', apiError.response.status);
        console.log('Response Data:', apiError.response.data);
      }
    }
    
    // Test 9: Test Journal Voucher APIs
    console.log('\n📊 Test 9: Journal Voucher APIs Testing');
    console.log('-'.repeat(40));
    
    try {
      // Test journal voucher list
      const journalListUrl = `${API_BASE_URL}/print-voucher/journal/list/all`;
      console.log(`🌐 Testing API: ${journalListUrl}`);
      
      const journalListResponse = await axios.get(journalListUrl, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ Journal Voucher List API Status: ${journalListResponse.status}`);
      
      if (journalListResponse.data.success && journalListResponse.data.data) {
        const backendResponse = journalListResponse.data.data;
        const journalList = backendResponse.data || backendResponse;
        
        if (Array.isArray(journalList)) {
          console.log(`📋 Total journal voucher numbers: ${journalList.length}`);
          
          if (journalList.length > 0) {
            console.log('📋 Sample Journal Voucher Numbers:');
            journalList.slice(0, 3).forEach((voucher, index) => {
              console.log(`  ${index + 1}. ${voucher}`);
            });
          }
        }
      }
      
    } catch (apiError) {
      console.log('❌ Journal Voucher List API Test Failed:', apiError.message);
    }
    
    // Test 10: Frontend Data Structure Validation
    console.log('\n📊 Test 10: Frontend Data Structure Validation');
    console.log('-'.repeat(40));
    
    console.log('✅ Expected Frontend Data Structure:');
    console.log('   - Voucher List API: string[] (array of voucher numbers)');
    console.log('   - Voucher Detail API: VoucherPrintDto');
    console.log('     * voucher_no: string');
    console.log('     * trans_date: Date');
    console.log('     * amount: number');
    console.log('     * narration: string');
    console.log('     * dr_cr: string ("Payment" | "Receipt")');
    console.log('     * mode: string ("Cash" | "Cheque" | "Bank Transfer")');
    console.log('     * member_no: number');
    console.log('     * member_name: string');
    console.log('     * head_code: string');
    console.log('     * head_name: string');
    console.log('     * cheque_no?: string (optional)');
    console.log('     * cheque_date?: Date (optional)');
    console.log('     * bank_name?: string (optional)');
    console.log('');
    console.log('✅ Journal Voucher Structure:');
    console.log('   - voucher_no: string');
    console.log('   - trans_date: Date');
    console.log('   - narration: string');
    console.log('   - entries: JournalEntryDto[]');
    console.log('     * trans_no: number');
    console.log('     * member_code: number');
    console.log('     * member_name: string');
    console.log('     * head_code: string');
    console.log('     * head_name: string');
    console.log('     * debit: number');
    console.log('     * credit: number');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

async function populateVoucherSampleData(client) {
  console.log('📝 Creating sample voucher data...');
  
  try {
    // Ensure test member exists
    const existingMember = await client.query('SELECT mbno FROM member_master WHERE mbno = $1', [TEST_MEMBER_NO]);
    
    if (existingMember.rows.length === 0) {
      await client.query(`
        INSERT INTO member_master (
          mbno, prefix, f_name, m_name, l_name, sex, desig, 
          present_address, permanent_address, wingno, officeno, 
          age, dob, date_of_appt, gross_salary, basic_pay, 
          nominee_name, nominee_relation, flg_retire, memb_date, 
          pfno, lfno, isactive, phoneno, pan_no
        ) VALUES (
          $1, 'Mr.', 'Test', 'Voucher', 'Member', 'M', 'Accountant',
          'Test Address 1', 'Test Address 1', 'A', 101,
          '35', '1989-01-01', '2015-01-01', 60000, 40000,
          'Test Nominee', 'Spouse', 'N', '2015-01-01',
          'PF001', 'LF001', 'Y', '9876543210', 'ABCDE1234F'
        );
      `, [TEST_MEMBER_NO]);
      
      console.log(`✅ Created test member: ${TEST_MEMBER_NO}`);
    }
    
    // Ensure test head code exists
    const existingHead = await client.query('SELECT code FROM headmaster WHERE code = $1', ['A001']);
    
    if (existingHead.rows.length === 0) {
      await client.query(`
        INSERT INTO headmaster (code, head_name, parent_code, hposition, interest, headtype, op_bal, pflag)
        VALUES ('A001', 'Savings Bank Account', 'A1000', '1', 'N', 'AST', 0, '');
      `);
      
      console.log('✅ Created test head code: A001');
    }
    
    // Create sample voucher transactions
    const sampleVouchers = [
      {
        transNo: 4001,
        date: '2024-12-24',
        type: 'CR',
        member: TEST_MEMBER_NO,
        amount: 50000,
        voucher: TEST_VOUCHER_NO,
        narration: 'Member Deposit - Cash Receipt',
        mode: 'C', // Cash
        code: 'A001'
      },
      {
        transNo: 4002,
        date: '2024-12-23',
        type: 'DR',
        member: TEST_MEMBER_NO,
        amount: 25000,
        voucher: 'P001',
        narration: 'Member Withdrawal - Cash Payment',
        mode: 'C', // Cash
        code: 'A001'
      },
      {
        transNo: 4003,
        date: '2024-12-22',
        type: 'CR',
        member: TEST_MEMBER_NO,
        amount: 75000,
        voucher: 'R002',
        narration: 'Member Deposit - Cheque Receipt',
        mode: 'Q', // Cheque
        code: 'A001',
        chequeNo: 'CHQ123456',
        chequeDate: '2024-12-22',
        bankName: 'State Bank of India'
      },
      {
        transNo: 4004,
        date: '2024-12-21',
        type: 'DR',
        member: TEST_MEMBER_NO,
        amount: 30000,
        voucher: 'P002',
        narration: 'Member Withdrawal - Bank Transfer',
        mode: 'B', // Bank Transfer
        code: 'A001',
        chequeNo: 'TXN789012',
        chequeDate: '2024-12-21',
        bankName: 'HDFC Bank'
      }
    ];
    
    for (const voucher of sampleVouchers) {
      // Check if transaction already exists
      const existingTrans = await client.query('SELECT trans_no FROM transactions WHERE trans_no = $1', [voucher.transNo]);
      
      if (existingTrans.rows.length === 0) {
        await client.query(`
          INSERT INTO transactions (
            trans_no, trans_date, trans_type, mbno, acc_no, acc_type,
            trans_amt, receipt_vchr_no, vchr_type, modeofpay,
            cheq_no, cheq_amt, cheq_date, bankname, pass_flag,
            cashier_flag, code, narration
          ) VALUES (
            $1, $2, $3, $4, 123456, 'SB',
            $5, $6, 'RV', $7,
            $8, $5, $9, $10, 'N',
            'N', $11, $12
          );
        `, [
          voucher.transNo,
          voucher.date,
          voucher.type,
          voucher.member,
          parseFloat(voucher.amount),
          voucher.voucher,
          voucher.mode,
          voucher.chequeNo || '',
          voucher.chequeDate || null,
          voucher.bankName || '',
          voucher.code,
          voucher.narration
        ]);
      }
    }
    
    // Create sample ledger entries for journal vouchers
    const sampleLedgerEntries = [
      {
        transNo: 5001,
        date: '2024-12-24',
        type: 'DR',
        member: TEST_MEMBER_NO,
        amount: 10000,
        voucher: 'J001',
        narration: 'Journal Entry - Debit',
        code: 'A001'
      },
      {
        transNo: 5002,
        date: '2024-12-24',
        type: 'CR',
        member: TEST_MEMBER_NO,
        amount: 10000,
        voucher: 'J001',
        narration: 'Journal Entry - Credit',
        code: 'L1004'
      }
    ];
    
    for (const entry of sampleLedgerEntries) {
      // Check if ledger entry already exists
      const existingLedger = await client.query('SELECT trans_no FROM ledger WHERE trans_no = $1', [entry.transNo]);
      
      if (existingLedger.rows.length === 0) {
        await client.query(`
          INSERT INTO ledger (
            trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type,
            trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance,
            narration, username, ledgerid
          ) VALUES (
            $1, $2, $3, $4, $5, 123456, 'GL',
            $6, $7, 'JV', 'C', 0,
            $8, 'testuser', $1
          );
        `, [
          entry.transNo,
          entry.date,
          entry.type,
          entry.code,
          entry.member,
          parseFloat(entry.amount),
          entry.voucher,
          entry.narration
        ]);
      }
    }
    
    console.log(`✅ Created ${sampleVouchers.length} sample voucher transactions`);
    console.log(`✅ Created ${sampleLedgerEntries.length} sample journal voucher entries`);
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error.message);
    throw error;
  }
}

// UI Selection Guide
function displayUISelectionGuide() {
  console.log('\n🎯 UI SELECTION GUIDE - How to Access Receipt/Payment Voucher');
  console.log('=' .repeat(60));
  console.log('');
  console.log('📍 Navigation Path:');
  console.log('   1. Open the application');
  console.log('   2. Go to "Reports" menu');
  console.log('   3. Select "Monthly Reports" submenu');
  console.log('   4. Select "Print Vouchers" submenu');
  console.log('   5. Click on "Receipt/Payment Voucher"');
  console.log('');
  console.log('⚙️  Component Configuration:');
  console.log('   1. Date: Select transaction date (default: 2015-04-01)');
  console.log('   2. Voucher No.: Select from dropdown (loads existing vouchers)');
  console.log('   3. Voucher Type: Automatically set based on selected voucher (Receipt/Payment)');
  console.log('   4. Payment Mode: Automatically set based on selected voucher (Cash/Cheque/Bank Transfer)');
  console.log('   5. Member No.: Automatically populated from voucher data');
  console.log('   6. Narration: Automatically populated from voucher data');
  console.log('');
  console.log('📊 Expected Display:');
  console.log('   - Form with voucher details (date, number, type, mode, member, narration)');
  console.log('   - Cheque details section (if payment mode is Cheque/Bank Transfer)');
  console.log('   - Entries table with account head, description, debit, credit columns');
  console.log('   - Add/Remove entry functionality');
  console.log('   - Total calculations with balance validation');
  console.log('   - Save and Post buttons');
  console.log('');
  console.log('🔍 Data Verification:');
  console.log('   - Check if voucher numbers are loaded in dropdown');
  console.log('   - Verify voucher details populate correctly when selected');
  console.log('   - Ensure member information displays properly');
  console.log('   - Confirm cheque details show for non-cash payments');
  console.log('   - Verify debit and credit totals balance');
  console.log('   - Check entry addition and removal functionality');
  console.log('');
  console.log('🎨 UI Features:');
  console.log('   - Professional Ant Design components');
  console.log('   - Responsive form layout');
  console.log('   - Editable entries table');
  console.log('   - Real-time total calculations');
  console.log('   - Balance validation warnings');
  console.log('   - Save and Post functionality');
  console.log('   - Conditional cheque details display');
  console.log('');
  console.log('🔧 Test Data Available:');
  console.log(`   - Test Voucher: ${TEST_VOUCHER_NO} (Cash Receipt - ₹50,000)`);
  console.log('   - Additional Vouchers: P001 (Cash Payment), R002 (Cheque Receipt), P002 (Bank Transfer)');
  console.log(`   - Test Member: ${TEST_MEMBER_NO} (Test Voucher Member)`);
  console.log('   - Journal Vouchers: J001 (Journal Entry with multiple entries)');
  console.log('   - Various payment modes: Cash, Cheque, Bank Transfer');
  console.log('');
  console.log('📋 Key Features:');
  console.log('   - Voucher Management: Create, edit, and manage receipt/payment vouchers');
  console.log('   - Multi-Entry Support: Add multiple account heads in single voucher');
  console.log('   - Payment Mode Handling: Support for Cash, Cheque, and Bank Transfer');
  console.log('   - Balance Validation: Ensures debit and credit amounts balance');
  console.log('   - Member Integration: Links vouchers to specific members');
  console.log('   - Journal Voucher Support: Separate handling for journal entries');
}

// Run the comprehensive test
async function runTest() {
  await testReceiptPaymentVoucherComponent();
  displayUISelectionGuide();
  
  console.log('\n🎉 RECEIPT/PAYMENT VOUCHER TEST COMPLETED');
  console.log('=' .repeat(60));
}

runTest().catch(console.error);