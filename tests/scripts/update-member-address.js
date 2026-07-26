/**
 * Update Member Address Script
 * Updates member address for testing purposes
 */

const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
};

async function updateMemberAddress() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('=== UPDATING MEMBER ADDRESS FOR TESTING ===');
    
    // Update address for test member
    const updateQuery = `
      UPDATE member_master 
      SET present_address = 'Test Address, New Delhi - 110001'
      WHERE mbno = 610015819
    `;
    
    await pool.query(updateQuery);
    console.log('✅ Updated address for member 610015819');
    
    // Verify the update
    const verifyQuery = `
      SELECT mbno, 
             CONCAT(prefix, ' ', f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as member_name,
             present_address
      FROM member_master 
      WHERE mbno = 610015819
    `;
    
    const result = await pool.query(verifyQuery);
    if (result.rows.length > 0) {
      const member = result.rows[0];
      console.log(`✅ Verified: ${member.member_name} - ${member.present_address}`);
    }
    
  } catch (error) {
    console.error('❌ Error updating member address:', error.message);
  } finally {
    await pool.end();
  }
}

updateMemberAddress();