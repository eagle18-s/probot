const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { efendimLog } = require('../utils/logger');
const { parseDuration, parseInt10, makeId } = require('../utils/helpers');

function addCase(guildId, type, targetId, modId, reason, extra = {}) {
  const cases = storage.load('cases', {});
  if (!cases[guildId]) cases[guildId] = { nextId: 1, list: [] };
  const id = cases[guildId].nextId++;
  cases[guildId].list.push({
    id, type, targetId, modId, reason,
    date: Date.now(),
    ...extra
  });
  storage.save('cases', cases);
  return id;
}

module.exports = {
  name: 'ban',
  aliases: ['unban', 'mute', 'timeout', 'unmute', 'kick', 'warn', 'warnings', 'clearwarns', 'clear', 'sil', 'yavaş-mod', 'slowmode', 'case', 'cases'],
  async execute(message, args, client, ctx) {
    const cmd = message.content.slice(client.PREFIX.length).trim().split(/ +/)[0].toLowerCase();
    const { gcfg } = ctx;

    // ========== BAN ==========
    if (cmd === 'ban') {
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
        return message.reply('❌ Ban Members yetkisi gerekli.');
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ Kullanım: `.ban @kişi [sebep]`');
      if (!member.bannable) return message.reply('❌ Bu istifadəçini ban edə bilmərəm.');
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
      await member.send({ embeds: [new EmbedBuilder()
        .setTitle('Banlandınız')
        .setDescription(`**Sunucu:** ${message.guild.name}\n**Banlayan:** ${message.author.tag}\n**Sebep:** ${reason}`)
        .setColor(0xff0000)] }).catch(() => {});
      await member.ban({ reason });
      const caseId = addCase(message.guild.id, 'BAN', member.id, message.author.id, reason);
      await message.reply(`✅ **${member.user.tag}** banlandı. Case: **#${caseId}**`);
      efendimLog(client, message.guild, 'BAN', `**İstifadəçi:** ${member.user.tag}\n**Mod:** ${message.author.tag}\n**Sebep:** ${reason}\n**Case:** #${caseId}`, 0xff0000, true);
    }

    // ========== UNBAN ==========
    if (cmd === 'unban') {
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
        return message.reply('❌ Ban Members yetkisi gerekli.');
      const id = args[0];
      if (!id) return message.reply('❌ Kullanım: `.unban ID`');
      try {
        await message.guild.members.unban(id);
        const caseId = addCase(message.guild.id, 'UNBAN', id, message.author.id, 'Ban qaldırıldı');
        await message.reply(`✅ \`${id}\` banı qaldırıldı. Case: #${caseId}`);
      } catch { message.reply('❌ Banlı istifadəçi tapılmadı.'); }
    }

    // ========== MUTE ==========
    if (cmd === 'mute' || cmd === 'timeout') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return message.reply('❌ Timeout Members yetkisi gerekli.');
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ Kullanım: `.mute @üye <süre> [sebep]` (məs: 10m)`');
      if (!member.moderatable) return message.reply('❌ Bu istifadəçini mute edə bilmərəm.');
      const time = args[1];
      const dur = parseDuration(time);
      if (!dur || dur > 28 * 24 * 60 * 60 * 1000) return message.reply('❌ Keçərli süre (maks 28 gün). Məs: 10m, 2h, 1d');
      const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi';
      await member.timeout(dur, reason);
      const caseId = addCase(message.guild.id, 'MUTE', member.id, message.author.id, reason, { duration: time });
      await message.reply(`✅ **${member.user.tag}** ${time} timeout. Case: #${caseId}`);
    }

    // ========== UNMUTE ==========
    if (cmd === 'unmute') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return message.reply('❌ Yetkin yox.');
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ İstifadəçi etiketlə.');
      await member.timeout(null);
      const caseId = addCase(message.guild.id, 'UNMUTE', member.id, message.author.id, 'Timeout qaldırıldı');
      await message.reply(`✅ **${member.user.tag}** timeout qaldırıldı. Case: #${caseId}`);
    }

    // ========== KICK ==========
    if (cmd === 'kick') {
      if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
        return message.reply('❌ Kick Members yetkisi gerekli.');
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ İstifadəçi etiketlə.');
      if (!member.kickable) return message.reply('❌ Bu istifadəçini kick edə bilmərəm.');
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
      await member.kick(reason);
      const caseId = addCase(message.guild.id, 'KICK', member.id, message.author.id, reason);
      await message.reply(`✅ **${member.user.tag}** atıldı. Case: #${caseId}`);
    }

    // ========== WARN ==========
    if (cmd === 'warn') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return message.reply('❌ Yetkin yox.');
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ İstifadəçi etiketlə.');
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
      const warns = storage.load('warns', {});
      if (!warns[message.guild.id]) warns[message.guild.id] = {};
      if (!warns[message.guild.id][member.id]) warns[message.guild.id][member.id] = [];
      warns[message.guild.id][member.id].push({ reason, mod: message.author.tag, date: Date.now() });
      storage.save('warns', warns);
      const caseId = addCase(message.guild.id, 'WARN', member.id, message.author.id, reason);
      message.reply(`⚠️ **${member.user.tag}** uyarıldı. Toplam: **${warns[message.guild.id][member.id].length}**. Case: #${caseId}`);
    }

    // ========== WARNINGS ==========
    if (cmd === 'warnings') {
      const member = message.mentions.members.first() || message.member;
      const warns = storage.load('warns', {});
      const list = warns[message.guild.id]?.[member.id] || [];
      if (!list.length) return message.reply(`${member.user.tag} üçün uyarı yoxdur.`);
      const embed = new EmbedBuilder()
        .setTitle(`${member.user.tag} — Uyarılar`)
        .setColor(0xffaa00)
        .setDescription(list.map((w, i) => `**${i + 1}.** ${w.reason}\nMod: ${w.mod} • <t:${Math.floor(w.date / 1000)}:R>`).join('\n\n'));
      message.reply({ embeds: [embed] });
    }

    // ========== CLEARWARNS ==========
    if (cmd === 'clearwarns') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return message.reply('❌ Yetkin yox.');
      const member = message.mentions.members.first();
      if (!member) return message.reply('❌ İstifadəçi etiketlə.');
      const warns = storage.load('warns', {});
      if (warns[message.guild.id]) delete warns[message.guild.id][member.id];
      storage.save('warns', warns);
      message.reply(`✅ **${member.user.tag}** uyarıları silindi.`);
    }

    // ========== CLEAR ==========
    if (cmd === 'clear' || cmd === 'sil') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
        return message.reply('❌ Mesaj idarəetmə yetkin yox.');
      const n = parseInt10(args[0]);
      if (n === null || n < 1 || n > 100) return message.reply('❌ 1-100 arası rəqəm yaz.');
      const del = Math.min(n + 1, 100);
      await message.channel.bulkDelete(del, true).catch(() => {});
      const m = await message.channel.send(`✅ ${n} mesaj silindi.`);
      setTimeout(() => m.delete().catch(() => {}), 3000);
    }

    // ========== SLOWMODE ==========
    if (cmd === 'yavaş-mod' || cmd === 'slowmode') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
        return message.reply('❌ Kanal idarəetmə yetkin yox.');
      const s = parseInt10(args[0]);
      if (s === null || s < 0 || s > 21600) return message.reply('❌ 0-21600 saniyə yaz.');
      await message.channel.setRateLimitPerUser(s);
      message.reply(`✅ Yavaş mod: **${s}s**`);
    }

    // ========== CASE ==========
    if (cmd === 'case') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return message.reply('❌ Yetkin yox.');
      const id = parseInt10(args[0]);
      if (!id) return message.reply('❌ Case nömrəsi yaz.');
      const cases = storage.load('cases', {});
      const c = cases[message.guild.id]?.list.find(x => x.id === id);
      if (!c) return message.reply('❌ Case tapılmadı.');
      const embed = new EmbedBuilder()
        .setTitle(`Case #${c.id}`)
        .setColor(0x5865F2)
        .addFields(
          { name: 'Tip', value: c.type, inline: true },
          { name: 'İstifadəçi', value: `<@${c.targetId}>`, inline: true },
          { name: 'Mod', value: `<@${c.modId}>`, inline: true },
          { name: 'Sebep', value: c.reason },
          { name: 'Tarix', value: `<t:${Math.floor(c.date / 1000)}:F>` }
        );
      message.reply({ embeds: [embed] });
    }

    // ========== CASES ==========
    if (cmd === 'cases') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return message.reply('❌ Yetkin yox.');
      const cases = storage.load('cases', {});
      const list = (cases[message.guild.id]?.list || []).slice(-10).reverse();
      if (!list.length) return message.reply('❌ Case yoxdur.');
      const embed = new EmbedBuilder()
        .setTitle('Son 10 Case')
        .setColor(0x5865F2)
        .setDescription(list.map(c => `**#${c.id}** [${c.type}] <@${c.targetId}> — ${c.reason}`).join('\n'));
      message.reply({ embeds: [embed] });
    }
  }
};