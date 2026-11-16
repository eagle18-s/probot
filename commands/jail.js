const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { efendimLog } = require('../utils/logger');

module.exports = {
  name: 'jail',
  aliases: ['unjail', 'jailrol', 'jailytrol', 'üyerol', 'rolver', 'rolal'],
  async execute(message, args, client, ctx) {
    const cmd = message.content.slice(client.PREFIX.length).trim().split(/ +/)[0].toLowerCase();
    const config = ctx.config;
    if (!config[message.guild.id]) config[message.guild.id] = {};
    const gcfg = config[message.guild.id];

    if (cmd === 'jailrol') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const id = args[0];
      if (!id) return message.reply('❌ Rol ID.');
      gcfg.jailRole = id;
      storage.save('config', config);
      return message.reply(`✅ Jail rolu: <@&${id}>`);
    }
    if (cmd === 'jailytrol') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const r = message.mentions.roles.first();
      if (!r) return message.reply('❌ Rol etiketlə.');
      gcfg.jailYetkiliRol = r.id;
      storage.save('config', config);
      return message.reply(`✅ Jail yetkili rolu: ${r}`);
    }
    if (cmd === 'üyerol') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const r = message.mentions.roles.first();
      if (!r) return message.reply('❌ Rol etiketlə.');
      gcfg.üyeRol = r.id;
      storage.save('config', config);
      return message.reply(`✅ Üzvə rolu: ${r}`);
    }

    if (cmd === 'jail') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Yetkin yox.');
      if (!gcfg.jailRole) return message.reply('❌ Əvvəlcə `.jailrol <ID>`');
      const m = message.mentions.members.first();
      if (!m) return message.reply('❌ İstifadəçi etiketlə.');
      if (m.roles.highest.position >= message.guild.members.me.roles.highest.position)
        return message.reply('❌ Bu istifadəçini jail edə bilmərəm.');
      // Rolları yadda saxla
      const jailData = storage.load('jailData', {});
      if (!jailData[message.guild.id]) jailData[message.guild.id] = {};
      jailData[message.guild.id][m.id] = m.roles.cache.filter(r => r.id !== message.guild.id && r.id !== gcfg.jailRole).map(r => r.id);
      storage.save('jailData', jailData);
      await m.roles.set([gcfg.jailRole]).catch(() => {});
      await message.reply(`🔒 **${m.user.tag}** jail edildi.`);
      efendimLog(client, message.guild, 'JAIL', `**${m.user.tag}** — Mod: ${message.author.tag}`, 0x8b0000);
    }

    if (cmd === 'unjail') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Yetkin yox.');
      const m = message.mentions.members.first();
      if (!m) return message.reply('❌ İstifadəçi etiketlə.');
      const jailData = storage.load('jailData', {});
      const saved = jailData[message.guild.id]?.[m.id] || (gcfg.üyeRol ? [gcfg.üyeRol] : []);
      await m.roles.set(saved).catch(() => {});
      if (jailData[message.guild.id]) delete jailData[message.guild.id][m.id];
      storage.save('jailData', jailData);
      await message.reply(`🔓 **${m.user.tag}** jaildən çıxarıldı.`);
      efendimLog(client, message.guild, 'UNJAIL', `**${m.user.tag}** — Mod: ${message.author.tag}`, 0x00ff00);
    }

    if (cmd === 'rolver') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ Yetkin yox.');
      const m = message.mentions.members.first();
      const r = message.mentions.roles.first();
      if (!m || !r) return message.reply('❌ `.rolver @üzvə @rol`');
      try { await m.roles.add(r); message.reply(`✅ ${m} → ${r}`); }
      catch (e) { message.reply('❌ Rol verilə bilmədi (bot rolu yuxarı olmalı).'); }
    }

    if (cmd === 'rolal') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ Yetkin yox.');
      const m = message.mentions.members.first();
      const r = message.mentions.roles.first();
      if (!m || !r) return message.reply('❌ `.rolal @üzvə @rol`');
      try { await m.roles.remove(r); message.reply(`✅ ${m} ← ${r}`); }
      catch (e) { message.reply('❌ Rol alına bilmədi.'); }
    }
  }
};