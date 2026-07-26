/**
 * Check loan_master data types and sample data
 */

const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function checkLoanData() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('Checking loan_master data types and sample data...');
    
    // Check data types
    const dataTypeQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'loan_master'
      ORDER BY ordinal_position
    `;
    
    const dataTypeResult = await pool.query(dataTypeQuery);
    console.log('\nColumn data types:');
    dataTypeResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check sample data
    const sampleQuery = `
      SELECT 
        mbno,
        loantype,
        loancaseno,
        loan_amt,
        balance,
        payment_date
      FROM loan_master
      WHERE balance::numeric = 0
      LIMIT 5
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    console.log('\nSample closed loans:');
    sampleResult.rows.forEach((loan, index) => {
      console.log(`  ${index + 1}. Member: ${loan.mbno}, Type: ${loan.loantype}, Case: ${loan.loancaseno}, Amount: ${loan.loan_amt}, Balance: ${loan.balance}`);
    });
    
    // Check if loantype has null values
    const nullTypeQuery = `
      SELECT COUNT(*) as total_loans, 
             COUNT(loantype) as loans_with_type,
             COUNT(*) - COUNT(loantype) as loans_without_type
      FROM loan_master
    `;
    
    const nullTypeResult = await pool.query(nullTypeQuery);
    console.log('\nLoan type statistics:');
    console.log(`  Total loans: ${nullTypeResult.rows[0].total_loans}`);
    console.log(`  Loans with type: ${nullTypeResult.rows[0].loans_with_type}`);
    console.log(`  Loans without type: ${nullTypeResult.rows[0].loans_without_type}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLoanData();