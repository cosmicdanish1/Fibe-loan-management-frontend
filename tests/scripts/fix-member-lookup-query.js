/**
 * Fix Member Lookup Query
 * Update the member lookup to handle different isactive values
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

console.log('=== FIXING MEMBER LOOKUP QUERY ===');

async function fixMemberLookupQuery() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('\n--- STEP 1: ANALYZE ISACTIVE VALUES ---');
    
    // Check what values exist in isactive field
    const isActiveQuery = `
      SELECT 
        isactive,
        COUNT(*) as count
      FROM member_master 
      WHERE mbno IS NOT NULL
      GROUP BY isactive
      ORDER BY count DESC
    `;
    
    const isActiveResult = await pool.query(isActiveQuery);
    console.log('isactive values in database:');
    isActiveResult.rows.forEach(row => {
      console.log(`  "${row.isactive}": ${row.count} members`);
    });
    
    console.log('\n--- STEP 2: TEST CORRECTED QUERY ---');
    
    // Test the corrected query that handles both 'Y' and '1' values
    const correctedQuery = `
      SELECT DISTINCT
        m.mbno as memberNo,
        TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, '')) as memberName,
        m.officeno as officeNo,
        m.wingno as wingNo,
        COALESCE(d.name, 'Unknown Office') as officeName
      FROM member_master m
      LEFT JOIN division_master d ON m.officeno = d.officeno AND m.wingno = d.wingno
      WHERE (m.isactive = 'Y' OR m.isactive = '1') AND m.mbno IS NOT NULL
      AND (
        TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, '')) ILIKE '%610015819%' 
        OR m.mbno::text ILIKE '%610015819%'
      )
      ORDER BY TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, ''))
      LIMIT 50
    `;
    
    const correctedResult = await pool.query(correctedQuery);
    console.log(`✅ Corrected query found ${correctedResult.rows.length} members for "610015819"`);
    
    if (correctedResult.rows.length > 0) {
      correctedResult.rows.forEach(member => {
        console.log(`   ${member.memberno}: ${member.membername}`);
      });
    }
    
    console.log('\n--- STEP 3: TEST WITH NAME SEARCH ---');
    
    // Test with name search
    const nameQuery = `
      SELECT DISTINCT
        m.mbno as memberNo,
        TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, '')) as memberName,
        m.officeno as officeNo,
        m.wingno as wingNo,
        COALESCE(d.name, 'Unknown Office') as officeName
      FROM member_master m
      LEFT JOIN division_master d ON m.officeno = d.officeno AND m.wingno = d.wingno
      WHERE (m.isactive = 'Y' OR m.isactive = '1') AND m.mbno IS NOT NULL
      AND (
        TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, '')) ILIKE '%MAHESH%' 
        OR m.mbno::text ILIKE '%MAHESH%'
      )
      ORDER BY TRIM(COALESCE(m.f_name, '') || ' ' || COALESCE(m.m_name, '') || ' ' || COALESCE(m.l_name, ''))
      LIMIT 50
    `;
    
    const nameResult = await pool.query(nameQuery);
    console.log(`✅ Name search found ${nameResult.rows.length} members for "MAHESH"`);
    
    if (nameResult.rows.length > 0) {
      nameResult.rows.slice(0, 5).forEach(member => {
        console.log(`   ${member.memberno}: ${member.membername}`);
      });
    }
    
    console.log('\n--- STEP 4: GENERATE BACKEND FIX ---');
    
    console.log('\n🔧 BACKEND FIX NEEDED:');
    console.log('');
    console.log('File: backend/src/modules/member/member.service.ts');
    console.log('Method: lookupMembers()');
    console.log('');
    console.log('CHANGE THIS LINE:');
    console.log('  WHERE m.isactive = \'Y\' AND m.mbno IS NOT NULL');
    console.log('');
    console.log('TO THIS:');
    console.log('  WHERE (m.isactive = \'Y\' OR m.isactive = \'1\') AND m.mbno IS NOT NULL');
    console.log('');
    console.log('This will fix the member lookup to find members with both \'Y\' and \'1\' active status.');
    
    console.log('\n--- STEP 5: TEST API AFTER FIX ---');
    console.log('After applying the fix, test these API calls:');
    console.log('1. GET /api/v1/members?search=610015819');
    console.log('2. GET /api/v1/members?search=MAHESH');
    console.log('3. GET /api/v1/members/lookup?search=610015819');
    console.log('4. GET /api/v1/members/lookup?search=MAHESH');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixMemberLookupQuery().catch(console.error);