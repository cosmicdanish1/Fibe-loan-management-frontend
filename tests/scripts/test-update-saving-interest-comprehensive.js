const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testUpdateSavingInterestComponent() {
  console.log('🔍 Testing UpdateSavingInterest Component Comprehensive Analysis\n');
  
  try {
    // Test 1: Check Database Tables for Interest Management
    console.log('1️⃣ Checking Interest-Related Database Tables...');
    await checkInterestTables();
    
    // Test 2: Test Backend API Endpoints
    console.log('\n2️⃣ Testing Backend API Endpoints...');
    await testInterestAPIs();
    
    // Test 3: Check Data Requirements
    console.log('\n3️⃣ Analyzing Data Requirements...');
    await analyzeDataRequirements();
    
    // Test 4: Populate Sample Data if Needed
    console.log('\n4️⃣ Populating Sample Data if Required...');
    await populateSampleInterestData();
    
    // Test 5: Test Complete Workflow
    console.log('\n5️⃣ Testing Complete Interest Calculation Workflow...');
    await testCompleteWorkflow();
    
    // Test 6: Frontend Data Validation
    console.log('\n6️⃣ Validating Frontend Data Requirements...');
    await validateFrontendRequirements();
    
    // Test 7: UI Data Display Test
    console.log('\n7️⃣ Testing UI Data Display Requirements...');
    await testUIDataDisplay();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

async function checkInterestTables() {
  console.log('   📋 Checking interest-related tables...');
  
  const tables = [
    'interestmaster',
    'interestpaid', 
    'interest_rates',
    'interest_postings',
    'fd_interest_master',
    'savings_accounts',
    'member_master',
    'ledger'
  ];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(result.rows[0].count);
      console.log(`   ✅ ${table}: ${count} records`);
      
      if (count === 0 && ['interestmaster', 'interest_rates'].includes(table)) {
        console.log(`   ⚠️ ${table} is empty - will need sample data`);
      }
    } catch (error) {
      console.log(`   ❌ ${table}: Table not found or error - ${error.message}`);
    }
  }
}

async function testInterestAPIs() {
  const baseURL = 'http://localhost:3001/api/v1';
  
  const endpoints = [
    { name: 'Current Interest Rate', url: '/interest/current-rate', method: 'GET' },
    { name: 'Interest History', url: '/interest/history', method: 'GET' },
    { name: 'Validate Parameters', url: '/interest/validate-parameters', method: 'POST' },
    { name: 'Preview Calculation', url: '/interest/preview-calculation', method: 'POST' },
    { name: 'Update Saving Interest', url: '/interest/update-saving-interest', method: 'POST' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(`${baseURL}${endpoint.url}`);
      } else {
        // Sample POST data for testing
        const sampleData = {
          fromDate: '2024-01-01',
          toDate: '2024-03-31',
          interestRate: 4.0,
          accountHead: 'A1001',
          voucherNumber: 'TEST001',
          narration: 'Test interest calculation'
        };
        response = await axios.post(`${baseURL}${endpoint.url}`, sampleData);
      }
      
      console.log(`   ✅ ${endpoint.name}: ${response.status} - Available`);
      
      if (endpoint.name === 'Current Interest Rate' && response.data?.data?.rate) {
        console.log(`      Current Rate: ${response.data.data.rate}%`);
      }
      
      if (endpoint.name === 'Interest History' && response.data?.data) {
        const history = response.data.data;
        console.log(`      History Records: ${Array.isArray(history) ? history.length : 0}`);
      }
      
    } catch (error) {
      const status = error.response?.status || 'Unknown';
      const message = error.response?.data?.message || error.message;
      console.log(`   ⚠️ ${endpoint.name}: ${status} - ${message}`);
    }
  }
}

async function analyzeDataRequirements() {
  console.log('   📊 Analyzing what data the frontend needs...');
  
  // Check member accounts for interest calculation
  try {
    const memberAccountsQuery = `
      SELECT COUNT(*) as total_members,
             COUNT(CASE WHEN sa."accountNumber" IS NOT NULL THEN 1 END) as members_with_savings_accounts
      FROM member_master mm
      LEFT JOIN savings_accounts sa ON mm.mbno = sa."memberId"
    `;
    
    const result = await pool.query(memberAccountsQuery);
    const data = result.rows[0];
    
    console.log(`   📈 Total Members: ${data.total_members}`);
    console.log(`   💰 Members with Savings Accounts: ${data.members_with_savings_accounts}`);
    
    // Check if we have balance data
    const balanceQuery = `
      SELECT COUNT(*) as accounts_with_balance,
             AVG("currentBalance"::numeric) as avg_balance,
             SUM("currentBalance"::numeric) as total_balance
      FROM savings_accounts 
      WHERE "currentBalance"::numeric > 0
    `;
    
    const balanceResult = await pool.query(balanceQuery);
    const balanceData = balanceResult.rows[0];
    console.log(`   💵 Accounts with Balance: ${balanceData.accounts_with_balance}`);
    console.log(`   💰 Average Balance: ₹${parseFloat(balanceData.avg_balance || 0).toFixed(2)}`);
    console.log(`   💸 Total Balance: ₹${parseFloat(balanceData.total_balance || 0).toFixed(2)}`);
    
    // Check interest master data
    const interestMasterQuery = `
      SELECT COUNT(*) as interest_records,
             MAX(rate::numeric) as max_rate,
             MIN(rate::numeric) as min_rate
      FROM interestmaster
    `;
    
    try {
      const interestResult = await pool.query(interestMasterQuery);
      const intData = interestResult.rows[0];
      console.log(`   📋 Interest Master Records: ${intData.interest_records}`);
      if (intData.interest_records > 0) {
        console.log(`   📊 Rate Range: ${intData.min_rate}% - ${intData.max_rate}%`);
      }
    } catch (error) {
      console.log(`   ⚠️ Interest Master: No data or table issues`);
    }
    
    // Check ledger data for balance calculation
    const ledgerQuery = `
      SELECT COUNT(*) as ledger_records,
             COUNT(DISTINCT mbno) as members_with_transactions
      FROM ledger 
      WHERE trans_date >= CURRENT_DATE - INTERVAL '1 year'
    `;
    
    const ledgerResult = await pool.query(ledgerQuery);
    const ledgerData = ledgerResult.rows[0];
    console.log(`   📊 Recent Ledger Records: ${ledgerData.ledger_records}`);
    console.log(`   👥 Members with Transactions: ${ledgerData.members_with_transactions}`);
    
  } catch (error) {
    console.log(`   ❌ Error analyzing data: ${error.message}`);
  }
}

async function populateSampleInterestData() {
  console.log('   🔧 Populating sample interest data...');
  
  try {
    // 1. Ensure we have active interest rates
    const rateCheck = await pool.query('SELECT COUNT(*) as count FROM interest_rates WHERE "isActive" = true');
    if (parseInt(rateCheck.rows[0].count) === 0) {
      console.log('   📝 Creating sample interest rates...');
      
      await pool.query(`
        INSERT INTO interest_rates (
          id, name, type, rate, "calculationMethod", 
          "minAmount", "maxAmount", "isActive", "effectiveFrom", "createdAt", "updatedAt"
        )
        VALUES 
        (1, 'Savings Account Interest', 'SB', 4.0, 'DAILY_BALANCE', 1000, NULL, true, CURRENT_DATE - INTERVAL '1 year', NOW(), NOW()),
        (2, 'Fixed Deposit Interest', 'FD', 6.5, 'COMPOUND', 5000, NULL, true, CURRENT_DATE - INTERVAL '1 year', NOW(), NOW()),
        (3, 'Recurring Deposit Interest', 'RD', 5.5, 'COMPOUND', 500, NULL, true, CURRENT_DATE - INTERVAL '1 year', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
        rate = EXCLUDED.rate,
        "updatedAt" = NOW()
      `);
      
      console.log('   ✅ Sample interest rates created');
    }
    
    // 2. Ensure we have more savings accounts with balances
    const savingsCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM savings_accounts 
      WHERE "currentBalance"::numeric > 1000
    `);
    
    if (parseInt(savingsCheck.rows[0].count) < 20) {
      console.log('   📝 Creating more savings accounts with balances...');
      
      // Get members without savings accounts
      const membersWithoutAccounts = await pool.query(`
        SELECT mm.mbno, CONCAT(mm.f_name, ' ', mm.l_name) as name 
        FROM member_master mm
        LEFT JOIN savings_accounts sa ON mm.mbno = sa."memberId"
        WHERE sa."memberId" IS NULL
        LIMIT 20
      `);
      
      for (const member of membersWithoutAccounts.rows) {
        const accountNumber = `SB${member.mbno}001`;
        const balance = Math.floor(Math.random() * 100000) + 10000; // Random balance between 10k-110k
        const interestRate = 4.0 + (Math.random() * 2); // 4.0% to 6.0%
        
        await pool.query(`
          INSERT INTO savings_accounts (
            "accountNumber", "memberId", "accountType", "openingDate", 
            "interestRate", "minimumBalance", "currentBalance", status, 
            "lastTransactionDate", "createdAt", "updatedAt"
          )
          VALUES ($1, $2, 'SB', CURRENT_DATE - INTERVAL '6 months', $3, 1000, $4, 'ACTIVE', CURRENT_DATE, NOW(), NOW())
          ON CONFLICT ("accountNumber") DO UPDATE SET
          "currentBalance" = EXCLUDED."currentBalance",
          "updatedAt" = NOW()
        `, [accountNumber, member.mbno, interestRate, balance]);
      }
      
      console.log('   ✅ Additional savings accounts created');
    }
    
    // 3. Create sample ledger entries for balance calculation
    const recentLedgerCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM ledger 
      WHERE trans_date >= CURRENT_DATE - INTERVAL '3 months'
      AND acc_type = 'SB'
    `);
    
    if (parseInt(recentLedgerCheck.rows[0].count) < 100) {
      console.log('   📝 Creating sample ledger entries for savings accounts...');
      
      const savingsAccounts = await pool.query(`
        SELECT "accountNumber", "memberId", "currentBalance" 
        FROM savings_accounts 
        WHERE status = 'ACTIVE'
        LIMIT 15
      `);
      
      for (const account of savingsAccounts.rows) {
        // Create some transactions over the last 3 months
        for (let i = 0; i < 8; i++) {
          const transactionDate = new Date();
          transactionDate.setDate(transactionDate.getDate() - (i * 10)); // Every 10 days
          
          const amount = Math.floor(Math.random() * 5000) + 1000;
          const isCredit = Math.random() > 0.3; // 70% credit, 30% debit
          
          await pool.query(`
            INSERT INTO ledger (
              trans_no, trans_date, trans_type, code, mbno, 
              acc_no, acc_type, trans_amt, receipt_vchr_no, 
              vchr_type, pl_balance, narration, username
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            Date.now() + i,
            transactionDate.toISOString().split('T')[0],
            isCredit ? 'CR' : 'DR',
            account.accountNumber,
            account.memberId,
            account.accountNumber,
            'SB',
            amount,
            `V${Date.now()}${i}`,
            isCredit ? 'DEPOSIT' : 'WITHDRAWAL',
            account.currentBalance,
            isCredit ? 'Cash Deposit' : 'Cash Withdrawal',
            'system'
          ]);
        }
      }
      
      console.log('   ✅ Sample ledger entries created');
    }
    
  } catch (error) {
    console.log(`   ❌ Error populating data: ${error.message}`);
  }
}

async function testCompleteWorkflow() {
  console.log('   🔄 Testing complete interest calculation workflow...');
  
  const baseURL = 'http://localhost:3001/api/v1';
  
  // Test data for interest calculation
  const testData = {
    fromDate: '2024-10-01',
    toDate: '2024-12-31',
    interestRate: 4.0,
    accountHead: 'A1001',
    voucherNumber: 'TEST_' + Date.now(),
    narration: 'Test quarterly interest calculation'
  };
  
  try {
    // Step 1: Validate parameters
    console.log('   📋 Step 1: Validating parameters...');
    const validateResponse = await axios.post(`${baseURL}/interest/validate-parameters`, testData);
    
    if (validateResponse.data?.success) {
      const validation = validateResponse.data.data;
      console.log(`   ✅ Validation: ${validation.valid ? 'Valid' : 'Invalid'}`);
      console.log(`   📊 Eligible Members: ${validation.eligibleMembers || 0}`);
      console.log(`   📅 Period Days: ${validation.days || 0}`);
      
      if (validation.valid && validation.eligibleMembers > 0) {
        // Step 2: Preview calculation
        console.log('   👁️ Step 2: Generating preview...');
        const previewResponse = await axios.post(`${baseURL}/interest/preview-calculation`, testData);
        
        if (previewResponse.data?.success) {
          const preview = previewResponse.data.data;
          console.log(`   ✅ Preview Generated:`);
          console.log(`      Total Members: ${preview.totalMembers || 0}`);
          console.log(`      Total Interest: ₹${preview.totalInterestAmount || 0}`);
          console.log(`      Interest Rate: ${preview.interestRate || 0}%`);
          
          if (preview.memberCalculations && preview.memberCalculations.length > 0) {
            console.log(`   📋 Sample calculations:`);
            preview.memberCalculations.slice(0, 3).forEach((calc, index) => {
              console.log(`      ${index + 1}. ${calc.memberName} (${calc.memberNumber}): ₹${calc.interestAmount}`);
            });
          }
        } else {
          console.log(`   ⚠️ Preview failed: ${previewResponse.data?.message || 'Unknown error'}`);
        }
      } else {
        console.log(`   ⚠️ No eligible members found for interest calculation`);
      }
    } else {
      console.log(`   ⚠️ Validation failed: ${validateResponse.data?.message || 'Unknown error'}`);
    }
    
  } catch (error) {
    const status = error.response?.status || 'Unknown';
    const message = error.response?.data?.message || error.message;
    console.log(`   ❌ Workflow test failed: ${status} - ${message}`);
  }
}

async function validateFrontendRequirements() {
  console.log('   🎯 Validating frontend data requirements...');
  
  // Check what the frontend expects vs what we have
  const requirements = [
    {
      name: 'Current Interest Rate',
      check: async () => {
        const result = await pool.query('SELECT rate FROM interest_rates WHERE type = \'SB\' AND "isActive" = true LIMIT 1');
        return result.rows.length > 0 ? result.rows[0].rate : null;
      }
    },
    {
      name: 'Interest History',
      check: async () => {
        const result = await pool.query('SELECT COUNT(*) as count FROM interestpaid');
        return parseInt(result.rows[0].count);
      }
    },
    {
      name: 'Member Accounts for Calculation',
      check: async () => {
        const result = await pool.query(`
          SELECT COUNT(*) as count 
          FROM member_master m
          INNER JOIN savings_accounts s ON m.mbno = s."memberId"
          WHERE s."currentBalance"::numeric > 0 AND s.status = 'ACTIVE'
        `);
        return parseInt(result.rows[0].count);
      }
    },
    {
      name: 'Ledger Data for Balance Calculation',
      check: async () => {
        const result = await pool.query(`
          SELECT COUNT(*) as count 
          FROM ledger 
          WHERE trans_date >= CURRENT_DATE - INTERVAL '1 year'
        `);
        return parseInt(result.rows[0].count);
      }
    },
    {
      name: 'Active Savings Accounts',
      check: async () => {
        const result = await pool.query(`
          SELECT COUNT(*) as count 
          FROM savings_accounts 
          WHERE status = 'ACTIVE' AND "currentBalance"::numeric >= "minimumBalance"::numeric
        `);
        return parseInt(result.rows[0].count);
      }
    }
  ];
  
  for (const req of requirements) {
    try {
      const result = await req.check();
      if (result !== null && result > 0) {
        console.log(`   ✅ ${req.name}: ${result}`);
      } else {
        console.log(`   ⚠️ ${req.name}: No data available`);
      }
    } catch (error) {
      console.log(`   ❌ ${req.name}: Error - ${error.message}`);
    }
  }
}

async function testUIDataDisplay() {
  console.log('   🖥️ Testing UI data display requirements...');
  
  try {
    // Test current rate display
    const currentRate = await pool.query(`
      SELECT rate, name, "effectiveFrom" 
      FROM interest_rates 
      WHERE type = 'SB' AND "isActive" = true 
      ORDER BY "effectiveFrom" DESC 
      LIMIT 1
    `);
    
    if (currentRate.rows.length > 0) {
      const rate = currentRate.rows[0];
      console.log(`   ✅ Current Rate Display: ${rate.rate}% (${rate.name})`);
    } else {
      console.log(`   ⚠️ Current Rate Display: No active rate found`);
    }
    
    // Test interest history for sidebar
    const history = await pool.query(`
      SELECT COUNT(*) as total_runs,
             MAX(paydate) as last_run,
             SUM(amount::numeric) as total_interest_paid
      FROM interestpaid
    `);
    
    const historyData = history.rows[0];
    console.log(`   ✅ Interest History: ${historyData.total_runs} runs, Last: ${historyData.last_run || 'Never'}`);
    console.log(`   💰 Total Interest Paid: ₹${parseFloat(historyData.total_interest_paid || 0).toFixed(2)}`);
    
    // Test member eligibility for calculation
    const eligibility = await pool.query(`
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN "currentBalance"::numeric >= "minimumBalance"::numeric THEN 1 END) as eligible_accounts,
        AVG("currentBalance"::numeric) as avg_balance
      FROM savings_accounts 
      WHERE status = 'ACTIVE'
    `);
    
    const eligData = eligibility.rows[0];
    console.log(`   ✅ Account Eligibility: ${eligData.eligible_accounts}/${eligData.total_accounts} accounts eligible`);
    console.log(`   💵 Average Balance: ₹${parseFloat(eligData.avg_balance || 0).toFixed(2)}`);
    
    // Summary of what should be visible in UI
    console.log('\n   📋 Frontend UI Data Expectations:');
    console.log('   ✅ Current interest rate should be loaded and displayed');
    console.log('   ✅ Date fields should be pre-populated with current quarter');
    console.log('   ✅ Interest history should show in sidebar (if available)');
    console.log('   ✅ Validation should show eligible member count');
    console.log('   ✅ Preview should show calculation summary and member list');
    console.log('   ✅ Process button should create interest entries and vouchers');
    
    // Test sample calculation
    const sampleCalc = await pool.query(`
      SELECT 
        sa."accountNumber",
        CONCAT(mm.f_name, ' ', mm.l_name) as memberName,
        sa."memberId",
        sa."currentBalance"::numeric as currentBalance,
        sa."interestRate"::numeric as interestRate,
        (sa."currentBalance"::numeric * sa."interestRate"::numeric / 100 / 4) as quarterly_interest
      FROM savings_accounts sa
      INNER JOIN member_master mm ON sa."memberId" = mm.mbno
      WHERE sa.status = 'ACTIVE' AND sa."currentBalance"::numeric >= sa."minimumBalance"::numeric
      LIMIT 5
    `);
    
    if (sampleCalc.rows.length > 0) {
      console.log('\n   🧮 Sample Interest Calculations (Quarterly):');
      sampleCalc.rows.forEach((calc, index) => {
        console.log(`   ${index + 1}. ${calc.membername} (${calc.memberId}): ₹${parseFloat(calc.quarterly_interest).toFixed(2)}`);
      });
    }
    
  } catch (error) {
    console.log(`   ❌ UI data test failed: ${error.message}`);
  }
}

// Run the comprehensive test
testUpdateSavingInterestComponent();