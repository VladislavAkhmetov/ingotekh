const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.YC_IAM_TOKEN || process.env.TOKEN || '';
const BUCKET = 'ingotekh-demo';
const BASE_DIR = path.resolve(__dirname, '..');

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,
  keepAliveMsecs: 10000
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function s3Request(method, reqPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'storage.yandexcloud.net',
      port: 443,
      agent,
      path: reqPath,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        ...headers
      }
    };
    if (body) {
      opts.headers['Content-Length'] = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
    }
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`S3 ${method} ${reqPath} failed: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function configureWebsite() {
  console.log(`Configuring static website hosting for ${BUCKET}...`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<WebsiteConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <IndexDocument>
        <Suffix>index.html</Suffix>
    </IndexDocument>
    <ErrorDocument>
        <Key>index.html</Key>
    </ErrorDocument>
</WebsiteConfiguration>`;

  await s3Request('PUT', `/${BUCKET}?website`, {
    'Content-Type': 'application/xml'
  }, xml);
  console.log('Website configuration applied successfully!');
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item.startsWith('.') || item === 'node_modules' || item === 'scripts' || item === 'design-reference' || item === 'screens') {
      continue;
    }
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (stat.isFile()) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function uploadFile(filePath, index, total) {
  const relPath = path.relative(BASE_DIR, filePath).split(path.sep).join('/');
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const fileContent = fs.readFileSync(filePath);

  const encodedPath = '/' + BUCKET + '/' + relPath.split('/').map(encodeURIComponent).join('/');

  await s3Request('PUT', encodedPath, {
    'Content-Type': contentType,
    'x-amz-acl': 'public-read'
  }, fileContent);

  if (index % 50 === 0 || index === total) {
    console.log(`[${index}/${total}] Uploading... current: ${relPath}`);
  }
}

async function main() {
  if (!TOKEN) {
    console.error('Error: YC_IAM_TOKEN or TOKEN environment variable is required.');
    process.exit(1);
  }
  try {
    await configureWebsite();

    const files = [
      path.join(BASE_DIR, 'index.html'),
      ...getAllFiles(path.join(BASE_DIR, 'css')),
      ...getAllFiles(path.join(BASE_DIR, 'js')),
      ...getAllFiles(path.join(BASE_DIR, 'public'))
    ];

    console.log(`Found ${files.length} files to upload to s3://${BUCKET}/`);

    let completed = 0;
    const concurrency = 16;
    let idx = 0;

    async function worker() {
      while (idx < files.length) {
        const curIdx = ++idx;
        const file = files[curIdx - 1];
        try {
          await uploadFile(file, curIdx, files.length);
          completed++;
        } catch (e) {
          console.error(`Failed ${file}:`, e.message);
        }
      }
    }

    const workers = [];
    for (let i = 0; i < concurrency; i++) workers.push(worker());
    await Promise.all(workers);

    console.log(`\n🎉 Successfully uploaded ${completed}/${files.length} files to production!`);
    console.log(`🌐 Live URL: http://${BUCKET}.website.yandexcloud.net`);
  } catch (err) {
    console.error('Error during deployment:', err.message);
  }
}

main();
