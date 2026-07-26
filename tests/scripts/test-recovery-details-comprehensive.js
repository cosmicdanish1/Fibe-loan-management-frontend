const { Pool } = require('pg');
const axios = require('axios');

// Database configuration
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'cooperative_db',
  password: 'admin',
  port: 5432,
};

const API_BASE_URL = 'http://localhost:3000';

async function testRecoveryDetailsComprehensive() {
  console.log('🔍 RECOVERY DETAILS - COMPREHENSIVE TEST');
  console.log('=====================================\n');

  const pool = new Pool(dbConfig);

  try {
    // 1. Check database connection
    console.log('1️⃣ Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully\n');

    // 2. Analyze demand_master table structure
    console.log('2️⃣ Analyzing demand_master table structure...');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'demand_master' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table Structure:');
    tableInfo.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log();

    // 3. Check total records in demand_master
    console.log('3️⃣ Checking demand_master table data...');
    const totalRecords = await pool.query('SELECT COUNT(*) as count FROM demand_master');
    console.log(`📊 Total records in demand_master: ${totalRecords.rows[0].count}`);

    // 4. Check data distribution by year and month
    console.log('\n4️⃣ Analyzing data distribution...');
    const distribution = await pool.query(`
      SELECT 
        demand_for_year,
        demand_for_month,
        COUNT(*) as record_count,
        COUNT(DISTINCT mbno) as unique_members
      FROM demand_master 
      GROUP BY demand_for_year, demand_for_month 
      ORDER BY demand_for_year DESC, demand_for_month DESC 
      LIMIT 10
    `);
    
    console.log('📈 Recent data distribution:');
    distribution.rows.forEach(row => {
      const monthNames = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthName = monthNames[row.demand_for_month] || row.demand_for_month;
      console.log(`   ${monthName} ${row.demand_for_year}: ${row.record_count} records, ${row.unique_members} members`);
    });

    // 5. Find sample members with good data
    console.log('\n5️⃣ Finding sample members with recovery data...');
    const sampleMembers = await pool.query(`
      SELECT 
        d.mbno,
        CONCAT(COALESCE(d.prefix, ''), ' ', COALESCE(d.f_name, ''), ' ', COALESCE(d.m_name, ''), ' ', COALESCE(d.l_name, '')) as member_name,
        d.demand_for_year,
        d.demand_for_month,
        d.totaldemand,
        d.rln_amount,
        d.eln_amount,
        d.rd_amount,
        d.md_amount,
        d.cd_amount,
        d.shr_amount,
        d.bankcharge,
        d."OTHERS",
        d.balance_for_month,
        d.dmnd_gnrt_date,
        d.demand_posted
      FROM demand_master d
      WHERE d.totaldemand > 0 
        AND d.demand_for_year >= 2024
        AND (d.rln_amount > 0 OR d.eln_amount > 0 OR d.rd_amount > 0 OR d.md_amount > 0)
      ORDER BY d.demand_for_year DESC, d.demand_for_month DESC, d.totaldemand DESC
      LIMIT 5
    `);

    console.log('👥 Sample members with recovery data:');
    sampleMembers.rows.forEach((member, index) => {
      const monthNames = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthName = monthNames[member.demand_for_month] || member.demand_for_month;
      console.log(`   ${index + 1}. Member: ${member.mbno} (${member.member_name?.trim() || 'Unknown'})`);
      console.log(`      Period: ${monthName} ${member.demand_for_year}`);
      console.log(`      Total Demand: ₹${parseFloat(member.totaldemand || 0).toLocaleString('en-IN')}`);
      console.log(`      Regular Loan: ₹${parseFloat(member.rln_amount || 0).toLocaleString('en-IN')}`);
      console.log(`      Emergency Loan: ₹${parseFloat(member.eln_amount || 0).toLocaleString('en-IN')}`);
      console.log(`      RD Amount: ₹${parseFloat(member.rd_amount || 0).toLocaleString('en-IN')}`);
      console.log(`      Status: ${member.demand_posted === 'Y' ? 'Posted' : 'Pending'}`);
      console.log();
    });

    // 6. Test backend API with sample data
    if (sampleMembers.rows.length > 0) {
      console.log('6️⃣ Testing backend API...');
      const testMember = sampleMembers.rows[0];
      const monthNames = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthName = monthNames[testMember.demand_for_month];

      try {
        const apiUrl = `${API_BASE_URL}/report/recovery-details?memberNo=${testMember.mbno}&month=${monthName}&year=${testMember.demand_for_year}`;
        console.log(`🔗 API URL: ${apiUrl}`);
        
        const response = await axios.get(apiUrl);
        console.log('✅ API Response Status:', response.status);
        console.log('📄 API Response Data:');
        console.log(JSON.stringify(response.data, null, 2));
      } catch (apiError) {
        console.log('❌ API Error:', apiError.message);
        if (apiError.response) {
          console.log('   Status:', apiError.response.status);
          console.log('   Data:', apiError.response.data);
        }
      }
    }

    // 7. Check for data quality issues
    console.log('\n7️⃣ Checking data quality...');
    
    // Check for missing member names
    const missingNames = await pool.query(`
      SELECT COUNT(*) as count 
      FROM demand_master 
      WHERE (f_name IS NULL OR f_name = '') 
        AND demand_for_year >= 2024
    `);
    console.log(`⚠️  Records with missing member names: ${missingNames.rows[0].count}`);

    // Check for zero amounts
    const zeroAmounts = await pool.query(`
      SELECT COUNT(*) as count 
      FROM demand_master 
      WHERE totaldemand = 0 
        AND demand_for_year >= 2024
    `);
    console.log(`⚠️  Records with zero total demand: ${zeroAmounts.rows[0].count}`);

    // Check data types
    console.log('\n8️⃣ Checking numeric data types...');
    const numericCheck = await pool.query(`
      SELECT 
        pg_typeof(totaldemand) as totaldemand_type,
        pg_typeof(rln_amount) as rln_amount_type,
        pg_typeof(rd_amount) as rd_amount_type,
        pg_typeof(bankcharge) as bankcharge_type,
        pg_typeof("OTHERS") as others_type
      FROM demand_master 
      LIMIT 1
    `);
    
    console.log('📊 Data types:');
    Object.entries(numericCheck.rows[0]).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // 9. UI Testing Instructions
    console.log('\n9️⃣ UI TESTING INSTRUCTIONS');
    console.log('==========================');
    console.log('To test RecoveryDetails in the UI:');
    console.log();
    console.log('1. Navigate to: Reports → Account Reports → Recovery Details');
    console.log('2. Use these test cases:');
    console.log();
    
    sampleMembers.rows.slice(0, 3).forEach((member, index) => {
      const monthNames = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthName = monthNames[member.demand_for_month];
      console.log(`   Test Case ${index + 1}:`);
      console.log(`   - Member Number: ${member.mbno}`);
      console.log(`   - Month: ${monthName}`);
      console.log(`   - Year: ${member.demand_for_year}`);
      console.log(`   - Expected Total Demand: ₹${parseFloat(member.totaldemand || 0).toLocaleString('en-IN')}`);
      console.log(`   - Expected Status: ${member.demand_posted === 'Y' ? 'Posted' : 'Pending'}`);
      console.log();
    });

    console.log('3. Expected Results:');
    console.log('   - Member information should display correctly');
    console.log('   - All loan recovery amounts should show');
    console.log('   - All deposit recovery amounts should show');
    console.log('   - Bank charges and other charges should display');
    console.log('   - Balance for month should be calculated');
    console.log('   - Status should show as Posted/Pending');
    console.log();
    console.log('4. Print Testing:');
    console.log('   - Click Generate to view data');
    console.log('   - Use browser print (Ctrl+P) to test print functionality');
    console.log('   - Verify portrait orientation');
    console.log('   - Check all data is visible in print preview');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testRecoveryDetailsComprehensive().catch(console.error);