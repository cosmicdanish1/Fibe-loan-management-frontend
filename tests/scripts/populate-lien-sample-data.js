const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function populateLienSampleData() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 POPULATING LIEN SAMPLE DATA');
    console.log('=' .repeat(40));

    // Step 1: Find existing members with real data
    console.log('\n📊 Step 1: Finding Existing Members');
    const existingMembersQuery = `
      SELECT mbno, CONCAT(prefix, ' ', f_name, ' ', COALESCE(l_name, '')) as name
      FROM member_master 
      WHERE mbno IS NOT NULL 
      ORDER BY mbno 
      LIMIT 5
    `;
    const existingMembers = await pool.query(existingMembersQuery);
    
    if (existingMembers.rows.length === 0) {
      console.log('❌ No existing members found');
      return;
    }

    console.log('✅ Found existing members:');
    existingMembers.rows.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.mbno}: ${member.name}`);
    });

    // Step 2: Create FD accounts for these members
    console.log('\n📊 Step 2: Creating FD Accounts');
    const currentDate = new Date();
    const maturityDate = new Date(currentDate.getFullYear() + 2, currentDate.getMonth(), currentDate.getDate());

    for (let i = 0; i < Math.min(3, existingMembers.rows.length); i++) {
      const member = existingMembers.rows[i];
      const accountNo = 5000 + i + 1;
      
      try {
        await pool.query(`
          INSERT INTO fdmaster (
            mbno, account_number, certno, depdate, matdate, fdamount, 
            rate, fdrdflag, status, depunit, depperiod, interestbalance,
            interestpayamentmode, interestamount, intpaid, openbal
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (mbno, account_number) DO UPDATE SET
            fdamount = EXCLUDED.fdamount,
            rate = EXCLUDED.rate,
            fdrdflag = EXCLUDED.fdrdflag,
            status = EXCLUDED.status
        `, [
          member.mbno, accountNo, `FD${accountNo}`, currentDate, maturityDate, 
          (i + 1) * 50000, 8.5, 'F', '0', 1, 24, 0, 1, 0, 0, 0
        ]);
        
        console.log(`   ✅ Created FD account ${accountNo} for member ${member.mbno}`);
      } catch (error) {
        console.log(`   ⚠️  FD account ${accountNo} for member ${member.mbno}: ${error.message}`);
      }
    }

    // Step 3: Create loan records for these members
    console.log('\n📊 Step 3: Creating Loan Records');
    for (let i = 0; i < Math.min(3, existingMembers.rows.length); i++) {
      const member = existingMembers.rows[i];
      const loanCaseNo = 3000 + i + 1;
      
      try {
        await pool.query(`
          INSERT INTO loan_master (
            mbno, loancaseno, loan_amt, payment_date, rate, 
            no_of_instal, instal_amt, balance, openbalance, purpose, loantype
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (mbno, loancaseno) DO UPDATE SET
            loan_amt = EXCLUDED.loan_amt,
            balance = EXCLUDED.balance
        `, [
          member.mbno, loanCaseNo, (i + 1) * 25000, currentDate, 12.0,
          24, (i + 1) * 1200, (i + 1) * 20000, (i + 1) * 25000, 'Personal Loan', 'PL'
        ]);
        
        console.log(`   ✅ Created loan ${loanCaseNo} for member ${member.mbno}`);
      } catch (error) {
        console.log(`   ⚠️  Loan ${loanCaseNo} for member ${member.mbno}: ${error.message}`);
      }
    }

    // Step 4: Create lien records linking FD accounts to loans
    console.log('\n📊 Step 4: Creating Lien Records');
    
    // Clear existing lien data first
    await pool.query('DELETE FROM fdrdlienmaster');
    console.log('   🗑️  Cleared existing lien data');

    for (let i = 0; i < Math.min(3, existingMembers.rows.length); i++) {
      const member = existingMembers.rows[i];
      const accountNo = 5000 + i + 1;
      const loanCaseNo = 3000 + i + 1;
      const lienDate = new Date(currentDate.getTime() - (i * 24 * 60 * 60 * 1000)); // Stagger dates
      
      try {
        await pool.query(`
          INSERT INTO fdrdlienmaster (
            srno, loancaseno, mbno, fdrd_accountnumber, fromdate, username
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [i + 1, loanCaseNo, member.mbno, accountNo, lienDate, 'admin']);
        
        console.log(`   ✅ Created lien record: Member ${member.mbno}, Loan ${loanCaseNo}, Account ${accountNo}`);
      } catch (error) {
        console.log(`   ❌ Error creating lien record: ${error.message}`);
      }
    }

    // Step 5: Verify the created data
    console.log('\n📊 Step 5: Verifying Created Data');
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
    console.log(`✅ Created ${verifyResult.rows.length} lien records with complete data:`);
    
    verifyResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Member ${row.mbno}: ${row.member_name}`);
      console.log(`      Loan ${row.loancaseno}: ₹${parseFloat(row.loan_amt || 0).toLocaleString('en-IN')}`);
      console.log(`      FD Account ${row.fdrd_accountnumber}: ₹${parseFloat(row.fdamount || 0).toLocaleString('en-IN')}`);
    });

    console.log('\n✅ Sample lien data population completed successfully!');

  } catch (error) {
    console.error('❌ Population failed:', error);
  } finally {
    await pool.end();
  }
}

populateLienSampleData().catch(console.error);