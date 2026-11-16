const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const cache = new Map();
const writeTimers = new Map();

function filePath(name) {
  return path.join(DATA_DIR, name.endsWith('.json') ? name : `${name}.json`);
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
      const p = filePath(name);
      const tmp = p + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, p);
      writeTimers.delete(name);
    } catch (e) {
      console.error(`[storage] ${name} yazılmadı:`, e.message);
    }
  }, 500));
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