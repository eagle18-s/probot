const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { makeId } = require('../utils/helpers');

module.exports = {
  name: 'reactionrole',
  aliases: ['rr', 'rrpanel', 'rolmenu'],
  async execute(message, args, client, ctx) {
    const cmd = message.content.slice(client.PREFIX.length).trim().split(/ +/)[0].toLowerCase();
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply('❌ Rolları İdarə Et yetkisi gerekli.');

    // ===== .reactionrole <msgID> <@rol> <emoji> [label] =====
    if (cmd === 'reactionrole' || cmd === 'rr') {
      const msgId = args[0];
      const role = message.mentions.roles.first();
      const emoji = args[2];
      const label = args.slice(3).join(' ') || role?.name || 'Rol';
      if (!msgId || !role || !emoji)
        return message.reply('❌ `.rr <mesajID> @rol <emoji> [label]`');

      const targetMsg = await message.channel.messages.fetch(msgId).catch(() => null);
      if (!targetMsg) return message.reply('❌ Mesaj tapılmadı (eyni kanalda olmalı).');

      const rr = storage.load('reactionRoles', {});
      if (!rr[message.guild.id]) rr[message.guild.id] = {};
      if (!rr[message.guild.id][msgId]) rr[message.guild.id][msgId] = { buttons: [] };

      const id = makeId(8);
      rr[message.guild.id][msgId].buttons.push({ id, roleId: role.id, emoji, label });
      storage.save('reactionRoles', rr);

      // Mesajın embedini yenilə
      const buttons = rr[message.guild.id][msgId].buttons.map(b =>
        new ButtonBuilder()
          .setCustomId(`rr_${b.id}`)
          .setLabel(b.label || 'Rol')
          .setEmoji(b.emoji)
          .setStyle(ButtonStyle.Secondary)
      );
      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

      await targetMsg.edit({ components: rows });
      message.reply(`✅ Rol əlavə edildi: ${role} (emoji: ${emoji})`);
      return;
    }

    // ===== .rrpanel — Select menu ilə =====
    if (cmd === 'rrpanel' || cmd === 'rolmenu') {
      const roleList = message.mentions.roles;
      if (!roleList.size) return message.reply('❌ `.rrpanel @rol1 @rol2 @rol3 ...` (maks 25)');
      if (roleList.size > 25) return message.reply('❌ Maks 25 rol.');

      const options = [];
      for (const role of roleList.values()) {
        options.push({ label: role.name, value: role.id });
      }
      const selectId = makeId(8);

      const embed = new EmbedBuilder()
        .setTitle('📋 Rol Menyusu')
        .setDescription('Aşağıdan rollarınızı seçin:')
        .setColor(0x5865F2);

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`rrsel_${selectId}`)
        .setPlaceholder('Rol seç...')
        .setMinValues(0)
        .setMaxValues(options.length)
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(menu);
      const sent = await message.channel.send({ embeds: [embed], components: [row] });

      const rr = storage.load('reactionRoles', {});
      if (!rr[message.guild.id]) rr[message.guild.id] = {};
      rr[message.guild.id][sent.id] = {
        selectMenuId: selectId,
        options: roleList.map(r => ({ roleId: r.id, label: r.name }))
      };
      storage.save('reactionRoles', rr);

      message.reply(`✅ Rol menüsü yaradıldı: ${sent.url}`);
      return;
    }
  }
};