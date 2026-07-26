const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function createFDSampleData() {
  console.log('🏦 CREATING FD SAMPLE DATA FOR UI TESTING');
  console.log('=' .repeat(50));
  
  try {
    const client = await pool.connect();
    
    // 1. Ensure head code exists
    console.log('1. 📋 Setting up head codes...');
    await client.query(`
      INSERT INTO headmaster (code, head_name, headtype, parent_code, hposition, interest, op_bal, pflag)
      VALUES ('A003', 'FIXED DEPOSIT', 'AST', 'A100', '1.2', 'Y', 0, 'Y')
      ON CONFLICT (code) DO UPDATE SET
        head_name = EXCLUDED.head_name,
        headtype = EXCLUDED.headtype
    `);
    console.log('   ✅ Head code A003 (FIXED DEPOSIT) ready');
    
    // 2. Update existing fdmaster records with head code
    console.log('\n2. 🔧 Updating fdmaster records with head code...');
    await client.query(`
      UPDATE fdmaster 
      SET headcode = 'A003' 
      WHERE fdrdflag = 'F' AND (headcode IS NULL OR headcode = '')
    `);
    console.log('   ✅ Updated fdmaster records with A003 head code');
    
    // 3. Get existing FD accounts
    console.log('\n3. 📊 Getting existing FD accounts...');
    const fdAccounts = await client.query(`
      SELECT 
        mbno,
        account_number,
        CONCAT(COALESCE(prefix, ''), ' ', f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as full_name,
        certno,
        fdamount,
        rate,
        depdate,
        matdate,
        status
      FROM fdmaster 
      WHERE fdrdflag = 'F'
      ORDER BY depdate DESC
      LIMIT 5
    `);
    
    console.log(`   📋 Found ${fdAccounts.rows.length} FD accounts:`);
    fdAccounts.rows.forEach(fd => {
      console.log(`      ${fd.mbno}: ${fd.full_name.trim()} - ₹${parseFloat(fd.fdamount || 0).toLocaleString('en-IN')}`);
    });
    
    // 4. Clear existing FD transactions
    console.log('\n4. 🧹 Clearing existing FD transactions...');
    const fdMemberNos = fdAccounts.rows.map(fd => fd.mbno);
    if (fdMemberNos.length > 0) {
      await client.query(`
        DELETE FROM ledger 
        WHERE code = 'A003' 
        AND mbno = ANY($1)
      `, [fdMemberNos]);
      console.log('   ✅ Cleared existing FD transactions');
    }
    
    // 5. Get next ledger ID
    const maxLedgerIdResult = await client.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_id FROM ledger');
    let nextLedgerId = parseInt(maxLedgerIdResult.rows[0].next_id);
    let transNo = 700000;
    
    console.log('\n5. 💰 Creating FD transactions...');
    
    // Create transactions for each FD account
    for (const fdAccount of fdAccounts.rows) {
      const mbno = fdAccount.mbno;
      const principalAmount = parseFloat(fdAccount.fdamount || 0);
      const interestRate = parseFloat(fdAccount.rate || 0);
      const depositDate = new Date(fdAccount.depdate);
      const maturityDate = new Date(fdAccount.matdate);
      
      console.log(`\n   📊 Creating transactions for Member ${mbno}:`);
      console.log(`      Principal: ₹${principalAmount.toLocaleString('en-IN')}, Rate: ${interestRate}%`);
      console.log(`      Period: ${depositDate.toISOString().split('T')[0]} to ${maturityDate.toISOString().split('T')[0]}`);
      
      // Initial deposit transaction
      await client.query(`
        INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
        VALUES ($1, $2, 'CR', 'A003', $3, $4, 'FD', $5, $6, 'R', 'C', 0.00, 'Fixed Deposit Opening', 'System', $7)
      `, [transNo++, depositDate.toISOString().split('T')[0], mbno, fdAccount.account_number, principalAmount, `FD${(transNo % 1000).toString().padStart(3, '0')}`, nextLedgerId++]);
      
      // Calculate quarterly interest credits
      const currentDate = new Date();
      const quarterlyInterest = Math.round((principalAmount * interestRate / 100 / 4) * 100) / 100;
      
      let interestDate = new Date(depositDate);
      interestDate.setMonth(interestDate.getMonth() + 3); // First quarter
      
      let quarterCount = 0;
      while (interestDate <= currentDate && interestDate <= maturityDate && quarterCount < 20) { // Max 5 years
        quarterCount++;
        
        await client.query(`
          INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
          VALUES ($1, $2, 'CR', 'A003', $3, $4, 'FD', $5, $6, 'J', 'C', 0.00, $7, 'System', $8)
        `, [transNo++, interestDate.toISOString().split('T')[0], mbno, fdAccount.account_number, quarterlyInterest, `INT${(transNo % 1000).toString().padStart(3, '0')}`, `Quarterly Interest Credit - Q${quarterCount}`, nextLedgerId++]);
        
        // Move to next quarter
        interestDate.setMonth(interestDate.getMonth() + 3);
      }
      
      // Maturity withdrawal (if matured and status is closed)
      if (fdAccount.status === '1' && maturityDate <= currentDate) {
        const maturityAmount = principalAmount + (principalAmount * interestRate / 100 * ((maturityDate - depositDate) / (365 * 24 * 60 * 60 * 1000)));
        
        await client.query(`
          INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
          VALUES ($1, $2, 'DR', 'A003', $3, $4, 'FD', $5, $6, 'P', 'C', 0.00, 'FD Maturity Withdrawal', 'System', $7)
        `, [transNo++, maturityDate.toISOString().split('T')[0], mbno, fdAccount.account_number, maturityAmount, `MAT${(transNo % 1000).toString().padStart(3, '0')}`, nextLedgerId++]);
      }
      
      console.log(`      ✅ Created ${quarterCount + 1 + (fdAccount.status === '1' ? 1 : 0)} transactions`);
    }
    
    client.release();
    
    // 6. Verify created data
    console.log('\n6. ✅ Verifying created data...');
    const verificationClient = await pool.connect();
    
    const verificationData = await verificationClient.query(`
      SELECT 
        f.mbno,
        CONCAT(COALESCE(f.prefix, ''), ' ', f.f_name, ' ', COALESCE(f.m_name, ''), ' ', COALESCE(f.l_name, '')) as full_name,
        f.account_number,
        f.certno,
        f.fdamount,
        f.rate,
        f.depdate,
        f.matdate,
        f.status,
        COUNT(l.trans_no) as transaction_count,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE -(l.trans_amt::numeric) END) as current_balance
      FROM fdmaster f 
      LEFT JOIN ledger l ON f.mbno = l.mbno AND l.code = 'A003'
      WHERE f.fdrdflag = 'F'
      GROUP BY f.mbno, f.prefix, f.f_name, f.m_name, f.l_name, f.account_number, f.certno, f.fdamount, f.rate, f.depdate, f.matdate, f.status
      ORDER BY transaction_count DESC
    `);
    
    console.log('\n📊 CREATED FD DATA SUMMARY:');
    verificationData.rows.forEach((fd, index) => {
      console.log(`   ${index + 1}. Member ${fd.mbno}: ${fd.full_name.trim()}`);
      console.log(`      Account: ${fd.account_number}, Certificate: ${fd.certno}`);
      console.log(`      Principal: ₹${parseFloat(fd.fdamount || 0).toLocaleString('en-IN')}, Rate: ${fd.rate}%`);
      console.log(`      Transactions: ${fd.transaction_count}, Balance: ₹${parseFloat(fd.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`      Status: ${fd.status === '0' ? 'Active' : 'Closed'}, Deposit Date: ${fd.depdate?.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    verificationClient.release();
    
    // 7. UI Testing Instructions
    console.log('=' .repeat(50));
    console.log('🎯 UI TESTING READY!');
    console.log('=' .repeat(50));
    
    if (verificationData.rows.length > 0) {
      const bestFD = verificationData.rows[0];
      
      console.log('\n🏆 BEST FD FOR UI TESTING:');
      console.log(`   Member Number: ${bestFD.mbno}`);
      console.log(`   Member Name: ${bestFD.full_name.trim()}`);
      console.log(`   Account Number: ${bestFD.account_number}`);
      console.log(`   Certificate Number: ${bestFD.certno}`);
      console.log(`   Principal Amount: ₹${parseFloat(bestFD.fdamount || 0).toLocaleString('en-IN')}`);
      console.log(`   Interest Rate: ${bestFD.rate}% p.a.`);
      console.log(`   Transactions: ${bestFD.transaction_count}`);
      console.log(`   Current Balance: ₹${parseFloat(bestFD.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`   Status: ${bestFD.status === '0' ? 'Active' : 'Closed'}`);
      
      console.log('\n📋 UI TEST STEPS:');
      console.log('   1. Open FD Statement in your app');
      console.log(`   2. Enter Member Number: ${bestFD.mbno}`);
      console.log(`   3. Member name should auto-fill`);
      console.log(`   4. Set From Date: 01-Apr-2015`);
      console.log(`   5. Set To Date: Current Date`);
      console.log('   6. Click "Generate FD Statement"');
      console.log(`   7. You should see ${bestFD.transaction_count} transactions`);
      console.log('   8. Verify FD account details display correctly');
      console.log('   9. Test print functionality');
      
      console.log('\n🎯 ALL TEST FD ACCOUNTS:');
      verificationData.rows.forEach((fd, index) => {
        console.log(`   ${index + 1}. ${fd.mbno}: ${fd.transaction_count} transactions, ₹${parseFloat(fd.current_balance || 0).toLocaleString('en-IN')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createFDSampleData();