const fs = require('fs');
const https = require('https');
const path = require('path');

const fontsDir = path.join(__dirname, 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Ensure downloading the raw TTF files containing Latin Extended (Polish characters)
const fontsToDownload = [
  { name: 'Merriweather-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather-Regular.ttf' },
  { name: 'Merriweather-Bold.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather-Bold.ttf' },
  { name: 'Merriweather-Italic.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather-Italic.ttf' },
  { name: 'Roboto-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf' },
  { name: 'Roboto-Bold.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Bold.ttf' }
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const font of fontsToDownload) {
    const dest = path.join(fontsDir, font.name);
    console.log(`Downloading ${font.name}...`);
    try {
      await downloadFile(font.url, dest);
      console.log(`Successfully downloaded ${font.name} to ${dest}`);
    } catch (e) {
      console.error(`Error downloading ${font.name}:`, e);
    }
  }
}

main();
