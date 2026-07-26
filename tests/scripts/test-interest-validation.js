const axios = require('axios');

async function testInterestValidation() {
  console.log('🔍 Testing Interest Validation Logic\n');
  
  const baseURL = 'http://localhost:3001/api/v1';
  
  // Test different date ranges
  const testCases = [
    {
      name: 'Current Quarter (Q4 2024)',
      data: {
        fromDate: '2024-10-01',
        toDate: '2024-12-31',
        interestRate: 4.0,
        accountHead: 'A1001',
        voucherNumber: 'TEST001',
        narration: 'Test interest calculation'
      }
    },
    {
      name: 'Previous Quarter (Q3 2024)',
      data: {
        fromDate: '2024-07-01',
        toDate: '2024-09-30',
        interestRate: 4.0,
        accountHead: 'A1001',
        voucherNumber: 'TEST002',
        narration: 'Test interest calculation'
      }
    },
    {
      name: 'Future Quarter (Q1 2025)',
      data: {
        fromDate: '2025-01-01',
        toDate: '2025-03-31',
        interestRate: 4.0,
        accountHead: 'A1001',
        voucherNumber: 'TEST003',
        narration: 'Test interest calculation'
      }
    },
    {
      name: 'Custom Range (Last 3 months)',
      data: {
        fromDate: '2024-10-01',
        toDate: '2024-12-30',
        interestRate: 4.0,
        accountHead: 'A1001',
        voucherNumber: 'TEST004',
        narration: 'Test interest calculation'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    
    try {
      const response = await axios.post(`${baseURL}/interest/validate-parameters`, testCase.data);
      
      if (response.data?.success) {
        const validation = response.data.data;
        console.log(`   ✅ Status: ${validation.valid ? 'Valid' : 'Invalid'}`);
        console.log(`   📊 Eligible Members: ${validation.eligibleMembers || 0}`);
        console.log(`   📅 Period Days: ${validation.days || 0}`);
        if (validation.message) {
          console.log(`   💬 Message: ${validation.message}`);
        }
        
        // If valid, try preview
        if (validation.valid && validation.eligibleMembers > 0) {
          console.log(`   👁️ Generating preview...`);
          const previewResponse = await axios.post(`${baseURL}/interest/preview-calculation`, testCase.data);
          
          if (previewResponse.data?.success) {
            const preview = previewResponse.data.data;
            console.log(`   ✅ Preview: ${preview.totalMembers} members, ₹${preview.totalInterestAmount} total`);
          } else {
            console.log(`   ⚠️ Preview failed: ${previewResponse.data?.message}`);
          }
        }
      } else {
        console.log(`   ❌ Validation failed: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      const status = error.response?.status || 'Unknown';
      const message = error.response?.data?.message || error.message;
      console.log(`   ❌ Error: ${status} - ${message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

testInterestValidation();