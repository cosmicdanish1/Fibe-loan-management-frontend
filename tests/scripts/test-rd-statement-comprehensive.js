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

async function testRDStatementComprehensive() {
  console.log('📅 RD STATEMENT COMPREHENSIVE TEST');
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
      AND table_name IN ('member_master', 'ledger', 'headmaster', 'recurring_deposits', 'rd_installments', 'fdrd_balance', 'fdrd_slab_details')
      ORDER BY table_name
    `);
    
    console.log(`✅ Found tables: ${tableCheck.rows.map(r => r.table_name).join(', ')}`);
    
    // 3. Check member_master data
    console.log('\n3. Checking member_master data...');
    const memberCount = await client.query('SELECT COUNT(*) as count FROM member_master WHERE isactive = \'Y\'');
    console.log(`📊 Active members: ${memberCount.rows[0].count}`);
    
    // 4. Check headmaster for RD-related head codes
    console.log('\n4. Checking headmaster for RD head codes...');
    const rdHeads = await client.query(`
      SELECT code, head_name, headtype 
      FROM headmaster 
      WHERE UPPER(head_name) LIKE '%RECURRING%' 
         OR UPPER(head_name) LIKE '%RD%' 
         OR UPPER(head_name) LIKE '%DEPOSIT%'
         OR code LIKE 'A004%'
         OR code LIKE 'A1003%'
         OR code LIKE 'RD%'
      ORDER BY code
    `);
    
    console.log('📋 RD-related head codes:');
    rdHeads.rows.forEach(head => {
      console.log(`   ${head.code}: ${head.head_name} (${head.headtype})`);
    });
    
    // 5. Check ledger data for RD transactions
    console.log('\n5. Checking ledger data for RD transactions...');
    const rdLedgerCount = await client.query(`
      SELECT 
        l.code,
        h.head_name,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT l.mbno) as unique_members
      FROM ledger l
      LEFT JOIN headmaster h ON l.code = h.code
      WHERE l.code IN (
        SELECT code FROM headmaster 
        WHERE UPPER(head_name) LIKE '%RECURRING%' 
           OR UPPER(head_name) LIKE '%RD%' 
           OR code LIKE 'A004%'
           OR code LIKE 'A1003%'
           OR code LIKE 'RD%'
      )
      GROUP BY l.code, h.head_name
      ORDER BY transaction_count DESC
      LIMIT 10
    `);
    
    console.log('📊 RD transactions by head code:');
    rdLedgerCount.rows.forEach(row => {
      console.log(`   ${row.code}: ${row.head_name} - ${row.transaction_count} transactions, ${row.unique_members} members`);
    });
    
    // 6. Check recurring_deposits table
    console.log('\n6. Checking recurring_deposits table...');
    const recurringDepositsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recurring_deposits'
      )
    `);
    
    if (recurringDepositsExists.rows[0].exists) {
      const rdCount = await client.query('SELECT COUNT(*) as count FROM recurring_deposits');
      console.log(`📊 Recurring deposits records: ${rdCount.rows[0].count}`);
      
      if (rdCount.rows[0].count > 0) {
        const rdSample = await client.query(`
          SELECT 
            "accountNumber",
            "memberId",
            "monthlyInstallment",
            "tenureMonths",
            "startDate",
            "maturityDate",
            "status"
          FROM recurring_deposits 
          ORDER BY "id" 
          LIMIT 5
        `);
        
        console.log('📋 Sample recurring deposits:');
        rdSample.rows.forEach(rd => {
          console.log(`   Account: ${rd.accountNumber}, Member: ${rd.memberId}, Amount: ₹${rd.monthlyInstallment}, Tenure: ${rd.tenureMonths} months`);
        });
      }
    }
    
    // 7. Find members with RD transactions
    console.log('\n7. Finding members with RD transactions...');
    const membersWithRD = await client.query(`
      SELECT DISTINCT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
        COUNT(l.trans_no) as transaction_count,
        MIN(l.trans_date) as first_transaction,
        MAX(l.trans_date) as last_transaction,
        l.code as head_code,
        h.head_name
      FROM member_master m 
      INNER JOIN ledger l ON m.mbno = l.mbno
      LEFT JOIN headmaster h ON l.code = h.code
      WHERE m.isactive = 'Y' 
        AND l.code IN (
          SELECT code FROM headmaster 
          WHERE UPPER(head_name) LIKE '%RECURRING%' 
             OR UPPER(head_name) LIKE '%RD%' 
             OR code LIKE 'A004%'
             OR code LIKE 'A1003%'
             OR code LIKE 'RD%'
        )
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name, l.code, h.head_name
      ORDER BY transaction_count DESC
      LIMIT 10
    `);
    
    console.log('📋 Members with RD transactions:');
    membersWithRD.rows.forEach(member => {
      console.log(`   ${member.mbno}: ${member.full_name}`);
      console.log(`      Head Code: ${member.head_code} (${member.head_name})`);
      console.log(`      Transactions: ${member.transaction_count}, Period: ${member.first_transaction?.toISOString().split('T')[0]} to ${member.last_transaction?.toISOString().split('T')[0]}`);
    });
    
    // 8. Check if we need to create sample data
    if (membersWithRD.rows.length === 0) {
      console.log('\n⚠️ No RD transactions found. Creating sample data...');
      await createSampleRDData(client);
      
      // Re-check after creating sample data
      const newMembersWithRD = await client.query(`
        SELECT DISTINCT 
          m.mbno,
          CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
          COUNT(l.trans_no) as transaction_count
        FROM member_master m 
        INNER JOIN ledger l ON m.mbno = l.mbno
        WHERE m.isactive = 'Y' 
          AND l.code = 'A1003'
        GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
        ORDER BY transaction_count DESC
        LIMIT 5
      `);
      
      console.log('✅ Sample RD data created. Updated member list:');
      newMembersWithRD.rows.forEach(member => {
        console.log(`   ${member.mbno}: ${member.full_name} - ${member.transaction_count} transactions`);
      });
    }
    
    // 9. Test balance calculation for a specific member
    console.log('\n9. Testing balance calculation...');
    const testMember = membersWithRD.rows[0] || { mbno: '1001', head_code: 'A1003' };
    const testMemberNo = testMember.mbno;
    const testHeadCode = testMember.head_code || 'A1003'; // Using A1003 as fallback
    
    const balanceTest = await client.query(`
      SELECT 
        l.trans_date,
        l.trans_type,
        l.trans_amt,
        l.narration,
        l.receipt_vchr_no,
        SUM(CASE WHEN l2.trans_type = 'CR' THEN l2.trans_amt::numeric ELSE -(l2.trans_amt::numeric) END) 
          OVER (ORDER BY l2.trans_date, l2.trans_no ROWS UNBOUNDED PRECEDING) as running_balance
      FROM ledger l
      LEFT JOIN ledger l2 ON l2.mbno = l.mbno AND l2.code = l.code AND l2.trans_no <= l.trans_no
      WHERE l.mbno = $1 AND l.code = $2
      ORDER BY l.trans_date, l.trans_no
      LIMIT 10
    `, [testMemberNo, testHeadCode]);
    
    console.log(`📊 Balance calculation for member ${testMemberNo} (Head Code: ${testHeadCode}):`);
    balanceTest.rows.forEach((row, index) => {
      const amount = parseFloat(row.trans_amt);
      console.log(`   ${index + 1}. ${row.trans_date?.toISOString().split('T')[0]} - ${row.trans_type} ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} - Balance: ₹${parseFloat(row.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    });
    
    client.release();
    
    // 10. Test backend API
    console.log('\n10. Testing backend API...');
    
    try {
      const fromDate = '2015-04-01T00:00:00.000Z';
      const toDate = new Date().toISOString();
      
      console.log(`Testing API with member: ${testMemberNo}, dates: ${fromDate.split('T')[0]} to ${toDate.split('T')[0]}, head code: ${testHeadCode}`);
      
      const apiResponse = await axios.get(`${BASE_URL}/report/rd-statement`, {
        params: {
          memberNo: testMemberNo,
          fromDate: fromDate,
          toDate: toDate,
          headCode: testHeadCode
        }
      });
      
      console.log('✅ API Response Status:', apiResponse.status);
      console.log('📊 API Response Structure:', {
        success: apiResponse.data.success,
        memberNo: apiResponse.data.data?.memberNo,
        memberName: apiResponse.data.data?.memberName,
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
    
    // 11. Check data types for money fields
    console.log('\n11. Checking data type consistency...');
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
      WHERE table_name IN ('ledger', 'recurring_deposits', 'rd_installments', 'fdrd_balance')
      AND table_schema = 'public'
      AND (column_name LIKE '%amount%' OR column_name LIKE '%balance%' OR column_name = 'trans_amt')
      ORDER BY table_name, column_name
    `);
    
    console.log('💰 Money/Balance column types:');
    dataTypeCheck.rows.forEach(col => {
      const status = col.status === 'GOOD' ? '✅' : col.status === 'NEEDS_FIX' ? '⚠️' : '📝';
      console.log(`   ${status} ${col.table_name}.${col.column_name}: ${col.data_type} (${col.status})`);
    });
    
    // 12. Frontend recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('📋 FRONTEND TESTING RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    console.log('\n🎯 RECOMMENDED TEST INPUTS:');
    console.log(`Member Number: ${testMemberNo}`);
    console.log(`From Date: 01-Apr-2015`);
    console.log(`To Date: ${new Date().toLocaleDateString('en-GB')}`);
    console.log(`Head Code: ${testHeadCode} (automatically used)`);
    
    console.log('\n📊 EXPECTED RESULTS:');
    console.log('- Should display member name automatically after entering member number');
    console.log('- Should show opening balance, closing balance, and transaction count');
    console.log('- Should display transactions with date, particulars, withdrawal, deposit, and running balance');
    console.log('- Should handle date range filtering properly');
    console.log('- Should show proper currency formatting');
    
    console.log('\n🔧 UI TESTING STEPS:');
    console.log('1. Open RD Statement report');
    console.log(`2. Enter Member Number: ${testMemberNo}`);
    console.log('3. Verify member name auto-fills');
    console.log('4. Set date range (From: 01-Apr-2015, To: Current Date)');
    console.log('5. Click Generate RD Statement');
    console.log('6. Verify data displays correctly');
    console.log('7. Test print functionality (should be portrait orientation)');
    console.log('8. Test member lookup functionality (F2 key)');
    
    console.log('\n🚨 POTENTIAL ISSUES TO CHECK:');
    console.log('- Member lookup integration');
    console.log('- Date range validation');
    console.log('- Balance calculation accuracy');
    console.log('- Print layout and formatting');
    console.log('- Currency formatting consistency');
    console.log('- Head code configuration (RD01 vs A1003 vs A004)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleRDData(client) {
  console.log('Creating sample RD data...');
  
  // Ensure we have the A1003 head code (Recurring Deposit)
  await client.query(`
    INSERT INTO headmaster (code, head_name, headtype, parent_code, hposition, interest, op_bal, pflag)
    VALUES ('A1003', 'RECURRING DEPOSIT', 'AST', 'A100', '1.3', 'Y', 0, 'Y')
    ON CONFLICT (code) DO UPDATE SET
      head_name = EXCLUDED.head_name,
      headtype = EXCLUDED.headtype
  `);
  
  // Also ensure A004 exists
  await client.query(`
    INSERT INTO headmaster (code, head_name, headtype, parent_code, hposition, interest, op_bal, pflag)
    VALUES ('A004', 'RECURRING DEPOSIT', 'AST', 'A100', '1.4', 'Y', 0, 'Y')
    ON CONFLICT (code) DO UPDATE SET
      head_name = EXCLUDED.head_name,
      headtype = EXCLUDED.headtype
  `);
  
  // Get some active members
  const members = await client.query(`
    SELECT mbno FROM member_master 
    WHERE isactive = 'Y' 
    ORDER BY mbno::numeric 
    LIMIT 5
  `);
  
  if (members.rows.length === 0) {
    console.log('No active members found. Creating sample members first...');
    
    const sampleMembers = [
      { mbno: '1001', prefix: 'Mr', f_name: 'RAJESH', m_name: 'KUMAR', l_name: 'SHARMA' },
      { mbno: '1002', prefix: 'Mrs', f_name: 'PRIYA', m_name: '', l_name: 'SINGH' },
      { mbno: '1003', prefix: 'Mr', f_name: 'AMIT', m_name: 'KUMAR', l_name: 'GUPTA' }
    ];
    
    for (const member of sampleMembers) {
      await client.query(`
        INSERT INTO member_master (mbno, prefix, f_name, m_name, l_name, isactive, wingno, officeno)
        VALUES ($1, $2, $3, $4, $5, 'Y', 'Main Office', 1)
        ON CONFLICT (mbno) DO UPDATE SET
          prefix = EXCLUDED.prefix,
          f_name = EXCLUDED.f_name,
          m_name = EXCLUDED.m_name,
          l_name = EXCLUDED.l_name,
          isactive = 'Y'
      `, [member.mbno, member.prefix, member.f_name, member.m_name, member.l_name]);
    }
    
    // Re-fetch members
    const newMembers = await client.query(`
      SELECT mbno FROM member_master 
      WHERE isactive = 'Y' 
      ORDER BY mbno::numeric 
      LIMIT 3
    `);
    members.rows = newMembers.rows;
  }
  
  // Get the next available ledgerid
  const maxLedgerIdResult = await client.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_id FROM ledger');
  let nextLedgerId = parseInt(maxLedgerIdResult.rows[0].next_id);
  
  // Create sample RD transactions for each member
  let transNo = 200000;
  
  for (const member of members.rows) {
    const mbno = member.mbno;
    
    // Opening RD account
    await client.query(`
      INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
      VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', 1000.00, 'R001', 'R', 'C', 0.00, 'RD Account Opening', 'System', $4)
    `, [transNo++, '2015-04-01', mbno, nextLedgerId++]);
    
    // Monthly RD deposits
    const months = ['2015-05-01', '2015-06-01', '2015-07-01', '2015-08-01', '2015-09-01', '2015-10-01'];
    for (const month of months) {
      const voucherNo = `R${(transNo % 1000).toString().padStart(3, '0')}`;
      await client.query(`
        INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
        VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', 1000.00, $4, 'R', 'C', 0.00, 'Monthly RD Deposit', 'System', $5)
      `, [transNo++, month, mbno, voucherNo, nextLedgerId++]);
    }
    
    // Interest credit
    const interestVoucherNo = `J${(transNo % 1000).toString().padStart(3, '0')}`;
    await client.query(`
      INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
      VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', 350.00, $4, 'J', 'C', 0.00, 'RD Interest Credit', 'System', $5)
    `, [transNo++, '2015-12-31', mbno, interestVoucherNo, nextLedgerId++]);
  }
  
  console.log('✅ Sample RD data created');
}

// Run the test
testRDStatementComprehensive();