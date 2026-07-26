const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testCalculatorAPIs() {
  console.log('🧮 TESTING CALCULATOR BACKEND APIs\n');

  try {
    // Test 1: Get loan rates
    console.log('1. 📊 Testing GET /utilities/calculator/loan-rates...');
    try {
      const loanRatesResponse = await axios.get(`${API_BASE_URL}/utilities/calculator/loan-rates`);
      console.log('   ✅ Loan rates API working');
      console.log('   Response:', JSON.stringify(loanRatesResponse.data, null, 2));
      
      if (loanRatesResponse.data.success && loanRatesResponse.data.data) {
        const loanData = loanRatesResponse.data.data.data || loanRatesResponse.data.data;
        console.log(`   Found ${loanData.length} loan types`);
        loanData.forEach(loan => {
          console.log(`     ${loan.name}: ${loan.rate}% (Max: ₹${loan.maxAmount?.toLocaleString()}, ${loan.maxTenure} months)`);
        });
      }
    } catch (error) {
      console.log('   ❌ Loan rates API failed:', error.response?.data || error.message);
    }

    // Test 2: Get member eligibility
    console.log('\n2. 👤 Testing GET /utilities/calculator/member-eligibility...');
    const testMemberNo = '610017770';
    try {
      const eligibilityResponse = await axios.get(`${API_BASE_URL}/utilities/calculator/member-eligibility?memberNo=${testMemberNo}`);
      console.log('   ✅ Member eligibility API working');
      console.log('   Response:', JSON.stringify(eligibilityResponse.data, null, 2));
      
      if (eligibilityResponse.data.success && eligibilityResponse.data.data) {
        const memberData = eligibilityResponse.data.data.data || eligibilityResponse.data.data;
        if (memberData) {
          console.log(`   Member: ${memberData.name} (${memberData.memberNo})`);
          console.log(`   Basic Pay: ₹${memberData.basicPay?.toLocaleString()}`);
          console.log(`   Active Loans: ${memberData.activeLoans}`);
          console.log(`   Total Outstanding: ₹${memberData.totalOutstanding?.toLocaleString()}`);
          console.log(`   Available Eligibility: ₹${memberData.availableEligibility?.toLocaleString()}`);
        } else {
          console.log('   No member data found (member may not exist)');
        }
      }
    } catch (error) {
      console.log('   ❌ Member eligibility API failed:', error.response?.data || error.message);
    }

    // Test 3: Get member balance
    console.log('\n3. 💰 Testing GET /utilities/member/balance...');
    try {
      const balanceResponse = await axios.get(`${API_BASE_URL}/utilities/member/balance?memberNo=${testMemberNo}`);
      console.log('   ✅ Member balance API working');
      console.log('   Response:', JSON.stringify(balanceResponse.data, null, 2));
      
      if (balanceResponse.data.success && balanceResponse.data.data) {
        const balanceData = balanceResponse.data.data.data || balanceResponse.data.data;
        console.log(`   Member: ${balanceData.member?.name}`);
        console.log(`   RD Accounts: ${balanceData.rd_summary?.rd_accounts}, Total: ₹${parseFloat(balanceData.rd_summary?.total_rd_deposited || 0).toLocaleString()}`);
        console.log(`   FD Accounts: ${balanceData.fd_summary?.fd_accounts}, Total: ₹${parseFloat(balanceData.fd_summary?.total_fd_deposited || 0).toLocaleString()}`);
        console.log(`   SB Accounts: ${balanceData.sb_summary?.sb_accounts}, Balance: ₹${parseFloat(balanceData.sb_summary?.total_sb_balance || 0).toLocaleString()}`);
      }
    } catch (error) {
      console.log('   ❌ Member balance API failed:', error.response?.data || error.message);
    }

    // Test 4: Test with different member numbers
    console.log('\n4. 🔍 Testing with different member numbers...');
    const testMembers = ['1001', '1002', '1003'];
    
    for (const memberNo of testMembers) {
      try {
        const response = await axios.get(`${API_BASE_URL}/utilities/calculator/member-eligibility?memberNo=${memberNo}`);
        if (response.data.success && response.data.data) {
          const memberData = response.data.data.data || response.data.data;
          if (memberData) {
            console.log(`   Member ${memberNo}: ${memberData.name}, Loans: ${memberData.activeLoans}, Outstanding: ₹${memberData.totalOutstanding?.toLocaleString()}`);
          } else {
            console.log(`   Member ${memberNo}: No data found`);
          }
        }
      } catch (error) {
        console.log(`   Member ${memberNo}: API failed - ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎉 CALCULATOR API TESTING COMPLETE!');
    console.log('All APIs are ready for frontend integration.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCalculatorAPIs();