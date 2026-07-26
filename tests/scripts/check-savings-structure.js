const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkSavingsAccountsStructure() {
  try {
    // Check savings_accounts structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'savings_accounts' 
      ORDER BY ordinal_position
    `);
    
    console.log('Savings accounts table structure:');
    structure.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check data in savings_accounts
    const dataCheck = await pool.query('SELECT COUNT(*) as count FROM savings_accounts');
    console.log(`\nSavings accounts data: ${dataCheck.rows[0].count} records`);
    
    if (parseInt(dataCheck.rows[0].count) > 0) {
      const sample = await pool.query('SELECT * FROM savings_accounts LIMIT 3');
      console.log('\nSample data:');
      sample.rows.forEach((row, index) => {
        console.log(`Record ${index + 1}:`, JSON.stringify(row, null, 2));
      });
    }
    
    // Check interest_rates structure
    const interestStructure = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'interest_rates' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nInterest rates table structure:');
    interestStructure.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    // Check interestmaster structure
    const masterStructure = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'interestmaster' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nInterest master table structure:');
    masterStructure.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSavingsAccountsStructure();