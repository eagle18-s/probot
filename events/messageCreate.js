const { PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { efendimLog } = require('../utils/logger');


const spamMap = new Map();
const aiHistory = new Map(); // kanal başına söhbət tarixçəsi

// Yaddaş təmizləmə
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of spamMap) {
    const filtered = v.filter(t => now - t < 10000);
    if (filtered.length) spamMap.set(k, filtered);
    else spamMap.delete(k);
  }
}, 60000);

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;
    const config = storage.load('config', {});
    const gcfg = config[message.guild.id] || {};
    const now = Date.now();

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

    // ===== AI (Söhbət) =====
    // 1) Bot mention edilibsə cavab ver
    // 2) `.ai <sual>` komandası
    // 3) `.sor <sual>` komandası
    const aiCommand = message.content.startsWith('.ai ') || message.content.startsWith('.sor ');
    const aiMention = message.mentions.has(client.user.id);

    if (aiCommand || aiMention) {
      let prompt = message.content;
      if (aiCommand) {
        prompt = message.content.slice(4).trim();
      } else if (aiMention) {
        prompt = message.content.replace(`<@${client.user.id}>`, '').replace(`<@!${client.user.id}>`, '').trim();
      }
      if (!prompt) prompt = 'Salam!';

      await message.channel.sendTyping().catch(() => {});
      const key = `${message.channel.id}-${message.author.id}`;
      const hist = aiHistory.get(key) || [];

      try {
        const answer = await askAI(prompt, {
          message,
          client,
          guild: message.guild,
          member: message.member
        }, hist);

        // Tarixçəyə əlavə et
        hist.push({ role: 'user', content: prompt });
        hist.push({ role: 'assistant', content: answer });
        aiHistory.set(key, hist.slice(-20)); // son 20 mesaj

        // Uzun cavabı böl
        if (answer.length > 1900) {
          const chunks = answer.match(/[\s\S]{1,1900}/g);
          for (const c of chunks) await message.reply(c);
        } else {
          await message.reply(answer);
        }
      } catch (e) {
        console.error('[AI]', e);
        message.reply(`❌ AI xətası: ${e.message.slice(0, 200)}`);
      }
      return;
    }

    // ===== Komanda =====
    if (!message.content.startsWith(client.PREFIX)) return;
    const args = message.content.slice(client.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const cmd = client.commands.get(commandName);
    if (!cmd) return;

    try {
      await cmd.execute(message, args, client, { config, gcfg });
    } catch (e) {
      console.error(`[cmd:${commandName}]`, e);
      message.reply('❌ Komanda işlərkən xəta oldu.').catch(() => {});
    }
  }
};
