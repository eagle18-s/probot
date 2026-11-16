const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../utils/storage');
const { efendimLog } = require('../utils/logger');
const { xpForLevel, formatTime } = require('../utils/helpers');
const { createXPProfileCard, createStatCard } = require('../utils/canvas');
const { AttachmentBuilder } = require('discord.js');

const spamMap = new Map();
const xpCooldown = new Map();

// Təmizləmə (yaddaş sızması qarşısı)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of spamMap) {
    const filtered = v.filter(t => now - t < 10000);
    if (filtered.length) spamMap.set(k, filtered);
    else spamMap.delete(k);
  }
  for (const [k, v] of xpCooldown) {
    if (now - v > 60000) xpCooldown.delete(k);
  }
}, 60000);

function getUserXP(guildId, userId) {
  const xpData = storage.load('xp', {});
  if (!xpData[guildId]) xpData[guildId] = {};
  if (!xpData[guildId][userId]) {
    xpData[guildId][userId] = { xp: 0, level: 0, messages: 0, voiceTime: 0, lastMessage: 0 };
  }
  return { xpData, user: xpData[guildId][userId] };
}

function addXP(guildId, userId, amount) {
  const { xpData, user } = getUserXP(guildId, userId);
  user.xp += amount;
  let leveledUp = false;
  while (user.xp >= xpForLevel(user.level + 1)) { user.level++; leveledUp = true; }
  storage.save('xp', xpData);
  return { user, leveledUp };
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;
    const config = storage.load('config', {});
    const gcfg = config[message.guild.id] || {};
    const now = Date.now();

    // ===== XP =====
    const key = `${message.guild.id}-${message.author.id}`;
    if (!xpCooldown.has(key) || now - xpCooldown.get(key) > 15000) {
      xpCooldown.set(key, now);
      const { xpData, user } = getUserXP(message.guild.id, message.author.id);
      user.messages++;
      user.lastMessage = now;
      storage.save('xp', xpData);
      const xpGain = Math.floor(Math.random() * 11) + 10;
      const { leveledUp, user: updated } = addXP(message.guild.id, message.author.id, xpGain);
      if (leveledUp) message.channel.send(`🎉 Tebrikler ${message.author}! **Seviye ${updated.level}** oldun!`).catch(() => {});
    }

    // ===== Küfür =====
    const küfürler = storage.load('küfürler', []);
    if (Array.isArray(küfürler) && küfürler.length) {
      const low = message.content.toLowerCase();
      const hasKüfür = küfürler.some(k => {
        const re = new RegExp(`(^|\\s|\\b)${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|\\b|$)`, 'i');
        return re.test(low);
      });
      if (hasKüfür && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.delete().catch(() => {});
        const w = await message.channel.send(`${message.author}, küfür yasaktır!`);
        setTimeout(() => w.delete().catch(() => {}), 4000);
        return;
      }
    }

    // ===== Link =====
    const linkRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)|(discordapp\.com\/invite\/[^\s]+)/i;
    if (linkRegex.test(message.content) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const exceptions = gcfg.linkExceptions || [];
      if (!exceptions.includes(message.channel.id)) {
        await message.delete().catch(() => {});
        const w = await message.channel.send(`${message.author}, bu kanalda link göndərmek yasaktır!`);
        setTimeout(() => w.delete().catch(() => {}), 4000);
        return;
      }
    }

    // ===== Spam =====
    const skey = `${message.author.id}-${message.guild.id}`;
    if (!spamMap.has(skey)) spamMap.set(skey, []);
    const stamps = spamMap.get(skey).filter(t => now - t < 5000);
    stamps.push(now);
    spamMap.set(skey, stamps);
    if (stamps.length >= 6 && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.member.timeout(30000, 'Spam').catch(() => {});
      await message.channel.send(`${message.author} spam yaptığı için 30s timeout yedi.`).catch(() => {});
      spamMap.set(skey, []);
    }

    // ===== Komanda =====
    if (!message.content.startsWith(client.PREFIX)) return;
    const args = message.content.slice(client.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const cmd = client.commands.get(commandName);
    if (!cmd) return;

    try {
      await cmd.execute(message, args, client, { config, gcfg, getUserXP, addXP });
    } catch (e) {
      console.error(`[cmd:${commandName}]`, e);
      message.reply('❌ Komanda işlərkən xəta oldu.').catch(() => {});
    }
  }
};