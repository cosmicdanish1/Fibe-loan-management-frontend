const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugMemberLedgerQuery() {
  console.log('=== DEBUGGING MEMBER LEDGER QUERY ISSUE ===\n');
  
  const client = await pool.connect();
  
  try {
    const testMemberNo = '610026281';
    
    // 1. Check member_master table structure and data
    console.log('1. CHECKING MEMBER_MASTER TABLE...');
    
    const memberQuery = await client.query(`
      SELECT mbno, f_name, m_name, l_name, 
             pg_typeof(mbno) as mbno_type
      FROM member_master 
      WHERE mbno = $1
    `, [testMemberNo]);
    
    if (memberQuery.rows.length > 0) {
      const member = memberQuery.rows[0];
      console.log(`✅ Member found: ${member.f_name} ${member.m_name || ''} ${member.l_name || ''}`);
      console.log(`📊 mbno value: "${member.mbno}" (type: ${member.mbno_type})`);
    } else {
      console.log(`❌ Member not found with mbno = ${testMemberNo}`);
    }
    
    // 2. Check ledger table structure and data
    console.log('\n2. CHECKING LEDGER TABLE...');
    
    const ledgerQuery = await client.query(`
      SELECT mbno, trans_date, code, trans_amt, trans_type,
             pg_typeof(mbno) as mbno_type
      FROM ledger 
      WHERE mbno = $1
      LIMIT 3
    `, [testMemberNo]);
    
    console.log(`📊 Ledger entries found: ${ledgerQuery.rows.length}`);
    if (ledgerQuery.rows.length > 0) {
      const entry = ledgerQuery.rows[0];
      console.log(`📊 mbno value: "${entry.mbno}" (type: ${entry.mbno_type})`);
      console.log(`📄 Sample entry: ${entry.trans_date} - ${entry.code} - ${entry.trans_type} ${entry.trans_amt}`);
    }
    
    // 3. Test different query approaches
    console.log('\n3. TESTING DIFFERENT QUERY APPROACHES...');
    
    // Test 1: String comparison
    const stringQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM ledger l
      WHERE l.mbno = $1
        AND l.trans_date >= '2016-11-01'
        AND l.trans_date <= '2025-12-28'
    `, [testMemberNo]);
    
    console.log(`🧪 String comparison: ${stringQuery.rows[0].count} entries`);
    
    // Test 2: Numeric comparison
    const numericQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM ledger l
      WHERE l.mbno = $1::text
        AND l.trans_date >= '2016-11-01'
        AND l.trans_date <= '2025-12-28'
    `, [parseInt(testMemberNo)]);
    
    console.log(`🧪 Numeric comparison: ${numericQuery.rows[0].count} entries`);
    
    // Test 3: Cast both sides
    const castQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM ledger l
      WHERE CAST(l.mbno AS TEXT) = CAST($1 AS TEXT)
        AND l.trans_date >= '2016-11-01'
        AND l.trans_date <= '2025-12-28'
    `, [testMemberNo]);
    
    console.log(`🧪 Cast comparison: ${castQuery.rows[0].count} entries`);
    
    // 4. Test the exact query from the backend service
    console.log('\n4. TESTING BACKEND SERVICE QUERY...');
    
    const backendQuery = await client.query(`
      SELECT l.trans_date, h.head_name, l.receipt_vchr_no, l.narration, l.trans_amt, l.trans_type, l.code
      FROM ledger l
      LEFT JOIN headmaster h ON l.code = h.code
      WHERE l.mbno = $1
        AND l.trans_date >= $2 
        AND l.trans_date <= $3
      ORDER BY l.trans_date ASC, l.receipt_vchr_no ASC
      LIMIT 5
    `, [parseInt(testMemberNo), new Date('2016-11-01'), new Date('2025-12-28')]);
    
    console.log(`🧪 Backend service query: ${backendQuery.rows.length} entries`);
    if (backendQuery.rows.length > 0) {
      console.log(`📄 Sample entries:`);
      backendQuery.rows.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.trans_date} - ${entry.head_name || entry.code} - ${entry.trans_type} ${entry.trans_amt}`);
      });
    }
    
    // 5. Check data types in both tables
    console.log('\n5. CHECKING DATA TYPES...');
    
    const memberDataTypes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'member_master' AND column_name = 'mbno'
    `);
    
    const ledgerDataTypes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'ledger' AND column_name = 'mbno'
    `);
    
    console.log(`📊 member_master.mbno: ${memberDataTypes.rows[0]?.data_type || 'not found'}`);
    console.log(`📊 ledger.mbno: ${ledgerDataTypes.rows[0]?.data_type || 'not found'}`);
    
    // 6. Test with different member numbers
    console.log('\n6. TESTING WITH DIFFERENT MEMBER NUMBERS...');
    
    const testMembers = ['1001', '610016572', '610026281'];
    
    for (const memberNo of testMembers) {
      const testQuery = await client.query(`
        SELECT COUNT(*) as count
        FROM ledger l
        WHERE l.mbno = $1
      `, [memberNo]);
      
      console.log(`🧪 Member ${memberNo}: ${testQuery.rows[0].count} entries`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugMemberLedgerQuery().catch(console.error);