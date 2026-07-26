const axios = require('axios');
const { Pool } = require('pg');

const BASE_URL = 'http://localhost:3001/api/v1';

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'EMP_Espat_Society',
  password: 'Test@1212',
  port: 5432,
});

async function debugRDStatementUIIssue() {
  console.log('🔍 DEBUGGING RD STATEMENT UI ISSUE');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check if backend is running
    console.log('1. 🚀 Testing backend connection...');
    try {
      const healthCheck = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      console.log('   ✅ Backend is running:', healthCheck.status);
    } catch (error) {
      console.log('   ❌ Backend connection failed:', error.message);
      console.log('   🔧 Please ensure backend is running on port 3001');
      return;
    }
    
    // 2. Check database data
    console.log('\n2. 📊 Checking database data...');
    const client = await pool.connect();
    
    const rdData = await client.query(`
      SELECT 
        m.mbno,
        CONCAT(COALESCE(m.prefix, ''), ' ', m.f_name, ' ', COALESCE(m.m_name, ''), ' ', COALESCE(m.l_name, '')) as full_name,
        COUNT(l.trans_no) as transaction_count,
        MIN(l.trans_date) as first_transaction,
        MAX(l.trans_date) as last_transaction,
        SUM(CASE WHEN l.trans_type = 'CR' THEN l.trans_amt::numeric ELSE -(l.trans_amt::numeric) END) as current_balance
      FROM member_master m 
      INNER JOIN ledger l ON m.mbno = l.mbno
      WHERE l.code = 'A1003'
      GROUP BY m.mbno, m.prefix, m.f_name, m.m_name, m.l_name
      ORDER BY transaction_count DESC
    `);
    
    console.log(`   📋 Found ${rdData.rows.length} members with RD data:`);
    rdData.rows.forEach((member, index) => {
      console.log(`      ${index + 1}. Member ${member.mbno}: ${member.full_name.trim()}`);
      console.log(`         Transactions: ${member.transaction_count}, Balance: ₹${parseFloat(member.current_balance).toLocaleString('en-IN')}`);
      console.log(`         Period: ${member.first_transaction?.toISOString().split('T')[0]} to ${member.last_transaction?.toISOString().split('T')[0]}`);
    });
    
    client.release();
    
    if (rdData.rows.length === 0) {
      console.log('   ❌ No RD data found in database');
      console.log('   🔧 Run: node create-simple-rd-data.js');
      return;
    }
    
    // 3. Test API with exact UI parameters
    console.log('\n3. 🧪 Testing API with UI parameters...');
    const testMember = rdData.rows[0];
    
    // Test with the exact parameters from UI
    const uiParams = {
      memberNo: '1001',
      fromDate: '2015-04-01T00:00:00.000Z', // From UI date picker
      toDate: '2025-12-29T23:59:59.999Z',   // To UI date picker
      headCode: 'A1003'
    };
    
    console.log('   📋 Testing with UI parameters:');
    console.log(`      Member No: ${uiParams.memberNo}`);
    console.log(`      From Date: ${uiParams.fromDate}`);
    console.log(`      To Date: ${uiParams.toDate}`);
    console.log(`      Head Code: ${uiParams.headCode}`);
    
    try {
      const apiResponse = await axios.get(`${BASE_URL}/report/rd-statement`, {
        params: uiParams,
        timeout: 10000
      });
      
      console.log('   ✅ API Response Status:', apiResponse.status);
      console.log('   📊 Response Structure:');
      console.log('      Success:', apiResponse.data.success);
      console.log('      Data exists:', !!apiResponse.data.data);
      
      if (apiResponse.data.data) {
        console.log('      Member No:', apiResponse.data.data.memberNo);
        console.log('      Member Name:', apiResponse.data.data.memberName);
        console.log('      Opening Balance:', apiResponse.data.data.openingBalance);
        console.log('      Closing Balance:', apiResponse.data.data.closingBalance);
        console.log('      Transaction Count:', apiResponse.data.data.transactions?.length || 0);
        
        if (apiResponse.data.data.transactions && apiResponse.data.data.transactions.length > 0) {
          console.log('   📋 First 3 transactions:');
          apiResponse.data.data.transactions.slice(0, 3).forEach((trans, index) => {
            console.log(`      ${index + 1}. ${trans.date?.split('T')[0]} - ${trans.particulars} - ₹${trans.deposit || trans.withdrawal || 0}`);
          });
        } else {
          console.log('   ⚠️ No transactions in API response');
        }
      } else {
        console.log('   ❌ No data in API response');
      }
      
    } catch (apiError) {
      console.log('   ❌ API Error:', apiError.response?.status, apiError.response?.data || apiError.message);
    }
    
    // 4. Test with different date ranges
    console.log('\n4. 🔄 Testing with different date ranges...');
    
    const dateRangeTests = [
      {
        name: 'Exact RD Data Range',
        fromDate: testMember.first_transaction?.toISOString(),
        toDate: testMember.last_transaction?.toISOString()
      },
      {
        name: 'Wide Range',
        fromDate: '2020-01-01T00:00:00.000Z',
        toDate: '2025-12-31T23:59:59.999Z'
      },
      {
        name: 'Recent Range',
        fromDate: '2023-01-01T00:00:00.000Z',
        toDate: '2024-12-31T23:59:59.999Z'
      }
    ];
    
    for (const test of dateRangeTests) {
      console.log(`\n   🧪 Testing: ${test.name}`);
      console.log(`      From: ${test.fromDate?.split('T')[0]}`);
      console.log(`      To: ${test.toDate?.split('T')[0]}`);
      
      try {
        const testResponse = await axios.get(`${BASE_URL}/report/rd-statement`, {
          params: {
            memberNo: '1001',
            fromDate: test.fromDate,
            toDate: test.toDate,
            headCode: 'A1003'
          },
          timeout: 5000
        });
        
        const transactionCount = testResponse.data.data?.transactions?.length || 0;
        console.log(`      ✅ Result: ${transactionCount} transactions`);
        
        if (transactionCount > 0) {
          console.log(`      💰 Balance: ₹${testResponse.data.data.closingBalance}`);
          break; // Found working date range
        }
        
      } catch (error) {
        console.log(`      ❌ Failed: ${error.message}`);
      }
    }
    
    // 5. Check frontend component configuration
    console.log('\n5. 🎨 Checking frontend component...');
    const fs = require('fs');
    const rdComponentPath = 'Frontend/src/service/Reports/MemberStatement/RDStatement/page/RDStatement.tsx';
    
    if (fs.existsSync(rdComponentPath)) {
      const componentContent = fs.readFileSync(rdComponentPath, 'utf8');
      
      // Check key configurations
      const checks = [
        { name: 'Head Code A1003', pattern: /A1003/, found: componentContent.includes('A1003') },
        { name: 'API Service Call', pattern: /apiService\.getRDStatement/, found: componentContent.includes('apiService.getRDStatement') },
        { name: 'Response Handling', pattern: /response\.data/, found: componentContent.includes('response.data') },
        { name: 'Error Handling', pattern: /catch.*error/, found: /catch.*error/i.test(componentContent) }
      ];
      
      console.log('   📋 Component Configuration:');
      checks.forEach(check => {
        const status = check.found ? '✅' : '❌';
        console.log(`      ${status} ${check.name}`);
      });
      
      // Check for potential issues
      if (componentContent.includes('RD01')) {
        console.log('   ⚠️ WARNING: Component still contains RD01 head code');
      }
      
      if (!componentContent.includes('A1003')) {
        console.log('   ❌ ISSUE: Component missing A1003 head code');
      }
      
    } else {
      console.log('   ❌ RD Statement component not found');
    }
    
    // 6. Recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 TROUBLESHOOTING RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    console.log('\n🔧 IMMEDIATE FIXES TO TRY:');
    console.log('   1. Ensure backend is running: npm run start:dev (in backend folder)');
    console.log('   2. Check browser console for JavaScript errors');
    console.log('   3. Verify network requests in browser DevTools');
    console.log('   4. Try different member numbers: 1001, 1002, 1003');
    console.log('   5. Use wider date range: 2020-01-01 to 2025-12-31');
    
    console.log('\n🎯 EXACT TEST PARAMETERS FOR UI:');
    console.log('   Member Number: 1001');
    console.log('   From Date: 01-Jan-2020');
    console.log('   To Date: 31-Dec-2025');
    console.log('   Expected: 17 transactions, ₹13,600 balance');
    
    console.log('\n🔍 DEBUG STEPS:');
    console.log('   1. Open browser DevTools (F12)');
    console.log('   2. Go to Network tab');
    console.log('   3. Generate RD Statement');
    console.log('   4. Check if API request is made');
    console.log('   5. Check API response in Network tab');
    console.log('   6. Check Console tab for errors');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugRDStatementUIIssue();