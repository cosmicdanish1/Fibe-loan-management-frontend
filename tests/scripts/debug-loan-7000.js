const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkLoan7000() {
  try {
    // Check if loan 7000 exists in loan_master
    const result = await pool.query('SELECT * FROM loan_master WHERE loancaseno = $1', ['7000']);
    console.log('Loan 7000 in loan_master:', result.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
    
    if (result.rows.length > 0) {
      console.log('Loan details:', result.rows[0]);
    }
    
    // Check if it exists as string
    const result2 = await pool.query("SELECT * FROM loan_master WHERE loancaseno::text = '7000'");
    console.log('Loan 7000 as string:', result2.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
    
    // Check what loan cases exist for member 610031566
    const result3 = await pool.query("SELECT loancaseno, mbno, loan_amt FROM loan_master WHERE mbno = '610031566'");
    console.log('\nLoans for member 610031566 in loan_master:');
    result3.rows.forEach(row => {
      console.log(`- Loan: ${row.loancaseno}, Member: ${row.mbno}, Amount: ${row.loan_amt}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLoan7000();