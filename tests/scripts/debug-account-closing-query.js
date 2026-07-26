/**
 * Debug Account Closing Register Database Query
 */

const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function debugQuery() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('Testing Account Closing Register Database Query...');
    
    // Test the exact query from the backend service
    const query = `
      -- Fixed Deposits
      SELECT 
        f.mbno as "memberCode",
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as "memberName",
        f.account_number::text as "accountNo",
        'FD' as "accountType",
        f.statusdate as "closingDate",
        COALESCE(f.matamount, 0)::numeric as "finalAmount",
        'Fixed Deposit' as "description"
      FROM fdmaster f
      INNER JOIN member_master m ON f.mbno = m.mbno
      WHERE f.status = '1' -- Assuming '1' means closed
        AND EXTRACT(MONTH FROM f.statusdate) = $1
        AND EXTRACT(YEAR FROM f.statusdate) = $2
        AND f.statusdate IS NOT NULL
        AND f.fdrdflag = 'F' -- FD flag

      UNION ALL

      -- Recurring Deposits (RD entries in fdmaster with fdrdflag = 'R')
      SELECT 
        f.mbno as "memberCode",
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as "memberName",
        f.account_number::text as "accountNo",
        'RD' as "accountType",
        f.statusdate as "closingDate",
        COALESCE(f.matamount, 0)::numeric as "finalAmount",
        'Recurring Deposit' as "description"
      FROM fdmaster f
      INNER JOIN member_master m ON f.mbno = m.mbno
      WHERE f.status = '1' -- Closed
        AND f.fdrdflag = 'R' -- RD flag
        AND EXTRACT(MONTH FROM f.statusdate) = $1
        AND EXTRACT(YEAR FROM f.statusdate) = $2
        AND f.statusdate IS NOT NULL

      UNION ALL

      -- Loans (assuming loans are closed when balance = 0)
      SELECT 
        l.mbno as "memberCode",
        CONCAT(m.prefix, ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as "memberName",
        l.loancaseno::text as "accountNo",
        'LOAN' as "accountType",
        l.payment_date as "closingDate", -- Using payment_date as placeholder
        COALESCE(l.loan_amt, 0)::numeric as "finalAmount",
        'Loan' as "description"
      FROM loan_master l
      INNER JOIN member_master m ON l.mbno = m.mbno
      WHERE COALESCE(l.balance, 0)::numeric = 0 -- Assuming 0 balance means closed
        AND EXTRACT(MONTH FROM l.payment_date) = $1
        AND EXTRACT(YEAR FROM l.payment_date) = $2

      ORDER BY "closingDate" ASC, "memberCode" ASC
    `;
    
    const params = [12, 2025];
    console.log('Executing query with params:', params);
    
    const result = await pool.query(query, params);
    
    console.log('✅ Query executed successfully');
    console.log('✅ Found', result.rows.length, 'closed accounts');
    
    if (result.rows.length > 0) {
      console.log('\nSample results:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`${index + 1}.`, row);
      });
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugQuery();