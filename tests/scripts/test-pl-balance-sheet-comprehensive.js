const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testPLBalanceSheetComprehensive() {
  console.log('📊 P&L BALANCE SHEET - Comprehensive Test');
  console.log('=' .repeat(70));

  try {
    // Test 1: Check headmaster table structure and data
    console.log('\n📋 TEST 1: Checking headmaster table structure and data...');
    
    const headmasterStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'headmaster' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ headmaster table columns:', headmasterStructure.rows.length);
    headmasterStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check existing head data
    const headCount = await pool.query('SELECT COUNT(*) as count FROM headmaster');
    console.log(`📊 Current headmaster records: ${headCount.rows[0].count}`);

    // Test 2: Check headtype table and categorize accounts
    console.log('\n📋 TEST 2: Checking headtype table and account categories...');
    
    const headTypes = await pool.query(`
      SELECT 
        ht.headtype,
        ht.ldtype,
        ht.remark,
        COUNT(hm.code) as head_count
      FROM headtype ht
      LEFT JOIN headmaster hm ON ht.headtype = hm.headtype
      GROUP BY ht.headtype, ht.ldtype, ht.remark
      ORDER BY ht.headtype
    `);

    if (headTypes.rows.length > 0) {
      console.log('✅ Found head types and their usage:');
      headTypes.rows.forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.headtype}: ${type.remark} (${type.head_count} heads, L/D: ${type.
    console.log('\n📋 TEST 3: Checking head types for P&L and Balance Sheet...');
    
    const headTypes = await pool.query(`
      SELECT 
        headtyp