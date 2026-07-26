// Test CashBook API to check for data loading issues
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: data, parseError: error.message });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testCashBookAPI() {
  console.log('🔍 Testing CashBook API...\n');

  try {
    const today = new Date().toISOString().split('T')[0];
    const testDate = '2024-12-24'; // Use a specific date
    
    console.log(`Testing CashBook API for date: ${testDate}`);
    
    const response = await makeRequest(`/api/v1/cashbook/report?date=${testDate}`);
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ CashBook API Response:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Analyze response structure
      const data = response.data;
      console.log('\n📊 Response Analysis:');
      console.log(`Type: ${typeof data}`);
      console.log(`Has success: ${data.success !== undefined}`);
      console.log(`Has data: ${data.data !== undefined}`);
      
      if (data.success && data.data) {
        console.log('\n✅ Wrapped response detected');
        console.log('Data structure:');
        console.log(`  Date: ${data.data.date}`);
        console.log(`  Total Receipts: ${data.data.totalReceipts}`);
        console.log(`  Total Payments: ${data.data.totalPayments}`);
        console.log(`  Net Balance: ${data.data.netBalance}`);
        console.log(`  Entries count: ${data.data.entries ? data.data.entries.length : 0}`);
        
        if (data.data.entries && data.data.entries.length > 0) {
          console.log('\n📋 Sample entries:');
          data.data.entries.slice(0, 3).forEach((entry, index) => {
            console.log(`  ${index + 1}. ${entry.code} - ${entry.headName}: Receipt ₹${entry.receipt}, Payment ₹${entry.payment}`);
          });
        } else {
          console.log('\n⚠️ No entries found for this date');
        }
      } else {
        console.log('\n❌ Unexpected response format');
      }
      
    } else {
      console.log(`❌ CashBook API failed: ${response.statusCode}`);
      if (response.data) {
        console.log('Error:', JSON.stringify(response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCashBookAPI();