const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function fixInterestRates() {
  try {
    console.log('🔧 Fixing interest rates...');
    
    // Check current interest rates
    const currentRates = await pool.query('SELECT * FROM interest_rates WHERE type = \'SB\'');
    console.log('Current SB rates:', currentRates.rows);
    
    // Update existing rates to be active
    const updateResult = await pool.query(`
      UPDATE interest_rates 
      SET "isActive" = true 
      WHERE type = 'SB'
    `);
    console.log(`Updated ${updateResult.rowCount} existing rates`);
    
    // If no SB rates exist, create one
    if (currentRates.rows.length === 0) {
      // Get next available ID
      const maxIdResult = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM interest_rates');
      const nextId = maxIdResult.rows[0].next_id;
      
      await pool.query(`
        INSERT INTO interest_rates (
          id, name, type, rate, "calculationMethod", "minAmount", 
          "isActive", "effectiveFrom", "createdAt", "updatedAt"
        ) VALUES (
          $1, 'Savings Account Interest', 'SB', 4.0, 'DAILY_BALANCE', 1000,
          true, CURRENT_DATE - INTERVAL '1 year', NOW(), NOW()
        )
      `, [nextId]);
      console.log('Created new SB interest rate with ID:', nextId);
    }
    
    // Verify the fix
    const verifyRates = await pool.query(`
      SELECT * FROM interest_rates 
      WHERE type = 'SB' AND "isActive" = true
    `);
    console.log('Active SB rates after fix:', verifyRates.rows);
    
    console.log('✅ Interest rates fixed successfully');
    
  } catch (error) {
    console.error('❌ Error fixing interest rates:', error.message);
  } finally {
    await pool.end();
  }
}

fixInterestRates();