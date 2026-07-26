const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function runCommand(command, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${description}`);
  console.log(`$ ${command}`);
  console.log('='.repeat(80));
  
  try {
    execSync(command, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    return true;
  } catch (error) {
    console.error(`\n❌ Error during: ${description}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Clean previous builds
console.log('\n🧹 Cleaning previous builds...');
try {
  fs.rmSync(path.join(__dirname, '..', 'dist'), { recursive: true, force: true });
  console.log('✅ Clean complete');
} catch (err) {
  console.log('ℹ️ No previous build to clean');
}

// Build renderer process
runCommand(
  'npx vite build',
  'Building renderer process with Vite...'
);

// Build main process and preload script
runCommand(
  'npx tsc -p tsconfig.electron.json --outDir dist/main',
  'Building main process with TypeScript...'
);

// Verify preload script was compiled
const preloadPath = path.join(__dirname, '..', 'dist', 'main', 'preload.js');
if (!fs.existsSync(preloadPath)) {
  console.error('❌ Preload script was not compiled');
  process.exit(1);
}
console.log('✅ Preload script compiled successfully');

console.log('\n🎉 Build completed successfully!');
