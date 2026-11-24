const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'haqqinda',
  aliases: ['botbilgi', 'info', 'astrol'],
  async execute(message, args, client, ctx) {
    // Botun ümumi statistikası
    const totalGuilds = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    
    // Uptime hesablanması
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: 'ASTROL • Gələcəyin Discord Təcrübəsi', 
        iconURL: client.user.displayAvatarURL({ size: 1024 }) 
      })
      .setTitle('✨ **ASTROL BOT** ✨')
      .setDescription(
        '```ansi\n\u001b[1;35mASTROL\u001b[0m, serverinizi sadəcə idarə etmir, onu \u001b[1;36mbir ekosistemə\u001b[0m çevirir.\n```\n' +
        '**ASTROL** — Müasir, sürətli və çoxfunksiyalı bir Discord botudur. Moderasiyadan tutmuş Süni İntellektə, Riyaziyyatdan tutmuş Veb Panelə qədər hər şey bir arada!\n\n' +
        '👑 **Niyə ASTROL?**\n' +
        '> Çünki biz sadəcə əmr yazmağı deyil, **idarə etməyi** sevdiririk. Hər şey aydın, estetik və sürətlidir.'
      )
      .setColor(0x5865F2)
      .setThumbnail(client.user.displayAvatarURL({ size: 1024 }))
      

      // ==== MODERASİYA ====
      .addFields({
        name: '🛡️ **Moderasiya & Təhlükəsizlik**',
        value: 
          '> `Ban`, `Kick`, `Mute`, `Jail`, `Warn`\n' +
          '> Avtomatik **Spam**, **Link** və **Küfür** Filtrasiyası\n' +
          '> Anti-Raid Qoruması və Detallı Loqlar',
        inline: false
      })



      // ==== CANVAS & VİZUAL ====
      .addFields({
        name: '🎨 **Canvas & Vizuallıq**',
        value: 
          '> Xoş gəldin/Vida kartları\n' +
          '> İstifadəçi məlumat kartları (`.iuser`)\n' +
          '> Riyazi funksiya qrafikləri (`.riyaziyyat`)\n' +
          '> Ship (Sevgi faizi) kartları (`.ship`)',
        inline: false
      })

      // ==== ƏYLƏNCƏ & SİSTEM ====
      .addFields({
        name: '🎉 **Əyləncə & Kommunal**',
        value: 
          '> Çekiliş (Giveaway) Sistemi\n' +
          '> Anketlər (Poll) və Reaksiya Rolları\n' +
          '> Ticket Dəstək Sistemi\n' +
          '> Musiqi/Səs effektləri (`.tts`)',
        inline: false
      })

      // ==== VEB PANEL ====
      .addFields({
        name: '🌐 **İnnovativ Veb Panel**',
        value: 
          '> Discord OAuth2 ilə təhlükəsiz giriş\n' +
          '> Kanal yaratma, silmə və kilidləmə\n' +
          '> Log, Qarşılama kanallarını 1 kliklə dəyişmə\n' +
          '> Çekilişləri idarə etmə',
        inline: false
      })

      // ==== STATİSTİKA ====
      .addFields({
        name: '📊 **Canlı Statistika**',
        value: 
          `> 🏠 **Server:** \`${totalGuilds}\`\n` +
          `> 👥 **İstifadəçi:** \`${totalUsers.toLocaleString('az-AZ')}\`\n` +
          `> ⏱️ **İşləmə müddəti:** \`${days}g ${hours}s ${minutes}d\`\n` +
          `> 📡 **Ping:** \`${client.ws.ping}ms\``,
        inline: true
      })

      .addFields({
        name: '⚙️ **Texnologiya**',
        value: 
          `> Node.js (v${process.version.replace('v', '')})\n` +
          `> Discord.js v14\n` +
          `> @napi-rs/canvas\n` +
          `> mathjs & Gemini AI`,
        inline: true
      })

      .setFooter({ 
        text: `ASTROL • Sorğu edən: ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTimestamp();

    // Butonlar
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Botu Dəvət Et')
        .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
        .setStyle(ButtonStyle.Link)
        .setEmoji('🚀'),
      new ButtonBuilder()
        .setLabel('Veb Panel')
        .setURL(process.env.RENDER_EXTERNAL_URL || 'https://your-app.onrender.com')
        .setStyle(ButtonStyle.Link)
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setLabel('Dəstək Serveri')
        .setURL('https://https://discord.gg/mDQHG6wF7B') // Buraya öz dəstək linkini yaz
        .setStyle(ButtonStyle.Link)
        .setEmoji('💬')
    );

    await message.reply({ embeds: [embed], components: [row] });
  }
};
