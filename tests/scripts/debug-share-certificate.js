const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugShareCertificate() {
  try {
    const memberNo = 940025125;
    
    console.log('🔍 Debugging Share Certificate for member:', memberNo);
    
    // Check member data
    console.log('\n1. Checking member data...');
    const memberCheck = await pool.query(`
      SELECT mbno, f_name, l_name, isactive, present_address, memb_date
      FROM member_master 
      WHERE mbno = $1
    `, [memberNo]);
    
    console.log('Member data:', memberCheck.rows);
    
    // Check share data
    console.log('\n2. Checking share data...');
    const shareCheck = await pool.query(`
      SELECT accno, cur_shareamt, op_shareamt
      FROM annualstatement 
      WHERE accno = $1
    `, [memberNo]);
    
    console.log('Share data:', shareCheck.rows);
    
    // Test the exact backend query with different isactive conditions
    console.log('\n3. Testing backend query with isactive = Y...');
    const backendQuery1 = `
      SELECT 
        m.mbno as "memberNo",
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as "memberName",
        m.isactive,
        COALESCE(a.cur_shareamt, 0)::numeric as "totalShareAmount"
      FROM member_master m
      LEFT JOIN annualstatement a ON m.mbno = a.accno
      WHERE m.mbno = $1
        AND m.isactive = 'Y'
    `;
    
    const result1 = await pool.query(backendQuery1, [memberNo]);
    console.log('Result with isactive = Y:', result1.rows);
    
    console.log('\n4. Testing backend query with isactive = 1...');
    const backendQuery2 = `
      SELECT 
        m.mbno as "memberNo",
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as "memberName",
        m.isactive,
        COALESCE(a.cur_shareamt, 0)::numeric as "totalShareAmount"
      FROM member_master m
      LEFT JOIN annualstatement a ON m.mbno = a.accno
      WHERE m.mbno = $1
        AND m.isactive = '1'
    `;
    
    const result2 = await pool.query(backendQuery2, [memberNo]);
    console.log('Result with isactive = 1:', result2.rows);
    
    console.log('\n5. Testing backend query without isactive filter...');
    const backendQuery3 = `
      SELECT 
        m.mbno as "memberNo",
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as "memberName",
        m.isactive,
        COALESCE(a.cur_shareamt, 0)::numeric as "totalShareAmount"
      FROM member_master m
      LEFT JOIN annualstatement a ON m.mbno = a.accno
      WHERE m.mbno = $1
    `;
    
    const result3 = await pool.query(backendQuery3, [memberNo]);
    console.log('Result without isactive filter:', result3.rows);
    
    // Find a better test member
    console.log('\n6. Finding a better test member...');
    const betterMemberQuery = `
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as name,
        m.isactive,
        a.cur_shareamt
      FROM member_master m
      INNER JOIN annualstatement a ON m.mbno = a.accno
      WHERE a.cur_shareamt > 0 
        AND (m.isactive = 'Y' OR m.isactive = '1')
      ORDER BY a.cur_shareamt DESC
      LIMIT 3
    `;
    
    const betterMembers = await pool.query(betterMemberQuery);
    console.log('Better test members:', betterMembers.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugShareCertificate();