const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkLedgerStructure() {
  const client = await pool.connect();
  
  try {
    // Check ledger table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'ledger' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Ledger table structure:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}) ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Check sample existing data
    const sample = await client.query('SELECT * FROM ledger LIMIT 1');
    console.log('\nSample ledger record:');
    if (sample.rows.length > 0) {
      Object.keys(sample.rows[0]).forEach(key => {
        console.log(`  ${key}: ${sample.rows[0][key]}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkLedgerStructure();