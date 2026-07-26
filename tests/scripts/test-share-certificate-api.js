const axios = require('axios');

async function testAPI() {
  try {
    console.log('🧪 Testing Share Certificate API...');
    
    const response = await axios.get('http://localhost:3001/api/v1/report/share-certificate', {
      params: {
        memberNo: '940025125',
        outputType: 'screen'
      },
      timeout: 5000
    });
    
    if (response.data && response.data.success && response.data.data) {
      const data = response.data.data;
      console.log('✅ API Test Successful!');
      console.log('📋 Certificate Details:');
      console.log(`   Member: ${data.memberName}`);
      console.log(`   Certificate: ${data.certificateNo}`);
      console.log(`   Total Shares: ${data.totalShares} shares`);
      console.log(`   Share Range: ${data.shareFrom} to ${data.shareTo}`);
      console.log(`   Face Value: ₹${data.faceValuePerShare} per share`);
      console.log(`   Total Value: ₹${data.totalValue?.toLocaleString('en-IN')}`);
      console.log(`   Share Amount: ₹${data.totalShareAmount?.toLocaleString('en-IN')}`);
      console.log('');
      console.log('🎯 TO TEST IN UI:');
      console.log('1. Navigate to Reports → Account Reports → Share Certificate');
      console.log('2. Enter Member Number: 940025125');
      console.log('3. Click GENERATE button');
      console.log('4. Click Print Certificate to test printing');
    } else {
      console.log('❌ Unexpected API response structure');
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Backend server not running. Start with: npm run start:dev');
    } else {
      console.log('❌ API Test Failed:', error.message);
      if (error.response && error.response.data) {
        console.log('   Error details:', error.response.data);
      }
    }
  }
}

testAPI();