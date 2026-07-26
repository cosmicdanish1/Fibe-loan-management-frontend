const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugFinancialData() {
  console.log('🔍 Debugging Financial Data');
  console.log('=' .repeat(50));

  try {
    // Check headmaster data
    console.log('\n📊 Sample headmaster data:');
    const headData = await pool.query(`
      SELECT code, head_name, headtype, op_bal 
      FROM headmaster 
      WHERE headtype IN ('AST', 'LIA', 'INC', 'EXP') 
      ORDER BY headtype, code 
      LIMIT 15
    `);

    headData.rows.forEach(row => {
      console.log(`${row.code} | ${row.head_name} | ${row.headtype} | ${row.op_bal}`);
    });

    // Check ledger data
    console.log('\n📊 Sample ledger data:');
    const ledgerData = await pool.query(`
      SELECT l.code, l.trans_date, l.trans_type, l.trans_amt, h.head_name, h.headtype
      FROM ledger l
      JOIN headmaster h ON l.code = h.code
      WHERE h.headtype IN ('AST', 'LIA', 'INC', 'EXP')
      ORDER BY l.trans_date DESC
      LIMIT 10
    `);

    ledgerData.rows.forEach(row => {
      console.log(`${row.code} | ${row.trans_date.toISOString().split('T')[0]} | ${row.trans_type} | ${row.trans_amt} | ${row.head_name}`);
    });

    // Test the exact query from the backend
    console.log('\n🔍 Testing backend query logic:');
    const fromDate = '2024-04-01';
    const toDate = '2024-12-31';
    const includeOpBal = true;

    const backendQuery = `
      SELECT 
        h.code as head_code,
        h.head_name,
        h.headtype,
        
        -- 1. Calculate Opening Balance (Everything BEFORE fromDate)
        COALESCE(SUM(CASE 
          WHEN $3::boolean = true AND l.trans_date < $1::date
          THEN (
            CASE 
              WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric
              WHEN l.trans_type = 'DR' THEN -l.trans_amt::numeric
              ELSE 0
            END
          )
          ELSE 0 
        END), 0) AS opening_balance,

        -- 2. Calculate Period Activity (Between Dates)
        COALESCE(SUM(CASE 
          WHEN l.trans_date >= $1::date AND l.trans_date <= $2::date AND l.trans_type = 'DR'
          THEN l.trans_amt::numeric
          ELSE 0 
        END), 0) AS period_debit,
        
        COALESCE(SUM(CASE 
          WHEN l.trans_date >= $1::date AND l.trans_date <= $2::date AND l.trans_type = 'CR'
          THEN l.trans_amt::numeric
          ELSE 0 
        END), 0) AS period_credit,

        -- 3. Calculate Total Closing Balance (All transactions up to toDate)
        COALESCE(SUM(CASE
          WHEN l.trans_date <= $2::date
          THEN (
            CASE 
              WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric
              WHEN l.trans_type = 'DR' THEN -l.trans_amt::numeric
              ELSE 0
            END
          )
          ELSE 0
        END), 0) AS closing_balance

      FROM 
        headmaster h
      LEFT JOIN 
        ledger l ON h.code = l.code
      WHERE h.headtype IN ('AST', 'LIA', 'INC', 'EXP')
      GROUP BY 
        h.code, h.head_name, h.headtype
      ORDER BY 
        h.code
      LIMIT 10
    `;

    const queryResult = await pool.query(backendQuery, [fromDate, toDate, includeOpBal]);
    
    console.log(`Found ${queryResult.rows.length} records:`);
    queryResult.rows.forEach(row => {
      console.log(`${row.head_code} | ${row.head_name} | ${row.headtype} | Op: ${row.opening_balance} | Dr: ${row.period_debit} | Cr: ${row.period_credit} | Cl: ${row.closing_balance}`);
    });

    // Check date ranges in ledger
    console.log('\n📅 Date range analysis:');
    const dateRange = await pool.query(`
      SELECT 
        MIN(trans_date) as earliest_date,
        MAX(trans_date) as latest_date,
        COUNT(*) as total_transactions
      FROM ledger l
      JOIN headmaster h ON l.code = h.code
      WHERE h.headtype IN ('AST', 'LIA', 'INC', 'EXP')
    `);

    console.log(`Date range: ${dateRange.rows[0].earliest_date} to ${dateRange.rows[0].latest_date}`);
    console.log(`Total transactions: ${dateRange.rows[0].total_transactions}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugFinancialData();