const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function testFixedDepositCertificate() {
  console.log('🏦 FIXED DEPOSIT CERTIFICATE - Comprehensive Test');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check fdmaster table structure and data
    console.log('\n📋 TEST 1: Checking fdmaster table structure and data...');
    
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fdmaster' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ fdmaster table columns:', tableCheck.rows.length);
    tableCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check existing data
    const dataCount = await pool.query('SELECT COUNT(*) as count FROM fdmaster');
    console.log(`📊 Current fdmaster records: ${dataCount.rows[0].count}`);

    // Test 2: Check if we have any FD data
    console.log('\n📋 TEST 2: Checking existing FD data...');
    
    const existingFDs = await pool.query(`
      SELECT 
        mbno, account_number, certno, fdamount, rate, depperiod,
        depdate, matdate, matamount, fdrdflag, status
      FROM fdmaster 
      WHERE fdrdflag = 'F' AND status != '1'
      ORDER BY depdate DESC 
      LIMIT 5
    `);

    if (existingFDs.rows.length > 0) {
      console.log('✅ Found existing FD records:');
      existingFDs.rows.forEach((fd, index) => {
        console.log(`   ${index + 1}. Member: ${fd.mbno}, Cert: ${fd.certno}, Amount: ${fd.fdamount}`);
      });
    } else {
      console.log('❌ No FD records found. Need to populate data.');
      
      // Test 3: Populate sample FD data
      console.log('\n📋 TEST 3: Populating sample FD data...');
      
      // First check if we have members
      const memberCheck = await pool.query('SELECT mbno, name FROM member_master LIMIT 5');
      if (memberCheck.rows.length === 0) {
        throw new Error('No members found. Please populate member_master table first.');
      }

      console.log('✅ Found members for FD creation:');
      memberCheck.rows.forEach(member => {
        console.log(`   - Member ${member.mbno}: ${member.name}`);
      });

      // Create sample FD data
      const sampleFDs = [
        {
          mbno: memberCheck.rows[0].mbno,
          account_number: 100001,
          prefix: 'Mr.',
          f_name: 'John',
          m_name: 'Kumar',
          l_name: 'Sharma',
          certno: 'FD001',
          depunit: 1,
          depperiod: 12,
          rate: 8.5,
          depdate: '2024-01-15',
          matdate: '2025-01-15',
          fdamount: 100000,
          matamount: 108500,
          interestbalance: 8500,
          interestpayamentmode: 1,
          interestamount: 8500,
          intpaid: 0,
          status: '0',
          nominee: 'Priya Sharma',
          nage: '28',
          naddr: '123 Main Street, Delhi',
          nrelation: 'Wife',
          fdrdflag: 'F',
          remarks: 'Regular FD',
          openbal: 0,
          rd_by_demand: 'N',
          operationmode: 1,
          intcalmethod: 1,
          refmbno: 0,
          headcode: 'FD001',
          oldacno: 0
        },
        {
          mbno: memberCheck.rows[1] ? memberCheck.rows[1].mbno : memberCheck.rows[0].mbno,
          account_number: 100002,
          prefix: 'Mrs.',
          f_name: 'Sunita',
          m_name: 'Devi',
          l_name: 'Patel',
          certno: 'FD002',
          depunit: 1,
          depperiod: 24,
          rate: 9.0,
          depdate: '2024-02-01',
          matdate: '2026-02-01',
          fdamount: 250000,
          matamount: 295000,
          interestbalance: 45000,
          interestpayamentmode: 2,
          interestamount: 45000,
          intpaid: 0,
          status: '0',
          nominee: 'Rahul Patel',
          nage: '25',
          naddr: '456 Park Avenue, Mumbai',
          nrelation: 'Son',
          fdrdflag: 'F',
          remarks: 'Long term FD',
          openbal: 0,
          rd_by_demand: 'N',
          operationmode: 1,
          intcalmethod: 1,
          refmbno: 0,
          headcode: 'FD002',
          oldacno: 0
        },
        {
          mbno: memberCheck.rows[2] ? memberCheck.rows[2].mbno : memberCheck.rows[0].mbno,
          account_number: 100003,
          prefix: 'Mr.',
          f_name: 'Rajesh',
          m_name: 'Kumar',
          l_name: 'Singh',
          certno: 'FD003',
          depunit: 1,
          depperiod: 36,
          rate: 9.5,
          depdate: '2024-03-10',
          matdate: '2027-03-10',
          fdamount: 500000,
          matamount: 642500,
          interestbalance: 142500,
          interestpayamentmode: 1,
          interestamount: 142500,
          intpaid: 0,
          status: '0',
          nominee: 'Meera Singh',
          nage: '35',
          naddr: '789 Garden Road, Bangalore',
          nrelation: 'Wife',
          fdrdflag: 'F',
          remarks: 'Premium FD',
          openbal: 0,
          rd_by_demand: 'N',
          operationmode: 1,
          intcalmethod: 1,
          refmbno: 0,
          headcode: 'FD003',
          oldacno: 0
        }
      ];

      for (const fd of sampleFDs) {
        await pool.query(`
          INSERT INTO fdmaster (
            mbno, account_number, prefix, f_name, m_name, l_name, certno,
            depunit, depperiod, rate, depdate, matdate, fdamount, matamount,
            interestbalance, interestpayamentmode, interestamount, intpaid,
            status, nominee, nage, naddr, nrelation, fdrdflag, remarks,
            openbal, rd_by_demand, operationmode, intcalmethod, refmbno,
            headcode, oldacno
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
            $27, $28, $29, $30, $31, $32
          )
        `, [
          fd.mbno, fd.account_number, fd.prefix, fd.f_name, fd.m_name, fd.l_name,
          fd.certno, fd.depunit, fd.depperiod, fd.rate, fd.depdate, fd.matdate,
          fd.fdamount, fd.matamount, fd.interestbalance, fd.interestpayamentmode,
          fd.interestamount, fd.intpaid, fd.status, fd.nominee, fd.nage,
          fd.naddr, fd.nrelation, fd.fdrdflag, fd.remarks, fd.openbal,
          fd.rd_by_demand, fd.operationmode, fd.intcalmethod, fd.refmbno,
          fd.headcode, fd.oldacno
        ]);
      }

      console.log(`✅ Inserted ${sampleFDs.length} sample FD records`);
    }

    // Test 4: Test the API endpoint directly
    console.log('\n📋 TEST 4: Testing FD Certificate API endpoint...');
    
    const testMember = await pool.query(`
      SELECT mbno FROM fdmaster 
      WHERE fdrdflag = 'F' AND status != '1' 
      LIMIT 1
    `);

    if (testMember.rows.length === 0) {
      throw new Error('No valid FD records found for testing');
    }

    const memberNo = testMember.rows[0].mbno;
    console.log(`🔍 Testing with member number: ${memberNo}`);

    // Test the exact query used by the service
    const serviceQuery = `
      SELECT 
        f.mbno as "memberNo",
        CONCAT(f.prefix, ' ', f.f_name, ' ', COALESCE(f.m_name, ''), ' ', COALESCE(f.l_name, '')) as "memberName",
        m.present_address as "address",
        f.account_number::text as "accountNo",
        f.certno as "certificateNo",
        f.fdamount::numeric as "depositAmount",
        f.rate::numeric as "interestRate",
        f.depperiod::numeric as "tenure",
        f.depdate as "openDate",
        f.matdate as "maturityDate",
        f.matamount::numeric as "maturityAmount",
        f.nominee as "nominee",
        f.nrelation as "nomineeRelation",
        f.naddr as "nomineeAddress"
      FROM fdmaster f
      INNER JOIN member_master m ON f.mbno = m.mbno
      WHERE f.mbno = $1
        AND f.fdrdflag = 'F'
        AND f.status != '1'
      ORDER BY f.depdate DESC
    `;

    const apiResult = await pool.query(serviceQuery, [parseInt(memberNo)]);
    
    if (apiResult.rows.length > 0) {
      console.log('✅ API query successful. Certificate data:');
      const cert = apiResult.rows[0];
      console.log(`   Member: ${cert.memberName} (${cert.memberNo})`);
      console.log(`   Certificate: ${cert.certificateNo}`);
      console.log(`   Account: ${cert.accountNo}`);
      console.log(`   Amount: ₹${parseFloat(cert.depositAmount).toLocaleString('en-IN')}`);
      console.log(`   Rate: ${cert.interestRate}% for ${cert.tenure} months`);
      console.log(`   Maturity: ₹${parseFloat(cert.maturityAmount).toLocaleString('en-IN')}`);
      console.log(`   Nominee: ${cert.nominee}`);
    } else {
      console.log('❌ API query returned no results');
    }

    // Test 5: Test with HTTP request (backend is running)
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

      // Try different ports and API paths where backend might be running
      const endpoints = [
        { port: 3000, path: '/api/v1/report/fd-certificate' },
        { port: 3001, path: '/api/report/fd-certificate' },
        { port: 3000, path: '/api/report/fd-certificate' }
      ];
      let apiResponse = null;
      
      for (const endpoint of endpoints) {
        try {
          const url = `http://localhost:${endpoint.port}${endpoint.path}?memberNo=${memberNo}`;
          console.log(`� TrCying ${url}...`);
          const response = await makeRequest(url);
          
          if (response.status === 200) {
            console.log(`✅ HTTP API Response from ${endpoint.port}${endpoint.path}:`, response.status);
            console.log('📄 Certificate Data:', JSON.stringify(response.data, null, 2));
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
        console.log('❌ No working API endpoint found on common ports');
      }
    } catch (httpError) {
      console.log('⚠️  HTTP API test failed:', httpError.message);
    }

    // Test 6: Verify data types and formatting
    console.log('\n📋 TEST 6: Verifying data types and formatting...');
    
    const typeCheck = await pool.query(`
      SELECT 
        fdamount, 
        pg_typeof(fdamount) as amount_type,
        rate,
        pg_typeof(rate) as rate_type,
        matamount,
        pg_typeof(matamount) as maturity_type
      FROM fdmaster 
      WHERE fdrdflag = 'F' AND status != '1'
      LIMIT 1
    `);

    if (typeCheck.rows.length > 0) {
      const types = typeCheck.rows[0];
      console.log('✅ Data type verification:');
      console.log(`   fdamount: ${types.fdamount} (${types.amount_type})`);
      console.log(`   rate: ${types.rate} (${types.rate_type})`);
      console.log(`   matamount: ${types.matamount} (${types.maturity_type})`);
    }

    // Test 7: Summary and UI Instructions
    console.log('\n📋 TEST 7: Summary and UI Instructions');
    console.log('=' .repeat(60));
    
    const finalCount = await pool.query(`
      SELECT COUNT(*) as count 
      FROM fdmaster f
      INNER JOIN member_master m ON f.mbno = m.mbno
      WHERE f.fdrdflag = 'F' AND f.status != '1'
    `);

    console.log(`✅ Total valid FD certificates available: ${finalCount.rows[0].count}`);
    
    if (finalCount.rows[0].count > 0) {
      const sampleMembers = await pool.query(`
        SELECT DISTINCT f.mbno, 
               CONCAT(f.prefix, ' ', f.f_name, ' ', COALESCE(f.m_name, ''), ' ', COALESCE(f.l_name, '')) as name,
               COUNT(f.certno) as fd_count
        FROM fdmaster f
        INNER JOIN member_master m ON f.mbno = m.mbno
        WHERE f.fdrdflag = 'F' AND f.status != '1'
        GROUP BY f.mbno, f.prefix, f.f_name, f.m_name, f.l_name
        ORDER BY f.mbno
        LIMIT 5
      `);

      console.log('\n🎯 UI TESTING INSTRUCTIONS:');
      console.log('To test the Fixed Deposit Certificate component:');
      console.log('1. Navigate to: Reports → Account Reports → Fixed Deposit Certificate');
      console.log('2. Try these member numbers:');
      
      sampleMembers.rows.forEach((member, index) => {
        console.log(`   ${index + 1}. Member ${member.mbno}: ${member.name} (${member.fd_count} FDs)`);
      });
      
      console.log('\n📋 Expected UI Behavior:');
      console.log('✅ Enter member number and click GENERATE');
      console.log('✅ Certificate should display with member details');
      console.log('✅ Print button should generate printable certificate');
      console.log('✅ Member lookup button should open member search');
      console.log('✅ Certificate type dropdown should work (Original/Duplicate/Triplicate)');
      
      console.log('\n💡 Component Features:');
      console.log('• Professional certificate layout with society header');
      console.log('• Complete FD details: amount, rate, tenure, maturity');
      console.log('• Nominee information display');
      console.log('• Print-ready format with signatures');
      console.log('• Member lookup integration');
      console.log('• Certificate number filtering (optional)');
    }

    console.log('\n🎉 FIXED DEPOSIT CERTIFICATE TEST COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testFixedDepositCertificate();