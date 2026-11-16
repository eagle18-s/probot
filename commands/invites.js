const { EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  name: 'davetler',
  aliases: ['invites', 'davet'],
  async execute(message, args, client, ctx) {
    const invites = storage.load('invites', {});
    const gData = invites[message.guild.id] || {};

    if (args[0] && message.mentions.users.size) {
      const target = message.mentions.users.first();
      const rec = gData[target.id];
      if (!rec) return message.reply(`❌ **${target.tag}** heç kimi dəvət etməyib.`);
      const embed = new EmbedBuilder()
        .setTitle(`📨 ${target.tag} — Dəvətlər`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: 'Cəmi dəvət', value: `${rec.count}`, inline: true },
          { name: 'Qoşulanlar', value: rec.joined.slice(-5).map(j => `<@${j.userId}>`).join('\n') || '—', inline: false }
        )
        .setColor(0x5865F2);
      return message.reply({ embeds: [embed] });
    }

    const sorted = Object.entries(gData).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.count - a.count).slice(0, 10);
    if (!sorted.length) return message.reply('❌ Hələ heç bir dəvət yoxdur.');
    const embed = new EmbedBuilder()
      .setTitle('🏆 Dəvət Sıralaması')
      .setColor(0x5865F2)
      .setDescription(sorted.map((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} <@${u.id}> — **${u.count}** dəvət`;
      }).join('\n'));
    message.reply({ embeds: [embed] });
  }
};