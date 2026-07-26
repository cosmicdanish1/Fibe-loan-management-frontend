const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function checkMemberStatementDataAvailability() {
  console.log('=== CHECKING MEMBER STATEMENT DATA AVAILABILITY ===\n');
  
  const client = await pool.connect();
  
  try {
    // 1. Check overall data availability
    console.log('1. OVERALL DATA ANALYSIS...');
    
    const totalMembers = await client.query('SELECT COUNT(*) as count FROM member_master');
    const totalTransactions = await client.query('SELECT COUNT(*) as count FROM ledger');
    const membersWithTransactions = await client.query(`
      SELECT COUNT(DISTINCT mbno) as count FROM ledger
    `);
    
    console.log(`✅ Total members: ${totalMembers.rows[0].count}`);
    console.log(`✅ Total transactions: ${totalTransactions.rows[0].count}`);
    console.log(`✅ Members with transactions: ${membersWithTransactions.rows[0].count}`);
    
    const coveragePercent = ((membersWithTransactions.rows[0].count / totalMembers.rows[0].count) * 100).toFixed(1);
    console.log(`📊 Transaction coverage: ${coveragePercent}%`);
    
    // 2. Check date distribution
    console.log('\n2. TRANSACTION DATE DISTRIBUTION...');
    
    const dateDistribution = await client.query(`
      SELECT 
        CASE 
          WHEN trans_date >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last 7 days'
          WHEN trans_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'Last 30 days'
          WHEN trans_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Last 90 days'
          WHEN trans_date >= CURRENT_DATE - INTERVAL '1 year' THEN 'Last year'
          ELSE 'Older than 1 year'
        END as period,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT mbno) as member_count
      FROM ledger
      GROUP BY 
        CASE 
          WHEN trans_date >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last 7 days'
          WHEN trans_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'Last 30 days'
          WHEN trans_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Last 90 days'
          WHEN trans_date >= CURRENT_DATE - INTERVAL '1 year' THEN 'Last year'
          ELSE 'Older than 1 year'
        END
      ORDER BY 
        CASE 
          WHEN MAX(trans_date) >= CURRENT_DATE - INTERVAL '7 days' THEN 1
          WHEN MAX(trans_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 2
          WHEN MAX(trans_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 3
          WHEN MAX(trans_date) >= CURRENT_DATE - INTERVAL '1 year' THEN 4
          ELSE 5
        END
    `);
    
    console.log('Transaction distribution by time period:');
    dateDistribution.rows.forEach(row => {
      console.log(`  ${row.period}: ${row.transaction_count} transactions, ${row.member_count} members`);
    });
    
    // 3. Find members with good transaction data for testing
    console.log('\n3. RECOMMENDED TEST MEMBERS...');
    
    const testMembers = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', m.l_name) as full_name,
        COUNT(l.trans_no) as total_transactions,
        COUNT(CASE WHEN l.trans_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_transactions,
        MIN(l.trans_date) as earliest_transaction,
        MAX(l.trans_date) as latest_transaction,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE -l.trans_amt::numeric END) as net_balance
      FROM member_master m
      INNER JOIN ledger l ON m.mbno = l.mbno
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      HAVING COUNT(l.trans_no) >= 5
      ORDER BY 
        COUNT(CASE WHEN l.trans_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) DESC,
        COUNT(l.trans_no) DESC
      LIMIT 10
    `);
    
    console.log('Top 10 members with good transaction data:');
    testMembers.rows.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.mbno} - ${member.full_name}`);
      console.log(`     Total: ${member.total_transactions}, Recent: ${member.recent_transactions}`);
      console.log(`     Period: ${new Date(member.earliest_transaction).toLocaleDateString()} to ${new Date(member.latest_transaction).toLocaleDateString()}`);
      console.log(`     Balance: ₹${parseFloat(member.net_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    });
    
    // 4. Check for members with no transactions
    console.log('\n4. MEMBERS WITHOUT TRANSACTIONS...');
    
    const membersWithoutTransactions = await client.query(`
      SELECT COUNT(*) as count
      FROM member_master m
      LEFT JOIN ledger l ON m.mbno = l.mbno
      WHERE l.mbno IS NULL
    `);
    
    console.log(`Members without any transactions: ${membersWithoutTransactions.rows[0].count}`);
    
    if (parseInt(membersWithoutTransactions.rows[0].count) > 0) {
      // Get sample members without transactions
      const sampleMembersWithoutTx = await client.query(`
        SELECT 
          m.mbno,
          CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', m.l_name) as full_name
        FROM member_master m
        LEFT JOIN ledger l ON m.mbno = l.mbno
        WHERE l.mbno IS NULL
        ORDER BY m.mbno
        LIMIT 5
      `);
      
      console.log('\nSample members without transactions:');
      sampleMembersWithoutTx.rows.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.mbno} - ${member.full_name}`);
      });
    }
    
    // 5. Populate transactions for members without data (if needed)
    const recentTransactionCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM ledger 
      WHERE trans_date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    console.log(`\n5. RECENT DATA AVAILABILITY...`);
    console.log(`Recent transactions (last 30 days): ${recentTransactionCount.rows[0].count}`);
    
    if (parseInt(recentTransactionCount.rows[0].count) < 100) {
      console.log('\n⚠️  LOW RECENT TRANSACTION DATA - POPULATING...');
      
      // Get random members to populate with recent data
      const randomMembers = await client.query(`
        SELECT mbno, CONCAT(prefix, ' ', f_name, ' ', l_name) as name
        FROM member_master 
        WHERE mbno NOT IN (
          SELECT DISTINCT mbno 
          FROM ledger 
          WHERE trans_date >= CURRENT_DATE - INTERVAL '30 days'
        )
        ORDER BY RANDOM()
        LIMIT 20
      `);
      
      let transactionCounter = 70000; // Start from a high number
      const currentDate = new Date();
      
      for (const member of randomMembers.rows) {
        // Create 3-8 random transactions per member
        const numTransactions = 3 + Math.floor(Math.random() * 6);
        
        const transactionTypes = [
          { code: 'A001', type: 'CR', amount: 5000, narration: 'Monthly Deposit' },
          { code: 'L1001', type: 'CR', amount: 2000, narration: 'Share Contribution' },
          { code: 'L1002', type: 'CR', amount: 500, narration: 'Thrift Deposit' },
          { code: 'A1047', type: 'DR', amount: 1000, narration: 'Loan Disbursement' },
          { code: 'I1002', type: 'CR', amount: 150, narration: 'Interest Credit' },
          { code: 'L1004', type: 'CR', amount: 1500, narration: 'Fixed Deposit' }
        ];
        
        for (let i = 0; i < numTransactions; i++) {
          const transType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
          
          // Random date within the last 30 days
          const randomDate = new Date();
          randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
          
          // Random amount variation
          const baseAmount = transType.amount;
          const variation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
          const finalAmount = Math.round(baseAmount * variation);
          
          transactionCounter++;
          
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
        }
        
        console.log(`✅ Created ${numTransactions} transactions for ${member.mbno} - ${member.name}`);
      }
      
      console.log(`✅ Populated transactions for ${randomMembers.rows.length} members`);
    }
    
    // 6. Final recommendations
    console.log('\n6. SYSTEM RECOMMENDATIONS...');
    
    const finalStats = await client.query(`
      SELECT 
        COUNT(DISTINCT m.mbno) as total_members,
        COUNT(DISTINCT l.mbno) as members_with_transactions,
        COUNT(l.trans_no) as total_transactions,
        COUNT(CASE WHEN l.trans_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_transactions
      FROM member_master m
      LEFT JOIN ledger l ON m.mbno = l.mbno
    `);
    
    const stats = finalStats.rows[0];
    const coverage = ((stats.members_with_transactions / stats.total_members) * 100).toFixed(1);
    
    console.log(`📊 Final Statistics:`);
    console.log(`   Total Members: ${stats.total_members}`);
    console.log(`   Members with Transactions: ${stats.members_with_transactions} (${coverage}%)`);
    console.log(`   Total Transactions: ${stats.total_transactions}`);
    console.log(`   Recent Transactions: ${stats.recent_transactions}`);
    
    if (coverage >= 80 && stats.recent_transactions >= 50) {
      console.log('\n✅ SYSTEM STATUS: EXCELLENT');
      console.log('   - High member coverage');
      console.log('   - Sufficient recent data');
      console.log('   - Member Statement will work for most members');
    } else if (coverage >= 50 && stats.recent_transactions >= 20) {
      console.log('\n⚠️  SYSTEM STATUS: GOOD');
      console.log('   - Moderate member coverage');
      console.log('   - Some recent data available');
      console.log('   - Member Statement will work for many members');
    } else {
      console.log('\n❌ SYSTEM STATUS: NEEDS IMPROVEMENT');
      console.log('   - Low member coverage or insufficient recent data');
      console.log('   - Consider running data population scripts');
    }
    
    // 7. Provide test member suggestions
    console.log('\n7. SUGGESTED TEST MEMBERS FOR UI TESTING...');
    
    const suggestedMembers = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', m.l_name) as full_name,
        COUNT(l.trans_no) as transaction_count,
        MAX(l.trans_date) as latest_transaction
      FROM member_master m
      INNER JOIN ledger l ON m.mbno = l.mbno
      WHERE l.trans_date >= CURRENT_DATE - INTERVAL '60 days'
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      HAVING COUNT(l.trans_no) >= 3
      ORDER BY MAX(l.trans_date) DESC, COUNT(l.trans_no) DESC
      LIMIT 5
    `);
    
    console.log('Use these members for testing the Member Statement UI:');
    suggestedMembers.rows.forEach((member, index) => {
      console.log(`  ${index + 1}. Member Number: ${member.mbno}`);
      console.log(`     Name: ${member.full_name}`);
      console.log(`     Transactions: ${member.transaction_count}`);
      console.log(`     Latest Activity: ${new Date(member.latest_transaction).toLocaleDateString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMemberStatementDataAvailability().catch(console.error);