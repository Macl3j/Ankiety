const fontkit = require('fontkit');
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'public', 'fonts', 'Merriweather-Regular.woff');
try {
  const font = fontkit.openSync(fontPath);
  console.log('Successfully opened font:', font.fullName);
} catch (e) {
  console.error('Failed to open font:', e);
}
