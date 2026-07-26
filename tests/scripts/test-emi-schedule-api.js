const axios = require('axios');

async function testEMIScheduleAPI() {
  console.log('🔍 Testing EMI Schedule API for loan 7000\n');
  
  try {
    const response = await axios.get('http://localhost:3001/api/v1/loans/master/7000/emi-schedule');
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ API Error:', error.response?.status || error.message);
    console.log('❌ Error Details:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Loan 7000 might not exist in loan_master table');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Server error - check backend logs');
    }
  }
}

testEMIScheduleAPI();