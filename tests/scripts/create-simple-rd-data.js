const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function createSimpleRDData() {
  console.log('🏗️ CREATING SIMPLE RD DATA FOR UI TESTING');
  console.log('=' .repeat(50));
  
  try {
    const client = await pool.connect();
    
    // 1. Use existing members
    console.log('1. 👥 Finding existing members...');
    const existingMembers = await client.query(`
      SELECT mbno, prefix, f_name, m_name, l_name 
      FROM member_master 
      WHERE isactive = 'Y' 
      ORDER BY mbno::numeric 
      LIMIT 5
    `);
    
    console.log('   Found existing members:');
    existingMembers.rows.forEach(member => {
      console.log(`   ${member.mbno}: ${member.prefix || ''} ${member.f_name} ${member.l_name || ''}`);
    });
    
    if (existingMembers.rows.length === 0) {
      console.log('   ❌ No existing members found');
      return;
    }
    
    // 2. Clear existing RD data
    console.log('\n2. 🧹 Clearing existing RD data...');
    const memberNos = existingMembers.rows.map(m => m.mbno);
    await client.query(`
      DELETE FROM ledger 
      WHERE code = 'A1003' 
      AND mbno = ANY($1)
    `, [memberNos]);
    console.log('   ✅ Cleared existing RD data');
    
    // 3. Get next ledger ID
    const maxLedgerIdResult = await client.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_id FROM ledger');
    let nextLedgerId = parseInt(maxLedgerIdResult.rows[0].next_id);
    let transNo = 500000;
    
    console.log('\n3. 💰 Creating RD transactions...');
    
    // Create RD data for first 3 members
    const membersToUse = existingMembers.rows.slice(0, 3);
    
    for (let i = 0; i < membersToUse.length; i++) {
      const member = membersToUse[i];
      const monthlyAmount = 1000 + (i * 500); // 1000, 1500, 2000
      const startDate = new Date('2023-01-01');
      startDate.setMonth(startDate.getMonth() + (i * 2)); // Stagger start dates
      
      console.log(`\n   📊 Creating RD for Member ${member.mbno}:`);
      console.log(`      Monthly Amount: ₹${monthlyAmount}`);
      console.log(`      Start Date: ${startDate.toISOString().split('T')[0]}`);
      
      // Account opening
      await client.query(`
        INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
        VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'R', 'C', 0.00, 'RD Account Opening', 'System', $6)
      `, [transNo++, startDate.toISOString().split('T')[0], member.mbno, monthlyAmount, `R${(transNo % 1000).toString().padStart(3, '0')}`, nextLedgerId++]);
      
      // Monthly deposits (12 months)
      for (let month = 1; month <= 12; month++) {
        const depositDate = new Date(startDate);
        depositDate.setMonth(startDate.getMonth() + month);
        
        // Only create deposits up to current date
        if (depositDate <= new Date()) {
          await client.query(`
            INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
            VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'R', 'C', 0.00, $6, 'System', $7)
          `, [transNo++, depositDate.toISOString().split('T')[0], member.mbno, monthlyAmount, `R${(transNo % 1000).toString().padStart(3, '0')}`, `Monthly RD Deposit - Month ${month}`, nextLedgerId++]);
        }
      }
      
      // Quarterly interest (4 quarters)
      for (let quarter = 1; quarter <= 4; quarter++) {
        const interestDate = new Date(startDate);
        interestDate.setMonth(startDate.getMonth() + (quarter * 3));
        
        if (interestDate <= new Date()) {
          const interestAmount = Math.round((monthlyAmount * quarter * 3 * 0.08 / 4) * 100) / 100;
          await client.query(`
            INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
            VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'J', 'C', 0.00, $6, 'System', $7)
          `, [transNo++, interestDate.toISOString().split('T')[0], member.mbno, interestAmount, `I${(transNo % 1000).toString().padStart(3, '0')}`, `Quarterly Interest - Q${quarter}`, nextLedgerId++]);
        }
      }
      
      console.log(`      ✅ Created RD transactions for Member ${member.mbno}`);
    }
    
    client.release();
    
    // 4. Verify created data
    console.log('\n4. ✅ Verifying created data...');
    const verificationClient = await pool.connect();
    
    const verificationData = await verificationClient.query(`
      SELECT 
        m.mbno,
        CONCAT(COALESCE(m.prefix, ''), ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
        COUNT(l.trans_no) as transaction_count,
        MIN(l.trans_date) as first_transaction,
        MAX(l.trans_date) as last_transaction,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE -(l.trans_amt::numeric) END) as current_balance
      FROM member_master m 
      INNER JOIN ledger l ON m.mbno = l.mbno
      WHERE l.code = 'A1003'
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      ORDER BY transaction_count DESC
    `);
    
    console.log('\n📊 CREATED RD DATA:');
    verificationData.rows.forEach((member, index) => {
      console.log(`   ${index + 1}. Member ${member.mbno}: ${member.full_name.trim()}`);
      console.log(`      Transactions: ${member.transaction_count}`);
      console.log(`      Period: ${member.first_transaction?.toISOString().split('T')[0]} to ${member.last_transaction?.toISOString().split('T')[0]}`);
      console.log(`      Balance: ₹${parseFloat(member.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log('');
    });
    
    verificationClient.release();
    
    // 5. UI Testing Instructions
    console.log('=' .repeat(50));
    console.log('🎯 UI TESTING READY!');
    console.log('=' .repeat(50));
    
    if (verificationData.rows.length > 0) {
      const bestMember = verificationData.rows[0];
      
      console.log('\n🏆 BEST MEMBER FOR UI TESTING:');
      console.log(`   Member Number: ${bestMember.mbno}`);
      console.log(`   Member Name: ${bestMember.full_name.trim()}`);
      console.log(`   Transactions: ${bestMember.transaction_count}`);
      console.log(`   Balance: ₹${parseFloat(bestMember.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`   Date Range: ${bestMember.first_transaction?.toISOString().split('T')[0]} to ${bestMember.last_transaction?.toISOString().split('T')[0]}`);
      
      console.log('\n📋 UI TEST STEPS:');
      console.log('   1. Open RD Statement in your app');
      console.log(`   2. Enter Member Number: ${bestMember.mbno}`);
      console.log(`   3. Member name should auto-fill`);
      console.log(`   4. Set From Date: ${bestMember.first_transaction?.toISOString().split('T')[0]}`);
      console.log(`   5. Set To Date: ${bestMember.last_transaction?.toISOString().split('T')[0]}`);
      console.log('   6. Click "Generate RD Statement"');
      console.log(`   7. You should see ${bestMember.transaction_count} transactions`);
      console.log('   8. Test print functionality');
      
      console.log('\n🎯 ALL TEST MEMBERS:');
      verificationData.rows.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.mbno}: ${member.transaction_count} transactions, ₹${parseFloat(member.current_balance).toLocaleString('en-IN')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createSimpleRDData();