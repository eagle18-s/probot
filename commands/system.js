const { PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  name: 'logsetup',
  aliases: [
    'welcomesetup', 'istatistik', 'sunucubilgi', 'avatar', 'snipe', 
    'küfür-ekle', 'küfür-sil', 'linkistisna', 'özelodasetup', 'yardim', 'help', 
    'kanal-yarat', 'kanal-sil', 'mesaj-gönder', 'embed', 'kilit', 'kilitaç',
    'ping', 'botbilgi', 'random', 'zar', 'yazı-tura'
  ],
  async execute(message, args, client, ctx) {
    const cmd = message.content.slice(client.PREFIX.length).trim().split(/ +/)[0].toLowerCase();
    const config = ctx.config;
    if (!config[message.guild.id]) config[message.guild.id] = {};
    const gcfg = config[message.guild.id];

    // ===== LOGSETUP =====
    if (cmd === 'logsetup') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin yetkisi.');
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply('❌ `.logsetup #kanal`');
      gcfg.logChannel = ch.id; storage.save('config', config);
      message.reply(`✅ Log kanalı: ${ch}`);
    }

    // ===== WELCOMESETUP =====
    if (cmd === 'welcomesetup') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin yetkisi.');
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply('❌ `.welcomesetup #kanal`');
      gcfg.welcomeLeaveChannel = ch.id; storage.save('config', config);
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
        ).setColor(0x5865F2).setTimestamp();
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
        ).setColor(0x5865F2);
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
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const w = args.join(' ').toLowerCase().trim();
      if (!w) return message.reply('❌ Söz yaz.');
      const list = storage.load('küfürler', []);
      if (list.includes(w)) return message.reply('❌ Artıq var.');
      list.push(w); storage.save('küfürler', list);
      message.reply(`✅ \`${w}\` əlavə edildi.`);
    }
    if (cmd === 'küfür-sil') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const w = args.join(' ').toLowerCase().trim();
      const list = storage.load('küfürler', []);
      const i = list.indexOf(w);
      if (i === -1) return message.reply('❌ Tapılmadı.');
      list.splice(i, 1); storage.save('küfürler', list);
      message.reply(`✅ \`${w}\` silindi.`);
    }

    // ===== LINK İSTİSNA =====
    if (cmd === 'linkistisna') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const ch = message.mentions.channels.first() || message.channel;
      if (!gcfg.linkExceptions) gcfg.linkExceptions = [];
      if (gcfg.linkExceptions.includes(ch.id)) {
        gcfg.linkExceptions = gcfg.linkExceptions.filter(x => x !== ch.id);
        storage.save('config', config);
        return message.reply(`✅ ${ch} artıq istisna deyil.`);
      }
      gcfg.linkExceptions.push(ch.id); storage.save('config', config);
      message.reply(`✅ ${ch} istisna edildi.`);
    }

    // ===== ÖZEL ODA =====
    if (cmd === 'özelodasetup') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const cat = await message.guild.channels.create({ name: 'ÖZEL ODALAR', type: ChannelType.GuildCategory });
      const setup = await message.guild.channels.create({ name: '➕ oda-oluştur', type: ChannelType.GuildVoice, parent: cat.id, userLimit: 1 });
      gcfg.özelOdaCategory = cat.id; gcfg.özelOdaSetupChannel = setup.id;
      storage.save('config', config);
      message.reply('✅ Özel oda sistemi quruldu!');
    }

    // ===== KANAL YARAT =====
    if (cmd === 'kanal-yarat') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
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
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply('❌ `.kanal-sil #kanal`');
      const n = ch.name;
      await ch.delete();
      message.reply(`✅ **${n}** silindi.`);
    }

    // ===== KİLİT =====
    if (cmd === 'kilit') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Yönetici yetkisi gerekli.');
      const ch = message.mentions.channels.first() || message.channel;
      try {
        await ch.permissionOverwrites.edit(message.guild.id, { ViewChannel: false });
        await ch.permissionOverwrites.edit(client.user.id, { ViewChannel: true, SendMessages: true, ManageChannels: true });
        await message.reply(`🔒 ${ch} kanalı kilitlendi.`);
      } catch { message.reply('❌ Kanal kilitlenirken hata oluştu.'); }
    }

    // ===== KİLİT AÇ =====
    if (cmd === 'kilitaç') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Yönetici yetkisi gerekli.');
      const ch = message.mentions.channels.first() || message.channel;
      try {
        await ch.permissionOverwrites.edit(message.guild.id, { ViewChannel: true });
        await message.reply(`🔓 ${ch} kanalının kilidi açıldı.`);
      } catch { message.reply('❌ Kanal açılırken hata oluştu.'); }
    }

    // ===== MESAJ GÖNDƏR =====
    if (cmd === 'mesaj-gönder') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply('❌ `.mesaj-gönder #kanal mətn`');
      const content = args.slice(1).join(' ');
      if (!content || content.length > 2000) return message.reply('❌ Mətn 1-2000 simvol.');
      await ch.send(content);
      message.reply(`✅ Göndərildi: ${ch}`);
    }

    // ===== EMBED =====
    if (cmd === 'embed') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Admin.');
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

    // ===== PING (YENİ) =====
    if (cmd === 'ping') {
      const ping = client.ws.ping;
      const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription(`Botun gecikməsi: **${ping}ms**`)
        .setColor(ping < 100 ? 0x00ff00 : ping < 200 ? 0xffaa00 : 0xff0000);
      message.reply({ embeds: [embed] });
    }

    // ===== BOTBİLGİ (YENİ) =====
    if (cmd === 'botbilgi') {
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const embed = new EmbedBuilder()
        .setTitle(`🤖 ${client.user.username} Məlumatları`)
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: '⏱️ İşləmə müddəti', value: `${days}g ${hours}s ${minutes}d`, inline: true },
          { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
          { name: '📚 Kitabxana', value: 'discord.js v14', inline: true },
          { name: '💾 Yaddaş', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
          { name: '🌐 Server sayı', value: `${client.guilds.cache.size}`, inline: true },
          { name: '👥 İstifadəçi sayı', value: `${client.users.cache.size}`, inline: true }
        ).setColor(0x5865F2);
      message.reply({ embeds: [embed] });
    }

    // ===== RANDOM (YENİ) =====
    if (cmd === 'random') {
      const min = parseInt(args[0], 10) || 1;
      const max = parseInt(args[1], 10) || 100;
      if (min >= max) return message.reply('❌ Birinci rəqəm ikincidən kiçik olmalıdır.');
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      message.reply(`🎲 **${min}** və **${max}** arasındakı təsadüfi ədəd: **${result}**`);
    }

    // ===== ZAR (YENİ) =====
    if (cmd === 'zar') {
      const faces = parseInt(args[0], 10) || 6;
      if (faces < 2) return message.reply('❌ Zər ən azı 2 üzlü olmalıdır.');
      const result = Math.floor(Math.random() * faces) + 1;
      message.reply(`🎲 **${faces}** üzlü zər atıldı: **${result}**`);
    }

    // ===== YAZI-TURA (YENİ) =====
    if (cmd === 'yazı-tura') {
      const result = Math.random() < 0.5 ? '🪙 **Yazı**' : '🪙 **Tura**';
      message.reply(result);
    }

    // ===== YARDIM (Butonlu və Menyulu - TAM YENİLƏNMİŞ) =====
    if (cmd === 'yardim' || cmd === 'help') {
      const kategoriler = {
        moderasiya: {
          label: 'Moderasiya', emoji: '🛡️', color: 0xff0000, desc: 'Ban, mute, kick və s.',
          commands: [
            { cmd: '.ban @kişi [səbəb]', desc: 'İstifadəçini banlayır' },
            { cmd: '.unban <ID>', desc: 'Banı qaldırır' },
            { cmd: '.mute @üzvə <süre>', desc: 'Timeout verir (10m)' },
            { cmd: '.unmute @üzvə', desc: 'Timeout-u qaldırır' },
            { cmd: '.kick @üzvə [səbəb]', desc: 'Sunucudan atır' },
            { cmd: '.warn @üzvə [səbəb]', desc: 'Uyarı verir' },
            { cmd: '.warnings @üzvə', desc: 'Uyarıları göstərir' },
            { cmd: '.clearwarns @üzvə', desc: 'Uyarıları silir' },
            { cmd: '.sil <sayı>', desc: 'Mesaj silir (1-100)' },
            { cmd: '.yavaş-mod <saniyə>', desc: 'Yavaş mod açır' },
            { cmd: '.case <ID>', desc: 'Case (hadisə) məlumatına baxır' },
            { cmd: '.cases', desc: 'Son 10 case-i göstərir' }
          ]
        },
        jail: {
          label: 'Jail & Rol', emoji: '🔒', color: 0x8b0000, desc: 'Jail və rol əmrləri',
          commands: [
            { cmd: '.jail @üzvə', desc: 'Jail-ə atır' },
            { cmd: '.unjail @üzvə', desc: 'Jail-dən çıxarır' },
            { cmd: '.jailrol <ID>', desc: 'Jail rolunu ayarlayır' },
            { cmd: '.jailytrol @rol', desc: 'Jail yetkili rolunu ayarlayır' },
            { cmd: '.üyerol @rol', desc: 'Üzvə rolunu ayarlayır' },
            { cmd: '.rolver @üzvə @rol', desc: 'Rol verir' },
            { cmd: '.rolal @üzvə @rol', desc: 'Rol alır' }
          ]
        },
        kanal: {
          label: 'Kanal İdarəsi', emoji: '📁', color: 0x3498db, desc: 'Kanal yaratma və kilidləmə',
          commands: [
            { cmd: '.kilit [#kanal]', desc: 'Kanalı @everyone üçün kilidləyir' },
            { cmd: '.kilitaç [#kanal]', desc: 'Kanalın kilidini açır' },
            { cmd: '.kanal-yarat <ad> <açıq/kilitli>', desc: 'Yeni mətn kanalı yaradır' },
            { cmd: '.kanal-sil #kanal', desc: 'Kanalı silir' },
            { cmd: '.mesaj-gönder #kanal <mətn>', desc: 'Kanala mesaj göndərir' },
            { cmd: '.özelodasetup', desc: 'Özel səs otaqları qurur' }
          ]
        },
        sistem: {
          label: 'Sistem', emoji: '⚙️', color: 0x00ff00, desc: 'Log, embed, statistika',
          commands: [
            { cmd: '.logsetup #kanal', desc: 'Log kanalı' },
            { cmd: '.welcomesetup #kanal', desc: 'Qarşılama kanalı' },
            { cmd: '.embed Başlıq | Mətn', desc: 'Embed göndərir' },
            { cmd: '.küfür-ekle/sil <söz>', desc: 'Qadağan sözləri idarə edir' },
            { cmd: '.linkistisna #kanal', desc: 'Link qadağasından azad edir' },
            { cmd: '.istatistik', desc: 'Server statistikası' },
            { cmd: '.sunucubilgi', desc: 'Server haqqında məlumat' },
            { cmd: '.avatar [@üzvə]', desc: 'Avatarı göstərir' },
            { cmd: '.snipe', desc: 'Son silinən mesajı göstərir' }
          ]
        },
        eylence: {
          label: 'Əyləncə & Kommunal', emoji: '🎉', color: 0xffaa00, desc: 'Çekiliş, anket, ping və s.',
          commands: [
            { cmd: '.çekiliş <süre> <say> <ödül>', desc: 'Çekiliş başladır' },
            { cmd: '.anket Sual | V1 | V2', desc: 'Anket yaradır' },
            { cmd: '.ticket <səbəb>', desc: 'Dəstək taleyi açır' },
            { cmd: '.ping', desc: 'Botun gecikməsini ölçür' },
            { cmd: '.botbilgi', desc: 'Bot haqqında texniki məlumat' },
            { cmd: '.random <min> <max>', desc: 'Təsadüfi ədəd seçir' },
            { cmd: '.zar [üz]', desc: 'Zər atır (default 6)' },
            { cmd: '.yazı-tura', desc: 'Yazı və ya tura atır' },
            { cmd: '.ship [@üzvə1] [@üzvə2]', desc: 'İki nəfərin sevgi faizini ölçür' },
            { cmd: '.ship', desc: 'Heç kim yazılmasa random biri ilə ship edir' }
          ]
        },
        davet: {
          label: 'Dəvətlər', emoji: '📨', color: 0x2b2d31, desc: 'Dəvət sayları',
          commands: [
            { cmd: '.davetler', desc: 'Dəvət sıralaması' },
            { cmd: '.davetler @üzvə', desc: 'İstifadəçinin dəvətləri' }
          ]
        }
      };

      const anaEmbed = new EmbedBuilder()
        .setTitle('📚 ASTROL Kömək Mərkəzi')
        .setDescription('Aşağıdakı menyudan kateqoriya seçərək komandalara baxa bilərsiniz.\n\n**Kateqoriyalar:**\n🛡️ Moderasiya • 🔒 Jail & Rol • 📁 Kanal İdarəsi\n⚙️ Sistem • 🎉 Əyləncə • 📨 Dəvətlər')
        .setColor(0x5865F2)
        .setFooter({ text: 'ASTROL Bot • Butonlara basaraq keçid edin' })
        .setThumbnail(client.user.displayAvatarURL());

      const menu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 Kateqoriya seçin...')
        .addOptions(Object.entries(kategoriler).map(([k, v]) => ({ label: v.label, description: v.desc, value: k, emoji: v.emoji })));

      const anaRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('help_home').setLabel('Ana Səhifə').setStyle(ButtonStyle.Secondary).setEmoji('🏠')
      );

      const msg = await message.reply({ embeds: [anaEmbed], components: [new ActionRowBuilder().addComponents(menu), anaRow] });

      const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 15 * 60 * 1000 });

      collector.on('collect', async (i) => {
        if (i.customId === 'help_home') {
          return i.update({ embeds: [anaEmbed], components: [new ActionRowBuilder().addComponents(menu), anaRow] });
        }
        if (i.customId === 'help_menu') {
          const kat = kategoriler[i.values[0]];
          const embed = new EmbedBuilder()
            .setTitle(`${kat.emoji} ${kat.label} Komandaları`)
            .setDescription(kat.commands.map(c => `**${c.cmd}**\n> ${c.desc}`).join('\n\n'))
            .setColor(kat.color)
            .setFooter({ text: 'ASTROL Bot • Ana səhifəyə dönmək üçün 🏠 düyməsinə basın' });
          const geriRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help_home').setLabel('Ana Səhifə').setStyle(ButtonStyle.Secondary).setEmoji('🏠')
          );
          await i.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu), geriRow] });
        }
      });

      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
    }
  }
}; 
