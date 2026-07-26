const API_BASE_URL = 'http://localhost:3000/api/v1';

async function checkMembersWithAccounts() {
  console.log('🔍 Checking members with accounts...');
  
  try {
    // Test with account_wise report to see what accounts exist
    const response = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=account_wise`);
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Total Records:', data.data?.totalRecords || 0);
    
    if (data.data?.data && data.data.data.length > 0) {
      console.log('Sample accounts:');
      data.data.data.slice(0, 3).forEach((account, index) => {
        console.log(`${index + 1}. Member: ${account.memberNo}, Account: ${account.accountNo}, Type: ${account.accountType}`);
      });
      
      // Test passbook with first member
      const firstMember = data.data.data[0].memberNo;
      console.log(`\n🧪 Testing PassBook with member ${firstMember}...`);
      
      const passbookResponse = await fetch(`${API_BASE_URL}/report/passbook-printing?memberNo=${firstMember}`);
      const passbookData = await passbookResponse.json();
      
      console.log('PassBook Status:', passbookResponse.status);
      if (passbookResponse.status === 200) {
        console.log('✅ PassBook Success:', {
          memberName: passbookData.data?.memberDetails?.memberName,
          totalAccounts: passbookData.data?.totalAccounts,
          totalTransactions: passbookData.data?.totalTransactions
        });
      } else {
        console.log('❌ PassBook Error:', passbookData.message);
      }
    } else {
      console.log('No accounts found in database');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMembersWithAccounts().catch(console.error);