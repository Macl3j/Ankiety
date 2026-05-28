const React = require('react');
const { renderToStream, Document, Page, Text, View, StyleSheet, Font } = require('@react-pdf/renderer');
const path = require('path');
const fs = require('fs');

async function test() {
  try {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    Font.register({
      family: 'Roboto',
      fonts: [
        { src: path.join(fontsDir, 'Roboto-Regular.woff') },
        { src: path.join(fontsDir, 'Roboto-Bold.woff'), fontWeight: 'bold' }
      ]
    });

    const styles = StyleSheet.create({
      page: { fontFamily: 'Roboto', padding: 10 }
    });

    const doc = React.createElement(Document, { title: "Testowy tytuł z ąśężźćńłó" }, 
      React.createElement(Page, { size: 'A4', style: styles.page }, 
        React.createElement(Text, null, "Zażółć gęślą jaźń! ".repeat(10))
      )
    );

    const stream = await renderToStream(doc);
    let chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => console.log('PDF rendered, size:', Buffer.concat(chunks).length));
    stream.on('error', err => console.error('Stream error:', err));
  } catch (err) {
    console.error('Catch error:', err.message);
  }
}

test();
