const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const mainDistDir = path.join(distDir, 'main');

// Create dist directories if they don't exist
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
if (!fs.existsSync(mainDistDir)) fs.mkdirSync(mainDistDir, { recursive: true });

// Compile main process
// Use the local tsc binary directly — avoids npx downloading the 'tsc' stub
// package instead of TypeScript when node_modules/.bin is not yet in PATH.
const tscBin = path.join(__dirname, '..', 'node_modules', '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc');

try {
  console.log('Compiling main process...');
  execSync(`"${tscBin}" -p tsconfig.electron.json`, { stdio: 'inherit' });
  console.log('Main process compiled successfully');
} catch (error) {
  console.error('Failed to compile main process:', error);
  console.error('');
  console.error('  Run "npm install" first, then try again.');
  process.exit(1);
}

// Copy package.json to dist
fs.copyFileSync(
  path.join(__dirname, '..', 'package.json'),
  path.join(distDir, 'package.json')
);

console.log('Build preparation complete');
