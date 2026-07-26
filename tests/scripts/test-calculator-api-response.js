const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testAPIResponse() {
  try {
    console.log('🔍 Testing Calculator API Response Structure...\n');

    const response = await axios.get(`${API_BASE_URL}/utilities/calculator/loan-rates`);
    
    console.log('Raw Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\nResponse Analysis:');
    console.log('- response.data.success:', response.data.success);
    console.log('- response.data.data:', typeof response.data.data);
    console.log('- response.data.data.success:', response.data.data?.success);
    console.log('- response.data.data.data:', Array.isArray(response.data.data?.data));
    
    if (response.data.data?.data) {
      console.log('\nLoan Types Found:');
      response.data.data.data.forEach((loan, index) => {
        console.log(`${index + 1}. ${loan.name} (${loan.code}): ${loan.rate}% - Max: ₹${loan.maxAmount}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPIResponse();