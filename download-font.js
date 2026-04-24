const https = require('https');
const fs = require('fs');
const path = require('path');

const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf';

https.get(fontUrl, (res) => {
  const data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    const base64 = buffer.toString('base64');
    fs.mkdirSync(path.join(__dirname, 'src', 'lib', 'fonts'), { recursive: true });
    fs.writeFileSync(
      path.join(__dirname, 'src', 'lib', 'fonts', 'NotoSansBengali.ts'),
      `export const NotoSansBengaliBase64 = "${base64}";`
    );
    console.log('Font successfully downloaded and converted to base64!');
  });
}).on('error', (err) => {
  console.error('Error downloading font:', err);
});
