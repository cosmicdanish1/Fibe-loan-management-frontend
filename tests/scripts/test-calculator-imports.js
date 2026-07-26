// Simple test to verify Calculator component imports are working
console.log('🔍 TESTING CALCULATOR COMPONENT IMPORTS\n');

const fs = require('fs');
const path = require('path');

// Check if files exist at the expected paths
const calculatorPath = 'Frontend/src/service/Utility/Calculator/page/Calculator.tsx';
const apiServicePath = 'Frontend/src/services/api.ts';
const memberLookupPath = 'Frontend/src/components/shared/MemberLookup/MemberLookup.tsx';

console.log('1. 📁 CHECKING FILE EXISTENCE...');

// Check Calculator component
if (fs.existsSync(calculatorPath)) {
  console.log('   ✅ Calculator component exists');
} else {
  console.log('   ❌ Calculator component NOT found');
}

// Check API service
if (fs.existsSync(apiServicePath)) {
  console.log('   ✅ API service exists');
} else {
  console.log('   ❌ API service NOT found');
}

// Check MemberLookup component
if (fs.existsSync(memberLookupPath)) {
  console.log('   ✅ MemberLookup component exists');
} else {
  console.log('   ❌ MemberLookup component NOT found');
}

console.log('\n2. 🔗 CHECKING IMPORT PATHS...');

// Read Calculator component and check imports
const calculatorContent = fs.readFileSync(calculatorPath, 'utf8');

// Check API service import
if (calculatorContent.includes("from '../../../../services/api'")) {
  console.log('   ✅ API service import path is correct');
} else if (calculatorContent.includes("from '../../../services/api'")) {
  console.log('   ❌ API service import path is incorrect (old path)');
} else {
  console.log('   ❌ API service import not found');
}

// Check MemberLookup import
if (calculatorContent.includes("from '../../../../components/shared/MemberLookup/MemberLookup'")) {
  console.log('   ✅ MemberLookup import path is correct');
} else if (calculatorContent.includes("from '../../../components/shared/MemberLookup/MemberLookup'")) {
  console.log('   ❌ MemberLookup import path is incorrect (old path)');
} else {
  console.log('   ❌ MemberLookup import not found');
}

console.log('\n3. 📊 CHECKING EXPORT STATEMENTS...');

// Check API service export
const apiContent = fs.readFileSync(apiServicePath, 'utf8');
if (apiContent.includes('export const apiService') && apiContent.includes('export default apiService')) {
  console.log('   ✅ API service exports are correct');
} else {
  console.log('   ❌ API service exports are missing or incorrect');
}

// Check MemberLookup export
const memberLookupContent = fs.readFileSync(memberLookupPath, 'utf8');
if (memberLookupContent.includes('export default MemberLookup')) {
  console.log('   ✅ MemberLookup export is correct');
} else {
  console.log('   ❌ MemberLookup export is missing or incorrect');
}

console.log('\n4. 🎯 PATH CALCULATION VERIFICATION...');

// Calculate relative path from Calculator to services
const calculatorDir = path.dirname(calculatorPath);
const servicesDir = path.dirname(apiServicePath);
const componentsDir = path.dirname(memberLookupPath);

console.log(`   Calculator location: ${calculatorDir}`);
console.log(`   Services location: ${servicesDir}`);
console.log(`   Components location: ${componentsDir}`);

// Calculate relative paths
const relativeToServices = path.relative(calculatorDir, servicesDir);
const relativeToComponents = path.relative(calculatorDir, componentsDir);

console.log(`   Relative path to services: ${relativeToServices}`);
console.log(`   Relative path to components: ${relativeToComponents}`);

// Convert to import format
const servicesImportPath = relativeToServices.replace(/\\/g, '/');
const componentsImportPath = relativeToComponents.replace(/\\/g, '/');

console.log(`   Expected services import: '${servicesImportPath}/api'`);
console.log(`   Expected components import: '${componentsImportPath}/MemberLookup'`);

console.log('\n🎉 IMPORT VERIFICATION COMPLETE!');
console.log('If all checks pass, the Calculator component should compile without import errors.');