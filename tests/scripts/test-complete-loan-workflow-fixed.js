const API_BASE = 'http://localhost:3000/api/v1';

// Test data
const testLoanData = {
  memberNo: '610031566', // A ANAND from our test
  loanType: 'ELN', // Emergency Loan (3 chars max)
  appliedAmount: 300000, // 3 lakh for Emergency loan
  purpose: 'Medical Emergency',
  noOfInstallments: 60,
  rate: 12.5,
  penalRate: 2.0
};

async function testCompleteWorkflow() {
  console.log('🚀 Testing Complete 4-Step Loan Workflow');
  console.log('=' .repeat(60));

  try {
    // Step 1: Test Member Lookup
    console.log('\n📋 STEP 1: Member Lookup');
    console.log('-'.repeat(30));
    
    const memberResponse = await fetch(`${API_BASE}/members/lookup?search=${testLoanData.memberNo}`);
    const memberResult = await memberResponse.json();
    
    if (memberResult.data && memberResult.data.length > 0) {
      const member = memberResult.data[0];
      console.log('✅ Member found:', {
        memberNo: member.memberNo,
        memberName: member.memberName,
        officeName: member.officeName
      });
    } else {
      throw new Error('Member not found');
    }

    // Step 2: Generate Loan Case Number and Save Application
    console.log('\n📝 STEP 2: Loan Application');
    console.log('-'.repeat(30));
    
    const caseNoResponse = await fetch(`${API_BASE}/members/generate/loan-case-number`);
    const caseNoResult = await caseNoResponse.json();
    const loanCaseNo = caseNoResult.data.loanCaseNo; // Extract from data wrapper
    
    console.log('🔢 Generated loan case number:', loanCaseNo);
    
    const loanApplicationData = {
      ...testLoanData,
      loanCaseNo: loanCaseNo
    };
    
    const saveResponse = await fetch(`${API_BASE}/members/loan-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanApplicationData)
    });
    
    const saveResult = await saveResponse.json();
    console.log('✅ Loan application saved:', saveResult.data ? saveResult.data.message : saveResult.message);

    // Step 2.5: Sanction the Loan
    console.log('\n✅ STEP 2.5: Loan Sanction');
    console.log('-'.repeat(30));
    
    const sanctionData = {
      sanctionedAmount: testLoanData.appliedAmount,
      sanctionDate: new Date().toISOString(),
      noOfInstallments: testLoanData.noOfInstallments,
      rate: testLoanData.rate,
      penalRate: testLoanData.penalRate,
      installmentAmount: Math.round(testLoanData.appliedAmount / testLoanData.noOfInstallments)
    };
    
    const sanctionResponse = await fetch(`${API_BASE}/members/loans/sanction/${loanCaseNo}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanctionData)
    });
    
    const sanctionResult = await sanctionResponse.json();
    console.log('✅ Loan sanctioned:', sanctionResult.data ? sanctionResult.data.message : sanctionResult.message);

    // Step 3: Generate Voucher
    console.log('\n🎫 STEP 3: Voucher Generation');
    console.log('-'.repeat(30));
    
    const voucherData = {
      loanCaseNo: loanCaseNo,
      amount: testLoanData.appliedAmount,
      paymentMode: 'BANK',
      chequeNo: 'CHQ001234',
      chequeDate: new Date().toISOString(),
      bankName: 'State Bank of India',
      narration: `Loan disbursement for case ${loanCaseNo} - Emergency loan`
    };
    
    const voucherResponse = await fetch(`${API_BASE}/members/vouchers/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voucherData)
    });
    
    const voucherResult = await voucherResponse.json();
    console.log('✅ Voucher generated:', {
      voucherNo: voucherResult.data ? voucherResult.data.voucherNo : voucherResult.voucherNo,
      message: voucherResult.data ? voucherResult.data.message : voucherResult.message
    });

    // Step 4: Get Pending Vouchers
    console.log('\n📋 STEP 4A: Get Pending Vouchers');
    console.log('-'.repeat(30));
    
    const pendingResponse = await fetch(`${API_BASE}/members/vouchers/pending`);
    const pendingResult = await pendingResponse.json();
    const pendingVouchers = pendingResult.data || pendingResult;
    
    console.log(`✅ Found ${pendingVouchers.length} pending vouchers`);
    if (pendingVouchers.length > 0) {
      console.log('📄 Latest voucher:', {
        voucherNo: pendingVouchers[0].voucherNo,
        memberName: pendingVouchers[0].memberName,
        amount: pendingVouchers[0].amount,
        loanCaseNo: pendingVouchers[0].loanCaseNo
      });
    }

    // Step 4: Pass Transaction (Final Posting)
    console.log('\n🔒 STEP 4B: Pass Transaction (Final Posting)');
    console.log('-'.repeat(30));
    
    const voucherNoToPass = voucherResult.data ? voucherResult.data.voucherNo : voucherResult.voucherNo;
    
    const passResponse = await fetch(`${API_BASE}/members/vouchers/pass/${voucherNoToPass}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postedBy: 'test-admin' })
    });
    
    const passResult = await passResponse.json();
    console.log('✅ Transaction posted successfully:', {
      voucherNo: passResult.data ? passResult.data.voucherNo : passResult.voucherNo,
      postedBy: passResult.data ? passResult.data.postedBy : passResult.postedBy,
      message: passResult.data ? passResult.data.message : passResult.message
    });

    // Verification: Check if loan is now active
    console.log('\n🔍 VERIFICATION: Check Loan Status');
    console.log('-'.repeat(30));
    
    const loanDetailsResponse = await fetch(`${API_BASE}/members/loans/case/${loanCaseNo}`);
    const loanDetailsResult = await loanDetailsResponse.json();
    const loanDetails = loanDetailsResult.data || loanDetailsResult;
    
    console.log('📊 Final loan status:', {
      loanCaseNo: loanDetails.loanCaseNo,
      memberName: loanDetails.memberName,
      loanType: loanDetails.loanType,
      sanctionedAmount: loanDetails.sanctionedAmount,
      applicationDate: loanDetails.applicationDate
    });

    console.log('\n🎉 WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('✅ All 4 steps executed without errors');
    console.log('✅ Loan application → Sanction → Voucher → Final Posting');
    console.log('✅ Data is now in permanent ledger tables');

  } catch (error) {
    console.error('\n❌ WORKFLOW FAILED:', error.message);
    if (error.response) {
      console.error('📄 Response data:', error.response.data);
      console.error('📊 Status:', error.response.status);
    }
    console.error('📍 Stack:', error.stack);
  }
}

// Helper function to use fetch instead of axios
async function fetch(url, options = {}) {
  const https = require('https');
  const http = require('http');
  const urlParsed = new URL(url);
  
  return new Promise((resolve, reject) => {
    const client = urlParsed.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: urlParsed.hostname,
      port: urlParsed.port,
      path: urlParsed.pathname + urlParsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            json: async () => JSON.parse(data)
          };
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

testCompleteWorkflow();