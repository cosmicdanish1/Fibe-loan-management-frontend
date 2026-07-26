const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function finalVerificationTest() {
  console.log('🔍 LIEN ACCOUNT INFORMATION - FINAL VERIFICATION');
  console.log('=' .repeat(60));

  try {
    // Test the API endpoint
    const testData = {
      outputType: 'screen'
    };

    console.log('\n📤 Testing API with parameters:');
    console.log(`   Output Type: ${testData.outputType}`);

    const response = await axios.get(`${API_BASE_URL}/report/lien-account-information`, {
      params: testData
    });

    console.log('\n✅ API Response Status:', response.status);
    
    const data = response.data.data || response.data;
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('\n📊 Response Summary:');
      console.log(`   Total Lien Accounts: ${data.length}`);
      
      data.forEach((lien, index) => {
        console.log(`\n   ${index + 1}. Member ${lien.memberNo}: ${lien.memberName}`);
        console.log(`      Address: ${lien.address}`);
        console.log(`      Loan Case: ${lien.loanCaseNo}, Account: ${lien.fdrdAccountNumber}`);
        console.log(`      Lien Date: ${new Date(lien.lienFromDate).toDateString()}`);
        console.log(`      Created By: ${lien.createdBy}`);
        
        if (lien.accountDetails) {
          console.log(`      Account Details:`);
          console.log(`        - Type: ${lien.accountDetails.accountType}`);
          console.log(`        - Amount: ₹${lien.accountDetails.accountAmount?.toLocaleString('en-IN') || 0}`);
          console.log(`        - Interest Rate: ${lien.accountDetails.interestRate}%`);
          console.log(`        - Status: ${lien.accountDetails.accountStatus}`);
        }
        
        if (lien.loanDetails) {
          console.log(`      Loan Details:`);
          console.log(`        - Amount: ₹${lien.loanDetails.loanAmount?.toLocaleString('en-IN') || 0}`);
          console.log(`        - Balance: ₹${lien.loanDetails.loanBalance?.toLocaleString('en-IN') || 0}`);
          console.log(`        - Type: ${lien.loanDetails.loanType}`);
        }
      });

      console.log('\n✅ ALL TESTS PASSED!');
      console.log('\n📖 READY FOR UI TESTING:');
      console.log('1. Start Frontend: npm start (in Frontend directory)');
      console.log('2. Navigate to: Reports → Account Reports → Lien Account Information');
      console.log('3. The page should auto-load with lien account data');
      console.log('4. Test expandable rows by clicking on any row');
      console.log('5. Test print functionality by selecting "Printer" output type');
      console.log('6. Click REFRESH to reload data');

    } else {
      console.log('❌ No lien accounts found in API response');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

finalVerificationTest().catch(console.error);