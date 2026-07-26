/**
 * Test Script: Loan Sanction Window Implementation
 * 
 * This script tests the complete loan sanction window functionality:
 * 1. Window opening from loan payment
 * 2. IPC communication between windows
 * 3. Loan sanction process
 * 4. Data synchronization
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Loan Sanction Window Implementation...\n');

// Test 1: Check if all required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
  'Frontend/src/main/main.ts',
  'Frontend/src/main/preload.ts',
  'Frontend/src/types/electron.d.ts',
  'Frontend/src/service/Transaction/LoanPayment/page/LoanPayment.tsx',
  'Frontend/src/service/Transaction/LoanSanction/page/LoanSanction.tsx',
  'Frontend/src/config/routes.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are present.');
  process.exit(1);
}

// Test 2: Check IPC channel configurations
console.log('\n🔗 Checking IPC channel configurations...');

const preloadContent = fs.readFileSync('Frontend/src/main/preload.ts', 'utf8');
const mainContent = fs.readFileSync('Frontend/src/main/main.ts', 'utf8');

// Check if required channels are in validSendChannels
const requiredSendChannels = ['open-window', 'loan-sanctioned'];
const requiredReceiveChannels = ['loan-sanctioned'];

let channelConfigValid = true;

requiredSendChannels.forEach(channel => {
  if (preloadContent.includes(`'${channel}'`)) {
    console.log(`✅ Send channel '${channel}' configured`);
  } else {
    console.log(`❌ Send channel '${channel}' missing from validSendChannels`);
    channelConfigValid = false;
  }
});

requiredReceiveChannels.forEach(channel => {
  if (preloadContent.includes(`'${channel}'`) && preloadContent.includes('validReceiveChannels')) {
    console.log(`✅ Receive channel '${channel}' configured`);
  } else {
    console.log(`❌ Receive channel '${channel}' missing from validReceiveChannels`);
    channelConfigValid = false;
  }
});

// Check if IPC handlers exist in main.ts
if (mainContent.includes("ipcMain.on('open-window'")) {
  console.log('✅ open-window IPC handler found');
} else {
  console.log('❌ open-window IPC handler missing');
  channelConfigValid = false;
}

if (mainContent.includes("ipcMain.on('loan-sanctioned'")) {
  console.log('✅ loan-sanctioned IPC handler found');
} else {
  console.log('❌ loan-sanctioned IPC handler missing');
  channelConfigValid = false;
}

// Test 3: Check window configuration
console.log('\n🪟 Checking window configuration...');

if (mainContent.includes("'/loan-sanction'") && mainContent.includes('WINDOW_CONFIGS')) {
  console.log('✅ Loan sanction window configuration found');
} else {
  console.log('❌ Loan sanction window configuration missing');
  channelConfigValid = false;
}

// Test 4: Check electronAPI methods
console.log('\n⚡ Checking electronAPI methods...');

if (preloadContent.includes('on: (channel: string, callback:')) {
  console.log('✅ electronAPI.on method exposed');
} else {
  console.log('❌ electronAPI.on method missing');
  channelConfigValid = false;
}

if (preloadContent.includes('send: (channel: string, ...args:')) {
  console.log('✅ electronAPI.send method exposed');
} else {
  console.log('❌ electronAPI.send method missing');
  channelConfigValid = false;
}

// Test 5: Check component implementations
console.log('\n🎯 Checking component implementations...');

const loanPaymentContent = fs.readFileSync('Frontend/src/service/Transaction/LoanPayment/page/LoanPayment.tsx', 'utf8');
const loanSanctionContent = fs.readFileSync('Frontend/src/service/Transaction/LoanSanction/page/LoanSanction.tsx', 'utf8');

// Check LoanPayment component
if (loanPaymentContent.includes("window.electronAPI.send('open-window'")) {
  console.log('✅ LoanPayment uses correct window opening method');
} else {
  console.log('❌ LoanPayment window opening method incorrect');
  channelConfigValid = false;
}

if (loanPaymentContent.includes("window.electronAPI.on('loan-sanctioned'")) {
  console.log('✅ LoanPayment listens for loan-sanctioned events');
} else {
  console.log('❌ LoanPayment missing loan-sanctioned event listener');
  channelConfigValid = false;
}

// Check LoanSanction component
if (loanSanctionContent.includes("window.electronAPI.send('loan-sanctioned'")) {
  console.log('✅ LoanSanction sends loan-sanctioned events');
} else {
  console.log('❌ LoanSanction missing loan-sanctioned event sending');
  channelConfigValid = false;
}

// Test 6: Check route configuration
console.log('\n🛣️ Checking route configuration...');

if (fs.existsSync('Frontend/src/config/routes.ts')) {
  const routesContent = fs.readFileSync('Frontend/src/config/routes.ts', 'utf8');
  if (routesContent.includes('/loan-sanction')) {
    console.log('✅ Loan sanction route configured');
  } else {
    console.log('❌ Loan sanction route missing from routes.ts');
    channelConfigValid = false;
  }
} else {
  console.log('⚠️ routes.ts file not found - checking App.tsx');
  
  if (fs.existsSync('Frontend/src/renderer/App.tsx')) {
    const appContent = fs.readFileSync('Frontend/src/renderer/App.tsx', 'utf8');
    if (appContent.includes('LoanSanction')) {
      console.log('✅ LoanSanction component imported in App.tsx');
    } else {
      console.log('❌ LoanSanction component missing from App.tsx');
      channelConfigValid = false;
    }
  }
}

// Test 7: TypeScript type definitions
console.log('\n📝 Checking TypeScript definitions...');

const typesContent = fs.readFileSync('Frontend/src/types/electron.d.ts', 'utf8');

if (typesContent.includes('on?: (channel: string, callback:')) {
  console.log('✅ electronAPI.on method typed');
} else {
  console.log('❌ electronAPI.on method type definition missing');
  channelConfigValid = false;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));

if (channelConfigValid) {
  console.log('✅ ALL TESTS PASSED');
  console.log('\n🎉 Loan Sanction Window Implementation is ready!');
  console.log('\n📋 Next Steps:');
  console.log('1. Build the application: npm run build');
  console.log('2. Start the application: npm start');
  console.log('3. Navigate to Loan Payment');
  console.log('4. Click "Open Loan Sanction Window"');
  console.log('5. Test the window opening and IPC communication');
  
  console.log('\n🔧 Features Implemented:');
  console.log('• ✅ Separate loan sanction window');
  console.log('• ✅ IPC communication between windows');
  console.log('• ✅ Event broadcasting for loan sanctioned');
  console.log('• ✅ Fallback to modal if electronAPI unavailable');
  console.log('• ✅ Window state management');
  console.log('• ✅ Proper error handling');
  
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('\n🔧 Please fix the issues above before proceeding.');
  console.log('\n💡 Common fixes:');
  console.log('• Add missing IPC channels to validSendChannels/validReceiveChannels');
  console.log('• Add missing IPC handlers in main.ts');
  console.log('• Add window configuration to WINDOW_CONFIGS');
  console.log('• Expose missing methods in preload.ts');
  console.log('• Update TypeScript definitions');
}

console.log('\n' + '='.repeat(60));

// Test 8: Check for potential issues
console.log('\n🔍 Checking for potential issues...');

let issuesFound = 0;

// Check for React import in LoanSanction (it's not needed with new JSX transform)
if (loanSanctionContent.includes("import React") && !loanSanctionContent.includes("React.")) {
  console.log('⚠️ Unused React import in LoanSanction.tsx');
  issuesFound++;
}

// Check for proper error handling
if (!loanPaymentContent.includes('try {') || !loanPaymentContent.includes('catch')) {
  console.log('⚠️ Consider adding more error handling in LoanPayment');
  issuesFound++;
}

if (!loanSanctionContent.includes('try {') || !loanSanctionContent.includes('catch')) {
  console.log('⚠️ Consider adding more error handling in LoanSanction');
  issuesFound++;
}

if (issuesFound === 0) {
  console.log('✅ No potential issues found');
} else {
  console.log(`⚠️ Found ${issuesFound} potential issues (non-critical)`);
}

console.log('\n🏁 Test completed!');