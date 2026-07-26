const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'recurring_deposits'
      ORDER BY ordinal_position
    `);
    console.log('recurring_deposits table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    // Check if there's a sequence for the id column
    const seqResult = await pool.query(`
      SELECT * FROM information_schema.sequences 
      WHERE sequence_name LIKE '%recurring_deposits%'
    `);
    console.log('\nSequences:');
    seqResult.rows.forEach(row => {
      console.log(`  ${row.sequence_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();