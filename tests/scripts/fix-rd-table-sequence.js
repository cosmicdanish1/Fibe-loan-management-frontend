const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function fixTable() {
  try {
    console.log('🔧 Fixing recurring_deposits table...');
    
    // Create sequence for recurring_deposits id
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS recurring_deposits_id_seq;
    `);
    
    // Set the sequence as default for id column
    await pool.query(`
      ALTER TABLE recurring_deposits 
      ALTER COLUMN id SET DEFAULT nextval('recurring_deposits_id_seq');
    `);
    
    // Set the sequence ownership
    await pool.query(`
      ALTER SEQUENCE recurring_deposits_id_seq OWNED BY recurring_deposits.id;
    `);
    
    // Get current max id and set sequence value
    const maxIdResult = await pool.query(`
      SELECT COALESCE(MAX(id), 0) as max_id FROM recurring_deposits;
    `);
    
    const maxId = maxIdResult.rows[0].max_id;
    
    await pool.query(`
      SELECT setval('recurring_deposits_id_seq', $1, true);
    `, [Math.max(maxId, 1)]);
    
    console.log('✅ Fixed recurring_deposits table sequence');
    
    // Do the same for rd_installments
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS rd_installments_id_seq;
    `);
    
    await pool.query(`
      ALTER TABLE rd_installments 
      ALTER COLUMN id SET DEFAULT nextval('rd_installments_id_seq');
    `);
    
    await pool.query(`
      ALTER SEQUENCE rd_installments_id_seq OWNED BY rd_installments.id;
    `);
    
    const maxInstallmentIdResult = await pool.query(`
      SELECT COALESCE(MAX(id), 0) as max_id FROM rd_installments;
    `);
    
    const maxInstallmentId = maxInstallmentIdResult.rows[0].max_id;
    
    await pool.query(`
      SELECT setval('rd_installments_id_seq', $1, true);
    `, [Math.max(maxInstallmentId, 1)]);
    
    console.log('✅ Fixed rd_installments table sequence');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixTable();