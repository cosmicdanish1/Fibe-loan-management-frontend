const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testMemberStatementCurrentStatus() {
  console.log('=== TESTING MEMBER STATEMENT CURRENT STATUS ===\n');
  
  // Test with recommended members
  const testMembers = [
    { memberNo: '1001', name: 'Member1001 Kumar Singh' },
    { memberNo: '1002', name: 'Member1002 Kumar Singh' },
    { memberNo: '610016572', name: 'Mr SINGH DALBIR' },
    { memberNo: '610023712', name: 'Mr A K BEHERA' }
  ];
  
  for (const member of testMembers) {
    console.log(`\n🧪 Testing Member: ${member.memberNo} - ${member.name}`);
    
    try {
      const response = await axios.get(`${BASE_URL}/report/member-statement`, {
        params: {
          memberNo: member.memberNo,
          fromDate: '2019-01-01T00:00:00.000Z',
          toDate: '2025-12-31T23:59:59.999Z'
        }
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Response structure:`, Object.keys(response.data));
      
      if (response.data.success !== undefined) {
        console.log(`🎯 Success: ${response.data.success}`);
        if (response.data.data) {
          const data = response.data.data;
          console.log(`📋 Summary items: ${data.summary?.length || 0}`);
          console.log(`📝 Transactions: ${data.transactions?.length || 0}`);
          console.log(`👤 Member name: ${data.memberName || 'N/A'}`);
          
          if (data.summary && data.summary.length > 0) {
            console.log(`💰 Sample summary:`, data.summary[0]);
          }
          
          if (data.transactions && data.transactions.length > 0) {
            console.log(`📄 Sample transaction:`, data.transactions[0]);
          }
        }
      } else {
        // Direct response format
        console.log(`📋 Summary items: ${response.data.summary?.length || 0}`);
        console.log(`📝 Transactions: ${response.data.transactions?.length || 0}`);
        console.log(`👤 Member name: ${response.data.memberName || 'N/A'}`);
        
        if (response.data.summary && response.data.summary.length > 0) {
          console.log(`💰 Sample summary:`, response.data.summary[0]);
        }
        
        if (response.data.transactions && response.data.transactions.length > 0) {
          console.log(`📄 Sample transaction:`, response.data.transactions[0]);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || 'Network'} - ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.log(`📄 Error details:`, error.response.data);
      }
    }
  }
  
  // Test with different date ranges
  console.log('\n\n🗓️ TESTING DIFFERENT DATE RANGES...');
  
  const dateRanges = [
    { name: 'Last 30 days', from: '2024-11-28', to: '2024-12-28' },
    { name: 'Last 90 days', from: '2024-09-28', to: '2024-12-28' },
    { name: 'Last year', from: '2024-01-01', to: '2024-12-31' },
    { name: 'All time', from: '2019-01-01', to: '2025-12-31' }
  ];
  
  for (const range of dateRanges) {
    console.log(`\n📅 Testing ${range.name} (${range.from} to ${range.to})`);
    
    try {
      const response = await axios.get(`${BASE_URL}/report/member-statement`, {
        params: {
          memberNo: '1001',
          fromDate: `${range.from}T00:00:00.000Z`,
          toDate: `${range.to}T23:59:59.999Z`
        }
      });
      
      const data = response.data.success ? response.data.data : response.data;
      console.log(`   Transactions found: ${data.transactions?.length || 0}`);
      console.log(`   Summary items: ${data.summary?.length || 0}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.status || 'Network'} - ${error.message}`);
    }
  }
}

testMemberStatementCurrentStatus().catch(console.error);