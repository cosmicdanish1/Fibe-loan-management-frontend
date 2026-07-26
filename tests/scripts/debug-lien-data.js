const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function debugLienData() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 DEBUGGING LIEN DATA');
    console.log('=' .repeat(40));

    // Check raw lien data
    console.log('\n📊 Raw Lien Data:');
    const lienQuery = `SELECT * FROM fdrdlienmaster LIMIT 5`;
    const lienResult = await pool.query(lienQuery);
    
    if (lienResult.rows.length > 0) {
      lienResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}.`, row);
      });
    }

    // Check if members exist for lien records
    console.log('\n📊 Checking Member Data for Lien Records:');
    const memberCheckQuery = `
      SELECT 
        l.mbno as lien_member,
        m.mbno as member_exists,
        CONCAT(m.prefix, ' ', m.f_name, ' ', m.l_name) as member_name
      FROM fdrdlienmaster l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      LIMIT 5
    `;
    const memberCheckResult = await pool.query(memberCheckQuery);
    
    if (memberCheckResult.rows.length > 0) {
      memberCheckResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Lien Member: ${row.lien_member}, Exists: ${row.member_exists ? 'Yes' : 'No'}, Name: ${row.member_name || 'N/A'}`);
      });
    }

    // Check FD accounts for lien records
    console.log('\n📊 Checking FD Account Data for Lien Records:');
    const fdCheckQuery = `
      SELECT 
        l.mbno,
        l.fdrd_accountnumber,
        f.mbno as fd_member,
        f.account_number as fd_account,
        f.fdamount,
        f.fdrdflag
      FROM fdrdlienmaster l
      LEFT JOIN fdmaster f ON l.mbno = f.mbno AND l.fdrd_accountnumber = f.account_number
      LIMIT 5
    `;
    const fdCheckResult = await pool.query(fdCheckQuery);
    
    if (fdCheckResult.rows.length > 0) {
      fdCheckResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Lien: ${row.mbno}/${row.fdrd_accountnumber}, FD Match: ${row.fd_member}/${row.fd_account}, Amount: ₹${parseFloat(row.fdamount || 0).toLocaleString('en-IN')}`);
      });
    }

    // Check loan data for lien records
    console.log('\n📊 Checking Loan Data for Lien Records:');
    const loanCheckQuery = `
      SELECT 
        l.mbno,
        l.loancaseno,
        lm.mbno as loan_member,
        lm.loancaseno as loan_case,
        lm.loan_amt
      FROM fdrdlienmaster l
      LEFT JOIN loan_master lm ON l.loancaseno = lm.loancaseno AND l.mbno = lm.mbno
      LIMIT 5
    `;
    const loanCheckResult = await pool.query(loanCheckQuery);
    
    if (loanCheckResult.rows.length > 0) {
      loanCheckResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Lien: ${row.mbno}/${row.loancaseno}, Loan Match: ${row.loan_member}/${row.loan_case}, Amount: ₹${parseFloat(row.loan_amt || 0).toLocaleString('en-IN')}`);
      });
    }

    // Try a simpler query without strict joins
    console.log('\n📊 Testing Simplified Query:');
    const simpleQuery = `
      SELECT 
        l.mbno,
        l.loancaseno,
        l.fdrd_accountnumber,
        l.fromdate,
        l.username
      FROM fdrdlienmaster l
      WHERE l.mbno IS NOT NULL
      ORDER BY l.fromdate DESC
      LIMIT 3
    `;
    const simpleResult = await pool.query(simpleQuery);
    
    if (simpleResult.rows.length > 0) {
      console.log('✅ Found lien records:');
      simpleResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Member: ${row.mbno}, Loan: ${row.loancaseno}, Account: ${row.fdrd_accountnumber}`);
      });
    } else {
      console.log('❌ No lien records found');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugLienData().catch(console.error);