const axios = require('axios');

async function testMemberDetailLedgerFix() {
  console.log('=== TESTING MEMBER DETAIL LEDGER API FIX ===\n');
  
  const baseURL = 'http://localhost:3001/api/v1';
  
  // Test members with known data
  const testMembers = [
    { memberNo: '610026281', name: 'SANJAY KUMAR VARMA' },
    { memberNo: '610016572', name: 'SINGH DALBIR' },
    { memberNo: '1001', name: 'Member1001 Kumar Singh' },
    { memberNo: '610023352', name: 'SSS MURTHY' }
  ];
  
  for (const member of testMembers) {
    console.log(`🧪 Testing Member: ${member.memberNo} (${member.name})`);
    console.log('='.repeat(60));
    
    try {
      // Test Member Detail Ledger API
      const response = await axios.get(`${baseURL}/member-ledger/detail-report`, {
        params: {
          memberNumber: member.memberNo,
          fromDate: '2019-01-01',
          toDate: '2025-12-31',
          outputType: 'screen'
        }
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`✅ Success: ${response.data.success}`);
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        console.log(`📊 Member Name: ${data.memberName}`);
        console.log(`📊 Date Range: ${data.fromDate} to ${data.toDate}`);
        console.log(`📊 Total Entries: ${data.entries?.length || 0}`);
        console.log(`💰 Total Debits: ₹${data.totalDebits?.toFixed(2) || '0.00'}`);
        console.log(`💰 Total Credits: ₹${data.totalCredits?.toFixed(2) || '0.00'}`);
        
        if (data.entries && data.entries.length > 0) {
          console.log('\n📄 Sample Entries (first 3):');
          data.entries.slice(0, 3).forEach((entry, index) => {
            console.log(`  ${index + 1}. ${entry.date} - ${entry.accountHead}`);
            console.log(`     Particulars: ${entry.particulars}`);
            console.log(`     Voucher: ${entry.voucherNo} | DR: ₹${entry.debit?.toFixed(2) || '0.00'} | CR: ₹${entry.credit?.toFixed(2) || '0.00'}`);
          });
        }
        
        console.log(`\n✅ SUCCESS: Member Detail Ledger API working for ${member.memberNo}`);
      } else {
        console.log(`❌ FAILED: No data returned for ${member.memberNo}`);
        console.log(`Response:`, JSON.stringify(response.data, null, 2));
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
  
  // Test validation endpoint
  console.log('🧪 TESTING MEMBER VALIDATION ENDPOINT...');
  console.log('='.repeat(60));
  
  try {
    const validationResponse = await axios.get(`${baseURL}/member-ledger/validate-member`, {
      params: { memberNumber: '610026281' }
    });
    
    console.log(`✅ Validation Status: ${validationResponse.status}`);
    console.log(`✅ Validation Success: ${validationResponse.data.success}`);
    
    if (validationResponse.data.success && validationResponse.data.data) {
      const data = validationResponse.data.data;
      console.log(`📊 Member Exists: ${data.exists}`);
      console.log(`📊 Member Name: ${data.memberName || 'N/A'}`);
      console.log(`📊 Member Number: ${data.memberNumber}`);
    }
    
  } catch (error) {
    console.log(`❌ Validation Error: ${error.message}`);
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('===========');
  console.log('✅ Fixed data type mismatch in member ledger service');
  console.log('✅ Changed numeric comparison to string comparison');
  console.log('✅ Updated all methods: getMemberDetailLedgerReport, getMemberLedgerReport, validateMember, calculateOpeningBalance');
  console.log('\n💡 RECOMMENDED TEST MEMBERS:');
  console.log('- 610026281 (SANJAY KUMAR VARMA) - 813 transactions');
  console.log('- 610016572 (SINGH DALBIR) - 72 transactions with recent activity');
  console.log('- 1001 (Member1001 Kumar Singh) - 22 transactions with recent activity');
  console.log('- 610023352 (SSS MURTHY) - 124 transactions with recent activity');
}

testMemberDetailLedgerFix().catch(console.error);