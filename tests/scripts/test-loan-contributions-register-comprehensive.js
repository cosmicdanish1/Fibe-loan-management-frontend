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

async function testLoanContributionsRegister() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 LOAN CONTRIBUTIONS REGISTER - COMPREHENSIVE TEST');
    console.log('=' .repeat(60));

    // Step 1: Check database connection
    console.log('\n📊 Step 1: Database Connection Test');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Step 2: Check existing loan data
    console.log('\n📊 Step 2: Checking Existing Loan Data');
    
    // Check loan_master table
    const loanMasterQuery = `
      SELECT 
        COUNT(*) as total_loans,
        COUNT(DISTINCT mbno) as unique_members,
        MIN(payment_date) as earliest_loan,
        MAX(payment_date) as latest_loan
      FROM loan_master
    `;
    const loanMasterResult = await pool.query(loanMasterQuery);
    console.log('📋 Loan Master Summary:', loanMasterResult.rows[0]);

    // Check ledger table for loan transactions
    const ledgerLoanQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(DISTINCT mbno) as unique_members,
        MIN(trans_date) as earliest_transaction,
        MAX(trans_date) as latest_transaction
      FROM ledger 
      WHERE code LIKE '%LN%' OR narration ILIKE '%loan%' OR narration ILIKE '%contribution%'
    `;
    const ledgerLoanResult = await pool.query(ledgerLoanQuery);
    console.log('📋 Ledger Loan Transactions:', ledgerLoanResult.rows[0]);

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

    // Step 4: Find members with loan data
    console.log('\n📊 Step 4: Finding Members with Loan Data');
    const membersWithLoansQuery = `
      SELECT DISTINCT 
        lm.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as member_name,
        COUNT(lm.loancaseno) as loan_count,
        SUM(lm.loan_amt::numeric) as total_loan_amount
      FROM loan_master lm
      LEFT JOIN member_master m ON lm.mbno = m.mbno
      GROUP BY lm.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      ORDER BY loan_count DESC
      LIMIT 5
    `;
    const membersWithLoansResult = await pool.query(membersWithLoansQuery);
    console.log('📋 Top 5 Members with Loans:');
    membersWithLoansResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Member ${row.mbno}: ${row.member_name || 'Name not available'} - ${row.loan_count} loans, Total: ₹${parseFloat(row.total_loan_amount || 0).toLocaleString('en-IN')}`);
    });

    // Step 5: Check if we have any data to test with
    let testMemberNo = null;
    if (membersWithLoansResult.rows.length > 0) {
      testMemberNo = membersWithLoansResult.rows[0].mbno;
      console.log(`\n✅ Found test member: ${testMemberNo}`);
    } else {
      console.log('\n⚠️  No members with loan data found. Creating sample data...');
      await createSampleLoanData(pool);
      
      // Re-check for test member
      const newMembersResult = await pool.query(membersWithLoansQuery);
      if (newMembersResult.rows.length > 0) {
        testMemberNo = newMembersResult.rows[0].mbno;
        console.log(`✅ Created and found test member: ${testMemberNo}`);
      }
    }

    if (!testMemberNo) {
      throw new Error('No test member available for testing');
    }

    // Step 6: Check backend server
    console.log('\n📊 Step 6: Backend Server Test');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/report/loan-contributions-register?memberNo=1&fromDate=2020-01-01&toDate=2020-01-02`);
      console.log('✅ Backend server is running');
    } catch (error) {
      if (error.response && error.response.status) {
        console.log('✅ Backend server is running (got response)');
      } else {
        console.log('❌ Backend server is not running. Please start it first.');
        console.log('   Run: npm run start:dev in the backend directory');
        return;
      }
    }

    // Step 7: Test API endpoint
    console.log('\n📊 Step 7: Testing Loan Contributions Register API');
    
    const testData = {
      memberNo: testMemberNo.toString(),
      fromDate: '2020-01-01',
      toDate: '2025-12-31',
      outputType: 'screen'
    };

    console.log('📤 Request Data:', testData);

    try {
      const apiResponse = await axios.get(`${API_BASE_URL}/report/loan-contributions-register`, {
        params: testData
      });

      console.log('✅ API Response Status:', apiResponse.status);
      console.log('📥 API Response Data:', JSON.stringify(apiResponse.data, null, 2));

      // Validate response structure
      if (apiResponse.data && apiResponse.data.memberNo) {
        console.log('\n✅ Response Structure Validation:');
        console.log(`   - Member No: ${apiResponse.data.memberNo}`);
        console.log(`   - Member Name: ${apiResponse.data.memberName}`);
        console.log(`   - Total Transactions: ${apiResponse.data.totalTransactions}`);
        console.log(`   - Loan Contributions Count: ${apiResponse.data.loanContributions?.length || 0}`);
        
        if (apiResponse.data.summary) {
          console.log(`   - Total Credits: ₹${apiResponse.data.summary.totalCredits?.toLocaleString('en-IN') || 0}`);
          console.log(`   - Total Debits: ₹${apiResponse.data.summary.totalDebits?.toLocaleString('en-IN') || 0}`);
        }
      }

    } catch (apiError) {
      console.log('❌ API Error:', apiError.response?.data || apiError.message);
      
      // If API fails, let's check the database query directly
      console.log('\n🔍 Testing Database Query Directly:');
      await testDatabaseQueryDirectly(pool, testMemberNo);
    }

    // Step 8: Data type validation
    console.log('\n📊 Step 8: Data Type Validation');
    await validateDataTypes(pool);

    // Step 9: Print testing guide
    console.log('\n📊 Step 9: UI Testing Guide');
    printUITestingGuide(testMemberNo);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleLoanData(pool) {
  console.log('🔧 Creating sample loan data...');
  
  try {
    // First, ensure we have a test member
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

    // Create sample loan data
    const currentDate = new Date();
    const loanData = [
      {
        mbno: testMemberNo,
        loantype: 'RLN',
        loancaseno: 1001,
        loan_amt: 50000.00,
        payment_date: new Date(currentDate.getFullYear() - 1, 0, 15),
        rate: 12.00,
        no_of_instal: 24,
        instal_amt: 2500.00,
        balance: 25000.00,
        openbalance: 50000.00,
        purpose: 'Home Renovation'
      },
      {
        mbno: testMemberNo,
        loantype: 'ELN',
        loancaseno: 1002,
        loan_amt: 25000.00,
        payment_date: new Date(currentDate.getFullYear(), 5, 10),
        rate: 10.50,
        no_of_instal: 12,
        instal_amt: 2200.00,
        balance: 15000.00,
        openbalance: 25000.00,
        purpose: 'Education'
      }
    ];

    for (const loan of loanData) {
      await pool.query(`
        INSERT INTO loan_master (mbno, loantype, loancaseno, loan_amt, payment_date, rate, no_of_instal, instal_amt, balance, openbalance, purpose)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (mbno, loancaseno) DO NOTHING
      `, [
        loan.mbno, loan.loantype, loan.loancaseno, loan.loan_amt, loan.payment_date,
        loan.rate, loan.no_of_instal, loan.instal_amt, loan.balance, loan.openbalance, loan.purpose
      ]);
    }

    // Create sample ledger transactions
    const ledgerData = [
      {
        mbno: testMemberNo,
        trans_date: new Date(currentDate.getFullYear() - 1, 1, 15),
        trans_type: 'DR',
        trans_amt: 50000.00,
        code: 'RLN001',
        narration: 'Loan Disbursement - RLN Case 1001',
        receipt_vchr_no: 'V001'
      },
      {
        mbno: testMemberNo,
        trans_date: new Date(currentDate.getFullYear() - 1, 2, 15),
        trans_type: 'CR',
        trans_amt: 2500.00,
        code: 'RLN001',
        narration: 'Loan Repayment - RLN Case 1001',
        receipt_vchr_no: 'V002'
      },
      {
        mbno: testMemberNo,
        trans_date: new Date(currentDate.getFullYear(), 6, 10),
        trans_type: 'DR',
        trans_amt: 25000.00,
        code: 'ELN001',
        narration: 'Loan Disbursement - ELN Case 1002',
        receipt_vchr_no: 'V003'
      },
      {
        mbno: testMemberNo,
        trans_date: new Date(currentDate.getFullYear(), 7, 10),
        trans_type: 'CR',
        trans_amt: 2200.00,
        code: 'ELN001',
        narration: 'Loan Repayment - ELN Case 1002',
        receipt_vchr_no: 'V004'
      }
    ];

    for (let i = 0; i < ledgerData.length; i++) {
      const transaction = ledgerData[i];
      await pool.query(`
        INSERT INTO ledger (mbno, trans_date, trans_type, trans_amt, code, narration, receipt_vchr_no, trans_no)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [
        transaction.mbno, transaction.trans_date, transaction.trans_type, transaction.trans_amt,
        transaction.code, transaction.narration, transaction.receipt_vchr_no, 1000 + i
      ]);
    }

    console.log('✅ Sample loan data created successfully');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

async function testDatabaseQueryDirectly(pool, memberNo) {
  try {
    const query = `
      SELECT 
        l.mbno as "memberNo",
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as "memberName",
        m.present_address as "address",
        lm.loantype as "loanType",
        lm.loancaseno as "loanCaseNo",
        lm.loan_amt::numeric as "loanAmount",
        lm.payment_date as "disbursementDate",
        lm.rate::numeric as "interestRate",
        lm.no_of_instal as "numberOfInstallments",
        lm.instal_amt::numeric as "installmentAmount",
        lm.balance::numeric as "outstandingBalance",
        lm.purpose as "purpose",
        l.trans_date as "transactionDate",
        l.trans_type as "transactionType",
        l.trans_amt::numeric as "transactionAmount",
        l.narration as "narration",
        l.receipt_vchr_no as "voucherNo"
      FROM ledger l
      INNER JOIN member_master m ON l.mbno = m.mbno
      LEFT JOIN loan_master lm ON l.mbno = lm.mbno
      WHERE l.mbno = $1
        AND l.trans_date >= '2020-01-01'::date
        AND l.trans_date <= '2025-12-31'::date
        AND (l.code LIKE '%LN%' OR l.narration ILIKE '%loan%' OR l.narration ILIKE '%contribution%')
      ORDER BY l.trans_date DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [memberNo]);
    console.log(`📊 Direct Database Query Results (${result.rows.length} rows):`);
    
    if (result.rows.length > 0) {
      result.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.transactionDate} - ${row.transactionType} - ₹${parseFloat(row.transactionAmount || 0).toLocaleString('en-IN')} - ${row.narration}`);
      });
    } else {
      console.log('   No loan transactions found for this member');
    }

  } catch (error) {
    console.error('❌ Direct query error:', error);
  }
}

async function validateDataTypes(pool) {
  try {
    console.log('🔍 Checking data types in loan_master table...');
    
    const dataTypeQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'loan_master' 
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(dataTypeQuery);
    console.log('📋 Loan Master Table Structure:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check for money type fields that should be numeric
    const moneyFieldsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loan_master' 
      AND data_type = 'money'
    `;
    
    const moneyFields = await pool.query(moneyFieldsQuery);
    if (moneyFields.rows.length > 0) {
      console.log('\n⚠️  Money type fields found (should be numeric for better handling):');
      moneyFields.rows.forEach(row => {
        console.log(`   - ${row.column_name}`);
      });
      
      console.log('\n💡 Recommendation: Convert money fields to numeric type');
      console.log('   Example: ALTER TABLE loan_master ALTER COLUMN loan_amt TYPE numeric USING loan_amt::numeric;');
    }

  } catch (error) {
    console.error('❌ Data type validation error:', error);
  }
}

function printUITestingGuide(testMemberNo) {
  console.log('\n📖 UI TESTING GUIDE');
  console.log('=' .repeat(50));
  console.log('To test the Loan Contributions Register in the UI:');
  console.log('');
  console.log('1. 🚀 Start the application:');
  console.log('   - Backend: npm run start:dev (in backend directory)');
  console.log('   - Frontend: npm start (in Frontend directory)');
  console.log('');
  console.log('2. 🧭 Navigate to the report:');
  console.log('   - Go to Reports → Account Reports → Loan Contributions Register');
  console.log('');
  console.log('3. 📝 Enter test data:');
  console.log(`   - Member Number: ${testMemberNo}`);
  console.log('   - From Date: 01-Jan-2020');
  console.log('   - To Date: 31-Dec-2025');
  console.log('   - Output Type: Screen');
  console.log('');
  console.log('4. 🔍 Click GENERATE button');
  console.log('');
  console.log('5. ✅ Expected Results:');
  console.log('   - Member information should display');
  console.log('   - Loan details should show loan types, amounts, rates');
  console.log('   - Transaction table should show loan-related transactions');
  console.log('   - Summary cards should show total credits/debits');
  console.log('');
  console.log('6. 🖨️  Test Print Functionality:');
  console.log('   - Change Output Type to "Printer"');
  console.log('   - Click GENERATE');
  console.log('   - Should open print dialog with vertical layout');
  console.log('');
  console.log('7. 🔧 Troubleshooting:');
  console.log('   - If no data shows: Check if member has loan transactions');
  console.log('   - If API error: Check backend server is running');
  console.log('   - If print issues: Check print CSS and layout');
  console.log('');
  console.log('📊 Database Tables Used:');
  console.log('   - member_master: Member information');
  console.log('   - loan_master: Loan details');
  console.log('   - ledger: Transaction history');
}

// Run the test
testLoanContributionsRegister().catch(console.error);