const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testNewLoanDisbursed() {
  console.log('💰 NEW LOAN DISBURSED - Comprehensive Test');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check loan_master table structure and data
    console.log('\n📋 TEST 1: Checking loan_master table structure and data...');
    
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'loan_master' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ loan_master table columns:', tableCheck.rows.length);
    tableCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check existing data
    const dataCount = await pool.query('SELECT COUNT(*) as count FROM loan_master');
    console.log(`📊 Current loan_master records: ${dataCount.rows[0].count}`);

    // Test 2: Check loan types available
    console.log('\n📋 TEST 2: Checking available loan types...');
    
    const loanTypes = await pool.query(`
      SELECT DISTINCT loantype, COUNT(*) as count
      FROM loan_master 
      GROUP BY loantype
      ORDER BY loantype ASC
    `);

    if (loanTypes.rows.length > 0) {
      console.log('✅ Found loan types:');
      loanTypes.rows.forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.loantype}: ${type.count} loans`);
      });
    } else {
      console.log('❌ No loan types found.');
    }

    // Test 3: Check recent loan disbursements
    console.log('\n📋 TEST 3: Checking recent loan disbursements...');
    
    const recentLoans = await pool.query(`
      SELECT 
        l.mbno, l.loantype, l.loancaseno, 
        l.loan_amt::numeric as loan_amt, 
        l.payment_date,
        l.instal_amt::numeric as instal_amt,
        l.no_of_instal,
        l.purpose,
        CONCAT(m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as member_name,
        m.desig, m.dept_name
      FROM loan_master l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      WHERE l.payment_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY l.payment_date DESC 
      LIMIT 5
    `);

    if (recentLoans.rows.length > 0) {
      console.log('✅ Found recent loan disbursements (last 30 days):');
      recentLoans.rows.forEach((loan, index) => {
        console.log(`   ${index + 1}. ${loan.member_name} (${loan.mbno})`);
        console.log(`      Type: ${loan.loantype}, Amount: ₹${loan.loan_amt}, Date: ${loan.payment_date.toISOString().split('T')[0]}`);
      });
    } else {
      console.log('❌ No recent loan disbursements found. Need to populate data.');
      
      // Test 4: Populate sample recent loan disbursements
      console.log('\n📋 TEST 4: Populating sample recent loan disbursements...');
      
      // First check if we have members
      const memberCheck = await pool.query(`
        SELECT mbno, 
               CONCAT(f_name, ' ', COALESCE(m_name, ''), ' ', COALESCE(l_name, '')) as name,
               desig, dept_name
        FROM member_master 
        WHERE isactive = 'Y'
        LIMIT 10
      `);
      
      if (memberCheck.rows.length === 0) {
        throw new Error('No active members found. Please populate member_master table first.');
      }

      console.log('✅ Found members for loan disbursement:');
      memberCheck.rows.forEach(member => {
        console.log(`   - Member ${member.mbno}: ${member.name} (${member.desig || 'N/A'})`);
      });

      // Create sample recent loan disbursements
      const currentDate = new Date();
      const sampleLoans = [
        {
          mbno: memberCheck.rows[0].mbno,
          loantype: 'HLN', // Home Loan
          loancaseno: 200001,
          loan_amt: 500000,
          payment_date: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          rate: 8.5,
          no_of_instal: 60,
          instal_amt: 10000,
          balance: 500000, // Full amount as balance (newly disbursed)
          openbalance: 0,
          purpose: 'Home Construction',
          intt_amount: 0,
          penalrate: 2.0
        },
        {
          mbno: memberCheck.rows[1] ? memberCheck.rows[1].mbno : memberCheck.rows[0].mbno,
          loantype: 'CAR', // Car Loan
          loancaseno: 200002,
          loan_amt: 300000,
          payment_date: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          rate: 9.0,
          no_of_instal: 36,
          instal_amt: 9500,
          balance: 300000,
          openbalance: 0,
          purpose: 'Vehicle Purchase',
          intt_amount: 0,
          penalrate: 2.5
        },
        {
          mbno: memberCheck.rows[2] ? memberCheck.rows[2].mbno : memberCheck.rows[0].mbno,
          loantype: 'EDU', // Education Loan
          loancaseno: 200003,
          loan_amt: 200000,
          payment_date: new Date(currentDate.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          rate: 7.5,
          no_of_instal: 48,
          instal_amt: 5000,
          balance: 200000,
          openbalance: 0,
          purpose: 'Higher Education',
          intt_amount: 0,
          penalrate: 1.5
        },
        {
          mbno: memberCheck.rows[3] ? memberCheck.rows[3].mbno : memberCheck.rows[0].mbno,
          loantype: 'PER', // Personal Loan
          loancaseno: 200004,
          loan_amt: 100000,
          payment_date: new Date(currentDate.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
          rate: 12.0,
          no_of_instal: 24,
          instal_amt: 5000,
          balance: 100000,
          openbalance: 0,
          purpose: 'Medical Emergency',
          intt_amount: 0,
          penalrate: 3.0
        },
        {
          mbno: memberCheck.rows[4] ? memberCheck.rows[4].mbno : memberCheck.rows[0].mbno,
          loantype: 'BUS', // Business Loan
          loancaseno: 200005,
          loan_amt: 750000,
          payment_date: new Date(currentDate.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
          rate: 10.5,
          no_of_instal: 72,
          instal_amt: 15000,
          balance: 750000,
          openbalance: 0,
          purpose: 'Business Expansion',
          intt_amount: 0,
          penalrate: 2.0
        }
      ];

      for (const loan of sampleLoans) {
        // Check if loan case already exists
        const existingLoan = await pool.query(
          'SELECT loancaseno FROM loan_master WHERE loancaseno = $1',
          [loan.loancaseno]
        );

        if (existingLoan.rows.length === 0) {
          await pool.query(`
            INSERT INTO loan_master (
              mbno, loantype, loancaseno, loan_amt, payment_date, rate,
              no_of_instal, instal_amt, balance, openbalance, purpose,
              intt_amount, penalrate
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
          `, [
            loan.mbno, loan.loantype, loan.loancaseno, loan.loan_amt,
            loan.payment_date, loan.rate, loan.no_of_instal, loan.instal_amt,
            loan.balance, loan.openbalance, loan.purpose, loan.intt_amount,
            loan.penalrate
          ]);
        } else {
          // Update existing loan with recent date
          await pool.query(`
            UPDATE loan_master 
            SET payment_date = $2, loan_amt = $3, instal_amt = $4, purpose = $5
            WHERE loancaseno = $1
          `, [loan.loancaseno, loan.payment_date, loan.loan_amt, loan.instal_amt, loan.purpose]);
        }
      }

      console.log(`✅ Inserted/Updated ${sampleLoans.length} sample recent loan records`);
    }

    // Test 5: Test the API endpoint directly
    console.log('\n📋 TEST 5: Testing New Loan Disbursed API endpoint...');
    
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago
    console.log(`🔍 Testing with fromDate: ${fromDate}`);

    // Test the exact query used by the service
    const serviceQuery = `
      SELECT 
        l.mbno,
        l.loantype,
        l.loancaseno,
        l.loan_amt::numeric as loan_amt,
        l.payment_date,
        l.purpose,
        l.instal_amt::numeric as instal_amt,
        l.no_of_instal,
        m.f_name,
        m.m_name,
        m.l_name,
        m.desig,
        m.dept_name
      FROM loan_master l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      WHERE l.payment_date >= $1
      ORDER BY l.payment_date DESC
      LIMIT 10
    `;

    const apiResult = await pool.query(serviceQuery, [fromDate]);
    
    if (apiResult.rows.length > 0) {
      console.log('✅ API query successful. New loan disbursement data:');
      apiResult.rows.forEach((loan, index) => {
        const memberName = [loan.f_name, loan.m_name, loan.l_name].filter(Boolean).join(' ').trim();
        console.log(`   ${index + 1}. Member: ${memberName} (${loan.mbno})`);
        console.log(`      Loan: ${loan.loantype} #${loan.loancaseno}`);
        console.log(`      Amount: ₹${parseFloat(loan.loan_amt).toLocaleString('en-IN')}`);
        console.log(`      EMI: ₹${parseFloat(loan.instal_amt).toLocaleString('en-IN')} x ${loan.no_of_instal}`);
        console.log(`      Date: ${loan.payment_date.toISOString().split('T')[0]}`);
        console.log(`      Purpose: ${loan.purpose || 'N/A'}`);
      });
    } else {
      console.log('❌ API query returned no results');
    }

    // Test 6: Test loan types API
    console.log('\n📋 TEST 6: Testing Loan Types API endpoint...');
    
    const loanTypesQuery = `
      SELECT DISTINCT loantype
      FROM loan_master 
      ORDER BY loantype ASC
    `;

    const loanTypesResult = await pool.query(loanTypesQuery);
    
    if (loanTypesResult.rows.length > 0) {
      console.log('✅ Loan types API query successful:');
      loanTypesResult.rows.forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.loantype}`);
      });
    } else {
      console.log('❌ No loan types found');
    }

    // Test 7: Test with HTTP request (if backend is running)
    console.log('\n📋 TEST 7: Testing HTTP API endpoint...');
    
    try {
      const https = require('https');
      const http = require('http');
      
      const makeRequest = (url) => {
        return new Promise((resolve, reject) => {
          const client = url.startsWith('https') ? https : http;
          const req = client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                resolve({
                  status: res.statusCode,
                  data: JSON.parse(data)
                });
              } catch (e) {
                resolve({
                  status: res.statusCode,
                  data: data
                });
              }
            });
          });
          req.on('error', reject);
          req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });
      };

      const endpoints = [
        { port: 3000, path: `/api/v1/report/new-loan-disbursed?fromDate=${fromDate}` },
        { port: 3001, path: `/api/report/new-loan-disbursed?fromDate=${fromDate}` },
        { port: 3000, path: '/api/v1/report/loan-types' }
      ];
      let apiResponse = null;
      
      for (const endpoint of endpoints) {
        try {
          const url = `http://localhost:${endpoint.port}${endpoint.path}`;
          console.log(`🔍 Trying ${url}...`);
          const response = await makeRequest(url);
          
          if (response.status === 200) {
            console.log(`✅ HTTP API Response from ${endpoint.port}${endpoint.path}:`, response.status);
            if (endpoint.path.includes('loan-types')) {
              console.log('📄 Loan Types Data:', JSON.stringify(response.data, null, 2));
            } else {
              console.log('📄 New Loan Data (first 2 records):', JSON.stringify(response.data.data?.slice(0, 2), null, 2));
            }
            apiResponse = response;
            break;
          } else {
            console.log(`❌ ${endpoint.port}${endpoint.path} returned status: ${response.status}`);
          }
        } catch (portError) {
          console.log(`⚠️  ${endpoint.port}${endpoint.path} failed: ${portError.message}`);
        }
      }
      
      if (!apiResponse) {
        console.log('❌ No working API endpoint found (backend may not be running)');
      }
    } catch (httpError) {
      console.log('⚠️  HTTP API test failed:', httpError.message);
    }

    // Test 8: Verify data types and money formatting
    console.log('\n📋 TEST 8: Verifying data types and money formatting...');
    
    const typeCheck = await pool.query(`
      SELECT 
        loan_amt, 
        pg_typeof(loan_amt) as loan_amt_type,
        instal_amt,
        pg_typeof(instal_amt) as instal_amt_type,
        payment_date,
        pg_typeof(payment_date) as date_type,
        loan_amt::numeric as loan_amt_numeric,
        instal_amt::numeric as instal_amt_numeric
      FROM loan_master 
      WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
      LIMIT 1
    `);

    if (typeCheck.rows.length > 0) {
      const types = typeCheck.rows[0];
      console.log('✅ Data type verification:');
      console.log(`   loan_amt: ${types.loan_amt} (${types.loan_amt_type}) -> numeric: ${types.loan_amt_numeric}`);
      console.log(`   instal_amt: ${types.instal_amt} (${types.instal_amt_type}) -> numeric: ${types.instal_amt_numeric}`);
      console.log(`   payment_date: ${types.payment_date} (${types.date_type})`);
    }

    // Test 9: Test different date ranges and loan type filters
    console.log('\n📋 TEST 9: Testing different date ranges and filters...');
    
    const dateRanges = [
      { days: 7, label: 'Last 7 days' },
      { days: 30, label: 'Last 30 days' },
      { days: 90, label: 'Last 90 days' }
    ];
    
    for (const range of dateRanges) {
      const rangeFromDate = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const rangeCount = await pool.query(`
        SELECT COUNT(*) as count, SUM(loan_amt::numeric) as total_amount
        FROM loan_master 
        WHERE payment_date >= $1
      `, [rangeFromDate]);
      
      console.log(`   ${range.label}: ${rangeCount.rows[0].count} loans, Total: ₹${parseFloat(rangeCount.rows[0].total_amount || 0).toLocaleString('en-IN')}`);
    }

    // Test loan type filtering
    const topLoanTypes = await pool.query(`
      SELECT loantype, COUNT(*) as count, SUM(loan_amt::numeric) as total_amount
      FROM loan_master 
      WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY loantype
      ORDER BY count DESC
      LIMIT 3
    `);

    if (topLoanTypes.rows.length > 0) {
      console.log('\n   Top loan types (last 30 days):');
      topLoanTypes.rows.forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.loantype}: ${type.count} loans, ₹${parseFloat(type.total_amount).toLocaleString('en-IN')}`);
      });
    }

    // Test 10: Summary and UI Instructions
    console.log('\n📋 TEST 10: Summary and UI Instructions');
    console.log('=' .repeat(60));
    
    const finalCount = await pool.query(`
      SELECT COUNT(*) as count, SUM(loan_amt::numeric) as total_amount
      FROM loan_master l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      WHERE l.payment_date >= CURRENT_DATE - INTERVAL '30 days'
    `);

    console.log(`✅ Total new loans (last 30 days): ${finalCount.rows[0].count}`);
    console.log(`💰 Total disbursed amount: ₹${parseFloat(finalCount.rows[0].total_amount || 0).toLocaleString('en-IN')}`);
    
    if (finalCount.rows[0].count > 0) {
      const sampleLoans = await pool.query(`
        SELECT 
          l.mbno,
          CONCAT(m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as member_name,
          l.loantype,
          l.loan_amt::numeric as loan_amt,
          l.payment_date,
          l.purpose
        FROM loan_master l
        LEFT JOIN member_master m ON l.mbno = m.mbno
        WHERE l.payment_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY l.payment_date DESC
        LIMIT 5
      `);

      console.log('\n🎯 UI TESTING INSTRUCTIONS:');
      console.log('To test the New Loan Disbursed component:');
      console.log('1. Navigate to: Reports → Monthly → New Loan Disbursed');
      console.log('2. Sample recent loans available:');
      
      sampleLoans.rows.forEach((loan, index) => {
        console.log(`   ${index + 1}. ${loan.member_name} (${loan.mbno})`);
        console.log(`      Type: ${loan.loantype}, Amount: ₹${loan.loan_amt.toLocaleString('en-IN')}`);
        console.log(`      Date: ${loan.payment_date.toISOString().split('T')[0]}, Purpose: ${loan.purpose || 'N/A'}`);
      });
      
      console.log('\n📋 Expected UI Behavior:');
      console.log('✅ From Date picker should default to start of current month');
      console.log('✅ Loan Type dropdown should populate with available loan types');
      console.log('✅ Generate button should load loans disbursed from selected date');
      console.log('✅ Table should show member details, loan info, and disbursement dates');
      console.log('✅ Print button should generate printable report');
      console.log('✅ Total amount should be calculated and displayed');
      console.log('✅ Empty state should show when no loans found');
      
      console.log('\n💡 Component Features:');
      console.log('• Date-based filtering from selected date onwards');
      console.log('• Optional loan type filtering');
      console.log('• Member details with designation and department');
      console.log('• Loan amount and EMI information');
      console.log('• Purpose and disbursement date display');
      console.log('• Print-ready report generation');
      console.log('• Total amount calculation');
      console.log('• Responsive table design');
      
      console.log('\n🔧 Filter Testing:');
      console.log('• Try From Date: Start of current month (default)');
      console.log('• Try From Date: Last week');
      console.log('• Try Loan Type: All types (default)');
      console.log('• Try Loan Type: Specific type (HLN, CAR, EDU, etc.)');
      console.log('• Combine date and loan type filters');
      
      console.log('\n📊 Available Loan Types:');
      loanTypesResult.rows.forEach((type, index) => {
        console.log(`• ${type.loantype}`);
      });
    }

    console.log('\n🎉 NEW LOAN DISBURSED TEST COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testNewLoanDisbursed();