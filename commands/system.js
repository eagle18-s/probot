const { PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  name: 'logsetup',
  aliases: ['welcomesetup', 'istatistik', 'sunucubilgi', 'avatar', 'snipe', 'küfür-ekle', 'küfür-sil', 'linkistisna', 'özelodasetup', 'yardim', 'help', 'kanal-yarat', 'kanal-sil', 'mesaj-gönder', 'embed'],
  async execute(message, args, client, ctx) {
    const cmd = message.content.slice(client.PREFIX.length).trim().split(/ +/)[0].toLowerCase();
    const config = ctx.config;
    if (!config[message.guild.id]) config[message.guild.id] = {};
    const gcfg = config[message.guild.id];

    // ===== LOGSETUP =====
    if (cmd === 'logsetup') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi gerekli.');
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply('❌ `.logsetup #kanal`');
      gcfg.logChannel = ch.id;
      storage.save('config', config);
      message.reply(`✅ Log kanalı: ${ch}`);
    }

    // ===== WELCOMESETUP =====
    if (cmd === 'welcomesetup') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi gerekli.');
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply('❌ `.welcomesetup #kanal`');
      gcfg.welcomeLeaveChannel = ch.id;
      storage.save('config', config);
      message.reply(`✅ Welcome/Leave kanalı: ${ch}`);
    }

    // ===== İSTATİSTİK =====
    if (cmd === 'istatistik') {
      await message.guild.members.fetch().catch(() => {});
      const online = message.guild.members.cache.filter(m => m.presence?.status === 'online').size;
      const idle = message.guild.members.cache.filter(m => m.presence?.status === 'idle').size;
      const dnd = message.guild.members.cache.filter(m => m.presence?.status === 'dnd').size;
      const offline = message.guild.memberCount - online - idle - dnd;
      const embed = new EmbedBuilder()
        .setTitle(`${message.guild.name} İstatistikleri`)
        .setThumbnail(message.guild.iconURL({ size: 1024 }))
        .addFields(
          { name: '👥 Cəmi', value: `${message.guild.memberCount}`, inline: true },
          { name: '🟢 Online', value: `${online}`, inline: true },
          { name: '🌙 Boşta', value: `${idle}`, inline: true },
          { name: '⛔ DND', value: `${dnd}`, inline: true },
          { name: '⚫ Offline', value: `${offline}`, inline: true },
          { name: '🚀 Boost', value: `${message.guild.premiumSubscriptionCount || 0}`, inline: true },
          { name: '📁 Kanallar', value: `${message.guild.channels.cache.size}`, inline: true },
          { name: '🎭 Rollar', value: `${message.guild.roles.cache.size}`, inline: true }
        )
        .setColor(0x5865F2).setTimestamp();
      message.reply({ embeds: [embed] });
    }

    // ===== SUNUCUBİLGİ =====
    if (cmd === 'sunucubilgi') {
      const owner = await message.guild.fetchOwner();
      const embed = new EmbedBuilder()
        .setTitle(`${message.guild.name}`)
        .setThumbnail(message.guild.iconURL({ size: 1024 }))
        .addFields(
          { name: 'Sahip', value: owner.user.tag, inline: true },
          { name: 'Üye', value: `${message.guild.memberCount}`, inline: true },
          { name: 'Rol', value: `${message.guild.roles.cache.size}`, inline: true },
          { name: 'Kanal', value: `${message.guild.channels.cache.size}`, inline: true },
          { name: 'Qurulma', value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setColor(0x5865F2);
      message.reply({ embeds: [embed] });
    }

    // ===== AVATAR =====
    if (cmd === 'avatar') {
      const u = message.mentions.users.first() || message.author;
      message.reply({ embeds: [new EmbedBuilder().setTitle(`${u.tag}`).setImage(u.displayAvatarURL({ size: 1024, dynamic: true })).setColor(0x5865F2)] });
    }

    // ===== SNIPE =====
    if (cmd === 'snipe') {
      const snipe = storage.load('snipe', {});
      const list = snipe[message.channel.id];
      if (!list || !list.length) return message.reply('❌ Bu kanalda silinən mesaj yoxdur.');
      const d = list[0];
      const embed = new EmbedBuilder()
        .setAuthor({ name: d.author, iconURL: d.avatar || undefined })
        .setDescription(d.content || '*Mətn yoxdur*')
        .setColor(0x2b2d31).setTimestamp(d.date);
      if (d.image) embed.setImage(d.image);
      message.reply({ embeds: [embed] });
    }

    // ===== KÜFÜR =====
    if (cmd === 'küfür-ekle') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi.');
      const w = args.join(' ').toLowerCase().trim();
      if (!w) return message.reply('❌ Söz yaz.');
      const list = storage.load('küfürler', []);
      if (list.includes(w)) return message.reply('❌ Artıq var.');
      list.push(w);
      storage.save('küfürler', list);
      message.reply(`✅ \`${w}\` əlavə edildi.`);
    }
    if (cmd === 'küfür-sil') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi.');
      const w = args.join(' ').toLowerCase().trim();
      const list = storage.load('küfürler', []);
      const i = list.indexOf(w);
      if (i === -1) return message.reply('❌ Tapılmadı.');
      list.splice(i, 1);
      storage.save('küfürler', list);
      message.reply(`✅ \`${w}\` silindi.`);
    }

    // ===== LINK İSTİSNA =====
    if (cmd === 'linkistisna') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi.');
      const ch = message.mentions.channels.first() || message.channel;
      if (!gcfg.linkExceptions) gcfg.linkExceptions = [];
      if (gcfg.linkExceptions.includes(ch.id)) {
        gcfg.linkExceptions = gcfg.linkExceptions.filter(x => x !== ch.id);
        storage.save('config', config);
        return message.reply(`✅ ${ch} artıq istisna deyil.`);
      }
      gcfg.linkExceptions.push(ch.id);
      storage.save('config', config);
      message.reply(`✅ ${ch} istisna edildi.`);
    }

    // ===== ÖZEL ODA =====
    if (cmd === 'özelodasetup') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi.');
      const cat = await message.guild.channels.create({ name: 'ÖZEL ODALAR', type: ChannelType.GuildCategory });
      const setup = await message.guild.channels.create({
        name: '➕ oda-oluştur', type: ChannelType.GuildVoice, parent: cat.id, userLimit: 1
      });
      gcfg.özelOdaCategory = cat.id;
      gcfg.özelOdaSetupChannel = setup.id;
      storage.save('config', config);
      message.reply('✅ Özel oda sistemi quruldu!');
    }

    // ===== KANAL YARAT =====
    if (cmd === 'kanal-yarat') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi.');
      const name = args[0];
      const tip = (args[1] || '').toLowerCase();
      if (!name || !['herkeseaçık', 'herkeseacik', 'kilitli'].includes(tip))
        return message.reply('❌ `.kanal-yarat <ad> herkeseaçık|kilitli`');
      const isLocked = tip === 'kilitli';
      const ch = await message.guild.channels.create({
        name, type: ChannelType.GuildText,
        permissionOverwrites: isLocked ? [
          { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels] }
        ] : []
      });
      message.reply(`✅ Kanal: ${ch} (${isLocked ? 'Kilitli' : 'Açıq'})`);
    }

    // ===== KANAL SİL =====
    if (cmd === 'kanal-sil') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi.');
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply('❌ `.kanal-sil #kanal`');
      const n = ch.name;
      await ch.delete();
      message.reply(`✅ **${n}** silindi.`);
    }

    // ===== MESAJ GÖNDƏR =====
    if (cmd === 'mesaj-gönder') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi.');
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply('❌ `.mesaj-gönder #kanal mətn`');
      const content = args.slice(1).join(' ');
      if (!content || content.length > 2000) return message.reply('❌ Mətn 1-2000 simvol.');
      await ch.send(content);
      message.reply(`✅ Göndərildi: ${ch}`);
    }

    // ===== EMBED =====
    if (cmd === 'embed') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
        return message.reply('❌ Admin yetkisi.');
      const raw = args.join(' ');
      const parts = raw.split('|').map(s => s.trim());
      if (parts.length < 2) return message.reply('❌ `.embed Başlıq | Mətn | [şəkil_url]`');
      const [title, desc, img] = parts;
      const emb = new EmbedBuilder()
        .setTitle(title).setDescription(desc).setColor(0x5865F2).setTimestamp()
        .setFooter({ text: `Göndərən: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
      if (img && /^https?:\/\//.test(img)) emb.setImage(img);
      await message.channel.send({ embeds: [emb] });
    }

    // ===== YARDIM =====
    if (cmd === 'yardim' || cmd === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('📚 ASTROL Yardım')
        .setDescription(`
**🛡️ Moderasiya:** \`.ban\`, \`.unban\`, \`.mute\`, \`.unmute\`, \`.kick\`, \`.warn\`, \`.warnings\`, \`.clearwarns\`, \`.sil\`, \`.yavaş-mod\`, \`.case\`, \`.cases\`
**🔒 Jail:** \`.jail\`, \`.unjail\`, \`.jailrol\`, \`.üyerol\`, \`.rolver\`, \`.rolal\`
**⭐ XP:** \`.seviye\`, \`.topxp\`, \`.xprofil\`, \`.stat\`
**🎉 Çekiliş:** \`.çekiliş <süre> <say> <ödül>\`
**🎫 Ticket:** \`.ticket <səbəb>\`
**📊 Reaction Roles:** \`.reactionrole <mesajID> <rol> <emoji> [label]\`
**📈 Poll:** \`.anket <sual> | <opt1> | <opt2> ...\`
**📨 Invites:** \`.davetler\`, \`.davetler @user\`
**⚙️ Sistem:** \`.logsetup\`, \`.welcomesetup\`, \`.küfür-ekle\`, \`.küfür-sil\`, \`.linkistisna\`, \`.özelodasetup\`, \`.sunucubilgi\`, \`.avatar\`, \`.snipe\`, \`.kanal-yarat\`, \`.kanal-sil\`, \`.embed\`, \`.mesaj-gönder\`
        `)
        .setColor(0x5865F2);
      message.reply({ embeds: [embed] });
    }
  }
};