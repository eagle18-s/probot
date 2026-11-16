const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = {
  name: 'ticket',
  aliases: ['destek'],
  async execute(message, args, client, ctx) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply('❌ Kanal idarəetmə yetkisi.');

    const reason = args.join(' ');
    if (!reason) return message.reply('❌ `.ticket <səbəb>`');

    let category = message.guild.channels.cache.find(c => c.name === 'TICKETS' && c.type === ChannelType.GuildCategory);
    if (!category) {
      category = await message.guild.channels.create({ name: 'TICKETS', type: ChannelType.GuildCategory });
    }

    const name = `ticket-${message.author.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
    const ticketCh = await message.guild.channels.create({
      name, type: ChannelType.GuildText, parent: category.id,
      permissionOverwrites: [
        { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: message.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('🎫 Destek Talebi')
      .setDescription(`**İstifadəçi:** ${message.author}\n**Səbəb:** ${reason}`)
      .setColor(0x5865F2).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Ticketi Bağla').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    const gcfg = ctx.gcfg;
    const ping = gcfg.jailYetkiliRol ? `<@&${gcfg.jailYetkiliRol}>` : '';
    await ticketCh.send({ content: `${ping} Yeni destek talebi!`, embeds: [embed], components: [row] });
    message.reply(`✅ Ticket: ${ticketCh}`);
  }
};