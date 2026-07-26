const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testPopulatedAPIs() {
  console.log('🧪 Testing AdHoc Reports and PassBook Printing with populated data...\n');

  try {
    // 1. Test Account-wise AdHoc Report
    console.log('1️⃣ Testing Account-wise AdHoc Report...');
    const accountWiseResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=account_wise`);
    const accountWiseData = await accountWiseResponse.json();
    
    console.log('Status:', accountWiseResponse.status);
    if (accountWiseResponse.status === 200) {
      console.log('✅ Account-wise Report Success!');
      console.log('Total Records:', accountWiseData.data?.totalRecords || 0);
      if (accountWiseData.data?.data?.length > 0) {
        console.log('Sample accounts:');
        accountWiseData.data.data.slice(0, 3).forEach((account, index) => {
          console.log(`  ${index + 1}. Member: ${account.memberNo}, Account: ${account.accountNo}, Type: ${account.accountType}, Amount: ₹${account.amount}`);
        });
      }
    } else {
      console.log('❌ Account-wise Report Failed:', accountWiseData.message);
    }

    // 2. Test Member-wise AdHoc Report
    console.log('\n2️⃣ Testing Member-wise AdHoc Report...');
    const memberWiseResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=member_wise`);
    const memberWiseData = await memberWiseResponse.json();
    
    console.log('Status:', memberWiseResponse.status);
    if (memberWiseResponse.status === 200) {
      console.log('✅ Member-wise Report Success!');
      console.log('Total Records:', memberWiseData.data?.totalRecords || 0);
      if (memberWiseData.data?.data?.length > 0) {
        console.log('Sample members:');
        memberWiseData.data.data.slice(0, 3).forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.memberNo}: ${member.memberName} - Share: ₹${member.shareBalance}, CD: ₹${member.cdBalance}, Loan: ₹${member.loanBalance}`);
        });
      }
    } else {
      console.log('❌ Member-wise Report Failed:', memberWiseData.message);
    }

    // 3. Test Balance Summary AdHoc Report
    console.log('\n3️⃣ Testing Balance Summary AdHoc Report...');
    const balanceSummaryResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=balance_summary`);
    const balanceSummaryData = await balanceSummaryResponse.json();
    
    console.log('Status:', balanceSummaryResponse.status);
    if (balanceSummaryResponse.status === 200) {
      console.log('✅ Balance Summary Report Success!');
      console.log('Total Records:', balanceSummaryData.data?.totalRecords || 0);
      if (balanceSummaryData.data?.data?.length > 0) {
        console.log('Account type summaries:');
        balanceSummaryData.data.data.forEach((summary, index) => {
          console.log(`  ${index + 1}. ${summary.accountType}: ${summary.totalAccounts} accounts, Total: ₹${summary.totalBalance || 0}`);
        });
      }
    } else {
      console.log('❌ Balance Summary Report Failed:', balanceSummaryData.message);
    }

    // 4. Test PassBook Printing with a member who has FD account
    console.log('\n4️⃣ Testing PassBook Printing...');
    const memberNo = '610023712'; // First member we populated
    const passbookResponse = await fetch(`${API_BASE_URL}/report/passbook-printing?memberNo=${memberNo}&includeZeroBalance=true`);
    const passbookData = await passbookResponse.json();
    
    console.log('Status:', passbookResponse.status);
    if (passbookResponse.status === 200) {
      console.log('✅ PassBook Printing Success!');
      console.log('Member:', passbookData.data?.memberDetails?.memberName);
      console.log('Total Accounts:', passbookData.data?.totalAccounts || 0);
      console.log('Total Transactions:', passbookData.data?.totalTransactions || 0);
      
      if (passbookData.data?.accounts?.length > 0) {
        console.log('Account details:');
        passbookData.data.accounts.forEach((account, index) => {
          console.log(`  ${index + 1}. Account: ${account.accountNo}, Type: ${account.accountType}, Balance: ₹${account.currentBalance}, Transactions: ${account.transactionCount}`);
        });
      }
    } else {
      console.log('❌ PassBook Printing Failed:', passbookData.message);
    }

    // 5. Test Custom Query AdHoc Report
    console.log('\n5️⃣ Testing Custom Query AdHoc Report...');
    const customQuery = encodeURIComponent('SELECT COUNT(*) as total_fd_accounts, SUM(fdamount) as total_amount FROM fdmaster');
    const customQueryResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=custom&customQuery=${customQuery}`);
    const customQueryData = await customQueryResponse.json();
    
    console.log('Status:', customQueryResponse.status);
    if (customQueryResponse.status === 200) {
      console.log('✅ Custom Query Report Success!');
      console.log('Query Result:', customQueryData.data?.data?.[0]);
    } else {
      console.log('❌ Custom Query Report Failed:', customQueryData.message);
    }

    console.log('\n🎉 All API tests completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testPopulatedAPIs().catch(console.error);