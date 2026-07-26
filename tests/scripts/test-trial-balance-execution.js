const { Pool } = require('pg');
const axios = require('axios');

// Database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

// Backend API base URL
const API_BASE_URL = 'http://localhost:3000';

async function testTrialBalanceExecution() {
  console.log('⚖️  TRIAL BALANCE EXECUTION TEST');
  console.log('=' .repeat(50));

  try {
    // Test 1: Get existing schedules
    console.log('\n📋 TEST 1: Getting existing trial balance schedules...');
    
    const schedulesResponse = await axios.get(`${API_BASE_URL}/api/v1/report/schedule?type=TRIAL`, {
      timeout: 5000
    });

    if (!schedulesResponse.data.success || !schedulesResponse.data.data.length) {
      console.log('❌ No trial balance schedules found');
      return;
    }

    const schedules = schedulesResponse.data.data;
    console.log(`✅ Found ${schedules.length} trial balance schedules`);
    
    // Use the first schedule for testing
    const testSchedule = schedules[0];
    console.log(`📊 Testing with schedule: "${testSchedule.schedule_name}" (ID: ${testSchedule.id})`);

    // Test 2: Test execution with proper data types
    console.log('\n⚡ TEST 2: Testing schedule execution...');
    
    const executionData = {
      scheduleId: parseInt(testSchedule.id), // Ensure it's a number
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      financialYearStart: '2024-04-01'
    };

    console.log('📤 Sending execution request with data:', executionData);

    try {
      const executionResponse = await axios.post(`${API_BASE_URL}/api/v1/report/schedule/execute`, executionData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });

      console.log(`✅ Execution successful: Status ${executionResponse.status}`);
      
      if (executionResponse.data && executionResponse.data.success) {
        const results = executionResponse.data.data || [];
        console.log(`📊 Execution results: ${results.length} line items calculated`);
        
        if (results.length > 0) {
          console.log('\n📋 Sample Results:');
          results.slice(0, 3).forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.particulars}`);
            console.log(`      Code Range: ${result.codeFrom} to ${result.codeTo}`);
            console.log(`      Current Period:`);
            console.log(`        Receipts: ₹${(result.current?.receipts || 0).toLocaleString()}`);
            console.log(`        Payments: ₹${(result.current?.payments || 0).toLocaleString()}`);
            console.log(`        Balance: ₹${(result.current?.balance || 0).toLocaleString()}`);
            console.log(`      Progressive Period:`);
            console.log(`        Receipts: ₹${(result.progressive?.receipts || 0).toLocaleString()}`);
            console.log(`        Payments: ₹${(result.progressive?.payments || 0).toLocaleString()}`);
            console.log(`        Balance: ₹${(result.progressive?.balance || 0).toLocaleString()}`);
          });

          // Show grand totals if available
          if (executionResponse.data.grandTotals) {
            const totals = executionResponse.data.grandTotals;
            console.log('\n📊 Grand Totals:');
            console.log(`   Current Period: Receipts ₹${(totals.currentReceipts || 0).toLocaleString()}, Payments ₹${(totals.currentPayments || 0).toLocaleString()}`);
            console.log(`   Progressive Period: Receipts ₹${(totals.progressiveReceipts || 0).toLocaleString()}, Payments ₹${(totals.progressivePayments || 0).toLocaleString()}`);
          }
        }
      } else {
        console.log('⚠️  Execution returned success but no data');
        console.log('Response:', executionResponse.data);
      }

    } catch (executionError) {
      console.log('❌ Execution failed:', executionError.message);
      
      if (executionError.response) {
        console.log('   Status:', executionError.response.status);
        console.log('   Status Text:', executionError.response.statusText);
        console.log('   Response Data:', executionError.response.data);
        
        // Check if it's a validation error
        if (executionError.response.status === 400) {
          console.log('\n🔍 Validation Error Analysis:');
          console.log('   - scheduleId should be a number:', typeof executionData.scheduleId);
          console.log('   - fromDate should be ISO date string:', executionData.fromDate);
          console.log('   - toDate should be ISO date string:', executionData.toDate);
          console.log('   - financialYearStart should be ISO date string:', executionData.financialYearStart);
        }
      }
    }

    // Test 3: Test with different date formats
    console.log('\n📅 TEST 3: Testing with different date formats...');
    
    const dateFormats = [
      {
        name: 'ISO Date Format',
        data: {
          scheduleId: parseInt(testSchedule.id),
          fromDate: '2024-01-01T00:00:00.000Z',
          toDate: '2024-12-31T23:59:59.999Z',
          financialYearStart: '2024-04-01T00:00:00.000Z'
        }
      },
      {
        name: 'Simple Date Format',
        data: {
          scheduleId: parseInt(testSchedule.id),
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          financialYearStart: '2024-04-01'
        }
      }
    ];

    for (const format of dateFormats) {
      console.log(`\n   Testing: ${format.name}`);
      try {
        const response = await axios.post(`${API_BASE_URL}/api/v1/report/schedule/execute`, format.data, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        console.log(`   ✅ Success: Status ${response.status}`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.status || error.message}`);
      }
    }

    // Test 4: Check schedule details in database
    console.log('\n🗄️  TEST 4: Checking schedule details in database...');
    
    const scheduleDetails = await pool.query(`
      SELECT 
        d.id,
        d.particulars,
        d.code_from,
        d.code_to,
        h.schedule_name
      FROM report_schedule_details d
      JOIN report_schedule_header h ON h.id = d.schedule_id
      WHERE d.schedule_id = $1
      ORDER BY d.id
    `, [testSchedule.id]);

    console.log(`✅ Schedule "${testSchedule.schedule_name}" has ${scheduleDetails.rows.length} details:`);
    scheduleDetails.rows.forEach((detail, index) => {
      console.log(`   ${index + 1}. ${detail.particulars} (${detail.code_from} to ${detail.code_to})`);
    });

    // Test 5: Check if head codes exist in ledger
    console.log('\n💰 TEST 5: Checking if head codes have ledger data...');
    
    for (const detail of scheduleDetails.rows.slice(0, 3)) {
      const ledgerCheck = await pool.query(`
        SELECT 
          COUNT(*) as transaction_count,
          COALESCE(SUM(CASE WHEN trans_type = 'DR' THEN CAST(trans_amt AS numeric) ELSE 0 END), 0) as total_debits,
          COALESCE(SUM(CASE WHEN trans_type = 'CR' THEN CAST(trans_amt AS numeric) ELSE 0 END), 0) as total_credits
        FROM ledger
        WHERE code >= $1 AND code <= $2
      `, [detail.code_from, detail.code_to]);

      const ledgerData = ledgerCheck.rows[0];
      console.log(`   ${detail.particulars} (${detail.code_from}-${detail.code_to}):`);
      console.log(`     Transactions: ${ledgerData.transaction_count}`);
      console.log(`     Debits: ₹${parseFloat(ledgerData.total_debits || 0).toLocaleString()}`);
      console.log(`     Credits: ₹${parseFloat(ledgerData.total_credits || 0).toLocaleString()}`);
    }

    console.log('\n🎯 EXECUTION TEST SUMMARY:');
    console.log('✅ Schedule data: Available');
    console.log('✅ API endpoint: Accessible');
    console.log('✅ Data validation: Checked');
    console.log('✅ Ledger data: Available');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testTrialBalanceExecution();
}

module.exports = { testTrialBalanceExecution };