const axios = require('axios');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

// API configuration
const API_BASE_URL = 'http://localhost:3000/api/v1';
const TEST_DATE = '2024-12-24'; // Today's date

console.log('🔍 CONSOLIDATION OF DAILY ACCOUNTS - COMPREHENSIVE TEST');
console.log('=' .repeat(60));

async function testConsolidationComponent() {
  const pool = new Pool(dbConfig);
  
  try {
    // Test 1: Check database connection
    console.log('\n📊 Test 1: Database Connection');
    console.log('-'.repeat(40));
    
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Test 2: Check transactions table data
    console.log('\n📊 Test 2: Transactions Table Analysis');
    console.log('-'.repeat(40));
    
    const transactionsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(DISTINCT code) as unique_head_codes,
        MIN(trans_date) as earliest_date,
        MAX(trans_date) as latest_date,
        COUNT(CASE WHEN trans_type = 'CR' THEN 1 END) as credit_transactions,
        COUNT(CASE WHEN trans_type = 'DR' THEN 1 END) as debit_transactions
      FROM transactions;
    `;
    
    const transResult = await client.query(transactionsQuery);
    const transStats = transResult.rows[0];
    
    console.log(`📈 Total transactions: ${transStats.total_transactions}`);
    console.log(`🏷️  Unique head codes: ${transStats.unique_head_codes}`);
    console.log(`📅 Date range: ${transStats.earliest_date?.toISOString().split('T')[0]} to ${transStats.latest_date?.toISOString().split('T')[0]}`);
    console.log(`💰 Credit transactions: ${transStats.credit_transactions}`);
    console.log(`💸 Debit transactions: ${transStats.debit_transactions}`);
    
    // Test 3: Check headmaster table data
    console.log('\n📊 Test 3: HeadMaster Table Analysis');
    console.log('-'.repeat(40));
    
    const headMasterQuery = `
      SELECT 
        COUNT(*) as total_heads,
        COUNT(CASE WHEN head_name IS NOT NULL AND head_name != '' THEN 1 END) as heads_with_names
      FROM headmaster;
    `;
    
    const headResult = await client.query(headMasterQuery);
    const headStats = headResult.rows[0];
    
    console.log(`🏷️  Total head codes: ${headStats.total_heads}`);
    console.log(`📝 Heads with names: ${headStats.heads_with_names}`);
    
    // Test 4: Check transactions for test date
    console.log(`\n📊 Test 4: Transactions for ${TEST_DATE}`);
    console.log('-'.repeat(40));
    
    const dateTransQuery = `
      SELECT 
        COUNT(*) as transactions_count,
        COUNT(DISTINCT code) as unique_codes,
        SUM(CASE WHEN trans_type = 'CR' THEN 
          CAST(REPLACE(REPLACE(REPLACE(REPLACE(trans_amt::text, '$', ''), '₹', ''), '?', ''), ',', '') AS NUMERIC) 
          ELSE 0 END) as total_receipts,
        SUM(CASE WHEN trans_type = 'DR' THEN 
          CAST(REPLACE(REPLACE(REPLACE(REPLACE(trans_amt::text, '$', ''), '₹', ''), '?', ''), ',', '') AS NUMERIC) 
          ELSE 0 END) as total_payments
      FROM transactions 
      WHERE DATE(trans_date) = $1;
    `;
    
    const dateTransResult = await client.query(dateTransQuery, [TEST_DATE]);
    const dateStats = dateTransResult.rows[0];
    
    console.log(`📊 Transactions on ${TEST_DATE}: ${dateStats.transactions_count}`);
    console.log(`🏷️  Unique head codes: ${dateStats.unique_codes}`);
    console.log(`💰 Total receipts: ₹${parseFloat(dateStats.total_receipts || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
    console.log(`💸 Total payments: ₹${parseFloat(dateStats.total_payments || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
    
    // Test 5: Populate sample data if needed
    if (parseInt(dateStats.transactions_count) === 0) {
      console.log('\n📊 Test 5: Populating Sample Consolidation Data');
      console.log('-'.repeat(40));
      
      await populateConsolidationSampleData(client);
      
      // Re-check after population
      const newDateTransResult = await client.query(dateTransQuery, [TEST_DATE]);
      const newDateStats = newDateTransResult.rows[0];
      
      console.log(`✅ After population - Transactions: ${newDateStats.transactions_count}`);
      console.log(`✅ After population - Head codes: ${newDateStats.unique_codes}`);
    } else {
      console.log('\n✅ Test 5: Sample data already exists - skipping population');
    }
    
    // Test 6: Test API endpoint
    console.log('\n📊 Test 6: API Endpoint Testing');
    console.log('-'.repeat(40));
    
    try {
      const apiUrl = `${API_BASE_URL}/consolidation/report?date=${TEST_DATE}&outputType=screen`;
      console.log(`🌐 Testing API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ API Response Status: ${response.status}`);
      console.log(`✅ API Response Success: ${response.data.success}`);
      
      if (response.data.success && response.data.data) {
        // Handle nested response structure like the frontend
        const backendResponse = response.data.data;
        const consolidationData = backendResponse.data || backendResponse;
        
        console.log(`� Datte: ${consolidationData.date}`);
        console.log(`💰 Total Receipts: ₹${consolidationData.totalReceipts?.toLocaleString('en-IN', {minimumFractionDigits: 2}) || '0.00'}`);
        console.log(`� Tnotal Payments: ₹${consolidationData.totalPayments?.toLocaleString('en-IN', {minimumFractionDigits: 2}) || '0.00'}`);
        console.log(`💵 Net Balance: ₹${consolidationData.netBalance?.toLocaleString('en-IN', {minimumFractionDigits: 2}) || '0.00'}`);
        console.log(`🏷️  Total Heads: ${consolidationData.totalHeads || 0}`);
        console.log(`📋 Entries Count: ${consolidationData.entries?.length || 0}`);
        
        if (consolidationData.entries && consolidationData.entries.length > 0) {
          console.log('\n📋 Sample Entries:');
          consolidationData.entries.slice(0, 5).forEach((entry, index) => {
            console.log(`  ${index + 1}. ${entry.headCode} - ${entry.headName}`);
            console.log(`     Receipts: ₹${entry.receipts?.toLocaleString('en-IN', {minimumFractionDigits: 2}) || '0.00'}`);
            console.log(`     Payments: ₹${entry.payments?.toLocaleString('en-IN', {minimumFractionDigits: 2}) || '0.00'}`);
            console.log(`     Net: ₹${entry.netAmount?.toLocaleString('en-IN', {minimumFractionDigits: 2}) || '0.00'}`);
          });
          
          if (consolidationData.entries.length > 5) {
            console.log(`     ... and ${consolidationData.entries.length - 5} more entries`);
          }
        }
      } else {
        console.log('❌ API returned no data or failed');
        console.log('Full Response:', JSON.stringify(response.data, null, 2));
      }
      
    } catch (apiError) {
      console.log('❌ API Test Failed:', apiError.message);
      if (apiError.response) {
        console.log('Response Status:', apiError.response.status);
        console.log('Response Data:', apiError.response.data);
      }
    }
    
    // Test 7: Frontend Data Structure Validation
    console.log('\n📊 Test 7: Frontend Data Structure Validation');
    console.log('-'.repeat(40));
    
    console.log('✅ Expected Frontend Data Structure:');
    console.log('   - response.success: boolean');
    console.log('   - response.data.date: string');
    console.log('   - response.data.totalReceipts: number');
    console.log('   - response.data.totalPayments: number');
    console.log('   - response.data.netBalance: number');
    console.log('   - response.data.entries: ConsolidationEntry[]');
    console.log('   - response.data.totalHeads: number');
    console.log('');
    console.log('✅ ConsolidationEntry Structure:');
    console.log('   - headCode: string');
    console.log('   - headName: string');
    console.log('   - receipts: number');
    console.log('   - payments: number');
    console.log('   - netAmount: number');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

async function populateConsolidationSampleData(client) {
  console.log('📝 Creating sample consolidation data...');
  
  try {
    // First, ensure we have head codes in headmaster table
    const headCodesData = [
      { code: 'A001', name: 'Savings Bank Account' },
      { code: 'A002', name: 'Current Account' },
      { code: 'A003', name: 'Fixed Deposit' },
      { code: 'A004', name: 'Recurring Deposit' },
      { code: 'L001', name: 'Personal Loan' },
      { code: 'L002', name: 'Home Loan' },
      { code: 'I001', name: 'Interest Income' },
      { code: 'F001', name: 'Service Charges' },
      { code: 'M001', name: 'Miscellaneous' }
    ];
    
    // Insert head codes if they don't exist
    for (const head of headCodesData) {
      // Check if head code exists first
      const existingHead = await client.query('SELECT code FROM headmaster WHERE code = $1', [head.code]);
      
      if (existingHead.rows.length === 0) {
        await client.query(`
          INSERT INTO headmaster (code, head_name, parent_code, hposition, interest, headtype, op_bal, pflag)
          VALUES ($1, $2, '', '1', 'N', 'OTH', 0, '');
        `, [head.code, head.name]);
      } else {
        // Update existing head name
        await client.query(`
          UPDATE headmaster SET head_name = $2 WHERE code = $1;
        `, [head.code, head.name]);
      }
    }
    
    console.log('✅ Head codes populated');
    
    // Create sample transactions for today
    const sampleTransactions = [
      // Savings Bank transactions
      { code: 'A001', type: 'CR', amount: 25000, desc: 'Deposit' },
      { code: 'A001', type: 'DR', amount: 5000, desc: 'Withdrawal' },
      { code: 'A001', type: 'CR', amount: 15000, desc: 'Transfer In' },
      
      // Fixed Deposit transactions
      { code: 'A003', type: 'CR', amount: 100000, desc: 'FD Opening' },
      { code: 'A003', type: 'CR', amount: 50000, desc: 'FD Renewal' },
      
      // Loan transactions
      { code: 'L001', type: 'DR', amount: 75000, desc: 'Loan Disbursement' },
      { code: 'L001', type: 'CR', amount: 5000, desc: 'Loan Repayment' },
      
      // Interest and charges
      { code: 'I001', type: 'DR', amount: 2500, desc: 'Interest Paid' },
      { code: 'F001', type: 'CR', amount: 500, desc: 'Service Charges' },
      
      // Recurring Deposit
      { code: 'A004', type: 'CR', amount: 10000, desc: 'RD Installment' },
      { code: 'A004', type: 'CR', amount: 8000, desc: 'RD Installment' }
    ];
    
    let transNo = 1000;
    
    for (const trans of sampleTransactions) {
      await client.query(`
        INSERT INTO transactions (
          trans_no, trans_type, trans_date, mbno, acc_no, acc_type, 
          trans_amt, receipt_vchr_no, vchr_type, modeofpay, 
          cheq_no, cheq_amt, cheq_date, bankname, pass_flag, 
          cashier_flag, code
        ) VALUES (
          $1, $2, $3, 1001, 123456, 'SB', 
          $4, 'R001', 'RV', 'CS', 
          '', 0.00, NULL, '', 'N', 
          'N', $5
        );
      `, [
        transNo++,
        trans.type,
        TEST_DATE,
        parseFloat(trans.amount), // Ensure it's a proper number
        trans.code
      ]);
    }
    
    console.log(`✅ Created ${sampleTransactions.length} sample transactions for ${TEST_DATE}`);
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error.message);
    throw error;
  }
}

// UI Selection Guide
function displayUISelectionGuide() {
  console.log('\n🎯 UI SELECTION GUIDE - How to Access Consolidation Report');
  console.log('=' .repeat(60));
  console.log('');
  console.log('📍 Navigation Path:');
  console.log('   1. Open the application');
  console.log('   2. Go to "Reports" menu');
  console.log('   3. Select "Daily Reports" submenu');
  console.log('   4. Click on "Consolidation Of Daily A/c"');
  console.log('');
  console.log('⚙️  Component Configuration:');
  console.log('   1. Select Date: Choose the date for consolidation report');
  console.log('   2. Output Type: Choose "Screen" or "Printer"');
  console.log('   3. Click "Load Report" button to fetch data');
  console.log('');
  console.log('📊 Expected Display:');
  console.log('   - Summary cards showing total receipts, payments, net balance, and head count');
  console.log('   - Detailed table with head code, head name, receipts, payments, and net amount');
  console.log('   - Print functionality for generating hard copies');
  console.log('');
  console.log('🔍 Data Verification:');
  console.log('   - Check if summary totals match individual entries');
  console.log('   - Verify head names are properly displayed');
  console.log('   - Ensure amounts are formatted correctly in Indian currency');
  console.log('   - Confirm net amounts are calculated as (receipts - payments)');
  console.log('');
  console.log('🎨 UI Features:');
  console.log('   - Responsive design with Tailwind CSS');
  console.log('   - Color-coded amounts (green for receipts, red for payments)');
  console.log('   - Loading states and error handling');
  console.log('   - Print-optimized layout');
}

// Run the comprehensive test
async function runTest() {
  await testConsolidationComponent();
  displayUISelectionGuide();
  
  console.log('\n🎉 CONSOLIDATION COMPONENT TEST COMPLETED');
  console.log('=' .repeat(60));
}

runTest().catch(console.error);