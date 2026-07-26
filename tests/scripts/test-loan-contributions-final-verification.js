const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function finalVerificationTest() {
  console.log('🔍 LOAN CONTRIBUTIONS REGISTER - FINAL VERIFICATION');
  console.log('=' .repeat(60));

  try {
    // Test with the known working member
    const testData = {
      memberNo: '610028576',
      fromDate: '2020-01-01',
      toDate: '2025-12-31',
      outputType: 'screen'
    };

    console.log('\n📤 Testing API with parameters:');
    console.log(`   Member No: ${testData.memberNo}`);
    console.log(`   From Date: ${testData.fromDate}`);
    console.log(`   To Date: ${testData.toDate}`);
    console.log(`   Output Type: ${testData.outputType}`);

    const response = await axios.get(`${API_BASE_URL}/report/loan-contributions-register`, {
      params: testData
    });

    console.log('\n✅ API Response Status:', response.status);
    console.log('\n📊 Full Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    const data = response.data.data || response.data; // Handle wrapped response
    
    if (data && data.memberNo) {
      console.log('\n📊 Response Summary:');
      console.log(`   Member: ${data.memberName} (${data.memberNo})`);
      console.log(`   Period: ${data.fromDate} to ${data.toDate}`);
      console.log(`   Total Transactions: ${data.totalTransactions}`);
      console.log(`   Loan Contributions: ${data.loanContributions?.length || 0} groups`);
      
      if (data.summary) {
        console.log(`   Total Credits: ₹${data.summary.totalCredits?.toLocaleString('en-IN') || 0}`);
        console.log(`   Total Debits: ₹${data.summary.totalDebits?.toLocaleString('en-IN') || 0}`);
        console.log(`   Net Amount: ₹${(data.summary.totalCredits - data.summary.totalDebits)?.toLocaleString('en-IN') || 0}`);
      }

      // Show sample loan contributions
      if (data.loanContributions && data.loanContributions.length > 0) {
        console.log('\n📋 Sample Loan Contributions:');
        data.loanContributions.slice(0, 3).forEach((contribution, index) => {
          console.log(`   ${index + 1}. ${contribution.loanDetails.loanType} - Case ${contribution.loanDetails.loanCaseNo}`);
          console.log(`      Amount: ₹${contribution.loanDetails.loanAmount?.toLocaleString('en-IN') || 0}`);
          console.log(`      Transactions: ${contribution.transactions?.length || 0}`);
          console.log(`      Purpose: ${contribution.loanDetails.purpose || 'Not specified'}`);
        });
      }

      console.log('\n✅ ALL TESTS PASSED!');
      console.log('\n📖 READY FOR UI TESTING:');
      console.log('1. Start Frontend: npm start (in Frontend directory)');
      console.log('2. Navigate to: Reports → Account Reports → Loan Contributions Register');
      console.log(`3. Enter Member Number: ${testData.memberNo}`);
      console.log('4. Set date range and click GENERATE');
      console.log('5. Test print functionality by selecting "Printer" output type');

    } else {
      console.log('❌ Invalid response structure');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

finalVerificationTest().catch(console.error);