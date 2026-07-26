const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function findRDMembersWithData() {
  console.log('🔍 FINDING RD MEMBERS WITH SUBSTANTIAL DATA');
  console.log('=' .repeat(60));
  
  try {
    const client = await pool.connect();
    
    // 1. Check all RD-related head codes with data
    console.log('1. 📊 Checking all RD head codes with transaction data...');
    const rdHeadCodes = await client.query(`
      SELECT 
        h.code,
        h.head_name,
        COUNT(l.trans_no) as total_transactions,
        COUNT(DISTINCT l.mbno) as unique_members,
        MIN(l.trans_date) as earliest_date,
        MAX(l.trans_date) as latest_date,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE 0 END) as total_credits,
        SUM(CASE WHEN l.trans_type = 'DR' THEN l.trans_amt::numeric ELSE 0 END) as total_debits
      FROM headmaster h
      LEFT JOIN ledger l ON h.code = l.code
      WHERE (
        UPPER(h.head_name) LIKE '%RECURRING%' 
        OR UPPER(h.head_name) LIKE '%RD%' 
        OR h.code LIKE 'A004%'
        OR h.code LIKE 'A1003%'
        OR h.code LIKE 'RD%'
      )
      AND l.trans_no IS NOT NULL
      GROUP BY h.code, h.head_name
      ORDER BY total_transactions DESC
    `);
    
    console.log('📋 RD Head Codes with Data:');
    rdHeadCodes.rows.forEach(head => {
      console.log(`   ${head.code}: ${head.head_name}`);
      console.log(`      Transactions: ${head.total_transactions}, Members: ${head.unique_members}`);
      console.log(`      Period: ${head.earliest_date?.toISOString().split('T')[0]} to ${head.latest_date?.toISOString().split('T')[0]}`);
      console.log(`      Credits: ₹${parseFloat(head.total_credits || 0).toLocaleString('en-IN')}, Debits: ₹${parseFloat(head.total_debits || 0).toLocaleString('en-IN')}`);
      console.log('');
    });
    
    // 2. Find members with the most RD transactions
    console.log('2. 👥 Finding members with most RD transactions...');
    const topRDMembers = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
        l.code as head_code,
        h.head_name,
        COUNT(l.trans_no) as transaction_count,
        MIN(l.trans_date) as first_transaction,
        MAX(l.trans_date) as last_transaction,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE -(l.trans_amt::numeric) END) as current_balance,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE 0 END) as total_deposits,
        SUM(CASE WHEN l.trans_type = 'DR' THEN l.trans_amt::numeric ELSE 0 END) as total_withdrawals
      FROM member_master m 
      INNER JOIN ledger l ON m.mbno = l.mbno
      LEFT JOIN headmaster h ON l.code = h.code
      WHERE m.isactive = 'Y' 
        AND l.code IN (
          SELECT code FROM headmaster 
          WHERE UPPER(head_name) LIKE '%RECURRING%' 
             OR UPPER(head_name) LIKE '%RD%' 
             OR code LIKE 'A004%'
             OR code LIKE 'A1003%'
             OR code LIKE 'RD%'
        )
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name, l.code, h.head_name
      ORDER BY transaction_count DESC, current_balance DESC
      LIMIT 20
    `);
    
    console.log('📋 Top Members with RD Data:');
    topRDMembers.rows.forEach((member, index) => {
      console.log(`   ${index + 1}. Member ${member.mbno}: ${member.full_name}`);
      console.log(`      Head Code: ${member.head_code} (${member.head_name})`);
      console.log(`      Transactions: ${member.transaction_count}`);
      console.log(`      Period: ${member.first_transaction?.toISOString().split('T')[0]} to ${member.last_transaction?.toISOString().split('T')[0]}`);
      console.log(`      Current Balance: ₹${parseFloat(member.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`      Total Deposits: ₹${parseFloat(member.total_deposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`      Total Withdrawals: ₹${parseFloat(member.total_withdrawals || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log('');
    });
    
    // 3. Check if we need to create more sample data
    if (topRDMembers.rows.length === 0) {
      console.log('⚠️ No RD data found. Creating comprehensive sample data...');
      await createComprehensiveRDData(client);
      
      // Re-run the query after creating data
      const newRDMembers = await client.query(`
        SELECT 
          m.mbno,
          CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
          COUNT(l.trans_no) as transaction_count,
          SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE -(l.trans_amt::numeric) END) as current_balance
        FROM member_master m 
        INNER JOIN ledger l ON m.mbno = l.mbno
        WHERE m.isactive = 'Y' 
          AND l.code = 'A1003'
        GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
        ORDER BY transaction_count DESC
        LIMIT 10
      `);
      
      console.log('✅ Sample RD data created. New member list:');
      newRDMembers.rows.forEach((member, index) => {
        console.log(`   ${index + 1}. Member ${member.mbno}: ${member.full_name}`);
        console.log(`      Transactions: ${member.transaction_count}, Balance: ₹${parseFloat(member.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      });
    }
    
    // 4. Get detailed transaction history for top 3 members
    console.log('3. 📊 Detailed transaction history for top members...');
    const topMembers = topRDMembers.rows.slice(0, 3);
    
    for (const member of topMembers) {
      console.log(`\n📋 Transaction Details for Member ${member.mbno} (${member.full_name}):`);
      
      const transactions = await client.query(`
        SELECT 
          l.trans_date,
          l.trans_type,
          l.trans_amt,
          l.narration,
          l.receipt_vchr_no,
          SUM(CASE WHEN l2.trans_type = 'CR' THEN l2.trans_amt::numeric ELSE -(l2.trans_amt::numeric) END) 
            OVER (ORDER BY l2.trans_date, l2.trans_no ROWS UNBOUNDED PRECEDING) as running_balance
        FROM ledger l
        LEFT JOIN ledger l2 ON l2.mbno = l.mbno AND l2.code = l.code AND l2.trans_no <= l.trans_no
        WHERE l.mbno = $1 AND l.code = $2
        ORDER BY l.trans_date, l.trans_no
        LIMIT 10
      `, [member.mbno, member.head_code]);
      
      transactions.rows.forEach((trans, index) => {
        const amount = parseFloat(trans.trans_amt);
        const balance = parseFloat(trans.running_balance || 0);
        console.log(`   ${index + 1}. ${trans.trans_date?.toISOString().split('T')[0]} - ${trans.trans_type} ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        console.log(`      Particulars: ${trans.narration}`);
        console.log(`      Voucher: ${trans.receipt_vchr_no}`);
        console.log(`      Running Balance: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        console.log('');
      });
    }
    
    client.release();
    
    // 5. UI Testing Recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 UI TESTING RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    if (topRDMembers.rows.length > 0) {
      const bestMember = topRDMembers.rows[0];
      console.log('\n🏆 BEST MEMBER FOR UI TESTING:');
      console.log(`   Member Number: ${bestMember.mbno}`);
      console.log(`   Member Name: ${bestMember.full_name}`);
      console.log(`   Head Code: ${bestMember.head_code}`);
      console.log(`   Transaction Count: ${bestMember.transaction_count}`);
      console.log(`   Current Balance: ₹${parseFloat(bestMember.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`   Date Range: ${bestMember.first_transaction?.toISOString().split('T')[0]} to ${bestMember.last_transaction?.toISOString().split('T')[0]}`);
      
      console.log('\n📋 UI TEST STEPS:');
      console.log('   1. Open RD Statement in your application');
      console.log(`   2. Enter Member Number: ${bestMember.mbno}`);
      console.log(`   3. Member name should auto-fill: "${bestMember.full_name}"`);
      console.log(`   4. Set From Date: ${bestMember.first_transaction?.toISOString().split('T')[0]}`);
      console.log(`   5. Set To Date: ${bestMember.last_transaction?.toISOString().split('T')[0]}`);
      console.log('   6. Click "Generate RD Statement"');
      console.log(`   7. You should see ${bestMember.transaction_count} transactions`);
      console.log(`   8. Final balance should be: ₹${parseFloat(bestMember.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      
      console.log('\n🎯 ALTERNATIVE TEST MEMBERS:');
      topRDMembers.rows.slice(1, 5).forEach((member, index) => {
        console.log(`   ${index + 2}. Member ${member.mbno}: ${member.full_name} (${member.transaction_count} transactions)`);
      });
    } else {
      console.log('\n⚠️ No RD data found in database.');
      console.log('   Run the comprehensive test script to create sample data first.');
    }
    
  } catch (error) {
    console.error('❌ Error finding RD members:', error);
  } finally {
    await pool.end();
  }
}

async function createComprehensiveRDData(client) {
  console.log('Creating comprehensive RD sample data...');
  
  // Ensure head codes exist
  await client.query(`
    INSERT INTO headmaster (code, head_name, headtype, parent_code, hposition, interest, op_bal, pflag)
    VALUES ('A1003', 'RECURRING DEPOSIT', 'AST', 'A100', '1.3', 'Y', 0, 'Y')
    ON CONFLICT (code) DO UPDATE SET
      head_name = EXCLUDED.head_name,
      headtype = EXCLUDED.headtype
  `);
  
  // Get active members
  const members = await client.query(`
    SELECT mbno, prefix, f_name, m_name, l_name 
    FROM member_master 
    WHERE isactive = 'Y' 
    ORDER BY mbno::numeric 
    LIMIT 10
  `);
  
  if (members.rows.length === 0) {
    // Create sample members
    const sampleMembers = [
      { mbno: '1001', prefix: 'Mr', f_name: 'RAJESH', m_name: 'KUMAR', l_name: 'SHARMA' },
      { mbno: '1002', prefix: 'Mrs', f_name: 'PRIYA', m_name: '', l_name: 'SINGH' },
      { mbno: '1003', prefix: 'Mr', f_name: 'AMIT', m_name: 'KUMAR', l_name: 'GUPTA' },
      { mbno: '1004', prefix: 'Ms', f_name: 'SUNITA', m_name: '', l_name: 'VERMA' },
      { mbno: '1005', prefix: 'Mr', f_name: 'VIKASH', m_name: 'KUMAR', l_name: 'YADAV' }
    ];
    
    for (const member of sampleMembers) {
      await client.query(`
        INSERT INTO member_master (mbno, prefix, f_name, m_name, l_name, isactive, wingno, officeno)
        VALUES ($1, $2, $3, $4, $5, 'Y', 'Main Office', 1)
        ON CONFLICT (mbno) DO UPDATE SET
          prefix = EXCLUDED.prefix,
          f_name = EXCLUDED.f_name,
          m_name = EXCLUDED.m_name,
          l_name = EXCLUDED.l_name,
          isactive = 'Y'
      `, [member.mbno, member.prefix, member.f_name, member.m_name, member.l_name]);
    }
    
    members.rows = sampleMembers;
  }
  
  // Get next ledger ID
  const maxLedgerIdResult = await client.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_id FROM ledger');
  let nextLedgerId = parseInt(maxLedgerIdResult.rows[0].next_id);
  let transNo = 300000;
  
  // Create comprehensive RD data for each member
  for (const member of members.rows) {
    const mbno = member.mbno;
    const monthlyAmount = 1000 + (parseInt(mbno) % 5) * 500; // Varying amounts
    
    // Account opening
    await client.query(`
      INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
      VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'R', 'C', 0.00, 'RD Account Opening', 'System', $6)
    `, [transNo++, '2020-04-01', mbno, monthlyAmount, `R${(transNo % 1000).toString().padStart(3, '0')}`, nextLedgerId++]);
    
    // Monthly deposits for 2 years (24 months)
    const startDate = new Date('2020-05-01');
    for (let i = 0; i < 24; i++) {
      const depositDate = new Date(startDate);
      depositDate.setMonth(startDate.getMonth() + i);
      
      const voucherNo = `R${(transNo % 1000).toString().padStart(3, '0')}`;
      await client.query(`
        INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
        VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'R', 'C', 0.00, $6, 'System', $7)
      `, [transNo++, depositDate.toISOString().split('T')[0], mbno, monthlyAmount, voucherNo, `Monthly RD Deposit - Month ${i + 1}`, nextLedgerId++]);
    }
    
    // Quarterly interest credits
    for (let quarter = 0; quarter < 8; quarter++) {
      const interestDate = new Date('2020-06-30');
      interestDate.setMonth(interestDate.getMonth() + (quarter * 3));
      
      const interestAmount = Math.round((monthlyAmount * (quarter + 1) * 0.08 / 4) * 100) / 100; // 8% annual interest
      const interestVoucherNo = `J${(transNo % 1000).toString().padStart(3, '0')}`;
      
      await client.query(`
        INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
        VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'J', 'C', 0.00, $6, 'System', $7)
      `, [transNo++, interestDate.toISOString().split('T')[0], mbno, interestAmount, interestVoucherNo, `Quarterly Interest Credit - Q${quarter + 1}`, nextLedgerId++]);
    }
    
    // Maturity withdrawal (for first 2 members)
    if (parseInt(mbno) <= 1002) {
      const maturityDate = '2022-04-01';
      const maturityAmount = monthlyAmount * 24 + (monthlyAmount * 24 * 0.08 * 2); // Principal + 2 years interest
      const maturityVoucherNo = `P${(transNo % 1000).toString().padStart(3, '0')}`;
      
      await client.query(`
        INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
        VALUES ($1, $2, 'DR', 'A1003', $3, 0, 'RD', $4, $5, 'P', 'C', 0.00, 'RD Maturity Withdrawal', 'System', $6)
      `, [transNo++, maturityDate, mbno, maturityAmount, maturityVoucherNo, nextLedgerId++]);
    }
  }
  
  console.log('✅ Comprehensive RD sample data created');
}

// Run the script
findRDMembersWithData();