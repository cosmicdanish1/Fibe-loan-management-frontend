const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function fixLienSampleData() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 FIXING LIEN SAMPLE DATA');
    console.log('=' .repeat(40));

    // Step 1: Check existing members
    const membersQuery = `SELECT mbno FROM member_master WHERE mbno IN (1001, 1002, 1003) ORDER BY mbno`;
    const members = await pool.query(membersQuery);
    
    console.log(`Found ${members.rows.length} test members`);

    // Step 2: Create FD accounts (without ON CONFLICT)
    console.log('\n📊 Creating FD Accounts');
    for (let i = 0; i < members.rows.length; i++) {
      const member = members.rows[i];
      const accountNo = 5000 + i + 1;
      const currentDate = new Date();
      const maturityDate = new Date(currentDate.getFullYear() + 2, currentDate.getMonth(), currentDate.getDate());
      
      try {
        // Check if account exists first
        const existsQuery = `SELECT 1 FROM fdmaster WHERE mbno = $1 AND account_number = $2`;
        const exists = await pool.query(existsQuery, [member.mbno, accountNo]);
        
        if (exists.rows.length === 0) {
          await pool.query(`
            INSERT INTO fdmaster (
              mbno, account_number, certno, depdate, matdate, fdamount, 
              rate, fdrdflag, status, depunit, depperiod, interestbalance,
              interestpayamentmode, interestamount, intpaid, openbal
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [
            member.mbno, accountNo, `FD${accountNo}`, currentDate, maturityDate, 
            (i + 1) * 50000, 8.5, 'F', '0', 1, 24, 0, 1, 0, 0, 0
          ]);
          console.log(`   ✅ Created FD account ${accountNo} for member ${member.mbno}`);
        } else {
          // Update existing account
          await pool.query(`
            UPDATE fdmaster SET 
              fdamount = $3, rate = $4, fdrdflag = $5, status = $6
            WHERE mbno = $1 AND account_number = $2
          `, [member.mbno, accountNo, (i + 1) * 50000, 8.5, 'F', '0']);
          console.log(`   ✅ Updated FD account ${accountNo} for member ${member.mbno}`);
        }
      } catch (error) {
        console.log(`   ❌ Error with FD account ${accountNo}: ${error.message}`);
      }
    }

    // Step 3: Create loan records (fix the loantype issue)
    console.log('\n📊 Creating Loan Records');
    for (let i = 0; i < members.rows.length; i++) {
      const member = members.rows[i];
      const loanCaseNo = 3000 + i + 1;
      const currentDate = new Date();
      
      try {
        // Check if loan exists first
        const existsQuery = `SELECT 1 FROM loan_master WHERE mbno = $1 AND loancaseno = $2`;
        const exists = await pool.query(existsQuery, [member.mbno, loanCaseNo]);
        
        if (exists.rows.length === 0) {
          await pool.query(`
            INSERT INTO loan_master (
              mbno, loancaseno, loan_amt, payment_date, rate, 
              no_of_instal, instal_amt, balance, openbalance, purpose
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            member.mbno, loanCaseNo, (i + 1) * 25000, currentDate, 12.0,
            24, (i + 1) * 1200, (i + 1) * 20000, (i + 1) * 25000, 'Personal Loan'
          ]);
          console.log(`   ✅ Created loan ${loanCaseNo} for member ${member.mbno}`);
        } else {
          // Update existing loan
          await pool.query(`
            UPDATE loan_master SET 
              loan_amt = $3, balance = $4
            WHERE mbno = $1 AND loancaseno = $2
          `, [member.mbno, loanCaseNo, (i + 1) * 25000, (i + 1) * 20000]);
          console.log(`   ✅ Updated loan ${loanCaseNo} for member ${member.mbno}`);
        }
      } catch (error) {
        console.log(`   ❌ Error with loan ${loanCaseNo}: ${error.message}`);
      }
    }

    // Step 4: Verify the complete data
    console.log('\n📊 Verifying Complete Data');
    const verifyQuery = `
      SELECT 
        l.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.l_name, '')) as member_name,
        l.loancaseno,
        l.fdrd_accountnumber,
        l.fromdate,
        f.fdamount,
        lm.loan_amt
      FROM fdrdlienmaster l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      LEFT JOIN fdmaster f ON l.mbno = f.mbno AND l.fdrd_accountnumber = f.account_number
      LEFT JOIN loan_master lm ON l.loancaseno = lm.loancaseno AND l.mbno = lm.mbno
      ORDER BY l.fromdate DESC
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    console.log(`✅ Found ${verifyResult.rows.length} lien records:`);
    
    verifyResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Member ${row.mbno}: ${row.member_name}`);
      console.log(`      Loan ${row.loancaseno}: ₹${parseFloat(row.loan_amt || 0).toLocaleString('en-IN')}`);
      console.log(`      FD Account ${row.fdrd_accountnumber}: ₹${parseFloat(row.fdamount || 0).toLocaleString('en-IN')}`);
    });

    console.log('\n✅ Lien data fix completed successfully!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await pool.end();
  }
}

fixLienSampleData().catch(console.error);