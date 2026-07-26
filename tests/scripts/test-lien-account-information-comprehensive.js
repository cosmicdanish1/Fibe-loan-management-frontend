const { Pool } = require('pg');
const axios = require('axios');

// Database configuration
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testLienAccountInformation() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 LIEN ACCOUNT INFORMATION - COMPREHENSIVE TEST');
    console.log('=' .repeat(60));

    // Step 1: Check database connection
    console.log('\n📊 Step 1: Database Connection Test');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Step 2: Check existing lien data
    console.log('\n📊 Step 2: Checking Existing Lien Data');
    
    // Check fdrdlienmaster table
    const lienMasterQuery = `
      SELECT 
        COUNT(*) as total_liens,
        COUNT(DISTINCT mbno) as unique_members,
        COUNT(DISTINCT loancaseno) as unique_loans,
        MIN(fromdate) as earliest_lien,
        MAX(fromdate) as latest_lien
      FROM fdrdlienmaster
    `;
    const lienMasterResult = await pool.query(lienMasterQuery);
    console.log('📋 Lien Master Summary:', lienMasterResult.rows[0]);

    // Check fdmaster table
    const fdMasterQuery = `
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(DISTINCT mbno) as unique_members,
        COUNT(CASE WHEN fdrdflag = 'F' THEN 1 END) as fixed_deposits,
        COUNT(CASE WHEN fdrdflag = 'R' THEN 1 END) as recurring_deposits,
        COUNT(CASE WHEN status = '0' THEN 1 END) as active_accounts
      FROM fdmaster
    `;
    const fdMasterResult = await pool.query(fdMasterQuery);
    console.log('📋 FD Master Summary:', fdMasterResult.rows[0]);

    // Step 3: Check member_master table
    console.log('\n📊 Step 3: Checking Member Master Data');
    const memberQuery = `
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN f_name IS NOT NULL THEN 1 END) as members_with_names
      FROM member_master
    `;
    const memberResult = await pool.query(memberQuery);
    console.log('📋 Member Master Summary:', memberResult.rows[0]);

    // Step 4: Check for existing lien accounts with complete data
    console.log('\n📊 Step 4: Finding Lien Accounts with Complete Data');
    const lienAccountsQuery = `
      SELECT 
        l.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as member_name,
        l.loancaseno,
        l.fdrd_accountnumber,
        l.fromdate,
        f.certno,
        f.fdamount,
        f.fdrdflag,
        f.status,
        lm.loan_amt
      FROM fdrdlienmaster l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      LEFT JOIN fdmaster f ON l.mbno = f.mbno AND l.fdrd_accountnumber = f.account_number
      LEFT JOIN loan_master lm ON l.loancaseno = lm.loancaseno AND l.mbno = lm.mbno
      ORDER BY l.fromdate DESC
      LIMIT 5
    `;
    const lienAccountsResult = await pool.query(lienAccountsQuery);
    
    console.log(`📋 Top 5 Lien Accounts (${lienAccountsResult.rows.length} found):`);
    if (lienAccountsResult.rows.length > 0) {
      lienAccountsResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Member ${row.mbno}: ${row.member_name || 'Name not available'}`);
        console.log(`      Loan Case: ${row.loancaseno}, Account: ${row.fdrd_accountnumber}`);
        console.log(`      FD Amount: ₹${parseFloat(row.fdamount || 0).toLocaleString('en-IN')}, Loan: ₹${parseFloat(row.loan_amt || 0).toLocaleString('en-IN')}`);
      });
    } else {
      console.log('   No lien accounts found. Creating sample data...');
      await createSampleLienData(pool);
      
      // Re-check for lien accounts
      const newLienResult = await pool.query(lienAccountsQuery);
      if (newLienResult.rows.length > 0) {
        console.log('✅ Created sample lien data successfully');
        newLienResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. Member ${row.mbno}: ${row.member_name || 'Name not available'}`);
          console.log(`      Loan Case: ${row.loancaseno}, Account: ${row.fdrd_accountnumber}`);
        });
      }
    }

    // Step 5: Check backend server
    console.log('\n📊 Step 5: Backend Server Test');
    try {
      const testResponse = await axios.get(`${API_BASE_URL}/report/lien-account-information?outputType=screen`);
      console.log('✅ Backend server is running (got response)');
    } catch (error) {
      if (error.response && error.response.status) {
        console.log('✅ Backend server is running (got response)');
      } else {
        console.log('❌ Backend server is not running. Please start it first.');
        console.log('   Run: npm run start:dev in the backend directory');
        return;
      }
    }

    // Step 6: Test API endpoint
    console.log('\n📊 Step 6: Testing Lien Account Information API');
    
    const testData = {
      outputType: 'screen'
    };

    console.log('📤 Request Data:', testData);

    try {
      const apiResponse = await axios.get(`${API_BASE_URL}/report/lien-account-information`, {
        params: testData
      });

      console.log('✅ API Response Status:', apiResponse.status);
      console.log('📥 API Response Data:', JSON.stringify(apiResponse.data, null, 2));

      // Validate response structure
      const data = apiResponse.data.data || apiResponse.data;
      if (Array.isArray(data) && data.length > 0) {
        console.log('\n✅ Response Structure Validation:');
        console.log(`   - Total Lien Accounts: ${data.length}`);
        
        data.slice(0, 3).forEach((lien, index) => {
          console.log(`   ${index + 1}. Member ${lien.memberNo}: ${lien.memberName}`);
          console.log(`      Loan Case: ${lien.loanCaseNo}, Account: ${lien.fdrdAccountNumber}`);
          console.log(`      Account Type: ${lien.accountDetails?.accountType || 'N/A'}`);
          console.log(`      Account Amount: ₹${lien.accountDetails?.accountAmount?.toLocaleString('en-IN') || 0}`);
          console.log(`      Loan Amount: ₹${lien.loanDetails?.loanAmount?.toLocaleString('en-IN') || 0}`);
        });
      } else {
        console.log('⚠️  No lien accounts found in API response');
      }

    } catch (apiError) {
      console.log('❌ API Error:', apiError.response?.data || apiError.message);
      
      // If API fails, let's check the database query directly
      console.log('\n🔍 Testing Database Query Directly:');
      await testDatabaseQueryDirectly(pool);
    }

    // Step 7: Data type validation
    console.log('\n📊 Step 7: Data Type Validation');
    await validateDataTypes(pool);

    // Step 8: Print testing guide
    console.log('\n📊 Step 8: UI Testing Guide');
    printUITestingGuide();

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleLienData(pool) {
  console.log('🔧 Creating sample lien data...');
  
  try {
    // First, ensure we have test members and accounts
    const memberCheckQuery = `SELECT mbno FROM member_master LIMIT 1`;
    const memberResult = await pool.query(memberCheckQuery);
    
    let testMemberNo;
    if (memberResult.rows.length === 0) {
      // Create a test member
      testMemberNo = 100001;
      await pool.query(`
        INSERT INTO member_master (mbno, f_name, l_name, present_address, prefix)
        VALUES ($1, 'Test', 'Member', 'Test Address', 'Mr.')
        ON CONFLICT (mbno) DO NOTHING
      `, [testMemberNo]);
      console.log(`✅ Created test member: ${testMemberNo}`);
    } else {
      testMemberNo = memberResult.rows[0].mbno;
    }

    // Create sample FD account
    const currentDate = new Date();
    const maturityDate = new Date(currentDate.getFullYear() + 2, currentDate.getMonth(), currentDate.getDate());
    
    const fdAccountNo = 1001;
    await pool.query(`
      INSERT INTO fdmaster (
        mbno, account_number, certno, depdate, matdate, fdamount, 
        rate, fdrdflag, status, depunit, depperiod
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (mbno, account_number) DO NOTHING
    `, [
      testMemberNo, fdAccountNo, 'FD001', currentDate, maturityDate, 100000.00,
      8.5, 'F', '0', 1, 24
    ]);

    // Create sample loan
    const loanCaseNo = 2001;
    await pool.query(`
      INSERT INTO loan_master (
        mbno, loancaseno, loan_amt, payment_date, rate, 
        no_of_instal, instal_amt, balance, openbalance, purpose
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (mbno, loancaseno) DO NOTHING
    `, [
      testMemberNo, loanCaseNo, 50000.00, currentDate, 12.00,
      24, 2500.00, 40000.00, 50000.00, 'Personal Loan'
    ]);

    // Create lien record
    await pool.query(`
      INSERT INTO fdrdlienmaster (
        srno, loancaseno, mbno, fdrd_accountnumber, fromdate, username
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [1, loanCaseNo, testMemberNo, fdAccountNo, currentDate, 'admin']);

    console.log('✅ Sample lien data created successfully');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

async function testDatabaseQueryDirectly(pool) {
  try {
    const query = `
      SELECT 
        l.mbno as "memberNo",
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as "memberName",
        m.present_address as "address",
        l.loancaseno as "loanCaseNo",
        l.fdrd_accountnumber as "fdrdAccountNumber",
        l.fromdate as "lienFromDate",
        l.username as "createdBy",
        f.certno as "certificateNo",
        f.fdamount::numeric as "accountAmount",
        f.rate::numeric as "interestRate",
        f.depdate as "depositDate",
        f.matdate as "maturityDate",
        f.fdrdflag as "accountType",
        f.status as "accountStatus",
        lm.loan_amt::numeric as "loanAmount",
        lm.balance::numeric as "loanBalance",
        lm.payment_date as "loanDate",
        lm.loantype as "loanType"
      FROM fdrdlienmaster l
      INNER JOIN member_master m ON l.mbno = m.mbno
      LEFT JOIN fdmaster f ON l.mbno = f.mbno AND l.fdrd_accountnumber = f.account_number
      LEFT JOIN loan_master lm ON l.loancaseno = lm.loancaseno AND l.mbno = lm.mbno
      ORDER BY l.fromdate DESC, l.mbno ASC
      LIMIT 5
    `;

    const result = await pool.query(query);
    console.log(`📊 Direct Database Query Results (${result.rows.length} rows):`);
    
    if (result.rows.length > 0) {
      result.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Member ${row.memberNo}: ${row.memberName || 'Name not available'}`);
        console.log(`      Loan Case: ${row.loanCaseNo}, Account: ${row.fdrdAccountNumber}`);
        console.log(`      Account Amount: ₹${parseFloat(row.accountAmount || 0).toLocaleString('en-IN')}`);
        console.log(`      Loan Amount: ₹${parseFloat(row.loanAmount || 0).toLocaleString('en-IN')}`);
      });
    } else {
      console.log('   No lien accounts found in database');
    }

  } catch (error) {
    console.error('❌ Direct query error:', error);
  }
}

async function validateDataTypes(pool) {
  try {
    console.log('🔍 Checking data types in lien-related tables...');
    
    // Check fdrdlienmaster table structure
    const lienTableQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'fdrdlienmaster' 
      ORDER BY ordinal_position
    `;
    
    const lienResult = await pool.query(lienTableQuery);
    console.log('📋 FD/RD Lien Master Table Structure:');
    lienResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check fdmaster table structure
    const fdTableQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'fdmaster' 
      AND column_name IN ('fdamount', 'rate', 'matamount', 'interestamount')
      ORDER BY ordinal_position
    `;
    
    const fdResult = await pool.query(fdTableQuery);
    console.log('\n📋 FD Master Money Fields:');
    fdResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check for proper numeric types
    const numericFields = fdResult.rows.filter(row => row.data_type === 'numeric');
    if (numericFields.length === fdResult.rows.length) {
      console.log('✅ All money fields are properly stored as numeric type');
    } else {
      console.log('⚠️  Some money fields may need conversion to numeric type');
    }

  } catch (error) {
    console.error('❌ Data type validation error:', error);
  }
}

function printUITestingGuide() {
  console.log('\n📖 UI TESTING GUIDE');
  console.log('=' .repeat(50));
  console.log('To test the Lien Account Information in the UI:');
  console.log('');
  console.log('1. 🚀 Start the application:');
  console.log('   - Backend: npm run start:dev (in backend directory)');
  console.log('   - Frontend: npm start (in Frontend directory)');
  console.log('');
  console.log('2. 🧭 Navigate to the report:');
  console.log('   - Go to Reports → Account Reports → Lien Account Information');
  console.log('');
  console.log('3. 📝 Test the functionality:');
  console.log('   - The page should auto-load lien account data');
  console.log('   - Click REFRESH button to reload data');
  console.log('   - Change Output Type to "Printer" and test');
  console.log('');
  console.log('4. ✅ Expected Results:');
  console.log('   - Table showing lien accounts with member details');
  console.log('   - Expandable rows showing account and loan details');
  console.log('   - Proper formatting of amounts and dates');
  console.log('   - Status tags for account types and status');
  console.log('');
  console.log('5. 🖨️  Test Print Functionality:');
  console.log('   - Change Output Type to "Printer"');
  console.log('   - Click REFRESH');
  console.log('   - Should open print dialog with vertical layout');
  console.log('');
  console.log('6. 🔧 Troubleshooting:');
  console.log('   - If no data shows: Check if lien accounts exist in database');
  console.log('   - If API error: Check backend server is running');
  console.log('   - If print issues: Check print CSS and layout');
  console.log('');
  console.log('📊 Database Tables Used:');
  console.log('   - fdrdlienmaster: Lien account records');
  console.log('   - member_master: Member information');
  console.log('   - fdmaster: FD/RD account details');
  console.log('   - loan_master: Loan information');
  console.log('');
  console.log('🔍 Sample Data to Look For:');
  console.log('   - Members with both FD/RD accounts and loans');
  console.log('   - Lien records linking accounts to loans');
  console.log('   - Active account status and proper amounts');
}

// Run the test
testLienAccountInformation().catch(console.error);