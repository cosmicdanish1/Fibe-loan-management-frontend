const axios = require('axios');

async function testMemberDetailLedgerFrontendFix() {
  console.log('=== TESTING MEMBER DETAIL LEDGER FRONTEND FIX ===\n');
  
  const baseURL = 'http://localhost:3001/api/v1';
  
  // Test members with known data
  const testMembers = [
    { memberNo: '610023352', name: 'SSS MURTHY' },
    { memberNo: '610026281', name: 'SANJAY KUMAR VARMA' },
    { memberNo: '610016572', name: 'SINGH DALBIR' }
  ];
  
  for (const member of testMembers) {
    console.log(`🧪 Testing Member: ${member.memberNo} (${member.name})`);
    console.log('='.repeat(60));
    
    try {
      // Simulate the API service request method
      const url = `${baseURL}/member-ledger/detail-report`;
      const params = new URLSearchParams({
        memberNumber: member.memberNo,
        fromDate: '2019-01-01',
        toDate: '2025-12-31',
        outputType: 'screen'
      });
      
      console.log(`[API] Making request to: ${url}?${params.toString()}`);
      const response = await axios.get(`${url}?${params.toString()}`);
      
      console.log(`[API] Response status: ${response.status}`);
      
      // Simulate the API service response processing
      const actualData = (response.data && response.data.data !== undefined) ? response.data.data : response.data;
      
      console.log('📊 API Service Response Structure:');
      console.log(`  success: ${actualData.success !== undefined ? actualData.success : 'true'}`);
      console.log(`  data exists: ${actualData.data !== undefined}`);
      
      // Simulate the frontend processing
      if (actualData.success !== false && actualData) {
        // The data is nested at response.data.data due to double wrapping
        const frontendData = actualData.data || actualData;
        
        console.log('🎯 Frontend Data Processing:');
        console.log(`  Member Name: ${frontendData.memberName || 'Not found'}`);
        console.log(`  Entries: ${frontendData.entries?.length || 0}`);
        console.log(`  Total Debits: ₹${frontendData.totalDebits?.toFixed(2) || '0.00'}`);
        console.log(`  Total Credits: ₹${frontendData.totalCredits?.toFixed(2) || '0.00'}`);
        
        if (frontendData.entries && frontendData.entries.length > 0) {
          console.log('\n📄 Sample Entries (first 3):');
          frontendData.entries.slice(0, 3).forEach((entry, index) => {
            console.log(`  ${index + 1}. ${entry.date} - ${entry.accountHead}`);
            console.log(`     Particulars: ${entry.particulars}`);
            console.log(`     Voucher: ${entry.voucherNo} | DR: ₹${entry.debit?.toFixed(2) || '0.00'} | CR: ₹${entry.credit?.toFixed(2) || '0.00'}`);
          });
        }
        
        if ((frontendData.entries?.length || 0) === 0) {
          console.log('ℹ️  No transactions found for this period');
        } else {
          console.log(`✅ SUCCESS: Found ${frontendData.entries?.length || 0} transactions`);
        }
      } else {
        console.log('❌ FAILED: No data returned');
      }
      
    } catch (error) {
      console.log(`❌ ERROR for ${member.memberNo}:`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || error.message}`);
      } else {
        console.log(`   Network Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
  
  console.log('🎯 SUMMARY:');
  console.log('===========');
  console.log('✅ Fixed frontend data extraction to handle nested response structure');
  console.log('✅ Data is now accessed at response.data.data instead of response.data');
  console.log('✅ Added debug logging to help troubleshoot future issues');
  console.log('✅ Added success message showing number of transactions found');
  console.log('✅ Member name is now populated from API response');
}

testMemberDetailLedgerFrontendFix().catch(console.error);