const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function fixFinancialHeadTypes() {
  console.log('🔧 Fixing Financial Head Types for P&L/Balance Sheet');
  console.log('=' .repeat(60));

  try {
    // Step 1: Update existing head types to standard format
    console.log('\n📋 Step 1: Standardizing existing head types...');
    
    const headTypeUpdates = [
      // Map existing types to standard types
      { from: 'BANK', to: 'AST', description: 'Bank accounts are assets' },
      { from: 'CINH', to: 'AST', description: 'Cash in hand is an asset' },
      { from: 'RLN', to: 'AST', description: 'Loans given are assets' },
      { from: 'ALN', to: 'AST', description: 'Advance loans are assets' },
      
      { from: 'SHR', to: 'LIA', description: 'Share capital is liability' },
      { from: 'MD', to: 'LIA', description: 'Member deposits are liabilities' },
      { from: 'MD1', to: 'LIA', description: 'Member deposits are liabilities' },
      { from: 'CD', to: 'LIA', description: 'Current deposits are liabilities' },
      
      // Income and expenses are already correct
    ];

    for (const update of headTypeUpdates) {
      const result = await pool.query(`
        UPDATE headmaster 
        SET headtype = $1 
        WHERE headtype = $2
      `, [update.to, update.from]);
      
      if (result.rowCount > 0) {
        console.log(`✅ Updated ${result.rowCount} accounts from ${update.from} to ${update.to} (${update.description})`);
      }
    }

    // Step 2: Add more comprehensive financial heads if they don't exist
    console.log('\n📋 Step 2: Adding comprehensive financial account heads...');
    
    const comprehensiveHeads = [
      // Assets
      { code: 'CASH01', name: 'Petty Cash', type: 'AST', parent: '', position: '001', balance: 5000 },
      { code: 'BANK01', name: 'Current Account - SBI', type: 'AST', parent: '', position: '002', balance: 150000 },
      { code: 'BANK02', name: 'Savings Account - HDFC', type: 'AST', parent: '', position: '003', balance: 75000 },
      { code: 'LOAN01', name: 'Member Loans Outstanding', type: 'AST', parent: '', position: '004', balance: 500000 },
      { code: 'INVST01', name: 'Fixed Deposits', type: 'AST', parent: '', position: '005', balance: 200000 },
      { code: 'FURN01', name: 'Furniture & Fixtures', type: 'AST', parent: '', position: '006', balance: 50000 },
      { code: 'COMP01', name: 'Computer & Equipment', type: 'AST', parent: '', position: '007', balance: 30000 },
      
      // Liabilities
      { code: 'SHARE01', name: 'Paid-up Share Capital', type: 'LIA', parent: '', position: '101', balance: 400000 },
      { code: 'RESRV01', name: 'General Reserve', type: 'LIA', parent: '', position: '102', balance: 100000 },
      { code: 'RESRV02', name: 'Statutory Reserve', type: 'LIA', parent: '', position: '103', balance: 50000 },
      { code: 'DEPST01', name: 'Member Fixed Deposits', type: 'LIA', parent: '', position: '104', balance: 300000 },
      { code: 'DEPST02', name: 'Member Savings Deposits', type: 'LIA', parent: '', position: '105', balance: 200000 },
      { code: 'PAYBL01', name: 'Interest Payable', type: 'LIA', parent: '', position: '106', balance: 15000 },
      
      // Income
      { code: 'INTINC01', name: 'Interest on Loans', type: 'INC', parent: '', position: '201', balance: 0 },
      { code: 'INTINC02', name: 'Interest on Investments', type: 'INC', parent: '', position: '202', balance: 0 },
      { code: 'FEEINC01', name: 'Loan Processing Fees', type: 'INC', parent: '', position: '203', balance: 0 },
      { code: 'FEEINC02', name: 'Membership Fees', type: 'INC', parent: '', position: '204', balance: 0 },
      { code: 'OTHINC01', name: 'Miscellaneous Income', type: 'INC', parent: '', position: '205', balance: 0 },
      
      // Expenses
      { code: 'SALARY01', name: 'Staff Salaries', type: 'EXP', parent: '', position: '301', balance: 0 },
      { code: 'RENT01', name: 'Office Rent', type: 'EXP', parent: '', position: '302', balance: 0 },
      { code: 'UTIL01', name: 'Electricity & Water', type: 'EXP', parent: '', position: '303', balance: 0 },
      { code: 'STAT01', name: 'Stationery & Printing', type: 'EXP', parent: '', position: '304', balance: 0 },
      { code: 'AUDIT01', name: 'Audit Fees', type: 'EXP', parent: '', position: '305', balance: 0 },
      { code: 'INTEXP01', name: 'Interest on Deposits', type: 'EXP', parent: '', position: '306', balance: 0 },
      { code: 'ADMIN01', name: 'Administrative Expenses', type: 'EXP', parent: '', position: '307', balance: 0 }
    ];

    let addedCount = 0;
    for (const head of comprehensiveHeads) {
      try {
        await pool.query(`
          INSERT INTO headmaster (code, parent_code, hposition, head_name, interest, headtype, op_bal, pflag)
          VALUES ($1, $2, $3, $4, 'N', $5, $6, '')
        `, [head.code, head.parent, head.position, head.name, head.type, head.balance]);
        addedCount++;
      } catch (error) {
        if (error.code === '23505') { // Duplicate key error
          // Update existing record
          await pool.query(`
            UPDATE headmaster 
            SET head_name = $1, headtype = $2, op_bal = $3
            WHERE code = $4
          `, [head.name, head.type, head.balance, head.code]);
        }
      }
    }

    console.log(`✅ Added/Updated ${addedCount} comprehensive financial heads`);

    // Step 3: Add sample transactions for the current financial year
    console.log('\n📋 Step 3: Adding sample transactions for current financial year...');
    
    const currentYear = new Date().getFullYear();
    const financialYearStart = new Date(currentYear, 3, 1); // April 1st
    const sampleDate1 = new Date(currentYear, 4, 15); // May 15th
    const sampleDate2 = new Date(currentYear, 5, 30); // June 30th
    const sampleDate3 = new Date(currentYear, 6, 31); // July 31st

    const sampleTransactions = [
      // Opening balances (April 1st)
      { code: 'CASH01', type: 'DR', amount: 5000, date: financialYearStart, narration: 'Opening Balance - Petty Cash' },
      { code: 'BANK01', type: 'DR', amount: 150000, date: financialYearStart, narration: 'Opening Balance - Current Account' },
      { code: 'LOAN01', type: 'DR', amount: 500000, date: financialYearStart, narration: 'Opening Balance - Member Loans' },
      { code: 'SHARE01', type: 'CR', amount: 400000, date: financialYearStart, narration: 'Opening Balance - Share Capital' },
      { code: 'RESRV01', type: 'CR', amount: 100000, date: financialYearStart, narration: 'Opening Balance - General Reserve' },
      { code: 'DEPST01', type: 'CR', amount: 300000, date: financialYearStart, narration: 'Opening Balance - Member FDs' },
      
      // May transactions
      { code: 'INTINC01', type: 'CR', amount: 25000, date: sampleDate1, narration: 'Interest Income on Loans - May' },
      { code: 'BANK01', type: 'DR', amount: 25000, date: sampleDate1, narration: 'Interest Received - May' },
      { code: 'SALARY01', type: 'DR', amount: 20000, date: sampleDate1, narration: 'Staff Salary - May' },
      { code: 'BANK01', type: 'CR', amount: 20000, date: sampleDate1, narration: 'Salary Payment - May' },
      
      // June transactions
      { code: 'FEEINC01', type: 'CR', amount: 8000, date: sampleDate2, narration: 'Loan Processing Fees - June' },
      { code: 'CASH01', type: 'DR', amount: 8000, date: sampleDate2, narration: 'Processing Fees Received - June' },
      { code: 'RENT01', type: 'DR', amount: 12000, date: sampleDate2, narration: 'Office Rent - June' },
      { code: 'BANK01', type: 'CR', amount: 12000, date: sampleDate2, narration: 'Rent Payment - June' },
      
      // July transactions
      { code: 'INTEXP01', type: 'DR', amount: 15000, date: sampleDate3, narration: 'Interest on Member Deposits - July' },
      { code: 'PAYBL01', type: 'CR', amount: 15000, date: sampleDate3, narration: 'Interest Payable - July' },
      { code: 'UTIL01', type: 'DR', amount: 3000, date: sampleDate3, narration: 'Electricity Bill - July' },
      { code: 'CASH01', type: 'CR', amount: 3000, date: sampleDate3, narration: 'Utility Payment - July' }
    ];

    let transNo = 2001; // Start from a higher number to avoid conflicts
    let transactionCount = 0;
    
    for (const trans of sampleTransactions) {
      try {
        await pool.query(`
          INSERT INTO ledger (trans_no, trans_date, trans_type, code, trans_amt, narration, username)
          VALUES ($1, $2, $3, $4, $5, $6, 'system')
        `, [transNo++, trans.date, trans.type, trans.code, trans.amount, trans.narration]);
        transactionCount++;
      } catch (error) {
        if (error.code !== '23505') { // Ignore duplicate key errors
          console.log(`⚠️  Error adding transaction ${transNo-1}:`, error.message);
        }
      }
    }

    console.log(`✅ Added ${transactionCount} sample transactions`);

    // Step 4: Verify the changes
    console.log('\n📊 Step 4: Verifying financial data structure...');
    
    const verification = await pool.query(`
      SELECT 
        headtype,
        COUNT(*) as count,
        STRING_AGG(code, ', ') as sample_codes
      FROM headmaster 
      WHERE headtype IN ('AST', 'LIA', 'INC', 'EXP')
      GROUP BY headtype
      ORDER BY headtype
    `);

    console.log('✅ Updated financial structure:');
    verification.rows.forEach(row => {
      console.log(`   ${row.headtype}: ${row.count} accounts (${row.sample_codes.substring(0, 80)}...)`);
    });

    // Step 5: Test the API response
    console.log('\n🌐 Step 5: Testing updated financial summary...');
    
    const testQuery = `
      SELECT 
        h.code as head_code,
        h.head_name,
        h.headtype,
        COALESCE(SUM(CASE
          WHEN l.trans_date <= '2024-12-31'::date
          THEN (
            CASE 
              WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric
              WHEN l.trans_type = 'DR' THEN -l.trans_amt::numeric
              ELSE 0
            END
          )
          ELSE 0
        END), 0) AS closing_balance
      FROM headmaster h
      LEFT JOIN ledger l ON h.code = l.code
      WHERE h.headtype IN ('AST', 'LIA', 'INC', 'EXP')
      GROUP BY h.code, h.head_name, h.headtype
      HAVING ABS(COALESCE(SUM(CASE
        WHEN l.trans_date <= '2024-12-31'::date
        THEN (
          CASE 
            WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric
            WHEN l.trans_type = 'DR' THEN -l.trans_amt::numeric
            ELSE 0
          END
        )
        ELSE 0
      END), 0)) > 0
      ORDER BY h.headtype, h.code
      LIMIT 20
    `;

    const testResult = await pool.query(testQuery);
    
    console.log(`✅ Found ${testResult.rows.length} accounts with balances:`);
    testResult.rows.forEach(row => {
      console.log(`   ${row.head_code} (${row.headtype}): ${row.head_name} = ₹${parseFloat(row.closing_balance).toLocaleString()}`);
    });

    console.log('\n🎯 SUMMARY:');
    console.log('✅ Head types standardized to AST, LIA, INC, EXP');
    console.log('✅ Comprehensive financial accounts added');
    console.log('✅ Sample transactions populated');
    console.log('✅ Data ready for P&L/Balance Sheet frontend');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixFinancialHeadTypes();