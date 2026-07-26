const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testAdHocReports() {
  console.log('🧪 Testing AdHoc Reports API...');
  
  try {
    // Test member_wise report
    const memberWiseResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=member_wise&memberNo=9999962331`);
    const memberWiseData = await memberWiseResponse.json();
    
    console.log('✅ Member Wise Report:', {
      status: memberWiseResponse.status,
      totalRecords: memberWiseData?.totalRecords || 0,
      hasData: Array.isArray(memberWiseData?.data)
    });

    // Test balance_summary report
    const balanceSummaryResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=balance_summary`);
    const balanceSummaryData = await balanceSummaryResponse.json();
    
    console.log('✅ Balance Summary Report:', {
      status: balanceSummaryResponse.status,
      totalRecords: balanceSummaryData?.totalRecords || 0,
      hasData: Array.isArray(balanceSummaryData?.data)
    });

  } catch (error) {
    console.error('❌ AdHoc Reports API Error:', error.message);
  }
}

async function testPassBookPrinting() {
  console.log('🧪 Testing PassBook Printing API...');
  
  try {
    // Test with member number
    const passbookResponse = await fetch(`${API_BASE_URL}/report/passbook-printing?memberNo=9999962331&includeZeroBalance=true&fromDate=2024-01-01&toDate=2024-12-31`);
    const passbookData = await passbookResponse.json();
    
    console.log('✅ PassBook Printing Report:', {
      status: passbookResponse.status,
      memberDetails: passbookData?.memberDetails?.memberName || 'N/A',
      totalAccounts: passbookData?.totalAccounts || 0,
      totalTransactions: passbookData?.totalTransactions || 0,
      hasAccounts: Array.isArray(passbookData?.accounts)
    });

    if (passbookData?.accounts?.length > 0) {
      const firstAccount = passbookData.accounts[0];
      console.log('📋 First Account Details:', {
        accountNo: firstAccount.accountNo,
        accountType: firstAccount.accountType,
        currentBalance: firstAccount.currentBalance,
        transactionCount: firstAccount.transactionCount
      });
    }

  } catch (error) {
    console.error('❌ PassBook Printing API Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting AdHoc Reports and PassBook Printing API Tests\n');
  
  await testAdHocReports();
  console.log('');
  await testPassBookPrinting();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);