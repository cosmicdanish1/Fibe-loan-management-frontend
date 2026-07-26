const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function findMembersWithLedgerData() {
  console.log('=== FINDING MEMBERS WITH LEDGER DATA ===\n');
  
  const client = await pool.connect();
  
  try {
    // 1. Check which members have ledger transactions
    console.log('1. MEMBERS WITH LEDGER TRANSACTIONS...');
    
    const membersWithLedger = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', m.l_name) as full_name,
        COUNT(l.trans_no) as transaction_count,
        MIN(l.trans_date) as earliest_transaction,
        MAX(l.trans_date) as latest_transaction,
        COUNT(CASE WHEN l.trans_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_transactions
      FROM member_master m
      INNER JOIN ledger l ON m.mbno = l.mbno
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      HAVING COUNT(l.trans_no) >= 1
      ORDER BY COUNT(l.trans_no) DESC
      LIMIT 20
    `);
    
    console.log('Top 20 members with ledger data:');
    console.log('=====================================');
    membersWithLedger.rows.forEach((member, index) => {
      console.log(`${index + 1}. Member: ${member.mbno} - ${member.full_name}`);
      console.log(`   Total Transactions: ${member.transaction_count}`);
      console.log(`   Recent Transactions: ${member.recent_transactions}`);
      console.log(`   Period: ${new Date(member.earliest_transaction).toLocaleDateString()} to ${new Date(member.latest_transaction).toLocaleDateString()}`);
      console.log('');
    });
    
    // 2. Check specific members that are commonly used for testing
    console.log('2. CHECKING COMMON TEST MEMBERS...');
    
    const testMembers = ['1001', '1002', '1003', '610016572', '610023712', '610023352', '610026281'];
    
    for (const memberNo of testMembers) {
      const result = await client.query(`
        SELECT 
          m.mbno,
          CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', m.l_name) as full_name,
          COUNT(l.trans_no) as transaction_count,
          MIN(l.trans_date) as earliest_transaction,
          MAX(l.trans_date) as latest_transaction
        FROM member_master m
        LEFT JOIN ledger l ON m.mbno = l.mbno
        WHERE m.mbno = $1
        GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      `, [memberNo]);
      
      if (result.rows.length > 0) {
        const member = result.rows[0];
        console.log(`✅ Member ${memberNo}: ${member.full_name}`);
        console.log(`   Transactions: ${member.transaction_count}`);
        if (member.transaction_count > 0) {
          console.log(`   Period: ${new Date(member.earliest_transaction).toLocaleDateString()} to ${new Date(member.latest_transaction).toLocaleDateString()}`);
        } else {
          console.log(`   ⚠️  No transactions found`);
        }
      } else {
        console.log(`❌ Member ${memberNo}: Not found in database`);
      }
      console.log('');
    }
    
    // 3. Find members with recent transactions (good for testing)
    console.log('3. MEMBERS WITH RECENT TRANSACTIONS (BEST FOR TESTING)...');
    
    const recentMembers = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', m.l_name) as full_name,
        COUNT(l.trans_no) as total_transactions,
        COUNT(CASE WHEN l.trans_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_transactions,
        MAX(l.trans_date) as latest_transaction
      FROM member_master m
      INNER JOIN ledger l ON m.mbno = l.mbno
      WHERE l.trans_date >= CURRENT_DATE - INTERVAL '60 days'
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      HAVING COUNT(l.trans_no) >= 3
      ORDER BY MAX(l.trans_date) DESC, COUNT(l.trans_no) DESC
      LIMIT 10
    `);
    
    console.log('Best members for testing (recent activity):');
    console.log('==========================================');
    recentMembers.rows.forEach((member, index) => {
      console.log(`${index + 1}. Member: ${member.mbno} - ${member.full_name}`);
      console.log(`   Total Transactions: ${member.total_transactions}`);
      console.log(`   Recent Transactions: ${member.recent_transactions}`);
      console.log(`   Latest Activity: ${new Date(member.latest_transaction).toLocaleDateString()}`);
      console.log('');
    });
    
    // 4. Check Member Detail Ledger API endpoint
    console.log('4. TESTING MEMBER DETAIL LEDGER API...');
    
    // Get a few good members to test the API
    const apiTestMembers = recentMembers.rows.slice(0, 3);
    
    for (const member of apiTestMembers) {
      console.log(`Testing API for Member ${member.mbno}...`);
      
      try {
        // Test the actual API endpoint that the frontend uses
        const axios = require('axios');
        const response = await axios.get(`http://localhost:3001/api/v1/report/member-ledger`, {
          params: {
            memberNo: member.mbno,
            fromDate: '2024-01-01',
            toDate: '2025-12-31'
          }
        });
        
        console.log(`✅ API Response: ${response.status}`);
        if (response.data) {
          const data = response.data.success ? response.data.data : response.data;
          if (Array.isArray(data)) {
            console.log(`   Ledger entries returned: ${data.length}`);
          } else {
            console.log(`   Response type: ${typeof data}`);
          }
        }
      } catch (error) {
        console.log(`❌ API Error: ${error.response?.status || 'Network'} - ${error.message}`);
      }
      console.log('');
    }
    
    // 5. Summary and recommendations
    console.log('5. SUMMARY AND RECOMMENDATIONS...');
    console.log('=================================');
    
    const totalMembersWithData = await client.query(`
      SELECT COUNT(DISTINCT m.mbno) as count
      FROM member_master m
      INNER JOIN ledger l ON m.mbno = l.mbno
    `);
    
    console.log(`📊 Total members with ledger data: ${totalMembersWithData.rows[0].count}`);
    
    console.log('\n🎯 RECOMMENDED MEMBER NUMBERS FOR TESTING:');
    console.log('==========================================');
    
    // Get top 5 members with good data
    const recommendedMembers = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', m.l_name) as full_name,
        COUNT(l.trans_no) as transaction_count,
        MAX(l.trans_date) as latest_transaction
      FROM member_master m
      INNER JOIN ledger l ON m.mbno = l.mbno
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      HAVING COUNT(l.trans_no) >= 5
      ORDER BY 
        CASE WHEN MAX(l.trans_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 2 END,
        COUNT(l.trans_no) DESC
      LIMIT 5
    `);
    
    recommendedMembers.rows.forEach((member, index) => {
      console.log(`${index + 1}. Member Number: ${member.mbno}`);
      console.log(`   Name: ${member.full_name}`);
      console.log(`   Transactions: ${member.transaction_count}`);
      console.log(`   Latest Activity: ${new Date(member.latest_transaction).toLocaleDateString()}`);
      console.log('');
    });
    
    console.log('💡 USAGE INSTRUCTIONS:');
    console.log('1. Open Member Detail Ledger page in frontend');
    console.log('2. Use any of the recommended member numbers above');
    console.log('3. Set date range from 2019-01-01 to 2025-12-31 for maximum data');
    console.log('4. Click Generate to see the ledger data');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

findMembersWithLedgerData().catch(console.error);