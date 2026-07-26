const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function analyzeLoanCodes() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 ANALYZING LOAN CODES');
    console.log('=' .repeat(40));

    // Check what L codes represent
    console.log('\n📊 Sample transactions with L codes for our test member:');
    const lCodesQuery = `
      SELECT 
        trans_date,
        trans_type,
        trans_amt,
        code,
        narration,
        receipt_vchr_no
      FROM ledger 
      WHERE mbno = 610028576 
        AND code LIKE 'L%'
      ORDER BY trans_date DESC
      LIMIT 10
    `;
    const lCodesResult = await pool.query(lCodesQuery);
    
    if (lCodesResult.rows.length > 0) {
      lCodesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.trans_date.toDateString()} - ${row.trans_type} - ₹${parseFloat(row.trans_amt || 0).toLocaleString('en-IN')} - ${row.code} - ${row.narration}`);
      });
    }

    // Check if there's a pattern between loan_master and ledger
    console.log('\n📊 Checking correlation between loan_master and ledger:');
    const correlationQuery = `
      SELECT 
        lm.loancaseno,
        lm.loan_amt,
        lm.payment_date,
        lm.loantype,
        l.trans_date,
        l.trans_type,
        l.trans_amt,
        l.code,
        l.narration
      FROM loan_master lm
      LEFT JOIN ledger l ON lm.mbno = l.mbno 
        AND l.trans_date >= lm.payment_date::date - INTERVAL '30 days'
        AND l.trans_date <= lm.payment_date::date + INTERVAL '30 days'
        AND l.trans_amt::numeric = lm.loan_amt::numeric
      WHERE lm.mbno = 610028576
      ORDER BY lm.payment_date DESC
      LIMIT 5
    `;
    const correlationResult = await pool.query(correlationQuery);
    
    if (correlationResult.rows.length > 0) {
      console.log('Potential loan disbursement matches:');
      correlationResult.rows.forEach((row, index) => {
        if (row.trans_date) {
          console.log(`   ${index + 1}. Loan Case ${row.loancaseno}: ₹${parseFloat(row.loan_amt || 0).toLocaleString('en-IN')} → Ledger: ${row.trans_date.toDateString()} - ${row.trans_type} - ₹${parseFloat(row.trans_amt || 0).toLocaleString('en-IN')} - ${row.code}`);
        } else {
          console.log(`   ${index + 1}. Loan Case ${row.loancaseno}: ₹${parseFloat(row.loan_amt || 0).toLocaleString('en-IN')} → No matching ledger entry`);
        }
      });
    }

    // Check account codes table if it exists
    console.log('\n📊 Checking if account codes table exists:');
    const accountCodesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%account%' OR table_name LIKE '%code%' OR table_name LIKE '%head%'
      ORDER BY table_name
    `;
    const accountCodesResult = await pool.query(accountCodesQuery);
    
    if (accountCodesResult.rows.length > 0) {
      console.log('Account/Code related tables:');
      accountCodesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await pool.end();
  }
}

analyzeLoanCodes().catch(console.error);