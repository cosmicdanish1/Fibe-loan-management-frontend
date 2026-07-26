const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkLoanCaseNumbers() {
  console.log('🔍 Checking Loan Case Numbers for Member 610031560\n');
  
  try {
    // Check what loan case numbers exist for this member
    const query = `
      SELECT 
        loancaseno,
        loantype,
        loan_amt,
        rate,
        no_of_instal,
        instal_amt,
        balance,
        purpose,
        payment_date
      FROM loan_master 
      WHERE mbno = '610031560'
      ORDER BY loancaseno
    `;
    
    const result = await pool.query(query);
    
    console.log(`Found ${result.rows.length} loans for member 610031560:`);
    
    result.rows.forEach(loan => {
      console.log(`\n📋 Loan Case: ${loan.loancaseno}`);
      console.log(`   Type: ${loan.loantype}`);
      console.log(`   Amount: ₹${loan.loan_amt}`);
      console.log(`   Rate: ${loan.rate}%`);
      console.log(`   Installments: ${loan.no_of_instal}`);
      console.log(`   EMI: ₹${loan.instal_amt}`);
      console.log(`   Balance: ₹${loan.balance}`);
      console.log(`   Purpose: ${loan.purpose || 'N/A'}`);
    });
    
    // Also check if loan case 7000 exists anywhere
    const checkLoan7000 = await pool.query('SELECT * FROM loan_master WHERE loancaseno = $1', ['7000']);
    
    if (checkLoan7000.rows.length > 0) {
      console.log('\n✅ Loan case 7000 exists in database');
      console.log('Member:', checkLoan7000.rows[0].mbno);
    } else {
      console.log('\n❌ Loan case 7000 does not exist in loan_master table');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLoanCaseNumbers();