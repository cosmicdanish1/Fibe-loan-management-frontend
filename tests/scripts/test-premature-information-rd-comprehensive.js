const { Pool } = require('pg');
const axios = require('axios');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

const API_BASE_URL = 'http://localhost:3001/api/v1';

console.log('🧪 Testing Premature Information RD Component');
console.log('='.repeat(60));

async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testBackendConnection() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend connection successful');
    return true;
  } catch (error) {
    console.log('⚠️  Backend connection failed, will test database directly');
    return false;
  }
}

async function checkRDTables() {
  console.log('\n📊 Checking RD-related tables...');
  
  const tables = [
    'recurring_deposits',
    'rd_installments', 
    'member_master',
    'deposit_slabs',
    'interest_rates'
  ];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(result.rows[0].count);
      console.log(`   ${table}: ${count} records`);
      
      if (count === 0) {
        console.log(`   ⚠️  ${table} is empty - will populate sample data`);
      }
    } catch (error) {
      console.log(`   ❌ ${table}: Error - ${error.message}`);
    }
  }
}

async function checkMemberData() {
  console.log('\n👥 Checking member data for RD accounts...');
  
  try {
    // Check if we have members with RD accounts
    const memberQuery = `
      SELECT DISTINCT m.mbno, m.f_name, m.l_name, m.basic_pay, m.officeno
      FROM member_master m
      WHERE m.mbno IS NOT NULL 
      AND m.f_name IS NOT NULL
      LIMIT 5
    `;
    
    const members = await pool.query(memberQuery);
    console.log(`   Found ${members.rows.length} sample members`);
    
    if (members.rows.length > 0) {
      members.rows.forEach((member, index) => {
        console.log(`   ${index + 1}. Member ${member.mbno}: ${member.f_name} ${member.l_name || ''} (Basic Pay: ${member.basic_pay})`);
      });
      return members.rows;
    }
    
    return [];
  } catch (error) {
    console.error('   ❌ Error checking member data:', error.message);
    return [];
  }
}

async function checkRDAccountData() {
  console.log('\n🏦 Checking RD account data...');
  
  try {
    const rdQuery = `
      SELECT rd.*, m.f_name, m.l_name, m.mbno
      FROM recurring_deposits rd
      LEFT JOIN member_master m ON rd."memberId" = m.mbno
      WHERE rd.status = 'ACTIVE'
      LIMIT 5
    `;
    
    const rdAccounts = await pool.query(rdQuery);
    console.log(`   Found ${rdAccounts.rows.length} active RD accounts`);
    
    if (rdAccounts.rows.length > 0) {
      rdAccounts.rows.forEach((account, index) => {
        console.log(`   ${index + 1}. Account ${account.accountNumber}: ${account.f_name} ${account.l_name || ''}`);
        console.log(`      Monthly: ₹${account.monthlyInstallment}, Rate: ${account.interestRate}%, Tenure: ${account.tenureMonths} months`);
      });
      return rdAccounts.rows;
    }
    
    return [];
  } catch (error) {
    console.error('   ❌ Error checking RD account data:', error.message);
    return [];
  }
}

async function populateRDSampleData() {
  console.log('\n🔄 Populating RD sample data...');
  
  try {
    // First, ensure we have deposit slabs
    const slabCheck = await pool.query('SELECT COUNT(*) as count FROM deposit_slabs');
    if (parseInt(slabCheck.rows[0].count) === 0) {
      console.log('   📝 Creating deposit slabs...');
      await pool.query(`
        INSERT INTO deposit_slabs (id, name, description, type, "minAmount", "maxAmount", "minTenure", "maxTenure", "interestRate", "penaltyRate", "isActive", "effectiveFrom", "createdAt", "updatedAt")
        VALUES 
        (1, 'RD Standard', 'Standard Recurring Deposit', 'RD', 500, 50000, 12, 120, 8.5, 1.0, true, '2024-01-01', NOW(), NOW()),
        (2, 'RD Premium', 'Premium Recurring Deposit', 'RD', 1000, 100000, 24, 120, 9.0, 1.0, true, '2024-01-01', NOW(), NOW()),
        (3, 'RD Senior', 'Senior Citizen RD', 'RD', 500, 75000, 12, 120, 9.5, 0.5, true, '2024-01-01', NOW(), NOW())
      `);
    }
    
    // Get sample members
    const members = await pool.query(`
      SELECT mbno, f_name, l_name, basic_pay 
      FROM member_master 
      WHERE mbno IS NOT NULL AND f_name IS NOT NULL 
      LIMIT 10
    `);
    
    if (members.rows.length === 0) {
      console.log('   ❌ No members found to create RD accounts');
      return;
    }
    
    // Create sample RD accounts
    console.log('   📝 Creating sample RD accounts...');
    
    for (let i = 0; i < Math.min(5, members.rows.length); i++) {
      const member = members.rows[i];
      const accountNumber = `RD${String(member.mbno).padStart(6, '0')}${String(i + 1).padStart(2, '0')}`;
      const monthlyInstallment = 1000 + (i * 500);
      const interestRate = 8.5 + (i * 0.25);
      const tenureMonths = 24 + (i * 12);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - (i * 3)); // Stagger start dates
      
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);
      
      // Calculate maturity amount (simplified)
      const totalDeposited = monthlyInstallment * tenureMonths;
      const maturityAmount = totalDeposited * (1 + (interestRate / 100) * (tenureMonths / 12));
      
      try {
        await pool.query(`
          INSERT INTO recurring_deposits (
            "accountNumber", "memberId", "monthlyInstallment", "interestRate", 
            "startDate", "maturityDate", "tenureMonths", "maturityAmount", 
            "totalDeposited", "interestAccrued", "installmentsPaid", 
            "installmentsMissed", "status", "nextDueDate", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
          ON CONFLICT ("accountNumber") DO NOTHING
        `, [
          accountNumber, member.mbno, monthlyInstallment, interestRate,
          startDate, maturityDate, tenureMonths, Math.round(maturityAmount),
          totalDeposited, 0, i * 2, 0, 'ACTIVE', 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next due in 30 days
        ]);
        
        console.log(`   ✅ Created RD account ${accountNumber} for member ${member.mbno} (${member.f_name})`);
        
        // Create some installment records
        for (let j = 1; j <= i * 2; j++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + j - 1);
          
          const paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * 10)); // Random payment delay
          
          await pool.query(`
            INSERT INTO rd_installments (
              "recurringDepositId", "installmentNumber", "amount", "dueDate", 
              "paidDate", "paidAmount", "status", "paymentMode", "createdAt", "updatedAt"
            ) 
            SELECT rd.id, $1, $2, $3, $4, $5, 'PAID', 'CASH', NOW(), NOW()
            FROM recurring_deposits rd 
            WHERE rd."accountNumber" = $6
          `, [j, monthlyInstallment, dueDate, paidDate, monthlyInstallment, accountNumber]);
        }
        
      } catch (error) {
        console.log(`   ⚠️  Account ${accountNumber} might already exist or error: ${error.message}`);
      }
    }
    
    console.log('   ✅ Sample RD data populated successfully');
    
  } catch (error) {
    console.error('   ❌ Error populating RD sample data:', error.message);
  }
}

async function testPrematureCalculation() {
  console.log('\n🧮 Testing premature withdrawal calculation...');
  
  try {
    // Get a sample RD account
    const rdQuery = `
      SELECT rd.*, m.f_name, m.l_name
      FROM recurring_deposits rd
      LEFT JOIN member_master m ON rd."memberId" = m.mbno
      WHERE rd.status = 'ACTIVE'
      LIMIT 1
    `;
    
    const rdResult = await pool.query(rdQuery);
    
    if (rdResult.rows.length === 0) {
      console.log('   ❌ No active RD accounts found for testing');
      return;
    }
    
    const account = rdResult.rows[0];
    console.log(`   📊 Testing with account: ${account.accountNumber}`);
    console.log(`   👤 Member: ${account.f_name} ${account.l_name || ''}`);
    
    // Calculate premature withdrawal details
    const startDate = new Date(account.startDate);
    const currentDate = new Date();
    const monthsCompleted = Math.floor((currentDate - startDate) / (30 * 24 * 60 * 60 * 1000));
    
    // Get installments paid
    const installmentsQuery = `
      SELECT COUNT(*) as paid_count, SUM(amount) as total_paid
      FROM rd_installments ri
      JOIN recurring_deposits rd ON ri."recurringDepositId" = rd.id
      WHERE rd."accountNumber" = $1 AND ri.status = 'PAID'
    `;
    
    const installmentsResult = await pool.query(installmentsQuery, [account.accountNumber]);
    const installmentData = installmentsResult.rows[0];
    
    const totalPaid = parseFloat(installmentData.total_paid || 0);
    const installmentsPaid = parseInt(installmentData.paid_count || 0);
    
    // Calculate premature interest rate (typically lower)
    const prematureRate = parseFloat(account.interestRate) - 1.0; // 1% penalty
    const timeInYears = monthsCompleted / 12;
    
    // Simple interest calculation for premature withdrawal
    const interestEarned = (totalPaid * prematureRate * timeInYears) / 100;
    const maturityAmount = totalPaid + interestEarned;
    
    console.log('   📈 Premature Calculation Results:');
    console.log(`      Duration: ${monthsCompleted} months (${timeInYears.toFixed(2)} years)`);
    console.log(`      Installments Paid: ${installmentsPaid}`);
    console.log(`      Total Deposited: ₹${totalPaid.toFixed(2)}`);
    console.log(`      Original Rate: ${account.interestRate}%`);
    console.log(`      Premature Rate: ${prematureRate}%`);
    console.log(`      Interest Earned: ₹${interestEarned.toFixed(2)}`);
    console.log(`      Maturity Amount: ₹${maturityAmount.toFixed(2)}`);
    
    return {
      accountNumber: account.accountNumber,
      memberName: `${account.f_name} ${account.l_name || ''}`,
      duration: monthsCompleted,
      totalDeposited: totalPaid,
      interestRate: prematureRate,
      interestEarned: interestEarned,
      maturityAmount: maturityAmount
    };
    
  } catch (error) {
    console.error('   ❌ Error testing premature calculation:', error.message);
    return null;
  }
}

async function testUtilityAPIs() {
  console.log('\n🔌 Testing Utility APIs...');
  
  try {
    // Test member search API
    console.log('   🔍 Testing member search...');
    const memberResponse = await axios.get(`${API_BASE_URL}/utilities/search/members?query=test&limit=5`);
    console.log(`   ✅ Member search API working: ${memberResponse.data.data?.length || 0} results`);
    
    // Test calculation API
    console.log('   🧮 Testing calculation service...');
    const calcResponse = await axios.post(`${API_BASE_URL}/utilities/calculation/emi`, {
      principal: 10000,
      annualRate: 8.5,
      tenureMonths: 24
    });
    console.log('   ✅ Calculation API working');
    
  } catch (error) {
    console.log('   ⚠️  Utility APIs not available, using direct database access');
  }
}

async function generateTestReport() {
  console.log('\n📋 Generating Test Report...');
  
  try {
    // Summary statistics
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM member_master WHERE mbno IS NOT NULL) as total_members,
        (SELECT COUNT(*) FROM recurring_deposits) as total_rd_accounts,
        (SELECT COUNT(*) FROM recurring_deposits WHERE status = 'ACTIVE') as active_rd_accounts,
        (SELECT COUNT(*) FROM rd_installments WHERE status = 'PAID') as paid_installments,
        (SELECT SUM("monthlyInstallment") FROM recurring_deposits WHERE status = 'ACTIVE') as total_monthly_collection
    `);
    
    const summary = stats.rows[0];
    
    console.log('   📊 Database Summary:');
    console.log(`      Total Members: ${summary.total_members}`);
    console.log(`      Total RD Accounts: ${summary.total_rd_accounts}`);
    console.log(`      Active RD Accounts: ${summary.active_rd_accounts}`);
    console.log(`      Paid Installments: ${summary.paid_installments}`);
    console.log(`      Monthly Collection: ₹${parseFloat(summary.total_monthly_collection || 0).toFixed(2)}`);
    
    // Sample data for UI testing
    const sampleData = await pool.query(`
      SELECT 
        rd."accountNumber",
        rd."memberId",
        m.f_name || ' ' || COALESCE(m.l_name, '') as member_name,
        rd."monthlyInstallment",
        rd."interestRate",
        rd."tenureMonths",
        rd."startDate",
        rd."maturityDate",
        rd.status
      FROM recurring_deposits rd
      LEFT JOIN member_master m ON rd."memberId" = m.mbno
      WHERE rd.status = 'ACTIVE'
      LIMIT 3
    `);
    
    console.log('\n   🎯 Sample Data for UI Testing:');
    sampleData.rows.forEach((account, index) => {
      console.log(`   ${index + 1}. Member No: ${account.memberId}`);
      console.log(`      Account: ${account.accountNumber}`);
      console.log(`      Name: ${account.member_name}`);
      console.log(`      Monthly: ₹${account.monthlyInstallment}, Rate: ${account.interestRate}%`);
      console.log(`      Start: ${new Date(account.startDate).toLocaleDateString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('   ❌ Error generating test report:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Premature Information RD Tests...\n');
  
  // Test database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('❌ Cannot proceed without database connection');
    return;
  }
  
  // Test backend connection
  const backendConnected = await testBackendConnection();
  
  // Check table structure and data
  await checkRDTables();
  
  // Check member data
  const members = await checkMemberData();
  
  // Check RD account data
  const rdAccounts = await checkRDAccountData();
  
  // Populate sample data if needed
  if (rdAccounts.length === 0) {
    await populateRDSampleData();
  }
  
  // Test premature calculation
  const calculationResult = await testPrematureCalculation();
  
  // Test utility APIs if backend is available
  if (backendConnected) {
    await testUtilityAPIs();
  }
  
  // Generate final report
  await generateTestReport();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Premature Information RD Testing Complete!');
  console.log('\n📝 UI Testing Instructions:');
  console.log('1. Open the Premature Information RD page');
  console.log('2. Enter a member number from the sample data above');
  console.log('3. Select an RD account from the dropdown');
  console.log('4. The system should calculate premature withdrawal details');
  console.log('5. Verify the calculation matches the expected results');
  
  if (calculationResult) {
    console.log('\n🎯 Expected Results for Testing:');
    console.log(`   Account: ${calculationResult.accountNumber}`);
    console.log(`   Member: ${calculationResult.memberName}`);
    console.log(`   Duration: ${calculationResult.duration} months`);
    console.log(`   Total Deposited: ₹${calculationResult.totalDeposited.toFixed(2)}`);
    console.log(`   Premature Rate: ${calculationResult.interestRate}%`);
    console.log(`   Interest: ₹${calculationResult.interestEarned.toFixed(2)}`);
    console.log(`   Total Amount: ₹${calculationResult.maturityAmount.toFixed(2)}`);
  }
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);