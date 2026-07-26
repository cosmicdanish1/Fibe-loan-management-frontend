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

async function testSavingStatementComprehensive() {
  console.log('🏦 SAVING STATEMENT COMPREHENSIVE TEST');
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
      AND table_name IN ('member_master', 'ledger', 'headmaster', 'bank_saving_product', 'bank_saving_detail_product')
      ORDER BY table_name
    `);
    
    console.log(`✅ Found tables: ${tableCheck.rows.map(r => r.table_name).join(', ')}`);
    
    // 3. Check member_master data
    console.log('\n3. Checking member_master data...');
    const memberCount = await client.query('SELECT COUNT(*) as count FROM member_master WHERE isactive = \'Y\'');
    console.log(`📊 Active members: ${memberCount.rows[0].count}`);
    
    // 4. Check headmaster for savings-related head codes
    console.log('\n4. Checking headmaster for savings head codes...');
    const savingsHeads = await client.query(`
      SELECT code, head_name, headtype 
      FROM headmaster 
      WHERE UPPER(head_name) LIKE '%SAVING%' 
         OR UPPER(head_name) LIKE '%DEPOSIT%' 
         OR code LIKE 'S%'
         OR code LIKE 'L10%'
      ORDER BY code
    `);
    
    console.log('📋 Savings-related head codes:');
    savingsHeads.rows.forEach(head => {
      console.log(`   ${head.code}: ${head.head_name} (${head.headtype})`);
    });
    
    // 5. Check ledger data for savings transactions
    console.log('\n5. Checking ledger data for savings transactions...');
    const savingsLedgerCount = await client.query(`
      SELECT 
        l.code,
        h.head_name,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT l.mbno) as unique_members
      FROM ledger l
      LEFT JOIN headmaster h ON l.code = h.code
      WHERE l.code IN (
        SELECT code FROM headmaster 
        WHERE UPPER(head_name) LIKE '%SAVING%' 
           OR UPPER(head_name) LIKE '%DEPOSIT%' 
           OR code LIKE 'S%'
           OR code LIKE 'L10%'
      )
      GROUP BY l.code, h.head_name
      ORDER BY transaction_count DESC
      LIMIT 10
    `);
    
    console.log('📊 Savings transactions by head code:');
    savingsLedgerCount.rows.forEach(row => {
      console.log(`   ${row.code}: ${row.head_name} - ${row.transaction_count} transactions, ${row.unique_members} members`);
    });
    
    // 6. Find members with savings transactions
    console.log('\n6. Finding members with savings transactions...');
    const membersWithSavings = await client.query(`
      SELECT DISTINCT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
        COUNT(l.trans_no) as transaction_count,
        MIN(l.trans_date) as first_transaction,
        MAX(l.trans_date) as last_transaction
      FROM member_master m 
      INNER JOIN ledger l ON m.mbno = l.mbno
      WHERE m.isactive = 'Y' 
        AND l.code IN (
          SELECT code FROM headmaster 
          WHERE UPPER(head_name) LIKE '%SAVING%' 
             OR UPPER(head_name) LIKE '%DEPOSIT%' 
             OR code LIKE 'S%'
             OR code LIKE 'L10%'
        )
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      ORDER BY transaction_count DESC
      LIMIT 10
    `);
    
    console.log('📋 Members with savings transactions:');
    membersWithSavings.rows.forEach(member => {
      console.log(`   ${member.mbno}: ${member.full_name}`);
      console.log(`      Transactions: ${member.transaction_count}, Period: ${member.first_transaction?.toISOString().split('T')[0]} to ${member.last_transaction?.toISOString().split('T')[0]}`);
    });
    
    // 7. Check if we need to create sample data
    if (membersWithSavings.rows.length === 0) {
      console.log('\n⚠️ No savings transactions found. Creating sample data...');
      await createSampleSavingsData(client);
      
      // Re-check after creating sample data
      const newMembersWithSavings = await client.query(`
        SELECT DISTINCT 
          m.mbno,
          CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
          COUNT(l.trans_no) as transaction_count
        FROM member_master m 
        INNER JOIN ledger l ON m.mbno = l.mbno
        WHERE m.isactive = 'Y' 
          AND l.code = 'L1004'
        GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
        ORDER BY transaction_count DESC
        LIMIT 5
      `);
      
      console.log('✅ Sample savings data created. Updated member list:');
      newMembersWithSavings.rows.forEach(member => {
        console.log(`   ${member.mbno}: ${member.full_name} - ${member.transaction_count} transactions`);
      });
    }
    
    // 8. Test balance calculation for a specific member
    console.log('\n8. Testing balance calculation...');
    const testMember = membersWithSavings.rows[0] || { mbno: '1001' };
    const testMemberNo = testMember.mbno;
    const testHeadCode = 'L1004'; // Using L1004 as it has data
    
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
    
    console.log(`📊 Balance calculation for member ${testMemberNo}:`);
    balanceTest.rows.forEach((row, index) => {
      const amount = parseFloat(row.trans_amt);
      console.log(`   ${index + 1}. ${row.trans_date?.toISOString().split('T')[0]} - ${row.trans_type} ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} - Balance: ₹${parseFloat(row.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    });
    
    client.release();
    
    // 9. Test backend API
    console.log('\n9. Testing backend API...');
    
    try {
      const fromDate = '2015-04-01T00:00:00.000Z';
      const toDate = new Date().toISOString();
      
      console.log(`Testing API with member: ${testMemberNo}, dates: ${fromDate.split('T')[0]} to ${toDate.split('T')[0]}`);
      
      const apiResponse = await axios.get(`${BASE_URL}/report/saving-statement`, {
        params: {
          memberNo: testMemberNo,
          fromDate: fromDate,
          toDate: toDate,
          headCode: testHeadCode
        }
      });
      
      console.log('✅ API Response Status:', apiResponse.status);
      console.log('📊 API Response Structure:', {
        memberNo: apiResponse.data.memberNo,
        memberName: apiResponse.data.memberName,
        openingBalance: apiResponse.data.openingBalance,
        closingBalance: apiResponse.data.closingBalance,
        transactionCount: apiResponse.data.transactions?.length || 0
      });
      
      if (apiResponse.data.transactions && apiResponse.data.transactions.length > 0) {
        console.log('📋 Sample transactions:');
        apiResponse.data.transactions.slice(0, 3).forEach((trans, index) => {
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
      WHERE table_name IN ('ledger', 'bank_saving_product', 'bank_saving_detail_product')
      AND table_schema = 'public'
      AND (column_name LIKE '%amount%' OR column_name LIKE '%balance%' OR column_name = 'trans_amt')
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
    console.log('1. Open Saving Statement report');
    console.log(`2. Enter Member Number: ${testMemberNo}`);
    console.log('3. Verify member name auto-fills');
    console.log('4. Set date range (From: 01-Apr-2015, To: Current Date)');
    console.log('5. Click Generate Saving Statement');
    console.log('6. Verify data displays correctly');
    console.log('7. Test print functionality (should be portrait orientation)');
    console.log('8. Test member lookup functionality (F2 key)');
    
    console.log('\n🚨 POTENTIAL ISSUES TO CHECK:');
    console.log('- Member lookup integration');
    console.log('- Date range validation');
    console.log('- Balance calculation accuracy');
    console.log('- Print layout and formatting');
    console.log('- Currency formatting consistency');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleSavingsData(client) {
  console.log('Creating sample savings data...');
  
  // Ensure we have the L1004 head code (Thrift Fund)
  await client.query(`
    INSERT INTO headmaster (code, head_name, headtype, parent_code, hposition, interest, op_bal, pflag)
    VALUES ('L1004', 'THRIFT FUND', 'L', 'L100', '1.4', 'Y', 0, 'Y')
    ON CONFLICT (code) DO NOTHING
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
  
  // Create sample savings transactions for each member
  let transNo = 100000;
  
  for (const member of members.rows) {
    const mbno = member.mbno;
    
    // Opening deposit
    await client.query(`
      INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, trans_amt, receipt_vchr_no, narration)
      VALUES ($1, $2, 'CR', 'L1004', $3, 5000.00, 'R001', 'Opening Deposit')
      ON CONFLICT (trans_no) DO NOTHING
    `, [transNo++, '2015-04-01', mbno]);
    
    // Monthly deposits
    const months = ['2015-05-01', '2015-06-01', '2015-07-01', '2015-08-01', '2015-09-01'];
    for (const month of months) {
      await client.query(`
        INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, trans_amt, receipt_vchr_no, narration)
        VALUES ($1, $2, 'CR', 'L1004', $3, 1000.00, $4, 'Monthly Thrift Deposit')
        ON CONFLICT (trans_no) DO NOTHING
      `, [transNo++, month, mbno, `R${transNo.toString().padStart(3, '0')}`]);
    }
    
    // One withdrawal
    await client.query(`
      INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, trans_amt, receipt_vchr_no, narration)
      VALUES ($1, $2, 'DR', 'L1004', $3, 2000.00, $4, 'Partial Withdrawal')
      ON CONFLICT (trans_no) DO NOTHING
    `, [transNo++, '2015-10-01', mbno, `P${transNo.toString().padStart(3, '0')}`]);
  }
  
  console.log('✅ Sample savings data created');
}

// Run the test
testSavingStatementComprehensive();