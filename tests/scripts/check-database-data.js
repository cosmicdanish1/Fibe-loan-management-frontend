const API_BASE_URL = 'http://localhost:3000/api/v1';

async function checkDatabaseData() {
  console.log('🔍 Checking database data...');
  
  try {
    // Check members
    const memberResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=member_wise`);
    const memberData = await memberResponse.json();
    
    console.log('Members Status:', memberResponse.status);
    console.log('Total Members:', memberData.data?.totalRecords || 0);
    
    if (memberData.data?.data && memberData.data.data.length > 0) {
      console.log('Sample members:');
      memberData.data.data.slice(0, 3).forEach((member, index) => {
        console.log(`${index + 1}. ${member.memberNo} - ${member.memberName}`);
      });
    }
    
    // Check loan summary
    const loanResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=loan_summary`);
    const loanData = await loanResponse.json();
    
    console.log('\nLoan Summary Status:', loanResponse.status);
    console.log('Total Loan Types:', loanData.data?.totalRecords || 0);
    
    if (loanData.data?.data && loanData.data.data.length > 0) {
      console.log('Loan types:');
      loanData.data.data.forEach((loan, index) => {
        console.log(`${index + 1}. ${loan.loanType}: ${loan.totalLoans} loans, ₹${loan.outstandingBalance}`);
      });
    }
    
    // Test custom query to check fdmaster table
    const customQuery = encodeURIComponent('SELECT COUNT(*) as total_fd_accounts FROM fdmaster');
    const fdResponse = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=custom&customQuery=${customQuery}`);
    const fdData = await fdResponse.json();
    
    console.log('\nFD Accounts Status:', fdResponse.status);
    if (fdResponse.status === 200 && fdData.data?.data) {
      console.log('Total FD Accounts:', fdData.data.data[0]?.total_fd_accounts || 0);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabaseData().catch(console.error);