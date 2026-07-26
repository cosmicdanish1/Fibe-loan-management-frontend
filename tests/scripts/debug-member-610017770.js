const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugMember610017770() {
  console.log('=== DEBUGGING MEMBER 610017770 ===\n');
  
  const client = await pool.connect();
  
  try {
    const memberNo = '610017770';
    
    // 1. Check if member exists
    console.log('1. CHECKING MEMBER EXISTENCE...');
    const memberCheck = await client.query(`
      SELECT mbno, CONCAT(prefix, ' ', f_name, ' ', m_name, ' ', l_name) as full_name
      FROM member_master 
      WHERE mbno = $1
    `, [memberNo]);
    
    if (memberCheck.rows.length > 0) {
      console.log(`✅ Member found: ${memberCheck.rows[0].full_name}`);
    } else {
      console.log('❌ Member not found');
      return;
    }
    
    // 2. Check all transactions for this member
    console.log('\n2. CHECKING ALL TRANSACTIONS...');
    const allTransactions = await client.query(`
      SELECT COUNT(*) as count, 
             MIN(trans_date) as earliest,
             MAX(trans_date) as latest
      FROM ledger 
      WHERE mbno = $1
    `, [memberNo]);
    
    console.log(`Total transactions: ${allTransactions.rows[0].count}`);
    if (allTransactions.rows[0].count > 0) {
      console.log(`Date range: ${new Date(allTransactions.rows[0].earliest).toLocaleDateString()} to ${new Date(allTransactions.rows[0].latest).toLocaleDateString()}`);
    }
    
    // 3. Check transactions in the requested date range
    console.log('\n3. CHECKING REQUESTED DATE RANGE...');
    const fromDate = '2024-12-31T18:30:00.000Z';
    const toDate = '2025-12-28T18:29:59.999Z';
    
    const rangeTransactions = await client.query(`
      SELECT COUNT(*) as count
      FROM ledger 
      WHERE mbno = $1
      AND trans_date BETWEEN $2 AND $3
    `, [memberNo, fromDate, toDate]);
    
    console.log(`Transactions in range (${fromDate} to ${toDate}): ${rangeTransactions.rows[0].count}`);
    
    // 4. Check recent transactions (last 30 days)
    console.log('\n4. CHECKING RECENT TRANSACTIONS...');
    const recentTransactions = await client.query(`
      SELECT COUNT(*) as count,
             MAX(trans_date) as latest
      FROM ledger 
      WHERE mbno = $1
      AND trans_date >= CURRENT_DATE - INTERVAL '30 days'
    `, [memberNo]);
    
    console.log(`Recent transactions (last 30 days): ${recentTransactions.rows[0].count}`);
    if (recentTransactions.rows[0].latest) {
      console.log(`Latest transaction: ${new Date(recentTransactions.rows[0].latest).toLocaleDateString()}`);
    }
    
    // 5. Show sample transactions if any exist
    console.log('\n5. SAMPLE TRANSACTIONS...');
    const sampleTransactions = await client.query(`
      SELECT trans_date, trans_type, code, trans_amt, narration, receipt_vchr_no
      FROM ledger 
      WHERE mbno = $1
      ORDER BY trans_date DESC
      LIMIT 5
    `, [memberNo]);
    
    if (sampleTransactions.rows.length > 0) {
      console.log('Recent transactions:');
      sampleTransactions.rows.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${new Date(tx.trans_date).toLocaleDateString()} - ${tx.trans_type} ${tx.code} ₹${tx.trans_amt} - ${tx.narration}`);
      });
    } else {
      console.log('No transactions found for this member');
    }
    
    // 6. Create some test transactions if none exist
    if (allTransactions.rows[0].count == 0) {
      console.log('\n6. CREATING TEST TRANSACTIONS...');
      
      const currentDate = new Date();
      const testTransactions = [
        { code: 'A001', type: 'CR', amount: 5000, narration: 'Opening Balance' },
        { code: 'L1001', type: 'CR', amount: 1000, narration: 'Share Contribution' },
        { code: 'L1002', type: 'CR', amount: 500, narration: 'Monthly Deposit' },
        { code: 'I1002', type: 'CR', amount: 150, narration: 'Interest Credit' }
      ];
      
      let transactionCounter = 60000; // Start from a high number
      
      for (const tx of testTransactions) {
        transactionCounter++;
        
        // Create transaction within the last 7 days
        const txDate = new Date();
        txDate.setDate(txDate.getDate() - Math.floor(Math.random() * 7));
        
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
          txDate,
          tx.type,
          tx.code,
          memberNo,
          tx.amount,
          `R${transactionCounter.toString().padStart(5, '0')}`,
          tx.narration,
          transactionCounter * 10
        ]);
        
        console.log(`✅ Created transaction: ${tx.type} ${tx.code} ₹${tx.amount} - ${tx.narration}`);
      }
      
      console.log(`✅ Created ${testTransactions.length} test transactions for member ${memberNo}`);
    }
    
    // 7. Final verification
    console.log('\n7. FINAL VERIFICATION...');
    const finalCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM ledger 
      WHERE mbno = $1
      AND trans_date >= CURRENT_DATE - INTERVAL '7 days'
    `, [memberNo]);
    
    console.log(`Transactions in last 7 days: ${finalCheck.rows[0].count}`);
    
    if (finalCheck.rows[0].count > 0) {
      console.log('✅ Member now has recent transactions - try the API again!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugMember610017770().catch(console.error);