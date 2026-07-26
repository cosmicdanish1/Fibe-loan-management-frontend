const axios = require('axios');

async function testUtilitiesAPI() {
  console.log('🧪 Testing Utilities API...\n');

  const baseURL = 'http://localhost:3001/api/v1';
  
  try {
    // Test the utilities endpoint
    console.log('Testing RD search endpoint...');
    const response = await axios.get(`${baseURL}/utilities/search/deposits`, {
      params: {
        memberNo: '610017770',
        type: 'RD'
      }
    });

    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log('\n🎉 RD accounts found:');
      response.data.data.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.accountNumber} - ₹${account.monthlyInstallment}/month (${account.interestRate}%)`);
      });
    }

  } catch (error) {
    console.error('❌ API Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 The API requires authentication. The frontend should handle this.');
      console.log('   For now, we can use mock data or implement authentication.');
    }
  }
}

testUtilitiesAPI();