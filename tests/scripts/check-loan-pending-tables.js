const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkLoanPendingTables() {
  try {
    console.log('🔍 Checking loan pending tables for loan case 7000...\n');
    
    // Check loan_pending table
    try {
      const result1 = await pool.query("SELECT * FROM loan_pending WHERE loancaseno = '7000'");
      console.log('loan_pending table:', result1.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
      if (result1.rows.length > 0) {
        console.log('Details:', result1.rows[0]);
      }
    } catch (e) {
      console.log('loan_pending table: ERROR -', e.message);
    }
    
    // Check loan_pending_aln table
    try {
      const result2 = await pool.query("SELECT * FROM loan_pending_aln WHERE loancaseno = '7000'");
      console.log('loan_pending_aln table:', result2.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
      if (result2.rows.length > 0) {
        console.log('Details:', result2.rows[0]);
      }
    } catch (e) {
      console.log('loan_pending_aln table: ERROR -', e.message);
    }
    
    // Check loan_pending_rln table
    try {
      const result3 = await pool.query("SELECT * FROM loan_pending_rln WHERE loancaseno = '7000'");
      console.log('loan_pending_rln table:', result3.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
      if (result3.rows.length > 0) {
        console.log('Details:', result3.rows[0]);
      }
    } catch (e) {
      console.log('loan_pending_rln table: ERROR -', e.message);
    }
    
    // Check loan_accounts table
    try {
      const result4 = await pool.query("SELECT * FROM loan_accounts WHERE loan_case_no = '7000'");
      console.log('loan_accounts table:', result4.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
      if (result4.rows.length > 0) {
        console.log('Details:', result4.rows[0]);
      }
    } catch (e) {
      console.log('loan_accounts table: ERROR -', e.message);
    }
    
    // Also check what member 610031566 has in these tables
    console.log('\n📋 All loans for member 610031566 in different tables:');
    
    try {
      const memberLoans = await pool.query("SELECT 'loan_pending' as source, loancaseno FROM loan_pending WHERE mbno = '610031566' UNION ALL SELECT 'loan_pending_aln' as source, loancaseno FROM loan_pending_aln WHERE mbno = '610031566' UNION ALL SELECT 'loan_pending_rln' as source, loancaseno FROM loan_pending_rln WHERE mbno = '610031566'");
      memberLoans.rows.forEach(row => {
        console.log(`- ${row.source}: ${row.loancaseno}`);
      });
    } catch (e) {
      console.log('Error checking member loans:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLoanPendingTables();