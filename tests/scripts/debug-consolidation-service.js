const axios = require('axios');

async function debugConsolidationService() {
  try {
    console.log('🔍 DEBUGGING CONSOLIDATION SERVICE');
    console.log('=' .repeat(50));
    
    // Test the API directly
    const response = await axios.get('http://localhost:3000/api/v1/consolidation/report?date=2024-12-24&outputType=screen');
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Headers:', response.headers['content-type']);
    console.log('📊 Full Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Data:', error.response.data);
    }
  }
}

debugConsolidationService();