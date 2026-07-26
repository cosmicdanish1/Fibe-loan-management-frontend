const axios = require('axios');
const { Pool } = require('pg');

const BASE_URL = 'http://localhost:3001/api/v1';

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testFDStatementComprehensive() {
  console.log('🏦 FD STATEMENT COMPREHENSIVE TEST');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check database connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // 2. Check required tables exist
    console.log('\n2. Checking required tables...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('member_master', 'ledger', 'headmaster', 'fdmaster', 'fixed_deposits', 'fdrd_balance', 'fdrd_slab_details')
      ORDER BY table_name
    `);
    
    console.log(`✅ Found tables: ${tableCheck.rows.map(r => r.table_name).join(', ')}`);
    
    // 3. Check member_master data
    console.log('\n3. Checking member_master data...');
    const memberCount = await client.query('SELECT COUNT(*) as count FROM member_master WHERE isactive = \'Y\'');
    console.log(`📊 Active members: ${memberCount.rows[0].count}`);
    
    // 4. Check headmaster for FD-related head codes
    console.log('\n4. Checking headmaster for FD head codes...');
    const fdHeads = await client.query(`
      SELECT code, head_name, headtype 
      FROM headmaster 
      WHERE UPPER(head_name) LIKE '%FIXED%' 
         OR UPPER(head_name) LIKE '%FD%' 
         OR UPPER(head_name) LIKE '%DEPOSIT%'
         OR code LIKE 'A003%'
         OR code LIKE 'FD%'
      ORDER BY code
    `);
    
    console.log('📋 FD-related head codes:');
    fdHeads.rows.forEach(head => {
      console.log(`   ${head.code}: ${head.head_name} (${head.headtype})`);
    });
    
    // 5. Check fdmaster table
    console.log('\n5. Checking fdmaster table...');
    const fdMasterCount = await client.query('SELECT COUNT(*) as count FROM fdmaster');
    console.log(`📊 FD master records: ${fdMasterCount.rows[0].count}`);
    
    if (fdMasterCount.rows[0].count > 0) {
      const fdSample = await client.query(`
        SELECT 
          mbno,
          account_number,
          CONCAT(COALESCE(prefix, ''), ' ', f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as full_name,
          certno,
          fdamount,
          rate,
          depdate,
          matdate,
          matamount,
          status,
          fdrdflag,
          headcode
        FROM fdmaster 
        WHERE fdrdflag = 'F'
        ORDER BY depdate DESC
        LIMIT 5
      `);
      
      console.log('📋 Sample FD accounts:');
      fdSample.rows.forEach(fd => {
        console.log(`   Member: ${fd.mbno}, Account: ${fd.account_number}, Amount: ₹${parseFloat(fd.fdamount || 0).toLocaleString('en-IN')}`);
        console.log(`      Name: ${fd.full_name.trim()}, Certificate: ${fd.certno}, Rate: ${fd.rate}%`);
        console.log(`      Deposit Date: ${fd.depdate?.toISOString().split('T')[0]}, Maturity: ${fd.matdate?.toISOString().split('T')[0]}`);
        console.log(`      Status: ${fd.status}, Head Code: ${fd.headcode}`);
        console.log('');
      });
    }
    
    // 6. Check ledger data for FD transactions
    console.log('\n6. Checking ledger data for FD transactions...');
    const fdLedgerCount = await client.query(`
      SELECT 
        l.code,
        h.head_name,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT l.mbno) as unique_members
      FROM ledger l
      LEFT JOIN headmaster h ON l.code = h.code
      WHERE l.code IN (
        SELECT code FROM headmaster 
        WHERE UPPER(head_name) LIKE '%FIXED%' 
           OR UPPER(head_name) LIKE '%FD%' 
           OR code LIKE 'A003%'
           OR code LIKE 'FD%'
      )
      GROUP BY l.code, h.head_name
      ORDER BY transaction_count DESC
      LIMIT 10
    `);
    
    console.log('📊 FD transactions by head code:');
    fdLedgerCount.rows.forEach(row => {
      console.log(`   ${row.code}: ${row.head_name} - ${row.transaction_count} transactions, ${row.unique_members} members`);
    });
    
    // 7. Find members with FD accounts and transactions
    console.log('\n7. Finding members with FD accounts and transactions...');
    const membersWithFD = await client.query(`
      SELECT DISTINCT 
        f.mbno,
        CONCAT(COALESCE(f.prefix, ''), ' ', f.f_name, ' ', COALESCE(f.m_name, ''), ' ', COALESCE(f.l_name, '')) as full_name,
        f.account_number,
        f.certno,
        f.fdamount,
        f.rate,
        f.depdate,
        f.matdate,
        f.status,
        f.headcode,
        COUNT(l.trans_no) as transaction_count
      FROM fdmaster f 
      LEFT JOIN ledger l ON f.mbno = l.mbno AND l.code = COALESCE(f.headcode, 'A003')
      WHERE f.fdrdflag = 'F'
      GROUP BY f.mbno, f.prefix, f.f_name, f.m_name, f.l_name, f.account_number, f.certno, f.fdamount, f.rate, f.depdate, f.matdate, f.status, f.headcode
      ORDER BY transaction_count DESC, f.fdamount DESC
      LIMIT 10
    `);
    
    console.log('📋 Members with FD accounts:');
    membersWithFD.rows.forEach(member => {
      console.log(`   ${member.mbno}: ${member.full_name.trim()}`);
      console.log(`      Account: ${member.account_number}, Certificate: ${member.certno}`);
      console.log(`      Amount: ₹${parseFloat(member.fdamount || 0).toLocaleString('en-IN')}, Rate: ${member.rate}%`);
      console.log(`      Transactions: ${member.transaction_count}, Head Code: ${member.headcode}`);
      console.log(`      Status: ${member.status}, Deposit Date: ${member.depdate?.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // 8. Check if we need to create sample data
    if (membersWithFD.rows.length === 0 || membersWithFD.rows[0].transaction_count === 0) {
      console.log('\n⚠️ No FD data found or no transactions. Creating sample data...');
      await createSampleFDData(client);
      
      // Re-check after creating sample data
      const newMembersWithFD = await client.query(`
        SELECT DISTINCT 
          f.mbno,
          CONCAT(COALESCE(f.prefix, ''), ' ', f.f_name, ' ', COALESCE(f.m_name, ''), ' ', COALESCE(f.l_name, '')) as full_name,
          f.fdamount,
          COUNT(l.trans_no) as transaction_count
        FROM fdmaster f 
        LEFT JOIN ledger l ON f.mbno = l.mbno AND l.code = 'A003'
        WHERE f.fdrdflag = 'F'
        GROUP BY f.mbno, f.prefix, f.f_name, f.m_name, f.l_name, f.fdamount
        ORDER BY transaction_count DESC
        LIMIT 5
      `);
      
      console.log('✅ Sample FD data created. Updated member list:');
      newMembersWithFD.rows.forEach(member => {
        console.log(`   ${member.mbno}: ${member.full_name.trim()} - ₹${parseFloat(member.fdamount || 0).toLocaleString('en-IN')}, ${member.transaction_count} transactions`);
      });
      
      membersWithFD.rows = newMembersWithFD.rows;
    }
    
    client.release();
    
    // 9. Test backend API
    console.log('\n9. Testing backend API...');
    const testMember = membersWithFD.rows[0];
    
    if (!testMember) {
      console.log('   ❌ No FD data available for testing');
      return;
    }
    
    try {
      const fromDate = '2015-04-01T00:00:00.000Z';
      const toDate = new Date().toISOString();
      const headCode = testMember.headcode || 'A003';
      
      console.log(`Testing API with member: ${testMember.mbno}, dates: ${fromDate.split('T')[0]} to ${toDate.split('T')[0]}, head code: ${headCode}`);
      
      const apiResponse = await axios.get(`${BASE_URL}/report/fd-statement`, {
        params: {
          memberNo: testMember.mbno,
          fromDate: fromDate,
          toDate: toDate,
          headCode: headCode
        }
      });
      
      console.log('✅ API Response Status:', apiResponse.status);
      console.log('📊 API Response Structure:', {
        success: apiResponse.data.success,
        memberNo: apiResponse.data.data?.memberNo,
        memberName: apiResponse.data.data?.memberName,
        accountNo: apiResponse.data.data?.accountNo,
        certificateNo: apiResponse.data.data?.certificateNo,
        principalAmount: apiResponse.data.data?.principalAmount,
        interestRate: apiResponse.data.data?.interestRate,
        openingBalance: apiResponse.data.data?.openingBalance,
        closingBalance: apiResponse.data.data?.closingBalance,
        transactionCount: apiResponse.data.data?.transactions?.length || 0
      });
      
      if (apiResponse.data.data?.transactions && apiResponse.data.data.transactions.length > 0) {
        console.log('📋 Sample transactions:');
        apiResponse.data.data.transactions.slice(0, 3).forEach((trans, index) => {
          console.log(`   ${index + 1}. ${trans.date?.split('T')[0]} - W:₹${trans.withdrawal || 0} D:₹${trans.deposit || 0} B:₹${trans.balance}`);
        });
      }
      
    } catch (apiError) {
      console.error('❌ API Error:', apiError.response?.data || apiError.message);
      
      // Check if backend is running
      try {
        await axios.get(`${BASE_URL}/health`);
        console.log('✅ Backend is running, but API endpoint may have issues');
      } catch (healthError) {
        console.log('❌ Backend appears to be down. Please start the backend server.');
      }
    }
    
    // 10. Check data types for money fields
    console.log('\n10. Checking data type consistency...');
    const dataTypeCheck = await pool.query(`
      SELECT 
        table_name,
        column_name, 
        data_type,
        CASE 
          WHEN data_type IN ('money', 'numeric', 'decimal') THEN 'GOOD'
          WHEN data_type IN ('varchar', 'text', 'character varying') AND column_name LIKE '%amount%' THEN 'NEEDS_FIX'
          WHEN data_type IN ('varchar', 'text', 'character varying') AND column_name LIKE '%balance%' THEN 'NEEDS_FIX'
          ELSE 'OK'
        END as status
      FROM information_schema.columns 
      WHERE table_name IN ('ledger', 'fdmaster', 'fixed_deposits', 'fdrd_balance')
      AND table_schema = 'public'
      AND (column_name LIKE '%amount%' OR column_name LIKE '%balance%' OR column_name = 'trans_amt' OR column_name = 'fdamount' OR column_name = 'matamount')
      ORDER BY table_name, column_name
    `);
    
    console.log('💰 Money/Balance column types:');
    dataTypeCheck.rows.forEach(col => {
      const status = col.status === 'GOOD' ? '✅' : col.status === 'NEEDS_FIX' ? '⚠️' : '📝';
      console.log(`   ${status} ${col.table_name}.${col.column_name}: ${col.data_type} (${col.status})`);
    });
    
    // 11. Frontend recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('📋 FRONTEND TESTING RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    console.log('\n🎯 RECOMMENDED TEST INPUTS:');
    if (testMember) {
      console.log(`Member Number: ${testMember.mbno}`);
      console.log(`From Date: 01-Apr-2015`);
      console.log(`To Date: ${new Date().toLocaleDateString('en-GB')}`);
      console.log(`Head Code: ${testMember.headcode || 'A003'} (automatically used)`);
    }
    
    console.log('\n📊 EXPECTED RESULTS:');
    console.log('- Should display member name automatically after entering member number');
    console.log('- Should show FD account details (account number, certificate number, principal amount, interest rate)');
    console.log('- Should display deposit date, maturity date, and maturity amount');
    console.log('- Should show opening balance, closing balance, and transaction count');
    console.log('- Should display transactions with date, particulars, withdrawal, deposit, and running balance');
    console.log('- Should handle date range filtering properly');
    console.log('- Should show proper currency formatting');
    
    console.log('\n🔧 UI TESTING STEPS:');
    console.log('1. Open FD Statement report');
    if (testMember) {
      console.log(`2. Enter Member Number: ${testMember.mbno}`);
      console.log('3. Verify member name auto-fills');
    }
    console.log('4. Set date range (From: 01-Apr-2015, To: Current Date)');
    console.log('5. Click Generate FD Statement');
    console.log('6. Verify FD account information displays correctly');
    console.log('7. Verify transaction data displays correctly');
    console.log('8. Test print functionality (should be portrait orientation)');
    console.log('9. Test member lookup functionality (F2 key)');
    
    console.log('\n🚨 POTENTIAL ISSUES TO CHECK:');
    console.log('- Member lookup integration');
    console.log('- Date range validation');
    console.log('- FD account information display');
    console.log('- Balance calculation accuracy');
    console.log('- Print layout and formatting');
    console.log('- Currency formatting consistency');
    console.log('- Head code configuration (FD01 vs A003)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleFDData(client) {
  console.log('Creating sample FD data...');
  
  // Ensure we have the A003 head code (Fixed Deposit)
  await client.query(`
    INSERT INTO headmaster (code, head_name, headtype, parent_code, hposition, interest, op_bal, pflag)
    VALUES ('A003', 'FIXED DEPOSIT', 'AST', 'A100', '1.2', 'Y', 0, 'Y')
    ON CONFLICT (code) DO UPDATE SET
      head_name = EXCLUDED.head_name,
      headtype = EXCLUDED.headtype
  `);
  
  // Get some active members
  const members = await client.query(`
    SELECT mbno, prefix, f_name, m_name, l_name 
    FROM member_master 
    WHERE isactive = 'Y' 
    ORDER BY mbno::numeric 
    LIMIT 3
  `);
  
  if (members.rows.length === 0) {
    console.log('No active members found for FD data creation');
    return;
  }
  
  // Get next account number
  const maxAccountResult = await client.query('SELECT COALESCE(MAX(account_number), 1000) + 1 as next_account FROM fdmaster');
  let nextAccountNo = parseInt(maxAccountResult.rows[0].next_account);
  
  // Get next ledger ID
  const maxLedgerIdResult = await client.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_id FROM ledger');
  let nextLedgerId = parseInt(maxLedgerIdResult.rows[0].next_id);
  let transNo = 600000;
  
  // Create sample FD data for each member
  for (let i = 0; i < members.rows.length; i++) {
    const member = members.rows[i];
    const principalAmount = 50000 + (i * 25000); // 50k, 75k, 100k
    const interestRate = 7.5 + (i * 0.5); // 7.5%, 8%, 8.5%
    const depositDate = new Date('2022-01-01');
    depositDate.setMonth(depositDate.getMonth() + (i * 3)); // Stagger dates
    
    const maturityDate = new Date(depositDate);
    maturityDate.setFullYear(maturityDate.getFullYear() + 3); // 3 year FD
    
    const maturityAmount = principalAmount * Math.pow(1 + (interestRate / 100), 3);
    
    // Create FD account in fdmaster
    await client.query(`
      INSERT INTO fdmaster (
        mbno, account_number, prefix, f_name, m_name, l_name, certno, 
        depunit, depperiod, rate, depdate, matdate, fdamount, matamount, 
        interestbalance, interestpayamentmode, interestamount, intpaid, 
        status, fdrdflag, headcode, openbal
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 
        3, 36, $8, $9, $10, $11, $12, 
        0, 1, 0, 0, 
        '0', 'F', 'A003', 0
      )
    `, [
      member.mbno, nextAccountNo++, member.prefix, member.f_name, member.m_name, member.l_name, 
      `FD${nextAccountNo}`, interestRate, depositDate, maturityDate, principalAmount, maturityAmount
    ]);
    
    // Create initial deposit transaction
    await client.query(`
      INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
      VALUES ($1, $2, 'CR', 'A003', $3, $4, 'FD', $5, $6, 'R', 'C', 0.00, 'Fixed Deposit Opening', 'System', $7)
    `, [transNo++, depositDate, member.mbno, nextAccountNo - 1, principalAmount, `FD${transNo}`, nextLedgerId++]);
    
    // Create quarterly interest credits
    for (let quarter = 1; quarter <= 12; quarter++) { // 3 years = 12 quarters
      const interestDate = new Date(depositDate);
      interestDate.setMonth(depositDate.getMonth() + (quarter * 3));
      
      if (interestDate <= new Date()) {
        const quarterlyInterest = Math.round((principalAmount * interestRate / 100 / 4) * 100) / 100;
        await client.query(`
          INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
          VALUES ($1, $2, 'CR', 'A003', $3, $4, 'FD', $5, $6, 'J', 'C', 0.00, $7, 'System', $8)
        `, [transNo++, interestDate, member.mbno, nextAccountNo - 1, quarterlyInterest, `INT${transNo}`, `Quarterly Interest Credit - Q${quarter}`, nextLedgerId++]);
      }
    }
  }
  
  console.log('✅ Sample FD data created');
}

// Run the test
testFDStatementComprehensive();