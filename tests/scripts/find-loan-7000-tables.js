const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function findLoan7000() {
  try {
    console.log('🔍 Searching for loan case 7000 in different tables...\n');
    
    // Check loan_application table
    try {
      const result1 = await pool.query("SELECT * FROM loan_application WHERE loan_case_no = '7000'");
      console.log('loan_application table:', result1.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
      if (result1.rows.length > 0) {
        console.log('Details:', result1.rows[0]);
      }
    } catch (e) {
      console.log('loan_application table: ERROR -', e.message);
    }
    
    // Check loan_sanction table  
    try {
      const result2 = await pool.query("SELECT * FROM loan_sanction WHERE loan_case_no = '7000'");
      console.log('loan_sanction table:', result2.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
      if (result2.rows.length > 0) {
        console.log('Details:', result2.rows[0]);
      }
    } catch (e) {
      console.log('loan_sanction table: ERROR -', e.message);
    }
    
    // Check demand_master table
    try {
      const result3 = await pool.query("SELECT DISTINCT loancaseno FROM demand_master WHERE loancaseno = '7000'");
      console.log('demand_master table:', result3.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
    } catch (e) {
      console.log('demand_master table: ERROR -', e.message);
    }
    
    // List all tables that might contain loan data
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%loan%'
      ORDER BY table_name
    `;
    
    const tables = await pool.query(tablesQuery);
    console.log('\n📋 Available loan-related tables:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findLoan7000();