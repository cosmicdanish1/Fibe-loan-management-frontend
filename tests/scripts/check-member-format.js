const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkMemberFormat() {
  try {
    const client = await pool.connect();
    
    // Check existing member numbers
    const result = await client.query(`
      SELECT mbno, prefix, f_name, l_name 
      FROM member_master 
      WHERE isactive = 'Y' 
      ORDER BY mbno::numeric 
      LIMIT 10
    `);
    
    console.log('📋 Existing member numbers and format:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.mbno} - ${row.prefix} ${row.f_name} ${row.l_name}`);
    });
    
    // Check column constraints
    const columnInfo = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'member_master' 
      AND column_name = 'mbno'
    `);
    
    console.log('\n📊 Column constraints:');
    console.log(`   mbno: ${columnInfo.rows[0].data_type}(${columnInfo.rows[0].character_maximum_length})`);
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMemberFormat();