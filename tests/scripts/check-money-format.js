const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function checkMoneyFormat() {
  const pool = new Pool(dbConfig);
  
  try {
    const client = await pool.connect();
    
    // Check existing money format
    const result = await client.query('SELECT trans_amt, trans_type FROM transactions LIMIT 5');
    console.log('Existing money formats:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. Amount: "${row.trans_amt}" (${typeof row.trans_amt}), Type: ${row.trans_type}`);
    });
    
    // Test inserting different money formats
    console.log('\nTesting money format insertion...');
    
    try {
      // Try inserting with just number
      await client.query(`
        INSERT INTO transactions (
          trans_no, trans_type, trans_date, mbno, acc_no, acc_type, 
          trans_amt, receipt_vchr_no, vchr_type, modeofpay, 
          cheq_no, cheq_amt, cheq_date, bankname, pass_flag, 
          cashier_flag, code
        ) VALUES (
          9999, 'CR', '2024-12-24', 1001, 123456, 'SB', 
          25000.00, 'R001', 'RV', 'CS', 
          '', 0.00, NULL, '', 'N', 
          'N', 'TEST'
        );
      `);
      console.log('✅ Successfully inserted with numeric format');
      
      // Clean up test record
      await client.query('DELETE FROM transactions WHERE trans_no = 9999');
      
    } catch (error) {
      console.log('❌ Numeric format failed:', error.message);
    }
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMoneyFormat();