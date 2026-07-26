const { Client } = require('pg');

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'EMP_Espat_Society',
  user: 'postgres',
  password: 'admin123'
};

async function testMemberLookup() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database successfully');
    
    // Test 1: Check if member_master table exists and has data
    console.log('\n📊 Testing member_master table...');
    const countQuery = 'SELECT COUNT(*) as total FROM member_master';
    const countResult = await client.query(countQuery);
    console.log(`📈 Total members in member_master: ${countResult.rows[0].total}`);
    
    // Test 2: Check active members
    console.log('\n🔍 Testing active members...');
    const activeQuery = `SELECT COUNT(*) as active_count FROM member_master WHERE isactive = 'Y'`;
    const activeResult = await client.query(activeQuery);
    console.log(`👥 Active members: ${activeResult.rows[0].active_count}`);
    
    // Test 3: Sample member data structure
    console.log('\n📋 Sample member data structure...');
    const sampleQuery = `
      SELECT 
        mbno, fullname, officeno, wingno, isactive
      FROM member_master 
      WHERE isactive = 'Y'
      LIMIT 3
    `;
    const sampleResult = await client.query(sampleQuery);
    console.log('Sample members:', JSON.stringify(sampleResult.rows, null, 2));
    
    // Test 4: Test the exact lookup query
    console.log('\n🔎 Testing lookup query...');
    const lookupQuery = `
      SELECT 
        m.mbno as memberNo,
        m.fullname as memberName,
        m.officeno as officeNo,
        m.wingno as wingNo,
        COALESCE(d.office_name, 'Unknown Office') as officeName
      FROM member_master m
      LEFT JOIN division_master d ON m.officeno = d.officeno
      WHERE m.isactive = 'Y'
      ORDER BY m.fullname
      LIMIT 5
    `;
    
    const lookupResult = await client.query(lookupQuery);
    console.log('Lookup result:', JSON.stringify(lookupResult.rows, null, 2));
    
    // Test 5: Check division_master table
    console.log('\n🏢 Testing division_master table...');
    const divisionQuery = 'SELECT COUNT(*) as total FROM division_master';
    const divisionResult = await client.query(divisionQuery);
    console.log(`🏢 Total divisions: ${divisionResult.rows[0].total}`);
    
    // Test 6: Test with search parameter
    console.log('\n🔍 Testing search functionality...');
    const searchQuery = `
      SELECT 
        m.mbno as memberNo,
        m.fullname as memberName,
        m.officeno as officeNo,
        m.wingno as wingNo,
        COALESCE(d.office_name, 'Unknown Office') as officeName
      FROM member_master m
      LEFT JOIN division_master d ON m.officeno = d.officeno
      WHERE m.isactive = 'Y'
      AND (m.fullname ILIKE '%a%' OR m.mbno::text ILIKE '%1%')
      ORDER BY m.fullname
      LIMIT 3
    `;
    
    const searchResult = await client.query(searchQuery);
    console.log('Search result:', JSON.stringify(searchResult.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testMemberLookup().catch(console.error);