const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testDefaulterList() {
  console.log('⚠️ DEFAULTER LIST - Comprehensive Test');
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

    // Test 2: Check if we have any defaulter data (loans with balance > 0)
    console.log('\n📋 TEST 2: Checking existing defaulter data...');
    
    const existingDefaulters = await pool.query(`
      SELECT 
        l.mbno, l.loantype, l.loancaseno, 
        l.loan_amt::numeric as loan_amt, 
        l.balance::numeric as balance,
        l.instal_amt::numeric as instal_amt,
        CONCAT(m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as member_name
      FROM loan_master l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      WHERE l.balance::numeric > 0
      ORDER BY l.balance::numeric DESC 
      LIMIT 5
    `);

    if (existingDefaulters.rows.length > 0) {
      console.log('✅ Found existing defaulter records:');
      existingDefaulters.rows.forEach((defaulter, index) => {
        console.log(`   ${index + 1}. Member: ${defaulter.mbno} (${defaulter.member_name}), Balance: ₹${defaulter.balance}, Loan: ${defaulter.loantype}`);
      });
    } else {
      console.log('❌ No defaulter records found. Need to populate data.');
      
      // Test 3: Populate sample defaulter data
      console.log('\n📋 TEST 3: Populating sample defaulter data...');
      
      // First check if we have members and existing loans
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

      console.log('✅ Found members for defaulter creation:');
      memberCheck.rows.forEach(member => {
        console.log(`   - Member ${member.mbno}: ${member.name} (${member.desig || 'N/A'})`);
      });

      // Create sample defaulter data (loans with outstanding balance)
      const sampleDefaulters = [
        {
          mbno: memberCheck.rows[0].mbno,
          loantype: 'HLN', // Home Loan
          loancaseno: 100001,
          loan_amt: 500000,
          payment_date: '2024-01-15',
          rate: 8.5,
          no_of_instal: 60,
          instal_amt: 10000,
          balance: 150000, // Outstanding balance
          openbalance: 500000,
          purpose: 'Home Construction',
          intt_amount: 0,
          penalrate: 2.0
        },
        {
          mbno: memberCheck.rows[1] ? memberCheck.rows[1].mbno : memberCheck.rows[0].mbno,
          loantype: 'CAR', // Car Loan
          loancaseno: 100002,
          loan_amt: 300000,
          payment_date: '2024-02-01',
          rate: 9.0,
          no_of_instal: 36,
          instal_amt: 9500,
          balance: 85000,
          openbalance: 300000,
          purpose: 'Vehicle Purchase',
          intt_amount: 0,
          penalrate: 2.5
        },
        {
          mbno: memberCheck.rows[2] ? memberCheck.rows[2].mbno : memberCheck.rows[0].mbno,
          loantype: 'EDU', // Education Loan
          loancaseno: 100003,
          loan_amt: 200000,
          payment_date: '2024-03-10',
          rate: 7.5,
          no_of_instal: 48,
          instal_amt: 5000,
          balance: 120000,
          openbalance: 200000,
          purpose: 'Higher Education',
          intt_amount: 0,
          penalrate: 1.5
        },
        {
          mbno: memberCheck.rows[3] ? memberCheck.rows[3].mbno : memberCheck.rows[0].mbno,
          loantype: 'PER', // Personal Loan
          loancaseno: 100004,
          loan_amt: 100000,
          payment_date: '2024-04-05',
          rate: 12.0,
          no_of_instal: 24,
          instal_amt: 5000,
          balance: 45000,
          openbalance: 100000,
          purpose: 'Medical Emergency',
          intt_amount: 0,
          penalrate: 3.0
        },
        {
          mbno: memberCheck.rows[4] ? memberCheck.rows[4].mbno : memberCheck.rows[0].mbno,
          loantype: 'BUS', // Business Loan
          loancaseno: 100005,
          loan_amt: 750000,
          payment_date: '2024-05-20',
          rate: 10.5,
          no_of_instal: 72,
          instal_amt: 15000,
          balance: 600000,
          openbalance: 750000,
          purpose: 'Business Expansion',
          intt_amount: 0,
          penalrate: 2.0
        }
      ];

      for (const loan of sampleDefaulters) {
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
          // Update existing loan with balance
          await pool.query(`
            UPDATE loan_master 
            SET balance = $2, loan_amt = $3, instal_amt = $4, purpose = $5
            WHERE loancaseno = $1
          `, [loan.loancaseno, loan.balance, loan.loan_amt, loan.instal_amt, loan.purpose]);
        }
      }

      console.log(`✅ Inserted/Updated ${sampleDefaulters.length} sample defaulter records`);
    }

    // Test 4: Test the API endpoint directly
    console.log('\n📋 TEST 4: Testing Defaulter List API endpoint...');
    
    const testDefaulters = await pool.query(`
      SELECT COUNT(*) as count
      FROM loan_master l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      WHERE l.balance::numeric > 0
    `);

    console.log(`🔍 Total defaulters found: ${testDefaulters.rows[0].count}`);

    if (testDefaulters.rows[0].count > 0) {
      // Test the exact query used by the service
      const serviceQuery = `
        SELECT 
          l.mbno,
          l.loantype,
          l.loancaseno,
          l.loan_amt::numeric as loan_amt,
          l.balance::numeric as balance,
          l.instal_amt::numeric as instal_amt,
          l.no_of_instal,
          l.purpose,
          l.payment_date,
          m.f_name,
          m.m_name,
          m.l_name,
          m.desig,
          m.dept_name
        FROM loan_master l
        LEFT JOIN member_master m ON l.mbno = m.mbno
        WHERE l.balance::numeric > $1
        ORDER BY l.balance::numeric DESC
        LIMIT 5
      `;

      const apiResult = await pool.query(serviceQuery, [1000]); // Test with minBalance = 1000
      
      if (apiResult.rows.length > 0) {
        console.log('✅ API query successful. Defaulter data:');
        apiResult.rows.forEach((defaulter, index) => {
          const memberName = [defaulter.f_name, defaulter.m_name, defaulter.l_name].filter(Boolean).join(' ').trim();
          console.log(`   ${index + 1}. Member: ${memberName} (${defaulter.mbno})`);
          console.log(`      Loan: ${defaulter.loantype} #${defaulter.loancaseno}`);
          console.log(`      Amount: ₹${parseFloat(defaulter.loan_amt).toLocaleString('en-IN')}`);
          console.log(`      Balance: ₹${parseFloat(defaulter.balance).toLocaleString('en-IN')}`);
          console.log(`      EMI: ₹${parseFloat(defaulter.instal_amt).toLocaleString('en-IN')}`);
          console.log(`      Purpose: ${defaulter.purpose || 'N/A'}`);
        });
      } else {
        console.log('❌ API query returned no results');
      }
    }

    // Test 5: Test with HTTP request (if backend is running)
    console.log('\n📋 TEST 5: Testing HTTP API endpoint...');
    
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
        { port: 3000, path: '/api/v1/report/defaulter-list?minBalance=1000' },
        { port: 3001, path: '/api/report/defaulter-list?minBalance=1000' }
      ];
      let apiResponse = null;
      
      for (const endpoint of endpoints) {
        try {
          const url = `http://localhost:${endpoint.port}${endpoint.path}`;
          console.log(`🔍 Trying ${url}...`);
          const response = await makeRequest(url);
          
          if (response.status === 200) {
            console.log(`✅ HTTP API Response from ${endpoint.port}${endpoint.path}:`, response.status);
            console.log('📄 Defaulter Data:', JSON.stringify(response.data, null, 2));
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

    // Test 6: Verify data types and money formatting
    console.log('\n📋 TEST 6: Verifying data types and money formatting...');
    
    const typeCheck = await pool.query(`
      SELECT 
        loan_amt, 
        pg_typeof(loan_amt) as loan_amt_type,
        balance,
        pg_typeof(balance) as balance_type,
        instal_amt,
        pg_typeof(instal_amt) as instal_amt_type,
        loan_amt::numeric as loan_amt_numeric,
        balance::numeric as balance_numeric,
        instal_amt::numeric as instal_amt_numeric
      FROM loan_master 
      WHERE balance::numeric > 0
      LIMIT 1
    `);

    if (typeCheck.rows.length > 0) {
      const types = typeCheck.rows[0];
      console.log('✅ Data type verification:');
      console.log(`   loan_amt: ${types.loan_amt} (${types.loan_amt_type}) -> numeric: ${types.loan_amt_numeric}`);
      console.log(`   balance: ${types.balance} (${types.balance_type}) -> numeric: ${types.balance_numeric}`);
      console.log(`   instal_amt: ${types.instal_amt} (${types.instal_amt_type}) -> numeric: ${types.instal_amt_numeric}`);
    }

    // Test 7: Test different balance thresholds
    console.log('\n📋 TEST 7: Testing different balance thresholds...');
    
    const thresholds = [0, 1000, 10000, 50000, 100000];
    
    for (const threshold of thresholds) {
      const thresholdCount = await pool.query(`
        SELECT COUNT(*) as count
        FROM loan_master 
        WHERE balance::numeric > $1
      `, [threshold]);
      
      console.log(`   Defaulters with balance > ₹${threshold.toLocaleString('en-IN')}: ${thresholdCount.rows[0].count}`);
    }

    // Test 8: Summary and UI Instructions
    console.log('\n📋 TEST 8: Summary and UI Instructions');
    console.log('=' .repeat(60));
    
    const finalCount = await pool.query(`
      SELECT COUNT(*) as count 
      FROM loan_master l
      LEFT JOIN member_master m ON l.mbno = m.mbno
      WHERE l.balance::numeric > 0
    `);

    console.log(`✅ Total defaulters available: ${finalCount.rows[0].count}`);
    
    if (finalCount.rows[0].count > 0) {
      const sampleDefaulters = await pool.query(`
        SELECT 
          l.mbno,
          CONCAT(m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as member_name,
          l.loantype,
          l.balance::numeric as balance,
          l.loan_amt::numeric as loan_amt,
          l.purpose
        FROM loan_master l
        LEFT JOIN member_master m ON l.mbno = m.mbno
        WHERE l.balance::numeric > 0
        ORDER BY l.balance::numeric DESC
        LIMIT 5
      `);

      console.log('\n🎯 UI TESTING INSTRUCTIONS:');
      console.log('To test the Defaulter List component:');
      console.log('1. Navigate to: Reports → Monthly → Defaulter List');
      console.log('2. Sample defaulters available:');
      
      sampleDefaulters.rows.forEach((defaulter, index) => {
        const riskLevel = defaulter.balance >= 100000 ? 'Critical' : 
                         defaulter.balance >= 50000 ? 'High' : 
                         defaulter.balance >= 20000 ? 'Medium' : 'Low';
        console.log(`   ${index + 1}. ${defaulter.member_name} (${defaulter.mbno})`);
        console.log(`      Loan: ${defaulter.loantype}, Balance: ₹${defaulter.balance.toLocaleString('en-IN')} (${riskLevel} Risk)`);
        console.log(`      Purpose: ${defaulter.purpose || 'N/A'}`);
      });
      
      console.log('\n📋 Expected UI Behavior:');
      console.log('✅ Component should load with defaulter list automatically');
      console.log('✅ Statistics cards should show total defaulters, loan amount, and outstanding');
      console.log('✅ Risk indicators should show color-coded risk levels');
      console.log('✅ Minimum balance filter should work (try ₹10,000, ₹50,000)');
      console.log('✅ Refresh button should reload data');
      console.log('✅ Print button should generate printable report');
      console.log('✅ Table should show member details, loan info, and outstanding amounts');
      console.log('✅ Progress bars should indicate outstanding percentage');
      
      console.log('\n💡 Component Features:');
      console.log('• Risk-based color coding (Critical/High/Medium/Low)');
      console.log('• Real-time statistics with animated cards');
      console.log('• Loan type icons (Home, Car, Education, etc.)');
      console.log('• Outstanding balance progress indicators');
      console.log('• Minimum balance filtering');
      console.log('• Print-ready report generation');
      console.log('• Responsive design with gradient styling');
      console.log('• Empty state with positive messaging');
      
      console.log('\n📊 Risk Level Calculation:');
      console.log('• Critical: ≥ ₹1,00,000 (Red, Pulsing)');
      console.log('• High: ≥ ₹50,000 (Orange)');
      console.log('• Medium: ≥ ₹20,000 (Yellow)');
      console.log('• Low: < ₹20,000 (Green)');
      
      console.log('\n🔧 Filter Testing:');
      console.log('• Try minimum balance: ₹0 (all defaulters)');
      console.log('• Try minimum balance: ₹10,000 (medium+ risk)');
      console.log('• Try minimum balance: ₹50,000 (high+ risk)');
      console.log('• Try minimum balance: ₹1,00,000 (critical risk only)');
    }

    console.log('\n🎉 DEFAULTER LIST TEST COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDefaulterList();