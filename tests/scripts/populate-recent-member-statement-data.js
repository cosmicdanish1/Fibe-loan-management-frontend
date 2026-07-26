const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function populateRecentMemberStatementData() {
  console.log('=== POPULATING RECENT MEMBER STATEMENT DATA ===\n');
  
  const client = await pool.connect();
  
  try {
    // 1. Get some test members
    const testMembers = await client.query(`
      SELECT mbno, CONCAT(prefix, ' ', f_name, ' ', l_name) as name
      FROM member_master 
      WHERE mbno IN (1001, 1002, 610023712, 610016572, 610023352)
      ORDER BY mbno
    `);
    
    console.log('Test members found:', testMembers.rows.length);
    
    // 2. Create recent transactions for testing
    const currentDate = new Date();
    const startDate = new Date();
    startDate.setMonth(currentDate.getMonth() - 3); // 3 months ago
    
    let transactionCounter = 50000; // Start from a high number to avoid conflicts
    
    for (const member of testMembers.rows) {
      console.log(`\nCreating transactions for Member: ${member.mbno} - ${member.name}`);
      
      // Create various types of transactions
      const transactionTypes = [
        { code: 'A001', type: 'CR', amount: 5000, narration: 'Monthly Deposit' },
        { code: 'L1001', type: 'CR', amount: 2000, narration: 'Share Contribution' },
        { code: 'L1002', type: 'CR', amount: 500, narration: 'Thrift Deposit' },
        { code: 'A1047', type: 'DR', amount: 1000, narration: 'Loan Disbursement' },
        { code: 'I1002', type: 'CR', amount: 150, narration: 'Interest Credit' },
        { code: 'E1026', type: 'DR', amount: 50, narration: 'Service Charge' },
        { code: 'L1004', type: 'CR', amount: 1500, narration: 'Fixed Deposit' },
        { code: 'L1045', type: 'CR', amount: 25, narration: 'Membership Fee' }
      ];
      
      // Create 10-15 transactions per member over the last 3 months
      const numTransactions = 10 + Math.floor(Math.random() * 6);
      
      for (let i = 0; i < numTransactions; i++) {
        const transType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        
        // Random date within the last 3 months
        const randomDate = new Date(startDate.getTime() + Math.random() * (currentDate.getTime() - startDate.getTime()));
        
        // Random amount variation (±20%)
        const baseAmount = transType.amount;
        const variation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const finalAmount = Math.round(baseAmount * variation);
        
        transactionCounter++;
        
        // Insert into ledger table
        await client.query(`
          INSERT INTO ledger (
            trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type,
            trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance,
            narration, username, ledgerid
          ) VALUES (
            $1, $2, $3, $4, $5, 0, 'SB',
            $6, $7, 'R', 'C', 0,
            $8, 'SYSTEM', $9
          )
        `, [
          transactionCounter,
          randomDate,
          transType.type,
          transType.code,
          member.mbno,
          finalAmount,
          `R${transactionCounter.toString().padStart(5, '0')}`,
          transType.narration,
          transactionCounter * 10
        ]);
        
        // Also insert into transactions table for consistency
        await client.query(`
          INSERT INTO transactions (
            trans_no, trans_type, trans_date, mbno, acc_no, acc_type,
            trans_amt, receipt_vchr_no, vchr_type, modeofpay,
            cheq_no, cheq_amt, pass_flag, cashier_flag,
            code, narration, username
          ) VALUES (
            $1, $2, $3, $4, 0, 'SB',
            $5, $6, 'R', 'C',
            '', 0, 'Y', 'Y',
            $7, $8, 'SYSTEM'
          )
        `, [
          transactionCounter,
          transType.type,
          randomDate,
          member.mbno,
          finalAmount,
          `R${transactionCounter.toString().padStart(5, '0')}`,
          transType.code,
          transType.narration
        ]);
      }
      
      console.log(`✅ Created ${numTransactions} transactions for member ${member.mbno}`);
    }
    
    // 3. Update statistics
    console.log('\n3. UPDATING DATABASE STATISTICS...');
    await client.query('ANALYZE ledger');
    await client.query('ANALYZE transactions');
    await client.query('ANALYZE member_master');
    await client.query('ANALYZE head_master');
    
    // 4. Verify the data
    console.log('\n4. VERIFYING POPULATED DATA...');
    
    const recentTransactions = await client.query(`
      SELECT COUNT(*) as count 
      FROM ledger 
      WHERE trans_date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    console.log(`✅ Recent transactions (last 30 days): ${recentTransactions.rows[0].count}`);
    
    const memberTransactionCounts = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', m.l_name) as name,
        COUNT(l.trans_no) as transaction_count,
        MAX(l.trans_date) as latest_transaction,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE -l.trans_amt::numeric END) as net_balance
      FROM member_master m
      INNER JOIN ledger l ON m.mbno = l.mbno
      WHERE m.mbno IN (1001, 1002, 610023712, 610016572, 610023352)
      AND l.trans_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY m.mbno, m.prefix, m.f_name, m.l_name
      ORDER BY m.mbno
    `);
    
    console.log('\n✅ Updated member transaction summary:');
    memberTransactionCounts.rows.forEach(member => {
      console.log(`  ${member.mbno} - ${member.name}:`);
      console.log(`    Transactions: ${member.transaction_count}`);
      console.log(`    Latest: ${new Date(member.latest_transaction).toLocaleDateString()}`);
      console.log(`    Net Balance: ₹${parseFloat(member.net_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    });
    
    console.log('\n✅ DATA POPULATION COMPLETE!');
    console.log('You can now test the Member Statement component with recent data.');
    
  } catch (error) {
    console.error('❌ Error populating data:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the population script
populateRecentMemberStatementData().catch(console.error);