/**
 * Debug API Response
 * Check the exact response structure from the member lookup API
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

console.log('=== DEBUGGING API RESPONSE ===');

async function debugAPIResponse() {
  try {
    console.log('\n--- TESTING MEMBER LOOKUP API RESPONSE ---');
    
    const response = await axios.get(`${API_BASE_URL}/members/lookup`, {
      params: { search: '610015819' },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers['content-type']);
    console.log('Response data type:', typeof response.data);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && typeof response.data === 'object') {
      console.log('Response keys:', Object.keys(response.data));
    }
    
    console.log('\n--- TESTING MEMBERS SEARCH API RESPONSE ---');
    
    const searchResponse = await axios.get(`${API_BASE_URL}/members`, {
      params: { search: '610015819' },
      timeout: 10000
    });
    
    console.log('Search response status:', searchResponse.status);
    console.log('Search response data type:', typeof searchResponse.data);
    console.log('Search response data:', JSON.stringify(searchResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
    }
  }
}

// Run the debug
debugAPIResponse().catch(console.error);