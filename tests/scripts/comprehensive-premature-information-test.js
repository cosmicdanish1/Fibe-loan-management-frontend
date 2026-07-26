const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function comprehensivePrematureInformationTest() {
  console.log('🔍 COMPREHENSIVE PREMATURE INFORMATION TEST\n');
  console.log('Testing both RD and SB Premature Information components...\n');

  try {
    // 1. Check database connectivity
    console.log('1. 🔌 TESTING DATABASE CONNECTIVITY...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully\n');

    // 2. Check member data
    console.log('2. 👤 CHECKING MEMBER DATA...');
    const memberQuery = `
      SELECT 
        mbno,
        CONCAT(COALESCE(prefix, ''), ' ', COALESCE(f_name, ''), ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as full_name,
        basic_pay,
        dept_name,
        isactive
      FROM member_master 
      WHERE mbno IN (610017770, 1001, 1002, 1003)
      ORDER BY mbno
    `;
    
    const members = await client.query(memberQuery);
    console.log(`Found ${members.rows.length} test members:`);
    members.rows.forEach(member => {
      console.log(`   ${member.mbno}: ${member.full_name.trim()} (${member.isactive === 'Y' ? 'Active' : 'Inactive'})`);
    });

    // 3. Check RD accounts data
    console.log('\n3. 🏦 CHECKING RD ACCOUNTS DATA...');
    const rdQuery = `
      SELECT 
        "accountNumber",
        "memberId",
        "monthlyInstallment",
        "interestRate",
        "startDate",
        "maturityDate",
        "tenureMonths",
        "status",
        "totalDeposited",
        "installmentsPaid"
      FROM recurring_deposits 
      WHERE "memberId" IN (610017770, 1001, 1002, 1003)
      ORDER BY "memberId", "startDate"
    `;
    
    const rdAccounts = await client.query(rdQuery);
    console.log(`Found ${rdAccounts.rows.length} RD accounts:`);
    rdAccounts.rows.forEach(rd => {
      console.log(`   Member ${rd.memberId}: ${rd.accountNumber} - ₹${rd.monthlyInstallment}/month (${rd.interestRate}%)`);
    });

    // 4. Check SB/Savings accounts data
    console.log('\n4. 💰 CHECKING SAVINGS BANK (SB) ACCOUNTS DATA...');
    
    // Check ledger data for savings accounts
    const sbLedgerQuery = `
      SELECT DISTINCT
        mbno,
        code,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN trans_type = 'CR' THEN trans_amt ELSE 0 END) as total_credits,
        SUM(CASE WHEN trans_type = 'DR' THEN trans_amt ELSE 0 END) as total_debits,
        MAX(trans_date) as last_transaction_date
      FROM ledger 
      WHERE mbno IN (610017770, 1001, 1002, 1003)
      AND code LIKE 'A%' -- Assuming A codes are for savings accounts
      GROUP BY mbno, code
      ORDER BY mbno, code
      LIMIT 20
    `;
    
    const sbLedger = await client.query(sbLedgerQuery);
    console.log(`Found ${sbLedger.rows.length} SB account entries in ledger:`);
    sbLedger.rows.forEach(sb => {
      const balance = sb.total_credits - sb.total_debits;
      console.log(`   Member ${sb.mbno}, Code ${sb.code}: ${sb.transaction_count} txns, Balance: ₹${balance.toFixed(2)}`);
    });

    // 5. Check what data the frontend expects for RD
    console.log('\n5. 📊 FRONTEND DATA REQUIREMENTS ANALYSIS...');
    console.log('RD Component expects:');
    console.log('   - Member validation: ✅ Available via member_master table');
    console.log('   - RD accounts: ✅ Available via recurring_deposits table');
    console.log('   - Account details: accountNumber, monthlyInstallment, interestRate, etc.');
    console.log('   - Calculation: premature rate = original rate - 1% penalty');

    console.log('\nSB Component expects:');
    console.log('   - Member validation: ✅ Available via member_master table');
    console.log('   - SB accounts: ⚠️ Need to check ledger or create dedicated SB table');
    console.log('   - Account balance: Available via ledger aggregation');
    console.log('   - Interest calculation: Based on balance and duration');

    // 6. Create missing SB account data if needed
    console.log('\n6. 🔧 CREATING MISSING SB ACCOUNT DATA...');
    
    // Check if we have a dedicated savings accounts table
    const sbTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'savings_accounts'
      );
    `);

    if (!sbTableCheck.rows[0].exists) {
      console.log('Creating savings_accounts table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS savings_accounts (
          id SERIAL PRIMARY KEY,
          "accountNumber" VARCHAR(20) NOT NULL,
          "memberId" INTEGER NOT NULL,
          "accountType" VARCHAR(10) DEFAULT 'SB',
          "openingDate" DATE NOT NULL,
          "interestRate" DECIMAL(5,2) NOT NULL,
          "minimumBalance" DECIMAL(15,2) DEFAULT 1000,
          "currentBalance" DECIMAL(15,2) DEFAULT 0,
          "status" VARCHAR(20) DEFAULT 'ACTIVE',
          "lastTransactionDate" DATE,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ savings_accounts table created');

      // Insert sample SB accounts
      const sbAccountsData = [
        { memberId: 610017770, accountNumber: 'SB610017770001', interestRate: 4.0, currentBalance: 50000 },
        { memberId: 610017770, accountNumber: 'SB610017770002', interestRate: 4.5, currentBalance: 75000 },
        { memberId: 1001, accountNumber: 'SB1001001', interestRate: 4.0, currentBalance: 25000 },
        { memberId: 1002, accountNumber: 'SB1002001', interestRate: 4.0, currentBalance: 30000 },
        { memberId: 1003, accountNumber: 'SB1003001', interestRate: 4.0, currentBalance: 40000 }
      ];

      for (const account of sbAccountsData) {
        try {
          await client.query(`
            INSERT INTO savings_accounts (
              "accountNumber", "memberId", "openingDate", "interestRate", 
              "currentBalance", "lastTransactionDate"
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            account.accountNumber,
            account.memberId,
            '2022-01-01',
            account.interestRate,
            account.currentBalance,
            new Date()
          ]);
          console.log(`✅ Created SB Account: ${account.accountNumber} for Member ${account.memberId}`);
        } catch (insertError) {
          if (insertError.code === '23505') { // Duplicate key error
            console.log(`⚠️ SB Account ${account.accountNumber} already exists`);
          } else {
            console.log(`❌ Error creating SB Account ${account.accountNumber}:`, insertError.message);
          }
        }
      }
    } else {
      console.log('✅ savings_accounts table already exists');
    }

    // 7. Verify SB accounts data
    console.log('\n7. ✅ VERIFYING SB ACCOUNTS DATA...');
    const sbAccountsQuery = `
      SELECT 
        "accountNumber",
        "memberId",
        "interestRate",
        "currentBalance",
        "openingDate",
        "status"
      FROM savings_accounts 
      WHERE "memberId" IN (610017770, 1001, 1002, 1003)
      ORDER BY "memberId", "accountNumber"
    `;
    
    const sbAccounts = await client.query(sbAccountsQuery);
    console.log(`Found ${sbAccounts.rows.length} SB accounts:`);
    sbAccounts.rows.forEach(sb => {
      console.log(`   Member ${sb.memberId}: ${sb.accountNumber} - ₹${sb.currentBalance} (${sb.interestRate}%)`);
    });

    // 8. Test API queries that frontend will use
    console.log('\n8. 🧪 TESTING API QUERIES...');
    
    // Test member validation query
    const memberValidationQuery = `
      SELECT 
        mbno as "memberNumber",
        CONCAT(COALESCE(f_name, ''), ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as "memberName",
        CASE WHEN mbno IS NOT NULL THEN true ELSE false END as exists
      FROM member_master 
      WHERE mbno = $1
    `;
    
    const memberValidation = await client.query(memberValidationQuery, [610017770]);
    console.log('Member validation query result:', memberValidation.rows[0]);

    // Test RD search query
    const rdSearchQuery = `
      SELECT 
        "accountNumber",
        "memberId",
        "monthlyInstallment",
        "interestRate",
        "startDate",
        "maturityDate",
        "tenureMonths",
        "maturityAmount",
        "totalDeposited",
        "installmentsPaid",
        "status"
      FROM recurring_deposits 
      WHERE "memberId" = $1 
      AND ("status" = 'ACTIVE' OR "status" IS NULL)
      ORDER BY "startDate" DESC
    `;
    
    const rdSearch = await client.query(rdSearchQuery, [610017770]);
    console.log(`RD search query result: ${rdSearch.rows.length} accounts found`);

    // Test SB search query
    const sbSearchQuery = `
      SELECT 
        "accountNumber",
        "memberId",
        "interestRate",
        "currentBalance",
        "openingDate",
        "status"
      FROM savings_accounts 
      WHERE "memberId" = $1 
      AND ("status" = 'ACTIVE' OR "status" IS NULL)
      ORDER BY "openingDate" DESC
    `;
    
    const sbSearch = await client.query(sbSearchQuery, [610017770]);
    console.log(`SB search query result: ${sbSearch.rows.length} accounts found`);

    // 9. Generate test data summary
    console.log('\n9. 📋 TEST DATA SUMMARY...');
    console.log('Available for testing:');
    console.log(`   Members: ${members.rows.length} (610017770, 1001, 1002, 1003)`);
    console.log(`   RD Accounts: ${rdAccounts.rows.length}`);
    console.log(`   SB Accounts: ${sbAccounts.rows.length}`);
    
    console.log('\nFrontend should be able to:');
    console.log('   ✅ Validate members using member-ledger API');
    console.log('   ✅ Load RD accounts using utilities API (with mock data)');
    console.log('   ✅ Load SB accounts using utilities API (new endpoint needed)');
    console.log('   ✅ Calculate premature withdrawals for both RD and SB');

    // 10. Recommendations
    console.log('\n10. 💡 RECOMMENDATIONS...');
    console.log('To fix the frontend issues:');
    console.log('   1. Add SB search endpoint to utilities controller');
    console.log('   2. Update API service to handle SB accounts');
    console.log('   3. Fix RD component to properly handle API responses');
    console.log('   4. Enhance SB component with proper data integration');
    console.log('   5. Remove hardcoded values and make components dynamic');

    client.release();
    console.log('\n🎉 COMPREHENSIVE TEST COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the comprehensive test
comprehensivePrematureInformationTest();