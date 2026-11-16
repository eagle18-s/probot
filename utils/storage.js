const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const cache = new Map();
const writeTimers = new Map();

function filePath(name) {
  return path.join(DATA_DIR, name.endsWith('.json') ? name : `${name}.json`);
}

// GitHub-a yükləmə funksiyası
async function githubUpload(filename, content) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !repo) return;

  const filePathInRepo = `data/${filename}`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePathInRepo}`;

  try {
    // Əvvəlcə faylın SHA-sını alaq (əgər varsa)
    const getReq = https.request(apiUrl + `?ref=${branch}`, { method: 'GET', headers: { 'User-Agent': 'Node', 'Authorization': `token ${token}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let sha = null;
        if (res.statusCode === 200) sha = JSON.parse(data).sha;
        
        // İndi faylı yükləyək
        const putData = JSON.stringify({
          message: `Auto-save ${filename}`,
          content: Buffer.from(content).toString('base64'),
          branch: branch,
          ...(sha ? { sha } : {})
        });

        const putReq = https.request(apiUrl, { method: 'PUT', headers: { 'User-Agent': 'Node', 'Authorization': `token ${token}`, 'Content-Type': 'application/json' } }, (putRes) => {
          putRes.on('data', () => {});
          putRes.on('end', () => {
            console.log(`[GitHub] ${filename} yadda saxlanıldı (Status: ${putRes.statusCode})`);
          });
        });
        putReq.on('error', (e) => console.error('[GitHub] Upload xətası:', e.message));
        putReq.write(putData);
        putReq.end();
      });
    });
    getReq.on('error', (e) => console.error('[GitHub] GET xətası:', e.message));
    getReq.end();
  } catch (e) {
    console.error('[GitHub] xəta:', e.message);
  }
}

function load(name, def = {}) {
  if (cache.has(name)) return cache.get(name);
  const p = filePath(name);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(def, null, 2));
    cache.set(name, def);
    return def;
  }
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    cache.set(name, data);
    return data;
  } catch (e) {
    console.error(`[storage] ${name} oxunmadı:`, e.message);
    cache.set(name, def);
    return def;
  }
}

function save(name, data) {
  cache.set(name, data);
  if (writeTimers.has(name)) clearTimeout(writeTimers.get(name));
  writeTimers.set(name, setTimeout(() => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const p = filePath(name);
      const tmp = p + '.tmp';
      fs.writeFileSync(tmp, jsonStr);
      fs.renameSync(tmp, p);
      writeTimers.delete(name);
      
      // GitHub-a yüklə
      githubUpload(name.endsWith('.json') ? name : `${name}.json`, jsonStr).catch(() => {});
    } catch (e) {
      console.error(`[storage] ${name} yazılmadı:`, e.message);
    }
  }, 1000)); // 1 saniyə debounce
}

function flushAll() {
  for (const [name, data] of cache.entries()) {
    try {
      fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`[storage] flush ${name}:`, e.message);
    }
  }
}

function allKeys() {
  try {
    return fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  } catch { return []; }
}

module.exports = { load, save, flushAll, allKeys, DATA_DIR };
