console.log('🔍 Debugging Analytics Routing Issue...\n');

// Check if the components are correctly imported and different
const fs = require('fs');
const path = require('path');

const analyticsPath = 'Frontend/src/service/Administration/AnalyticsDashboard/page/AnalyticsDashboard.tsx';
const fullScreenPath = 'Frontend/src/service/Administration/FullScreenAnalytics/page/FullScreenAnalytics.tsx';
const appPath = 'Frontend/src/renderer/App.tsx';

console.log('📁 Checking component files...');

// Check if files exist
if (fs.existsSync(analyticsPath)) {
  const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
  const hasAntDesign = analyticsContent.includes('antd');
  const hasCard = analyticsContent.includes('Card');
  console.log(`✅ AnalyticsDashboard.tsx exists`);
  console.log(`   - Uses Ant Design: ${hasAntDesign}`);
  console.log(`   - Has Card component: ${hasCard}`);
} else {
  console.log('❌ AnalyticsDashboard.tsx NOT FOUND');
}

if (fs.existsSync(fullScreenPath)) {
  const fullScreenContent = fs.readFileSync(fullScreenPath, 'utf8');
  const hasFramerMotion = fullScreenContent.includes('framer-motion');
  const hasRecharts = fullScreenContent.includes('recharts');
  console.log(`✅ FullScreenAnalytics.tsx exists`);
  console.log(`   - Uses Framer Motion: ${hasFramerMotion}`);
  console.log(`   - Uses Recharts: ${hasRecharts}`);
} else {
  console.log('❌ FullScreenAnalytics.tsx NOT FOUND');
}

console.log('\n🔗 Checking App.tsx routing...');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  // Check imports
  const hasAnalyticsImport = appContent.includes('AnalyticsDashboard');
  const hasFullScreenImport = appContent.includes('FullScreenAnalytics');
  
  // Check routes
  const dashboardRoute = appContent.match(/path="\/analytics-dashboard"[^>]*element={<([^>]+)>/);
  const realtimeRoute = appContent.match(/path="\/analytics-realtime"[^>]*element={<([^>]+)>/);
  
  console.log(`✅ App.tsx exists`);
  console.log(`   - Has AnalyticsDashboard import: ${hasAnalyticsImport}`);
  console.log(`   - Has FullScreenAnalytics import: ${hasFullScreenImport}`);
  
  if (dashboardRoute) {
    console.log(`   - /analytics-dashboard → ${dashboardRoute[1]}`);
  } else {
    console.log('   - /analytics-dashboard route NOT FOUND');
  }
  
  if (realtimeRoute) {
    console.log(`   - /analytics-realtime → ${realtimeRoute[1]}`);
  } else {
    console.log('   - /analytics-realtime route NOT FOUND');
  }
} else {
  console.log('❌ App.tsx NOT FOUND');
}

console.log('\n🎯 Expected vs Actual:');
console.log('Expected:');
console.log('   - Analytics Dashboard button → /analytics-dashboard → AnalyticsDashboard (Ant Design)');
console.log('   - Real-time Monitor button → /analytics-realtime → FullScreenAnalytics (Recharts)');

console.log('\nActual (from files):');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  const dashboardMatch = appContent.match(/path="\/analytics-dashboard"[^>]*element={<([^>]+)>/);
  const realtimeMatch = appContent.match(/path="\/analytics-realtime"[^>]*element={<([^>]+)>/);
  
  console.log(`   - Analytics Dashboard button → /analytics-dashboard → ${dashboardMatch ? dashboardMatch[1] : 'NOT FOUND'}`);
  console.log(`   - Real-time Monitor button → /analytics-realtime → ${realtimeMatch ? realtimeMatch[1] : 'NOT FOUND'}`);
}

console.log('\n💡 Possible Issues:');
console.log('1. Browser cache - try hard refresh (Ctrl+Shift+R)');
console.log('2. Electron cache - restart the application');
console.log('3. Component lazy loading issue');
console.log('4. Hash routing issue in Electron');
console.log('5. Window opening mechanism not working correctly');

console.log('\n🔧 Debugging Steps:');
console.log('1. Check browser developer tools for any errors');
console.log('2. Verify the URL in the address bar when windows open');
console.log('3. Check if both components render differently');
console.log('4. Test in browser mode vs Electron mode');

console.log('\n✅ DEBUGGING COMPLETE');