const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugMemberEligibility() {
  console.log('🔍 DEBUGGING MEMBER ELIGIBILITY API\n');

  try {
    const client = await pool.connect();

    // Check if member exists in member_master
    console.log('1. Checking member_master table...');
    const memberQuery = `
      SELECT 
        mbno,
        CONCAT(f_name, ' ', COALESCE(m_name, ''), ' ', l_name) as name,
        basic_pay,
        dept_name
      FROM member_master 
      WHERE mbno = $1
    `;

    const memberResult = await client.query(memberQuery, [610017770]);
    console.log(`   Found ${memberResult.rows.length} members for 610017770`);
    if (memberResult.rows.length > 0) {
      console.log('   Member data:', memberResult.rows[0]);
    }

    // Check loan_master for this member
    console.log('\n2. Checking loan_master table...');
    const loanQuery = `
      SELECT 
        COUNT(*) as active_loans,
        COALESCE(SUM(balance::numeric), 0) as total_outstanding,
        COALESCE(SUM(instal_amt::numeric), 0) as total_emi
      FROM loan_master 
      WHERE mbno = $1 
      AND balance::numeric > 0
    `;

    const loanResult = await client.query(loanQuery, [610017770]);
    console.log('   Loan summary:', loanResult.rows[0]);

    // Check business rules
    console.log('\n3. Checking business rules...');
    const businessRulesQuery = `
      SELECT 
        loanmaxlimit,
        loanagainstbasic,
        loanagainstdeppercent,
        appdate
      FROM busrules 
      WHERE appdate = (SELECT MAX(appdate) FROM busrules)
      LIMIT 1
    `;

    const businessRules = await client.query(businessRulesQuery);
    console.log('   Business rules:', businessRules.rows[0]);

    // Test with different member numbers
    console.log('\n4. Testing other member numbers...');
    const testMembers = [1001, 1002, 1003];
    
    for (const memberNo of testMembers) {
      const result = await client.query(memberQuery, [memberNo]);
      if (result.rows.length > 0) {
        console.log(`   Member ${memberNo}:`, result.rows[0]);
      } else {
        console.log(`   Member ${memberNo}: Not found`);
      }
    }

    // Check if there are any members with basic_pay > 0
    console.log('\n5. Checking members with basic_pay > 0...');
    const paidMembersQuery = `
      SELECT 
        mbno,
        CONCAT(f_name, ' ', COALESCE(m_name, ''), ' ', l_name) as name,
        basic_pay,
        dept_name
      FROM member_master 
      WHERE basic_pay::numeric > 0
      ORDER BY basic_pay::numeric DESC
      LIMIT 5
    `;

    const paidMembers = await client.query(paidMembersQuery);
    console.log(`   Found ${paidMembers.rows.length} members with salary > 0:`);
    paidMembers.rows.forEach(member => {
      console.log(`     ${member.mbno}: ${member.name} - ₹${parseFloat(member.basic_pay).toLocaleString()}`);
    });

    client.release();
    console.log('\n🎉 DEBUG COMPLETE!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugMemberEligibility();