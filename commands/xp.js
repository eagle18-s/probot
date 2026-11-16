const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { xpForLevel } = require('../utils/helpers');
const { createXPProfileCard, createStatCard } = require('../utils/canvas');

module.exports = {
  name: 'seviye',
  aliases: ['level', 'topxp', 'toplevel', 'xprofil', 'stat'],
  async execute(message, args, client, ctx) {
    const cmd = message.content.slice(client.PREFIX.length).trim().split(/ +/)[0].toLowerCase();
    const xpData = storage.load('xp', {});
    const guildData = xpData[message.guild.id] || {};

    if (cmd === 'seviye' || cmd === 'level') {
      const target = message.mentions.users.first() || message.author;
      const d = guildData[target.id] || { xp: 0, level: 0, messages: 0, voiceTime: 0 };
      const current = xpForLevel(d.level);
      const next = xpForLevel(d.level + 1);
      const embed = new EmbedBuilder()
        .setTitle(`${target.username} — Seviye`)
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '🏆 Seviye', value: `${d.level}`, inline: true },
          { name: '⭐ XP', value: `${d.xp}`, inline: true },
          { name: '📊 İlerleme', value: `${d.xp - current} / ${next - current}`, inline: true }
        )
        .setColor(0x5865F2).setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (cmd === 'topxp' || cmd === 'toplevel') {
      const sorted = Object.entries(guildData).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.xp - a.xp).slice(0, 10);
      if (!sorted.length) return message.reply('❌ XP məlumatı yoxdur.');
      let desc = '';
      sorted.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        desc += `${medal} <@${u.id}> — Lv **${u.level}** | ${u.xp} XP\n`;
      });
      return message.reply({ embeds: [new EmbedBuilder().setTitle('🏆 XP Sıralaması').setDescription(desc).setColor(0x5865F2).setTimestamp()] });
    }

    if (cmd === 'xprofil') {
      const target = message.mentions.users.first() || message.author;
      const d = guildData[target.id] || { xp: 0, level: 0, messages: 0, voiceTime: 0 };
      const sorted = Object.entries(guildData).sort((a, b) => b[1].xp - a[1].xp);
      const rank = sorted.findIndex(([id]) => id === target.id) + 1 || 1;
      try {
        const buf = await createXPProfileCard(target, d, rank);
        return message.reply({ files: [new AttachmentBuilder(buf, { name: 'xp.png' })] });
      } catch (e) { console.error(e); message.reply('❌ Kart yaradılmadı.'); }
    }

    if (cmd === 'stat') {
      const target = message.mentions.users.first() || message.author;
      const d = guildData[target.id] || { xp: 0, level: 0, messages: 0, voiceTime: 0 };
      try {
        const buf = await createStatCard(target, d);
        return message.reply({ files: [new AttachmentBuilder(buf, { name: 'stat.png' })] });
      } catch (e) { console.error(e); message.reply('❌ Kart yaradılmadı.'); }
    }
  }
};