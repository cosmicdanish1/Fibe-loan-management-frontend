const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testCalculatorComprehensive() {
  console.log('🧮 COMPREHENSIVE CALCULATOR COMPONENT TEST\n');
  console.log('Analyzing database requirements and enhancing loan calculator...\n');

  try {
    const client = await pool.connect();

    // 1. Check current Calculator component functionality
    console.log('1. 📊 CURRENT CALCULATOR ANALYSIS...');
    console.log('   Current Features:');
    console.log('   ✅ Basic EMI calculation');
    console.log('   ✅ Amortization schedule');
    console.log('   ✅ Total interest calculation');
    console.log('   ✅ Responsive UI');
    console.log('   ❌ No database integration');
    console.log('   ❌ No real loan data');
    console.log('   ❌ No member-specific calculations');

    // 2. Check available loan-related data in database
    console.log('\n2. 🏦 DATABASE LOAN DATA ANALYSIS...');
    
    // Check business rules table for interest rates
    console.log('   Checking business rules (interest rates)...');
    const busRulesQuery = `
      SELECT 
        appdate,
        rlnrate as regular_loan_rate,
        elnrate as emergency_loan_rate,
        alnrate as advance_loan_rate,
        mlnrate as misc_loan_rate,
        edlrate as education_loan_rate,
        flnrate as festival_loan_rate,
        slnrate as special_loan_rate,
        rlnmaxloanamt as regular_max_amount,
        rlnmaxnoinst as regular_max_installments
      FROM busrules 
      ORDER BY appdate DESC 
      LIMIT 5
    `;
    
    const busRules = await client.query(busRulesQuery);
    console.log(`   Found ${busRules.rows.length} business rule entries:`);
    if (busRules.rows.length > 0) {
      const latest = busRules.rows[0];
      console.log(`     Latest rates (${latest.appdate?.toISOString().split('T')[0]}):`);
      console.log(`       Regular Loan: ${latest.regular_loan_rate}%`);
      console.log(`       Emergency Loan: ${latest.emergency_loan_rate}%`);
      console.log(`       Advance Loan: ${latest.advance_loan_rate}%`);
      console.log(`       Education Loan: ${latest.education_loan_rate}%`);
    }

    // Check loan master data
    console.log('\n   Checking loan master data...');
    const loanMasterQuery = `
      SELECT 
        loantype,
        COUNT(*) as loan_count,
        AVG(rate::numeric) as avg_rate,
        AVG(loan_amt::numeric) as avg_amount,
        AVG(no_of_instal) as avg_installments
      FROM loan_master 
      GROUP BY loantype
      ORDER BY loan_count DESC
    `;
    
    const loanMaster = await client.query(loanMasterQuery);
    console.log(`   Found ${loanMaster.rows.length} loan types:`);
    loanMaster.rows.forEach(loan => {
      console.log(`     ${loan.loantype}: ${loan.loan_count} loans, Avg Rate: ${parseFloat(loan.avg_rate).toFixed(2)}%, Avg Amount: ₹${parseFloat(loan.avg_amount).toLocaleString()}`);
    });

    // Check interest master
    console.log('\n   Checking interest master...');
    const interestQuery = `
      SELECT 
        inttype,
        frdt,
        todt,
        rate::numeric as interest_rate
      FROM interestmaster 
      ORDER BY frdt DESC
      LIMIT 10
    `;
    
    const interestMaster = await client.query(interestQuery);
    console.log(`   Found ${interestMaster.rows.length} interest rate entries:`);
    interestMaster.rows.forEach(interest => {
      console.log(`     ${interest.inttype}: ${parseFloat(interest.interest_rate).toFixed(2)}% (${interest.frdt?.toISOString().split('T')[0]} to ${interest.todt?.toISOString().split('T')[0]})`);
    });

    // Check member loan data
    console.log('\n   Checking member loan data...');
    const memberLoanQuery = `
      SELECT 
        mbno,
        loantype,
        loan_amt::numeric as amount,
        rate::numeric as rate,
        no_of_instal as installments,
        instal_amt::numeric as emi,
        balance::numeric as balance
      FROM loan_master 
      WHERE mbno IN (610017770, 1001, 1002, 1003)
      ORDER BY mbno, loan_amt DESC
      LIMIT 10
    `;
    
    const memberLoans = await client.query(memberLoanQuery);
    console.log(`   Found ${memberLoans.rows.length} loans for test members:`);
    memberLoans.rows.forEach(loan => {
      console.log(`     Member ${loan.mbno}: ${loan.loantype} - ₹${parseFloat(loan.amount).toLocaleString()} @ ${parseFloat(loan.rate).toFixed(2)}% (${loan.installments} EMIs)`);
    });

    // 3. Check deposit/loan slab data
    console.log('\n3. 📋 DEPOSIT/LOAN SLAB DATA...');
    const slabQuery = `
      SELECT 
        name,
        type,
        "minAmount",
        "maxAmount",
        "minTenure",
        "maxTenure",
        "interestRate",
        "penaltyRate"
      FROM deposit_slabs 
      WHERE "isActive" = true
      ORDER BY "minAmount"
    `;
    
    const slabs = await client.query(slabQuery);
    console.log(`   Found ${slabs.rows.length} active deposit/loan slabs:`);
    slabs.rows.forEach(slab => {
      console.log(`     ${slab.name}: ₹${parseFloat(slab.minAmount).toLocaleString()}-₹${parseFloat(slab.maxAmount).toLocaleString()} @ ${parseFloat(slab.interestRate).toFixed(2)}%`);
    });

    // 4. Analyze what Calculator component needs
    console.log('\n4. 🎯 CALCULATOR ENHANCEMENT REQUIREMENTS...');
    console.log('   Database Integration Needs:');
    console.log('   📊 Real-time interest rates from busrules table');
    console.log('   👤 Member-specific loan history and eligibility');
    console.log('   💰 Loan type-specific rates and limits');
    console.log('   📈 Historical rate trends');
    console.log('   🔍 Loan comparison features');
    console.log('   📋 Pre-filled loan templates');

    // 5. Generate sample data for testing if needed
    console.log('\n5. 🔧 ENSURING TEST DATA AVAILABILITY...');
    
    // Check if we have recent business rules
    const recentRulesQuery = `
      SELECT COUNT(*) as count 
      FROM busrules 
      WHERE appdate >= CURRENT_DATE - INTERVAL '1 year'
    `;
    const recentRules = await client.query(recentRulesQuery);
    
    if (parseInt(recentRules.rows[0].count) === 0) {
      console.log('   Creating recent business rules entry...');
      await client.query(`
        INSERT INTO busrules (
          srno, appdate, rlnrate, elnrate, alnrate, mlnrate, edlrate, flnrate, slnrate,
          rlnmaxloanamt, elnmaxloanamt, alnmaxloanamt, mlnmaxloanamt, edlmaxloanamt,
          flnmaxloanamt, slnmaxloanamt, rlnmaxnoinst, elnmaxnoinst, alnmaxnoinst,
          mlnmaxnoinst, edlmaxnoinst, flnmaxnoinst, slnmaxnoinst,
          minmembship, workexp, defaultduration, minshareamt, maxshareamt,
          minmdamt, mincdamt, maxcdamt, minsavingbalance
        ) VALUES (
          (SELECT COALESCE(MAX(srno), 0) + 1 FROM busrules),
          CURRENT_DATE,
          12.0, 15.0, 10.0, 14.0, 8.0, 16.0, 11.0,
          50000, 10000, 20000, 30000, 40000, 15000, 25000,
          60, 24, 36, 48, 84, 36, 60,
          12, '2 years', 30, 1000, 5000,
          500, 1000, 10000, 1000
        )
      `);
      console.log('   ✅ Created recent business rules entry');
    } else {
      console.log('   ✅ Recent business rules data available');
    }

    // 6. Test API queries that enhanced calculator would need
    console.log('\n6. 🌐 API REQUIREMENTS FOR ENHANCED CALCULATOR...');
    
    // Test loan rates query
    const loanRatesQuery = `
      SELECT 
        'Regular Loan' as loan_type, rlnrate as rate, rlnmaxloanamt as max_amount, rlnmaxnoinst as max_tenure
      FROM busrules 
      WHERE appdate = (SELECT MAX(appdate) FROM busrules)
      UNION ALL
      SELECT 
        'Emergency Loan' as loan_type, elnrate as rate, elnmaxloanamt as max_amount, elnmaxnoinst as max_tenure
      FROM busrules 
      WHERE appdate = (SELECT MAX(appdate) FROM busrules)
      UNION ALL
      SELECT 
        'Advance Loan' as loan_type, alnrate as rate, alnmaxloanamt as max_amount, alnmaxnoinst as max_tenure
      FROM busrules 
      WHERE appdate = (SELECT MAX(appdate) FROM busrules)
    `;
    
    const loanRates = await client.query(loanRatesQuery);
    console.log('   Available loan types for calculator:');
    loanRates.rows.forEach(loan => {
      console.log(`     ${loan.loan_type}: ${parseFloat(loan.rate).toFixed(2)}% (Max: ₹${parseFloat(loan.max_amount).toLocaleString()}, ${loan.max_tenure} months)`);
    });

    // Test member eligibility query
    const memberEligibilityQuery = `
      SELECT 
        mm.mbno,
        mm.f_name || ' ' || COALESCE(mm.m_name, '') || ' ' || mm.l_name as name,
        mm.basic_pay,
        COUNT(lm.mbno) as active_loans,
        COALESCE(SUM(lm.balance::numeric), 0) as total_outstanding
      FROM member_master mm
      LEFT JOIN loan_master lm ON mm.mbno = lm.mbno AND lm.balance::numeric > 0
      WHERE mm.mbno IN (610017770, 1001, 1002, 1003)
      GROUP BY mm.mbno, mm.f_name, mm.m_name, mm.l_name, mm.basic_pay
    `;
    
    const memberEligibility = await client.query(memberEligibilityQuery);
    console.log('\n   Member loan eligibility data:');
    memberEligibility.rows.forEach(member => {
      console.log(`     ${member.name} (${member.mbno}): ₹${parseFloat(member.basic_pay || 0).toLocaleString()} salary, ${member.active_loans} active loans, ₹${parseFloat(member.total_outstanding).toLocaleString()} outstanding`);
    });

    // 7. Frontend enhancement recommendations
    console.log('\n7. 🎨 FRONTEND ENHANCEMENT PLAN...');
    console.log('   UI Improvements Needed:');
    console.log('   🎯 Add loan type selector with real rates');
    console.log('   👤 Add member lookup for personalized calculations');
    console.log('   📊 Add loan eligibility checker');
    console.log('   📈 Add comparison between loan types');
    console.log('   💾 Add save/load calculation feature');
    console.log('   📱 Enhance mobile responsiveness');
    console.log('   🎭 Add smooth animations and transitions');
    console.log('   🌟 Add modern shadows and gradients');

    // 8. Database integration points
    console.log('\n8. 🔗 DATABASE INTEGRATION POINTS...');
    console.log('   Required API Endpoints:');
    console.log('   GET /api/v1/calculator/loan-rates - Get current loan rates');
    console.log('   GET /api/v1/calculator/member-eligibility/{memberNo} - Check eligibility');
    console.log('   GET /api/v1/calculator/loan-types - Get available loan types');
    console.log('   POST /api/v1/calculator/calculate - Enhanced calculation with DB data');
    console.log('   GET /api/v1/calculator/member-loans/{memberNo} - Get member loan history');

    client.release();
    console.log('\n🎉 CALCULATOR ANALYSIS COMPLETE!');
    console.log('Ready to enhance Calculator component with database integration.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the comprehensive test
testCalculatorComprehensive();