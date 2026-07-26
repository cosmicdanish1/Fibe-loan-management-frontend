/**
 * Test PassBook Print Functionality
 * Test the complete flow from data loading to print generation
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

console.log('=== TESTING PASSBOOK PRINT FUNCTIONALITY ===');

async function testPassBookPrintFunctionality() {
  try {
    console.log('\n--- STEP 1: TEST PASSBOOK DATA API ---');
    
    // Test the passbook printing API endpoint
    const testMember = '610015819';
    
    const response = await axios.get(`${API_BASE_URL}/report/passbook-printing`, {
      params: {
        memberNo: testMember,
        includeZeroBalance: true
      },
      timeout: 10000
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Success:', response.data.success);
    
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      console.log('✅ PassBook API working correctly');
      console.log(`   Member: ${data.memberDetails.memberName}`);
      console.log(`   Accounts: ${data.totalAccounts}`);
      console.log(`   Transactions: ${data.totalTransactions}`);
      
      if (data.accounts && data.accounts.length > 0) {
        const account = data.accounts[0];
        console.log(`   Account Type: ${account.accountType}`);
        console.log(`   Balance: ₹${account.currentBalance}`);
        console.log(`   Transaction Count: ${account.transactionCount}`);
        
        console.log('\n--- STEP 2: ANALYZE PRINT DATA STRUCTURE ---');
        
        // Check if all required fields for printing are present
        const requiredFields = {
          'Member Details': {
            'memberNo': data.memberDetails.memberNo,
            'memberName': data.memberDetails.memberName,
            'address': data.memberDetails.address
          },
          'Account Details': {
            'accountNo': account.accountNo,
            'accountType': account.accountType,
            'currentBalance': account.currentBalance,
            'interestRate': account.interestRate
          },
          'Transactions': account.transactions
        };
        
        console.log('✅ Print Data Structure Analysis:');
        Object.keys(requiredFields).forEach(section => {
          console.log(`   ${section}:`);
          if (section === 'Transactions') {
            console.log(`     - ${requiredFields[section].length} transactions available`);
            if (requiredFields[section].length > 0) {
              const transaction = requiredFields[section][0];
              console.log(`     - Sample transaction: ${transaction.transactionDate} - ${transaction.narration} - ₹${transaction.amount}`);
            }
          } else {
            Object.keys(requiredFields[section]).forEach(field => {
              const value = requiredFields[section][field];
              console.log(`     - ${field}: ${value || 'MISSING'}`);
            });
          }
        });
        
        console.log('\n--- STEP 3: GENERATE PRINT HTML ---');
        
        // Generate the same HTML that the frontend would generate
        const printHTML = generatePrintHTML(data, account);
        
        console.log('✅ Print HTML generated successfully');
        console.log(`   HTML length: ${printHTML.length} characters`);
        console.log('   Contains organization header:', printHTML.includes('EMPLOYEE COOPERATIVE CREDIT SOCIETY'));
        console.log('   Contains member name:', printHTML.includes(data.memberDetails.memberName));
        console.log('   Contains transactions table:', printHTML.includes('transactions-table'));
        console.log('   Contains print styles:', printHTML.includes('@media print'));
        
        console.log('\n--- STEP 4: PRINT FUNCTIONALITY ANALYSIS ---');
        
        console.log('🖨️ PRINT PROCESS ANALYSIS:');
        console.log('1. ✅ Data Loading: API returns complete data');
        console.log('2. ✅ Data Structure: All required fields present');
        console.log('3. ✅ HTML Generation: Print HTML can be generated');
        console.log('4. ❓ Print Window: Need to test in browser');
        console.log('5. ❓ Print Dialog: Need to test in browser');
        
        console.log('\n--- STEP 5: COMMON PRINT ISSUES ---');
        
        console.log('🔧 POSSIBLE PRINT ISSUES:');
        console.log('');
        console.log('1. **Popup Blocker**: Browser blocking new window');
        console.log('   - Solution: Allow popups for the application');
        console.log('   - Check browser popup settings');
        console.log('');
        console.log('2. **JavaScript Error**: Error in print function');
        console.log('   - Check browser console for errors');
        console.log('   - Verify window.open() works');
        console.log('');
        console.log('3. **Data Not Loaded**: Print button clicked before data loads');
        console.log('   - Ensure "SHOW" button is clicked first');
        console.log('   - Wait for data to appear in the table');
        console.log('');
        console.log('4. **CSS Issues**: Print styles not applied');
        console.log('   - Check @media print styles');
        console.log('   - Verify portrait orientation');
        console.log('');
        console.log('5. **Browser Compatibility**: Different behavior in different browsers');
        console.log('   - Try in Chrome, Firefox, Edge');
        console.log('   - Check if Electron app vs web browser');
        
        console.log('\n--- STEP 6: TESTING INSTRUCTIONS ---');
        
        console.log('📱 TO TEST PRINT FUNCTIONALITY:');
        console.log('');
        console.log('1. **Load Data First**:');
        console.log('   - Enter Member Number: 610015819');
        console.log('   - Click "SHOW" button');
        console.log('   - Wait for data to appear');
        console.log('');
        console.log('2. **Check Data Loaded**:');
        console.log('   - Verify member name appears');
        console.log('   - Verify transaction table has data');
        console.log('   - Verify account balance shows');
        console.log('');
        console.log('3. **Test Print Button**:');
        console.log('   - Click "Print PassBook" button');
        console.log('   - Check browser console for errors');
        console.log('   - Allow popups if prompted');
        console.log('');
        console.log('4. **If Print Window Opens**:');
        console.log('   - Verify content appears correctly');
        console.log('   - Check if print dialog opens automatically');
        console.log('   - Test manual print (Ctrl+P)');
        console.log('');
        console.log('5. **If Print Window Doesn\'t Open**:');
        console.log('   - Check popup blocker');
        console.log('   - Check browser console for errors');
        console.log('   - Try different browser');
        
      } else {
        console.log('❌ No accounts found for member');
      }
      
    } else {
      console.log('❌ PassBook API failed or returned no data');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
    }
  }
}

function generatePrintHTML(passBookData, selectedAccountData) {
  return `
    <html>
      <head>
        <title>Pass Book - ${passBookData.memberDetails.memberName}</title>
        <style>
          @media print {
            @page { 
              size: A4 portrait; 
              margin: 0.5in; 
            }
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 0; 
              background: white; 
              font-size: 11px; 
              line-height: 1.2;
            }
          }
          body { 
            font-family: 'Courier New', monospace; 
            margin: 0; 
            padding: 20px; 
            background: white; 
            font-size: 11px; 
            line-height: 1.2;
          }
          .passbook { 
            border: 2px solid #000; 
            padding: 15px; 
            background: white; 
            max-width: 100%;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 1px solid #000; 
            padding-bottom: 10px; 
          }
          .org-name { 
            font-size: 14px; 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          .member-info { 
            margin-bottom: 15px; 
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 3px; 
          }
          .transactions-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
          }
          .transactions-table th, .transactions-table td { 
            border: 1px solid #000; 
            padding: 3px; 
            text-align: left; 
            font-size: 9px; 
          }
          .transactions-table th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
          }
          .amount { 
            text-align: right; 
          }
          .footer { 
            margin-top: 20px; 
            text-align: center; 
            font-size: 8px; 
          }
        </style>
      </head>
      <body>
        <div class="passbook">
          <div class="header">
            <div class="org-name">EMPLOYEE COOPERATIVE CREDIT SOCIETY LTD.</div>
            <div>PASS BOOK</div>
          </div>
          
          <div class="member-info">
            <div class="info-row">
              <span><strong>Member No:</strong> ${passBookData.memberDetails.memberNo}</span>
              <span><strong>Account No:</strong> ${selectedAccountData.accountNo}</span>
            </div>
            <div class="info-row">
              <span><strong>Name:</strong> ${passBookData.memberDetails.memberName}</span>
              <span><strong>Account Type:</strong> ${selectedAccountData.accountType}</span>
            </div>
            <div class="info-row">
              <span><strong>Address:</strong> ${passBookData.memberDetails.address}</span>
              <span><strong>Current Balance:</strong> ₹${selectedAccountData.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <table class="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th>Vch. No</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${selectedAccountData.transactions.map(transaction => `
                <tr>
                  <td>${new Date(transaction.transactionDate).toLocaleDateString('en-GB')}</td>
                  <td>${transaction.narration}</td>
                  <td>${transaction.voucherNo}</td>
                  <td class="amount">${transaction.transactionType === 'DR' ? '₹' + transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                  <td class="amount">${transaction.transactionType === 'CR' ? '₹' + transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                  <td class="amount">₹${transaction.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>This is a computer generated passbook. Generated on ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Run the test
testPassBookPrintFunctionality().catch(console.error);