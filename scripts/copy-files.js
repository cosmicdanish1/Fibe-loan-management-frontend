const fs = require('fs');
const path = require('path');

const filesToCopy = [
  { from: 'package.json', to: '../dist/package.json' },
  { from: 'dist/main/preload.js', to: '../dist/main/preload.js' },
  { from: 'dist/main/preload.js.map', to: '../dist/main/preload.js.map', optional: true }
];

filesToCopy.forEach((file) => {
  const { from, to, optional } = file;
  const source = path.join(__dirname, '..', from);
  const dest = path.join(__dirname, to);
  const dir = path.dirname(dest);
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, dest);
      console.log(`✅ Copied ${from} to ${to}`);
    } else if (!optional) {
      console.warn(`⚠️  Source file not found: ${source}`);
    }
  } catch (error) {
    console.error(`❌ Failed to copy ${from} to ${to}:`, error.message);
  }
});
