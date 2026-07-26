const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function debugLoanLedgerData() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 DEBUGGING LOAN LEDGER DATA');
    console.log('=' .repeat(50));

    // Check what codes exist in ledger table
    console.log('\n📊 Step 1: Checking all unique codes in ledger table');
    const codesQuery = `
      SELECT code, COUNT(*) as count
      FROM ledger 
      WHERE code IS NOT NULL
      GROUP BY code
      ORDER BY count DESC
      LIMIT 20
    `;
    const codesResult = await pool.query(codesQuery);
    console.log('Top 20 codes in ledger:');
    codesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.code}: ${row.count} transactions`);
    });

    // Check for loan-related codes
    console.log('\n📊 Step 2: Checking for loan-related codes');
    const loanCodesQuery = `
      SELECT code, COUNT(*) as count
      FROM ledger 
      WHERE code ILIKE '%loan%' OR code ILIKE '%ln%' OR code LIKE '%LN%'
      GROUP BY code
      ORDER BY count DESC
    `;
    const loanCodesResult = await pool.query(loanCodesQuery);
    console.log('Loan-related codes:');
    if (loanCodesResult.rows.length > 0) {
      loanCodesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.code}: ${row.count} transactions`);
      });
    } else {
      console.log('   No loan-related codes found');
    }

    // Check narrations for loan-related terms
    console.log('\n📊 Step 3: Checking narrations for loan-related terms');
    const narrationQuery = `
      SELECT narration, COUNT(*) as count
      FROM ledger 
      WHERE narration ILIKE '%loan%' OR narration ILIKE '%contribution%'
      GROUP BY narration
      ORDER BY count DESC
      LIMIT 10
    `;
    const narrationResult = await pool.query(narrationQuery);
    console.log('Loan-related narrations:');
    if (narrationResult.rows.length > 0) {
      narrationResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.narration}: ${row.count} transactions`);
      });
    } else {
      console.log('   No loan-related narrations found');
    }

    // Check if our test member has any ledger entries at all
    console.log('\n📊 Step 4: Checking ledger entries for test member 610028576');
    const memberLedgerQuery = `
      SELECT 
        trans_date,
        trans_type,
        trans_amt,
        code,
        narration,
        receipt_vchr_no
      FROM ledger 
      WHERE mbno = 610028576
      ORDER BY trans_date DESC
      LIMIT 10
    `;
    const memberLedgerResult = await pool.query(memberLedgerQuery);
    console.log(`Ledger entries for member 610028576 (${memberLedgerResult.rows.length} found):`);
    if (memberLedgerResult.rows.length > 0) {
      memberLedgerResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.trans_date} - ${row.trans_type} - ₹${parseFloat(row.trans_amt || 0).toLocaleString('en-IN')} - ${row.code} - ${row.narration}`);
      });
    } else {
      console.log('   No ledger entries found for this member');
    }

    // Check loan_master data for this member
    console.log('\n📊 Step 5: Checking loan_master data for test member');
    const loanMasterQuery = `
      SELECT 
        loantype,
        loancaseno,
        loan_amt,
        payment_date,
        rate,
        purpose
      FROM loan_master 
      WHERE mbno = 610028576
      ORDER BY payment_date DESC
      LIMIT 5
    `;
    const loanMasterResult = await pool.query(loanMasterQuery);
    console.log(`Loan master entries for member 610028576 (${loanMasterResult.rows.length} found):`);
    if (loanMasterResult.rows.length > 0) {
      loanMasterResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.loantype} - Case ${row.loancaseno} - ₹${parseFloat(row.loan_amt || 0).toLocaleString('en-IN')} - ${row.purpose}`);
      });
    }

    // Check if we need to create sample ledger data
    console.log('\n📊 Step 6: Recommendation');
    if (memberLedgerResult.rows.length === 0) {
      console.log('⚠️  No ledger entries found for test member.');
      console.log('💡 We need to create sample ledger transactions for loan contributions.');
      console.log('   This will populate the ledger table with loan-related transactions.');
    } else {
      console.log('✅ Member has ledger entries, but none match loan criteria.');
      console.log('💡 We may need to adjust the query criteria or add loan-specific codes.');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugLoanLedgerData().catch(console.error);