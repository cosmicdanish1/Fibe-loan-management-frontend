/**
 * Debug Account Closing Register API
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function debugAPI() {
  try {
    console.log('Testing Account Closing Register API...');
    
    // Test with current month/year
    const response = await axios.get(`${API_BASE_URL}/report/account-closing`, {
      params: {
        month: 12,
        year: 2025,
        accountType: 'ALL',
        outputType: 'screen'
      },
      timeout: 10000
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('❌ Response Status:', error.response.status);
      console.error('❌ Response Data:', error.response.data);
    }
  }
}

debugAPI();