const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkLedgerSchema() {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'ledger' 
      AND character_maximum_length IS NOT NULL
      ORDER BY column_name
    `);
    
    console.log('📋 Ledger table varchar columns and their limits:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}(${row.character_maximum_length})`);
    });
    
    // Also check a sample ledger record
    const sampleRecord = await client.query('SELECT * FROM ledger LIMIT 1');
    if (sampleRecord.rows.length > 0) {
      console.log('\n📊 Sample ledger record structure:');
      Object.keys(sampleRecord.rows[0]).forEach(key => {
        const value = sampleRecord.rows[0][key];
        const length = value ? value.toString().length : 0;
        console.log(`   ${key}: "${value}" (length: ${length})`);
      });
    }
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLedgerSchema();