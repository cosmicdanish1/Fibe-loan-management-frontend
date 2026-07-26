const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function checkLedgerData() {
  const pool = new Pool(dbConfig);
  
  try {
    const client = await pool.connect();
    
    // Check if our test entries were created
    console.log('🔍 Checking ledger entries for member 1001...');
    const result = await client.query(`
      SELECT trans_no, trans_date, trans_type, code, mbno, trans_amt, narration 
      FROM ledger 
      WHERE mbno = 1001 
      AND trans_date >= '2024-12-01' 
      ORDER BY trans_date;
    `);
    
    console.log(`Found ${result.rows.length} entries:`);
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. Trans: ${row.trans_no}, Date: ${row.trans_date?.toISOString().split('T')[0]}, Type: ${row.trans_type}, Code: ${row.code}, Amount: ${row.trans_amt}, Narration: ${row.narration}`);
    });
    
    // Try to add one test entry manually
    console.log('\n📝 Adding one test entry...');
    try {
      await client.query(`
        INSERT INTO ledger (
          trans_no, trans_date, trans_type, code, mbno, acc_no, acc_type,
          trans_amt, receipt_vchr_no, vchr_type, modeofpay, pl_balance,
          narration, username, ledgerid
        ) VALUES (
          9001, '2024-12-24', 'CR', 'A001', 1001, 123456, 'SB',
          25000.00, 'R001', 'RV', 'C', 0,
          'Test Deposit', 'testuser', 9001
        );
      `);
      console.log('✅ Test entry added successfully');
      
      // Check again
      const newResult = await client.query(`
        SELECT trans_no, trans_date, trans_type, code, mbno, trans_amt, narration 
        FROM ledger 
        WHERE mbno = 1001 
        AND trans_date >= '2024-12-01' 
        ORDER BY trans_date;
      `);
      
      console.log(`\nNow found ${newResult.rows.length} entries:`);
      newResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Trans: ${row.trans_no}, Date: ${row.trans_date?.toISOString().split('T')[0]}, Type: ${row.trans_type}, Code: ${row.code}, Amount: ${row.trans_amt}, Narration: ${row.narration}`);
      });
      
    } catch (insertError) {
      console.log('❌ Error adding test entry:', insertError.message);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLedgerData();