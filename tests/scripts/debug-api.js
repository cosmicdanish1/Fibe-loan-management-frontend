const API_BASE_URL = 'http://localhost:3000/api/v1';

async function debugAdHocReports() {
  console.log('🔍 Debugging AdHoc Reports API...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/report/adhoc-reports?reportType=balance_summary`);
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function debugPassBookPrinting() {
  console.log('🔍 Debugging PassBook Printing API...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/report/passbook-printing?memberNo=9999962331`);
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runDebug() {
  await debugAdHocReports();
  console.log('\n');
  await debugPassBookPrinting();
}

runDebug().catch(console.error);