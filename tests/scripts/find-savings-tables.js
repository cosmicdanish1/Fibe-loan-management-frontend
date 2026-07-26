const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function findSavingsAccountTables() {
  try {
    // Get all table names
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%saving%' OR table_name LIKE '%sb%' OR table_name LIKE '%account%')
      ORDER BY table_name
    `);
    
    console.log('Tables related to savings/accounts:');
    result.rows.forEach(row => {
      console.log('- ' + row.table_name);
    });
    
    // Check member_master structure for account info
    const memberStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'member_master' 
      AND (column_name LIKE '%account%' OR column_name LIKE '%balance%' OR column_name LIKE '%saving%')
      ORDER BY ordinal_position
    `);
    
    console.log('\nMember master account-related columns:');
    memberStructure.rows.forEach(row => {
      console.log('- ' + row.column_name + ' (' + row.data_type + ')');
    });
    
    // Check ledger structure
    const ledgerStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ledger' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nLedger table columns:');
    ledgerStructure.rows.forEach(row => {
      console.log('- ' + row.column_name + ' (' + row.data_type + ')');
    });
    
    // Check if there's a bank_passbook table that might contain account info
    const passbookCheck = await pool.query(`
      SELECT COUNT(*) as count, 
             COUNT(DISTINCT account_number) as unique_accounts
      FROM bank_passbook
    `);
    
    console.log('\nBank passbook data:');
    console.log('- Total records:', passbookCheck.rows[0].count);
    console.log('- Unique accounts:', passbookCheck.rows[0].unique_accounts);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findSavingsAccountTables();