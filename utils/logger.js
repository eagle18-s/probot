const { EmbedBuilder } = require('discord.js');
const storage = require('./storage');

const EFENDIM_ID = '1375956621229821992';
const PING_ADMIN_ID = '1561721639518081105';

async function efendimLog(client, guild, title, description, color = 0x2b2d31, critical = false) {
  const embed = new EmbedBuilder()
    .setTitle(`EFENDİM | ${title}`)
    .setDescription(description)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: `Sunucu: ${guild?.name || 'Bilinmir'}` });

  const config = storage.load('config', {});
  const logId = config[guild?.id]?.logChannel;
  if (logId && guild) {
    const ch = guild.channels.cache.get(logId);
    if (ch) ch.send({ embeds: [embed] }).catch(() => {});
  }
  if (critical) {
    try {
      const user = await client.users.fetch(EFENDIM_ID);
      await user.send({ embeds: [embed] });
    } catch {}
  }
}

async function serverLog(guild, embed, config) {
  const logId = config[guild.id]?.logChannel;
  if (!logId) return;
  const ch = guild.channels.cache.get(logId);
  if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}

async function checkJsonHealth(client) {
  const keys = storage.allKeys();
  const missing = [];
  const ok = [];
  for (const k of keys) {
    try {
      const d = storage.load(k.replace('.json', ''), null);
      if (d === null) missing.push(k);
      else ok.push(k);
    } catch { missing.push(k); }
  }
  const now = Math.floor(Date.now() / 1000);
  let msg = `🗂️ **JSON Yaddaş Yoxlaması**\nZaman: <t:${now}:F>\n\n`;
  msg += `✅ **Oxunan fayllar (${ok.length}):**\n${ok.map(f => `• \`${f}\``).join('\n') || '—'}\n\n`;
  if (missing.length) msg += `❌ **Çatışmayan (${missing.length}):**\n${missing.map(f => `• \`${f}\``).join('\n')}`;
  else msg += `🎉 Bütün JSON-lar yaddaşdadır, heç nə unudulmayıb!`;
  try {
    const admin = await client.users.fetch(PING_ADMIN_ID);
    await admin.send(msg);
  } catch (e) {
    console.error('[json-check] DM:', e.message);
  }
}

module.exports = { efendimLog, serverLog, checkJsonHealth, EFENDIM_ID, PING_ADMIN_ID };