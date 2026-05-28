const fs = require('fs');
const path = require('path');

const fontsToCopy = [
  {
    src: 'node_modules/@fontsource/merriweather/files/merriweather-latin-ext-400-normal.woff',
    dest: 'public/fonts/Merriweather-Regular.woff'
  },
  {
    src: 'node_modules/@fontsource/merriweather/files/merriweather-latin-ext-700-normal.woff',
    dest: 'public/fonts/Merriweather-Bold.woff'
  },
  {
    src: 'node_modules/@fontsource/merriweather/files/merriweather-latin-ext-400-italic.woff',
    dest: 'public/fonts/Merriweather-Italic.woff'
  },
  {
    src: 'node_modules/@fontsource/roboto/files/roboto-latin-ext-400-normal.woff',
    dest: 'public/fonts/Roboto-Regular.woff'
  },
  {
    src: 'node_modules/@fontsource/roboto/files/roboto-latin-ext-700-normal.woff',
    dest: 'public/fonts/Roboto-Bold.woff'
  }
];

fontsToCopy.forEach(({ src, dest }) => {
  fs.copyFileSync(path.join(__dirname, src), path.join(__dirname, dest));
  console.log(`Copied ${src} to ${dest}`);
});
