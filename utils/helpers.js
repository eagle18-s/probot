const ms = require('ms');

function parseDuration(str) {
  const v = ms(str);
  return typeof v === 'number' && v > 0 ? v : null;
}

function parseInt10(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}d ${s}sn`;
  if (m > 0) return `${m}d ${s}sn`;
  return `${s}sn`;
}

function xpForLevel(level) { return level * level * 100; }

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function makeId(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

module.exports = { parseDuration, parseInt10, formatTime, xpForLevel, chunk, makeId };