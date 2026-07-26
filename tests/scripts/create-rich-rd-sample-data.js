const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function createRichRDSampleData() {
  console.log('🏗️ CREATING RICH RD SAMPLE DATA FOR UI TESTING');
  console.log('=' .repeat(60));
  
  try {
    const client = await pool.connect();
    
    // 1. Ensure head code exists
    console.log('1. 📋 Setting up head codes...');
    await client.query(`
      INSERT INTO headmaster (code, head_name, headtype, parent_code, hposition, interest, op_bal, pflag)
      VALUES ('A1003', 'RECURRING DEPOSIT', 'AST', 'A100', '1.3', 'Y', 0, 'Y')
      ON CONFLICT (code) DO UPDATE SET
        head_name = EXCLUDED.head_name,
        headtype = EXCLUDED.headtype
    `);
    console.log('   ✅ Head code A1003 (RECURRING DEPOSIT) ready');
    
    // 2. Get or create sample members
    console.log('\n2. 👥 Setting up sample members...');
    const sampleMembers = [
      { mbno: '2001', prefix: 'Mr', f_name: 'RAJESH', m_name: 'KUMAR', l_name: 'SHARMA' },
      { mbno: '2002', prefix: 'Mrs', f_name: 'PRIYA', m_name: '', l_name: 'SINGH' },
      { mbno: '2003', prefix: 'Mr', f_name: 'AMIT', m_name: 'KUMAR', l_name: 'GUPTA' },
      { mbno: '2004', prefix: 'Ms', f_name: 'SUNITA', m_name: '', l_name: 'VERMA' },
      { mbno: '2005', prefix: 'Mr', f_name: 'VIKASH', m_name: 'KUMAR', l_name: 'YADAV' }
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
      
      console.log(`   ✅ Member ${member.mbno}: ${member.prefix} ${member.f_name} ${member.l_name}`);
    }
    
    // 3. Clear existing RD data for these members
    console.log('\n3. 🧹 Clearing existing RD data...');
    await client.query(`
      DELETE FROM ledger 
      WHERE code = 'A1003' 
      AND mbno IN ('2001', '2002', '2003', '2004', '2005')
    `);
    console.log('   ✅ Existing RD data cleared');
    
    // 4. Get next ledger ID
    const maxLedgerIdResult = await client.query('SELECT COALESCE(MAX(ledgerid), 0) + 1 as next_id FROM ledger');
    let nextLedgerId = parseInt(maxLedgerIdResult.rows[0].next_id);
    let transNo = 400000;
    
    console.log('\n4. 💰 Creating comprehensive RD transaction data...');
    
    // Create different RD scenarios for each member
    const rdScenarios = [
      {
        mbno: '2001',
        name: 'RAJESH KUMAR SHARMA',
        monthlyAmount: 2000,
        startDate: '2022-01-01',
        months: 36, // 3 years
        status: 'active'
      },
      {
        mbno: '2002',
        name: 'PRIYA SINGH',
        monthlyAmount: 1500,
        startDate: '2021-06-01',
        months: 24, // 2 years
        status: 'matured'
      },
      {
        mbno: '2003',
        name: 'AMIT KUMAR GUPTA',
        monthlyAmount: 3000,
        startDate: '2023-04-01',
        months: 12, // 1 year so far
        status: 'active'
      },
      {
        mbno: '2004',
        name: 'SUNITA VERMA',
        monthlyAmount: 1000,
        startDate: '2020-01-01',
        months: 48, // 4 years
        status: 'matured'
      },
      {
        mbno: '2005',
        name: 'VIKASH KUMAR YADAV',
        monthlyAmount: 2500,
        startDate: '2023-01-01',
        months: 12, // 1 year
        status: 'active'
      }
    ];
    
    for (const scenario of rdScenarios) {
      console.log(`\n   📊 Creating RD data for ${scenario.name} (${scenario.mbno}):`);
      console.log(`      Monthly Amount: ₹${scenario.monthlyAmount.toLocaleString('en-IN')}`);
      console.log(`      Start Date: ${scenario.startDate}`);
      console.log(`      Duration: ${scenario.months} months`);
      console.log(`      Status: ${scenario.status}`);
      
      // Account opening transaction
      const openingVoucher = `RD${(transNo % 10000).toString().padStart(4, '0')}`;
      await client.query(`
        INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
        VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'R', 'C', 0.00, 'RD Account Opening', 'System', $6)
      `, [transNo++, scenario.startDate, scenario.mbno, scenario.monthlyAmount, openingVoucher, nextLedgerId++]);
      
      // Monthly deposits
      const startDate = new Date(scenario.startDate);
      const currentDate = new Date();
      let monthsToCreate = scenario.months;
      
      // For active accounts, only create deposits up to current date
      if (scenario.status === 'active') {
        const monthsSinceStart = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24 * 30));
        monthsToCreate = Math.min(scenario.months, monthsSinceStart);
      }
      
      for (let i = 1; i <= monthsToCreate; i++) {
        const depositDate = new Date(startDate);
        depositDate.setMonth(startDate.getMonth() + i);
        
        // Skip future dates
        if (depositDate > currentDate && scenario.status === 'active') {
          break;
        }
        
        const depositVoucher = `RD${(transNo % 10000).toString().padStart(4, '0')}`;
        await client.query(`
          INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
          VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'R', 'C', 0.00, $6, 'System', $7)
        `, [transNo++, depositDate.toISOString().split('T')[0], scenario.mbno, scenario.monthlyAmount, depositVoucher, `Monthly RD Deposit - Installment ${i}`, nextLedgerId++]);
      }
      
      // Quarterly interest credits
      const quarters = Math.floor(monthsToCreate / 3);
      for (let q = 1; q <= quarters; q++) {
        const interestDate = new Date(startDate);
        interestDate.setMonth(startDate.getMonth() + (q * 3));
        
        if (interestDate > currentDate && scenario.status === 'active') {
          break;
        }
        
        const interestAmount = Math.round((scenario.monthlyAmount * q * 3 * 0.08 / 4) * 100) / 100; // 8% annual interest
        const interestVoucher = `INT${(transNo % 10000).toString().padStart(4, '0')}`;
        
        await client.query(`
          INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
          VALUES ($1, $2, 'CR', 'A1003', $3, 0, 'RD', $4, $5, 'J', 'C', 0.00, $6, 'System', $7)
        `, [transNo++, interestDate.toISOString().split('T')[0], scenario.mbno, interestAmount, interestVoucher, `Quarterly Interest Credit - Q${q}`, nextLedgerId++]);
      }
      
      // Maturity withdrawal for completed accounts
      if (scenario.status === 'matured') {
        const maturityDate = new Date(startDate);
        maturityDate.setMonth(startDate.getMonth() + scenario.months);
        
        const principalAmount = scenario.monthlyAmount * scenario.months;
        const interestAmount = Math.round((principalAmount * 0.08 * (scenario.months / 12)) * 100) / 100;
        const maturityAmount = principalAmount + interestAmount;
        
        const maturityVoucher = `MAT${(transNo % 10000).toString().padStart(4, '0')}`;
        await client.query(`
          INSERT INTO ledger (trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type, trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance, narration, username, ledgerid)
          VALUES ($1, $2, 'DR', 'A1003', $3, 0, 'RD', $4, $5, 'P', 'C', 0.00, 'RD Maturity Withdrawal', 'System', $6)
        `, [transNo++, maturityDate.toISOString().split('T')[0], scenario.mbno, maturityAmount, maturityVoucher, nextLedgerId++]);
      }
      
      console.log(`      ✅ Created ${monthsToCreate + 1 + quarters + (scenario.status === 'matured' ? 1 : 0)} transactions`);
    }
    
    client.release();
    
    // 5. Verify created data
    console.log('\n5. ✅ Verifying created data...');
    const verificationClient = await pool.connect();
    
    const verificationData = await verificationClient.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
        COUNT(l.trans_no) as transaction_count,
        MIN(l.trans_date) as first_transaction,
        MAX(l.trans_date) as last_transaction,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE -(l.trans_amt::numeric) END) as current_balance,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE 0 END) as total_deposits,
        SUM(CASE WHEN l.trans_type = 'DR' THEN l.trans_amt::numeric ELSE 0 END) as total_withdrawals
      FROM member_master m 
      INNER JOIN ledger l ON m.mbno = l.mbno
      WHERE l.code = 'A1003'
        AND m.mbno IN ('2001', '2002', '2003', '2004', '2005')
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      ORDER BY transaction_count DESC
    `);
    
    console.log('\n📊 CREATED RD DATA SUMMARY:');
    verificationData.rows.forEach((member, index) => {
      console.log(`   ${index + 1}. Member ${member.mbno}: ${member.full_name}`);
      console.log(`      Transactions: ${member.transaction_count}`);
      console.log(`      Period: ${member.first_transaction?.toISOString().split('T')[0]} to ${member.last_transaction?.toISOString().split('T')[0]}`);
      console.log(`      Current Balance: ₹${parseFloat(member.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`      Total Deposits: ₹${parseFloat(member.total_deposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`      Total Withdrawals: ₹${parseFloat(member.total_withdrawals || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log('');
    });
    
    verificationClient.release();
    
    // 6. UI Testing Instructions
    console.log('=' .repeat(60));
    console.log('🎯 UI TESTING INSTRUCTIONS');
    console.log('=' .repeat(60));
    
    if (verificationData.rows.length > 0) {
      const bestMember = verificationData.rows[0];
      
      console.log('\n🏆 RECOMMENDED MEMBER FOR UI TESTING:');
      console.log(`   Member Number: ${bestMember.mbno}`);
      console.log(`   Member Name: ${bestMember.full_name}`);
      console.log(`   Transaction Count: ${bestMember.transaction_count}`);
      console.log(`   Current Balance: ₹${parseFloat(bestMember.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log(`   Date Range: ${bestMember.first_transaction?.toISOString().split('T')[0]} to ${bestMember.last_transaction?.toISOString().split('T')[0]}`);
      
      console.log('\n📋 STEP-BY-STEP UI TEST:');
      console.log('   1. Open your Electron application');
      console.log('   2. Navigate to Reports → Member Statement → RD Statement');
      console.log(`   3. Enter Member Number: ${bestMember.mbno}`);
      console.log(`   4. Member name should auto-fill: "${bestMember.full_name}"`);
      console.log(`   5. Set From Date: ${bestMember.first_transaction?.toISOString().split('T')[0]}`);
      console.log(`   6. Set To Date: ${bestMember.last_transaction?.toISOString().split('T')[0]}`);
      console.log('   7. Click "Generate RD Statement"');
      console.log(`   8. You should see ${bestMember.transaction_count} transactions displayed`);
      console.log(`   9. Final balance should show: ₹${parseFloat(bestMember.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      console.log('   10. Test print functionality (should be portrait orientation)');
      
      console.log('\n🎯 ALTERNATIVE TEST MEMBERS:');
      verificationData.rows.slice(1).forEach((member, index) => {
        console.log(`   ${index + 2}. Member ${member.mbno}: ${member.full_name}`);
        console.log(`      ${member.transaction_count} transactions, Balance: ₹${parseFloat(member.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      });
      
      console.log('\n🔧 TESTING SCENARIOS:');
      console.log('   • Active RD Account: Members 2001, 2003, 2005');
      console.log('   • Matured RD Account: Members 2002, 2004');
      console.log('   • Different Monthly Amounts: ₹1,000 to ₹3,000');
      console.log('   • Various Durations: 1 to 4 years');
      console.log('   • Interest Credits: Quarterly interest postings');
      console.log('   • Maturity Withdrawals: Complete account closure');
      
      console.log('\n🎉 RICH RD SAMPLE DATA CREATION COMPLETE!');
      console.log('   You now have comprehensive RD data to test the UI functionality.');
    }
    
  } catch (error) {
    console.error('❌ Error creating RD sample data:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createRichRDSampleData();