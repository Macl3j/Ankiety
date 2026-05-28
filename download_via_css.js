const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'public', 'fonts');

const fonts = [
  { name: 'Merriweather-Regular.ttf', url: 'https://fonts.googleapis.com/css?family=Merriweather:400&subset=latin-ext' },
  { name: 'Merriweather-Bold.ttf', url: 'https://fonts.googleapis.com/css?family=Merriweather:700&subset=latin-ext' },
  { name: 'Merriweather-Italic.ttf', url: 'https://fonts.googleapis.com/css?family=Merriweather:400italic&subset=latin-ext' },
  { name: 'Roboto-Regular.ttf', url: 'https://fonts.googleapis.com/css?family=Roboto:400&subset=latin-ext' },
  { name: 'Roboto-Bold.ttf', url: 'https://fonts.googleapis.com/css?family=Roboto:700&subset=latin-ext' }
];

function fetchCss(url) {
  return new Promise((resolve, reject) => {
    // Old user-agent to force Google Fonts API to return TTF formats
    const options = {
      headers: {
        'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)'
      }
    };
    https.get(url, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', err => fs.unlink(dest, () => reject(err)));
    }).on('error', reject);
  });
}

async function main() {
  for (const f of fonts) {
    console.log(`Processing ${f.name}...`);
    const css = await fetchCss(f.url);
    const match = css.match(/url\((https:\/\/[^)]+)\)/);
    if (match && match[1]) {
      const ttfUrl = match[1];
      console.log(`Found TTF URL for ${f.name}: ${ttfUrl}`);
      await downloadFile(ttfUrl, path.join(fontsDir, f.name));
      console.log(`Downloaded ${f.name}`);
    } else {
      console.error(`Could not find URL for ${f.name}`);
    }
  }
}
main();
