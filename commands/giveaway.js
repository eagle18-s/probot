const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { parseDuration } = require('../utils/helpers');
const { makeId } = require('../utils/helpers');
const mgr = require('../utils/giveawayManager');

module.exports = {
  name: 'çekiliş',
  aliases: ['cekiliş', 'giveaway'],
  async execute(message, args, client, ctx) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ Admin yetkisi.');

    const time = args[0];
    const winners = parseInt(args[1], 10);
    const prize = args.slice(2).join(' ');
    if (!time || !winners || !prize || winners < 1)
      return message.reply('❌ `.çekiliş <süre> <say> <ödül>`\nMəs: `.çekiliş 10m 1 Discord Nitro`');

    const dur = parseDuration(time);
    if (!dur || dur < 10000) return message.reply('❌ Minimum 10 saniyə. Məs: 10m, 1h, 1d');

    const endAt = Date.now() + dur;
    const id = makeId(10);

    const embed = new EmbedBuilder()
      .setTitle('🎉 ÇEKİLİŞ BAŞLADI!')
      .setDescription(`**Ödül:** ${prize}\n\n**Qatıl** düyməsinə basın.`)
      .addFields(
        { name: 'Katılımcı Sayısı', value: '0', inline: true },
        { name: 'Kazanan Sayısı', value: `${winners}`, inline: true },
        { name: 'Bitiş', value: `<t:${Math.floor(endAt / 1000)}:R>`, inline: true }
      )
      .setColor(0x5865F2)
      .setFooter({ text: `Başlatan: ${message.author.tag}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('giveaway_join').setLabel('Qatıl').setStyle(ButtonStyle.Success).setEmoji('🎉')
    );

    const sent = await message.channel.send({ embeds: [embed], components: [row] });

    mgr.create(client, {
      id: sent.id,
      channelId: message.channel.id,
      prize, winnersCount: winners,
      participants: [],
      endAt, ended: false
    });

    message.reply(`✅ Çekiliş başladı: ${sent.url}`);
  }
};