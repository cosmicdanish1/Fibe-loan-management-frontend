const axios = require('axios');

async function testAccountClosingRegister() {
  try {
    console.log('Testing Account Closing Register API...');
    
    const response = await axios.get('http://localhost:3000/api/v1/report/account-closing', {
      params: {
        accountType: 'ALL',
        month: 12,
        year: 2024,
        outputType: 'screen'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAccountClosingRegister();