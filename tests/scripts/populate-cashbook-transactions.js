const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'admin',
  port: 5432,
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function checkExistingData() {
  logSection('CHECKING EXISTING CASHBOOK DATA');
  
  try {
    // Check transactions table
    const transResult = await pool.query('SELECT COUNT(*) as count FROM transactions');
    log(`Transactions table: ${transResult.rows[0].count} records`, 'blue');
    
    // Check ledger table
    const ledgerResult = await pool.query('SELECT COUNT(*) as count FROM ledger');
    log(`Ledger table: ${ledgerResult.rows[0].count} records`, 'blue');
    
    // Check recent transactions
    const recentTrans = await pool.query(`
      SELECT trans_date, trans_type, trans_amt, code, narration 
      FROM transactions 
      ORDER BY trans_date DESC 
      LIMIT 5
    `);
    
    if (recentTrans.rows.length > 0) {
      log('\nRecent transactions:', 'green');
      recentTrans.rows.forEach((row, i) => {
        log(`  ${i + 1}. ${row.trans_date.toISOString().split('T')[0]} - ${row.trans_type} ${row.trans_amt} (${row.code}) - ${row.narration}`, 'blue');
      });
    } else {
      log('No transactions found', 'yellow');
    }
    
    return {
      transactionCount: parseInt(transResult.rows[0].count),
      ledgerCount: parseInt(ledgerResult.rows[0].count)
    };
    
  } catch (error) {
    log(`Error checking existing data: ${error.message}`, 'red');
    return { transactionCount: 0, ledgerCount: 0 };
  }
}

async function getNextTransactionNumber() {
  try {
    const result = await pool.query('SELECT COALESCE(MAX(trans_no), 0) + 1 as next_trans_no FROM transactions');
    return result.rows[0].next_trans_no;
  } catch (error) {
    log(`Error getting next transaction number: ${error.message}`, 'red');
    return 1;
  }
}

async function populateSampleTransactions() {
  logSection('POPULATING SAMPLE CASHBOOK TRANSACTIONS');
  
  try {
    const nextTransNo = await getNextTransactionNumber();
    log(`Starting transaction number: ${nextTransNo}`, 'blue');
    
    // Sample transactions for different dates
    const sampleTransactions = [
      // Today's transactions
      {
        date: new Date().toISOString().split('T')[0],
        type: 'CR',
        amount: 25000.00,
        code: 'A1001',
        narration: 'Member Savings Deposit - Cash',
        mbno: 1001,
        vchr_no: 'R001'
      },
      {
        date: new Date().toISOString().split('T')[0],
        type: 'CR',
        amount: 50000.00,
        code: 'A1002',
        narration: 'Fixed Deposit Opening',
        mbno: 1002,
        vchr_no: 'R002'
      },
      {
        date: new Date().toISOString().split('T')[0],
        type: 'DR',
        amount: 15000.00,
        code: 'E4002',
        narration: 'Administrative Expenses - Office Supplies',
        mbno: 0,
        vchr_no: 'P001'
      },
      {
        date: new Date().toISOString().split('T')[0],
        type: 'CR',
        amount: 8000.00,
        code: 'I3001',
        narration: 'Interest Income on Investments',
        mbno: 0,
        vchr_no: 'R003'
      },
      {
        date: new Date().toISOString().split('T')[0],
        type: 'DR',
        amount: 12000.00,
        code: 'E4001',
        narration: 'Interest Payment to Members',
        mbno: 1003,
        vchr_no: 'P002'
      },
      
      // Yesterday's transactions
      {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'CR',
        amount: 35000.00,
        code: 'A1001',
        narration: 'Member Savings Deposit - Cheque',
        mbno: 1004,
        vchr_no: 'R004'
      },
      {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'DR',
        amount: 20000.00,
        code: 'L2001',
        narration: 'Loan Disbursement',
        mbno: 1005,
        vchr_no: 'P003'
      },
      
      // Last week's transactions
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'CR',
        amount: 100000.00,
        code: 'A1002',
        narration: 'Large Fixed Deposit',
        mbno: 1006,
        vchr_no: 'R005'
      },
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'DR',
        amount: 5000.00,
        code: 'E4002',
        narration: 'Bank Charges',
        mbno: 0,
        vchr_no: 'P004'
      }
    ];
    
    let transactionNumber = nextTransNo;
    let successCount = 0;
    
    for (const transaction of sampleTransactions) {
      try {
        // Insert into transactions table
        await pool.query(`
          INSERT INTO transactions (
            trans_no, trans_date, trans_type, mbno, acc_no, acc_type,
            trans_amt, receipt_vchr_no, vchr_type, modeofpay, cheq_no,
            cheq_amt, cheq_date, bankname, pass_flag, cashier_flag,
            code, narration, username, cust_bank_name
          ) VALUES (
            $1, $2, $3, $4, 0, 'SB',
            $5, $6, $7, 'C', '',
            '0.00', NULL, '', 'N', 'N',
            $8, $9, 'system', NULL
          )
        `, [
          transactionNumber,
          transaction.date,
          transaction.type,
          transaction.mbno,
          transaction.amount,
          transaction.vchr_no,
          transaction.type === 'CR' ? 'R' : 'P',
          transaction.code,
          transaction.narration
        ]);
        
        // Insert into ledger table
        await pool.query(`
          INSERT INTO ledger (
            trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type,
            trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance,
            narration, username, cust_bank_name, ledgerid
          ) VALUES (
            $1, $2, $3, $4, $5, 0, 'SB',
            $6, $7, $8, 'C', $9,
            $10, 'system', NULL, $11
          )
        `, [
          transactionNumber,
          transaction.date,
          transaction.type,
          transaction.code,
          transaction.mbno,
          transaction.amount,
          transaction.vchr_no,
          transaction.type === 'CR' ? 'R' : 'P',
          transaction.amount, // Simple balance calculation
          transaction.narration,
          transactionNumber // Using trans_no as ledgerid for simplicity
        ]);
        
        log(`✓ Created transaction ${transactionNumber}: ${transaction.type} ₹${transaction.amount} - ${transaction.narration}`, 'green');
        transactionNumber++;
        successCount++;
        
      } catch (error) {
        log(`✗ Failed to create transaction ${transactionNumber}: ${error.message}`, 'red');
      }
    }
    
    log(`\n✓ Successfully created ${successCount} transactions`, 'green');
    return successCount;
    
  } catch (error) {
    log(`Error populating transactions: ${error.message}`, 'red');
    return 0;
  }
}

async function verifyPopulatedData() {
  logSection('VERIFYING POPULATED DATA');
  
  try {
    // Check today's transactions
    const today = new Date().toISOString().split('T')[0];
    const todayTrans = await pool.query(`
      SELECT trans_type, trans_amt, code, narration 
      FROM transactions 
      WHERE DATE(trans_date) = $1
      ORDER BY trans_no
    `, [today]);
    
    log(`Today's transactions (${today}): ${todayTrans.rows.length} records`, 'blue');
    todayTrans.rows.forEach((row, i) => {
      log(`  ${i + 1}. ${row.trans_type} ₹${row.trans_amt} (${row.code}) - ${row.narration}`, 'green');
    });
    
    // Calculate today's totals
    const todayReceipts = todayTrans.rows
      .filter(t => t.trans_type === 'CR')
      .reduce((sum, t) => sum + parseFloat(t.trans_amt.replace(/[$₹,]/g, '')), 0);
    
    const todayPayments = todayTrans.rows
      .filter(t => t.trans_type === 'DR')
      .reduce((sum, t) => sum + parseFloat(t.trans_amt.replace(/[$₹,]/g, '')), 0);
    
    log(`\nToday's Summary:`, 'cyan');
    log(`  Total Receipts: ₹${todayReceipts.toLocaleString('en-IN')}`, 'green');
    log(`  Total Payments: ₹${todayPayments.toLocaleString('en-IN')}`, 'red');
    log(`  Net Balance: ₹${(todayReceipts - todayPayments).toLocaleString('en-IN')}`, 'blue');
    
    return true;
    
  } catch (error) {
    log(`Error verifying data: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  try {
    // Check existing data
    const existingData = await checkExistingData();
    
    if (existingData.transactionCount === 0) {
      log('\nNo transactions found. Populating sample data...', 'yellow');
      const populated = await populateSampleTransactions();
      
      if (populated > 0) {
        await verifyPopulatedData();
        log('\n🎉 Sample cashbook data populated successfully!', 'green');
        log('You can now test the CashBook component with real data.', 'green');
      } else {
        log('\n❌ Failed to populate sample data', 'red');
      }
    } else {
      log(`\n✓ Found ${existingData.transactionCount} existing transactions`, 'green');
      await verifyPopulatedData();
    }
    
  } catch (error) {
    log(`Main execution error: ${error.message}`, 'red');
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkExistingData, populateSampleTransactions, verifyPopulatedData };