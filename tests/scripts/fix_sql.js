const fs = require('fs');

const filePath = 'f:\\\\company\\\\main project\\\\backend\\\\src\\\\modules\\\\report\\\\report.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the 3 problematic lines (839-841)
const lines = content.split('\n');
lines.splice(838, 3); // Remove lines 839, 840, 841 (0-indexed, so 838, 839, 840)
content = lines.join('\n');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed! Removed 3 problematic SQL lines.');
