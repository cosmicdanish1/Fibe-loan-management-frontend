const axios = require('axios');

async function testFDCertificate() {
  try {
    console.log('🧪 Testing Fixed Deposit Certificate API...');
    
    const response = await axios.get('http://localhost:3001/api/v1/report/fd-certificate', {
      params: {
        memberNo: '610025808',
        outputType: 'screen'
      },
      timeout: 5000
    });
    
    if (response.data && response.data.success && response.data.data) {
      const data = response.data.data;
      console.log('✅ API Test Successful!');
      console.log('📋 Certificate Details:');
      console.log(`   Member: ${data.memberName}`);
      console.log(`   Account: ${data.accountNo}`);
      console.log(`   Certificate: ${data.certificateNo}`);
      console.log(`   Amount: ₹${data.depositAmount?.toLocaleString('en-IN')}`);
      console.log(`   Rate: ${data.interestRate}%`);
      console.log(`   Tenure: ${data.tenure} months`);
      console.log(`   Maturity: ₹${data.maturityAmount?.toLocaleString('en-IN')}`);
      console.log(`   Nominee: ${data.nominee}`);
      console.log('');
      console.log('🎉 Fixed Deposit Certificate is ready for use!');
      console.log('');
      console.log('🎯 TO TEST IN UI:');
      console.log('1. Navigate to Reports → Account Reports → Fixed Deposit Certificate');
      console.log('2. Enter Member Number: 610025808');
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
    }
  }
}

testFDCertificate();