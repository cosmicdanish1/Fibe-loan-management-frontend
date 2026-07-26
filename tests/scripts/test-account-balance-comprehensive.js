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

async function testAccountBalanceComprehensive() {
  console.log('🔍 ACCOUNT BALANCE COMPREHENSIVE TEST');
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
      AND table_name IN ('member_master', 'ledger', 'accountbalance')
      ORDER BY table_name
    `);
    
    console.log(`✅ Found tables: ${tableCheck.rows.map(r => r.table_name).join(', ')}`);
    
    // 3. Check member_master data
    console.log('\n3. Checking member_master data...');
    const memberCount = await client.query('SELECT COUNT(*) as count FROM member_master WHERE isactive = \'Y\'');
    console.log(`📊 Active members: ${memberCount.rows[0].count}`);
    
    if (memberCount.rows[0].count === '0') {
      console.log('⚠️ No active members found. Creating sample members...');
      await createSampleMembers(client);
    }
    
    // 4. Check ledger data
    console.log('\n4. Checking ledger data...');
    const ledgerCount = await client.query('SELECT COUNT(*) as count FROM ledger');
    console.log(`📊 Ledger entries: ${ledgerCount.rows[0].count}`);
    
    if (ledgerCount.rows[0].count === '0') {
      console.log('⚠️ No ledger entries found. Creating sample transactions...');
      await createSampleLedgerEntries(client);
    }
    
    // 5. Check accountbalance table structure and data
    console.log('\n5. Checking accountbalance table...');
    const accountBalanceExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'accountbalance'
      )
    `);
    
    if (accountBalanceExists.rows[0].exists) {
      const accountBalanceCount = await client.query('SELECT COUNT(*) as count FROM accountbalance');
      console.log(`📊 Account balance records: ${accountBalanceCount.rows[0].count}`);
      
      // Check data types
      const columnInfo = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'accountbalance' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Account balance table structure:');
      columnInfo.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // 6. Test member range query
    console.log('\n6. Testing member range queries...');
    const memberRange = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
        m.isactive
      FROM member_master m 
      WHERE m.isactive = 'Y' 
      ORDER BY m.mbno::numeric 
      LIMIT 10
    `);
    
    console.log('📋 Sample active members:');
    memberRange.rows.forEach(member => {
      console.log(`   ${member.mbno}: ${member.full_name}`);
    });
    
    // 7. Test balance calculation
    console.log('\n7. Testing balance calculations...');
    const balanceTest = await client.query(`
      SELECT 
        m.mbno as memberNo,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as memberName,
        COALESCE(SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt ELSE 0 END), 0) as totalCredit,
        COALESCE(SUM(CASE WHEN l.trans_type = 'DR' THEN l.trans_amt ELSE 0 END), 0) as totalDebit,
        COALESCE(SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN l.trans_type = 'DR' THEN l.trans_amt ELSE 0 END), 0) as currentBalance
      FROM member_master m 
      LEFT JOIN ledger l ON m.mbno = l.mbno
      WHERE m.isactive = 'Y' 
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      ORDER BY m.mbno::numeric 
      LIMIT 5
    `);
    
    console.log('📊 Balance calculations:');
    balanceTest.rows.forEach(member => {
      console.log(`   ${member.memberno}: ${member.membername}`);
      console.log(`      Credit: ₹${parseFloat(member.totalcredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`      Debit:  ₹${parseFloat(member.totaldebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`      Balance: ₹${parseFloat(member.currentbalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    });
    
    client.release();
    
    // 8. Test backend API
    console.log('\n8. Testing backend API...');
    
    // Get member range for testing
    const firstMember = memberRange.rows[0]?.mbno || '610014881';
    const lastMember = memberRange.rows[Math.min(4, memberRange.rows.length - 1)]?.mbno || '610015502';
    
    console.log(`Testing range: ${firstMember} to ${lastMember}`);
    
    try {
      const apiResponse = await axios.get(`${BASE_URL}/report/member-balance-range`, {
        params: {
          fromAccountNo: firstMember,
          toAccountNo: lastMember
        }
      });
      
      console.log('✅ API Response Status:', apiResponse.status);
      console.log('📊 API Response Data:', JSON.stringify(apiResponse.data, null, 2));
      
      if (apiResponse.data && Array.isArray(apiResponse.data)) {
        console.log(`✅ Received ${apiResponse.data.length} member balance records`);
        
        apiResponse.data.forEach((member, index) => {
          if (index < 3) { // Show first 3 records
            console.log(`   ${member.memberNo}: ${member.memberName} - ₹${member.currentBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}`);
          }
        });
      }
      
    } catch (apiError) {
      console.error('❌ API Error:', apiError.response?.data || apiError.message);
    }
    
    // 9. Frontend recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('📋 FRONTEND TESTING RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    console.log('\n🎯 RECOMMENDED TEST INPUTS:');
    console.log(`From Account: ${firstMember}`);
    console.log(`To Account: ${lastMember}`);
    
    console.log('\n📊 EXPECTED RESULTS:');
    console.log('- Should display member list with account numbers');
    console.log('- Should show member names properly formatted');
    console.log('- Should display current balance with proper currency formatting');
    console.log('- Should show total members and total balance in footer');
    
    console.log('\n🔧 UI TESTING STEPS:');
    console.log('1. Open Account Balance report');
    console.log(`2. Enter From Account: ${firstMember}`);
    console.log(`3. Enter To Account: ${lastMember}`);
    console.log('4. Click Generate Report');
    console.log('5. Verify data displays correctly');
    console.log('6. Test print functionality');
    
    // 10. Check for data type issues
    console.log('\n10. Checking data type consistency...');
    const dataTypeCheck = await pool.query(`
      SELECT 
        column_name, 
        data_type,
        CASE 
          WHEN data_type IN ('money', 'numeric', 'decimal') THEN 'GOOD'
          WHEN data_type IN ('varchar', 'text', 'character varying') AND column_name LIKE '%amount%' THEN 'NEEDS_FIX'
          WHEN data_type IN ('varchar', 'text', 'character varying') AND column_name LIKE '%balance%' THEN 'NEEDS_FIX'
          ELSE 'OK'
        END as status
      FROM information_schema.columns 
      WHERE table_name IN ('ledger', 'accountbalance', 'member_master')
      AND table_schema = 'public'
      AND (column_name LIKE '%amount%' OR column_name LIKE '%balance%')
      ORDER BY table_name, column_name
    `);
    
    console.log('💰 Money/Balance column types:');
    dataTypeCheck.rows.forEach(col => {
      const status = col.status === 'GOOD' ? '✅' : col.status === 'NEEDS_FIX' ? '⚠️' : '📝';
      console.log(`   ${status} ${col.column_name}: ${col.data_type} (${col.status})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleMembers(client) {
  console.log('Creating sample members...');
  
  const sampleMembers = [
    { mbno: '610014881', prefix: 'Mr', f_name: 'RAJESH', m_name: 'KUMAR', l_name: 'SHARMA' },
    { mbno: '610015124', prefix: 'Mrs', f_name: 'PRIYA', m_name: '', l_name: 'SINGH' },
    { mbno: '610015300', prefix: 'Mr', f_name: 'AMIT', m_name: 'KUMAR', l_name: 'GUPTA' },
    { mbno: '610015408', prefix: 'Ms', f_name: 'SUNITA', m_name: '', l_name: 'VERMA' },
    { mbno: '610015502', prefix: 'Mr', f_name: 'VIKASH', m_name: 'KUMAR', l_name: 'YADAV' }
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
  
  console.log('✅ Sample members created');
}

async function createSampleLedgerEntries(client) {
  console.log('Creating sample ledger entries...');
  
  const members = ['610014881', '610015124', '610015300', '610015408', '610015502'];
  
  for (const mbno of members) {
    // Create some credit entries (deposits)
    await client.query(`
      INSERT INTO ledger (mbno, trans_date, trans_type, trans_amt, head_code, particulars)
      VALUES 
        ($1, CURRENT_DATE - INTERVAL '30 days', 'CR', 5000.00, 'L1001', 'Opening Balance'),
        ($1, CURRENT_DATE - INTERVAL '20 days', 'CR', 2500.00, 'L1004', 'Monthly Deposit'),
        ($1, CURRENT_DATE - INTERVAL '10 days', 'DR', 1000.00, 'A1002', 'Loan Disbursement')
      ON CONFLICT DO NOTHING
    `, [mbno]);
  }
  
  console.log('✅ Sample ledger entries created');
}

// Run the test
testAccountBalanceComprehensive();