import https from 'node:https';
import http from 'node:http';

const URL = 'https://malsahori.com';

function fetchUrl(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = https.get(targetUrl, { headers }, (res) => {
      const ttfb = Date.now() - start;
      let rawData = [];
      res.on('data', (chunk) => rawData.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(rawData);
        resolve({
          statusCode: res.statusCode,
          ttfb,
          headers: res.headers,
          sizeBytes: buffer.length,
          bodyText: buffer.toString('utf8'),
        });
      });
    });
    req.on('error', reject);
  });
}

async function runAudit() {
  console.log('=== MOBILE PERFORMANCE AUDIT FOR https://malsahori.com ===\n');

  // 1. Initial Document Request & Headers Audit
  console.log('1. Checking Main HTML Document TTFB & Headers...');
  const mainDoc = await fetchUrl(URL, {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept-Encoding': 'gzip, deflate, br',
  });

  console.log(`   - HTTP Status: ${mainDoc.statusCode}`);
  console.log(`   - TTFB: ${mainDoc.ttfb} ms`);
  console.log(`   - Document Size (Compressed): ${(mainDoc.sizeBytes / 1024).toFixed(2)} KB`);
  console.log(`   - Content-Encoding: ${mainDoc.headers['content-encoding'] || 'NONE (Uncompressed)'}`);
  console.log(`   - Cache-Control: ${mainDoc.headers['cache-control'] || 'NONE'}`);
  console.log(`   - CDN / Server: ${mainDoc.headers['server'] || 'Unknown'} (CF-Cache-Status: ${mainDoc.headers['cf-cache-status'] || 'N/A'})`);

  // 2. Extract Subresources from HTML
  const html = mainDoc.bodyText;

  const scriptMatches = [...html.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);
  const cssMatches = [...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/g)].map(m => m[1]);
  const fontMatches = [...html.matchAll(/href=["']([^"']+\.woff2[^"']*)["']/g)].map(m => m[1]);
  const imgMatches = [...html.matchAll(/src=["']([^"']+\.(png|jpg|jpeg|webp|svg)[^"']*)["']/g)].map(m => m[1]);

  console.log('\n2. Discovered Resources in Initial HTML Payload:');
  console.log(`   - JavaScript Bundles: ${scriptMatches.length}`);
  scriptMatches.forEach(s => console.log(`     * ${s}`));
  console.log(`   - CSS Assets: ${cssMatches.length}`);
  cssMatches.forEach(c => console.log(`     * ${c}`));
  console.log(`   - Fonts: ${fontMatches.length}`);
  fontMatches.forEach(f => console.log(`     * ${f}`));
  console.log(`   - Preloaded Images: ${imgMatches.length}`);
  imgMatches.forEach(i => console.log(`     * ${i}`));

  // 3. Test Static Assets Compression & Caching Headers
  console.log('\n3. Testing Asset Cache-Control & Compression Headers...');
  for (const assetPath of [...scriptMatches, ...cssMatches].slice(0, 5)) {
    const fullUrl = assetPath.startsWith('http') ? assetPath : `${URL}${assetPath}`;
    try {
      const assetRes = await fetchUrl(fullUrl, { 'Accept-Encoding': 'gzip, deflate, br' });
      console.log(`   Asset: ${assetPath}`);
      console.log(`     - Size: ${(assetRes.sizeBytes / 1024).toFixed(2)} KB`);
      console.log(`     - Content-Encoding: ${assetRes.headers['content-encoding'] || 'NONE'}`);
      console.log(`     - Cache-Control: ${assetRes.headers['cache-control'] || 'MISSING'}`);
    } catch (e) {
      console.log(`     - Error fetching ${assetPath}: ${e.message}`);
    }
  }

  // 4. API Performance Test
  console.log('\n4. Testing Initial API TTFB (/api/public/homepage)...');
  try {
    const apiRes = await fetchUrl(`${URL}/api/public/homepage`, {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      'Accept-Encoding': 'gzip, deflate, br',
    });
    console.log(`   - API Status: ${apiRes.statusCode}`);
    console.log(`   - API TTFB: ${apiRes.ttfb} ms`);
    console.log(`   - API Payload Size: ${(apiRes.sizeBytes / 1024).toFixed(2)} KB`);
    console.log(`   - API Cache-Control: ${apiRes.headers['cache-control'] || 'NONE'}`);
  } catch (e) {
    console.log(`   - API Error: ${e.message}`);
  }

  console.log('\n=== AUDIT INITIAL FETCH COMPLETED ===');
}

runAudit();
