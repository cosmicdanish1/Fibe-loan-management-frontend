// This script will help identify and fix the window management issues

const fs = require('fs');
const path = require('path');

function analyzeWindowIssues() {
  console.log('🔍 ANALYZING WINDOW MANAGEMENT ISSUES');
  console.log('=' .repeat(60));
  
  const mainTsPath = 'Frontend/src/main/main.ts';
  
  if (!fs.existsSync(mainTsPath)) {
    console.log('❌ main.ts file not found');
    return;
  }
  
  const content = fs.readFileSync(mainTsPath, 'utf8');
  
  console.log('📊 CURRENT ISSUES IDENTIFIED:');
  console.log('');
  
  // Issue 1: Main window size
  const mainWindowMatch = content.match(/mainWindow = new BrowserWindow\(\{[\s\S]*?width: (\d+),[\s\S]*?height: (\d+),/);
  if (mainWindowMatch) {
    console.log('1. 🖥️ MAIN WINDOW SIZE ISSUE:');
    console.log(`   Current: ${mainWindowMatch[1]}x${mainWindowMatch[2]}`);
    console.log('   Problem: Should be full screen (maximized) by default');
    console.log('   Impact: Dashboard doesn\'t use full screen space');
    console.log('');
  }
  
  // Issue 2: Member lookup configuration
  const memberLookupMatch = content.match(/\/common\/member-lookup.*?{([^}]+)}/);
  if (memberLookupMatch) {
    console.log('2. 👥 MEMBER LOOKUP WINDOW ISSUE:');
    console.log('   Current config:', memberLookupMatch[1].trim());
    console.log('   Problem: alwaysOnTop: true causes windows to hide behind dashboard');
    console.log('   Impact: After auto-fill, parent windows get hidden');
    console.log('');
  }
  
  // Issue 3: Focus management
  const focusMatches = content.match(/mainWindow\?\.focus\(\)/g);
  console.log('3. 🎯 FOCUS MANAGEMENT ISSUE:');
  console.log(`   Focus calls found: ${focusMatches ? focusMatches.length : 0}`);
  console.log('   Problem: Focus is not properly restored after member lookup closes');
  console.log('   Impact: Windows get stuck behind dashboard');
  console.log('');
  
  // Issue 4: Always on top for dashboard
  const alwaysOnTopDashboard = content.includes('alwaysOnTop') && content.includes('mainWindow');
  console.log('4. 📌 DASHBOARD ALWAYS ON TOP ISSUE:');
  console.log(`   Dashboard alwaysOnTop configured: ${alwaysOnTopDashboard}`);
  console.log('   Problem: Dashboard should stay accessible but not always on top');
  console.log('   Impact: Other windows can\'t be properly focused');
  console.log('');
  
  console.log('🎯 RECOMMENDED FIXES:');
  console.log('');
  console.log('1. 🖥️ MAIN WINDOW FIXES:');
  console.log('   • Set main window to maximize on startup');
  console.log('   • Add option to keep dashboard accessible');
  console.log('   • Improve focus management');
  console.log('');
  console.log('2. 👥 MEMBER LOOKUP FIXES:');
  console.log('   • Remove alwaysOnTop from member lookup');
  console.log('   • Improve parent window focus after selection');
  console.log('   • Add proper z-index management');
  console.log('');
  console.log('3. 🎯 FOCUS MANAGEMENT FIXES:');
  console.log('   • Implement proper window focus chain');
  console.log('   • Add focus restoration after member selection');
  console.log('   • Prevent windows from hiding behind dashboard');
  console.log('');
  console.log('4. 📌 Z-INDEX MANAGEMENT:');
  console.log('   • Implement proper window layering');
  console.log('   • Add window bring-to-front functionality');
  console.log('   • Ensure dashboard remains accessible');
}

analyzeWindowIssues();