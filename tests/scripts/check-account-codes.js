const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function checkAccountCodes() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 CHECKING ACCOUNT CODES');
    console.log('=' .repeat(40));

    // Check codes_table structure and content
    console.log('\n📊 Codes Table Structure:');
    const codesStructureQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'codes_table'
      ORDER BY ordinal_position
    `;
    const codesStructureResult = await pool.query(codesStructureQuery);
    
    if (codesStructureResult.rows.length > 0) {
      codesStructureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type}`);
      });

      // Check codes_table content
      console.log('\n📊 Sample codes from codes_table:');
      const codesContentQuery = `SELECT * FROM codes_table LIMIT 10`;
      const codesContentResult = await pool.query(codesContentQuery);
      
      if (codesContentResult.rows.length > 0) {
        codesContentResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}.`, row);
        });
      }
    }

    // Check head_master structure and content
    console.log('\n📊 Head Master Table:');
    const headMasterQuery = `
      SELECT * FROM head_master 
      WHERE code IN ('A1047', 'A1001', 'L1004', 'L1002', 'L1045')
      ORDER BY code
    `;
    const headMasterResult = await pool.query(headMasterQuery);
    
    if (headMasterResult.rows.length > 0) {
      console.log('Relevant head codes:');
      headMasterResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}.`, row);
      });
    } else {
      console.log('No matching codes found in head_master');
    }

    // Check accountbalance table for these codes
    console.log('\n📊 Account Balance for relevant codes:');
    const accountBalanceQuery = `
      SELECT acno, acname, groupledger 
      FROM accountbalance 
      WHERE acno IN ('A1047', 'A1001', 'L1004', 'L1002', 'L1045')
      ORDER BY acno
    `;
    const accountBalanceResult = await pool.query(accountBalanceQuery);
    
    if (accountBalanceResult.rows.length > 0) {
      console.log('Account descriptions:');
      accountBalanceResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.acno}: ${row.acname} (Group: ${row.groupledger})`);
      });
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkAccountCodes().catch(console.error);