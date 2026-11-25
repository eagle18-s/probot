const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Bu funksiyanı həm əmr, həm də emoji üçün istifadə edəcəyik
async function sendInfoEmbed(target, client, author) {
  const totalGuilds = client.guilds.cache.size;
  const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'ASTROL • Gələcəyin Discord Təcrübəsi', iconURL: client.user.displayAvatarURL({ size: 1024 }) })
    .setTitle('✨ **ASTROL BOT** ✨')
    .setDescription(
      '```ansi\n\u001b[1;35mASTROL\u001b[0m, serverinizi sadəcə idarə etmir, onu \u001b[1;36mbir ekosistemə\u001b[0m çevirir.\n```\n' +
      '**ASTROL** — Müasir, sürətli və çoxfunksiyalı bir Discord botudur. Hər şey bir arada, peşəkar və estetik!\n\n' +
      '👑 **Niyə ASTROL?**\n' +
      '> Çünki biz sadəcə əmr yazmağı deyil, **idarə etməyi** sevdiririk. Hər şey aydın, sürətli və göz oxşayandır.'
    )
    .setColor(0x5865F2)
    .setThumbnail(client.user.displayAvatarURL({ size: 1024 }))
    .addFields(
      { name: '🛡️ **Moderasiya & Təhlükəsizlik**', value: '> `🔨 Ban / Unban` — İstifadəçiləri birdəfəlik uzaqlaşdır.\n> `👢 Kick` — İstifadəçiləri qov.\n> `🔇 Mute / Unmute` — Səssizə al və ya səsi aç.\n> `⛔ Jail / Unjail` — Xüsusi həbs otağına sal.\n> `⚠️ Warn / Warnings / Clearwarns` — Xəbərdarlıq sistemi.\n> `🧹 Clear / Sil` — Kanalları təmizlə.\n> `🐢 Slowmode` — Yavaş mod.\n> `🚨 Avtomatik Filtr` — Spam, Link və Küfür bloklanır.\n> `🛡️ Anti-Raid` — Kütləvi basqınlar avtomatik dayandırılır.\n> `📝 Case Sistemi` — Hər cəzanın öz nömrəsi və tarixçəsi var.', inline: false },
      { name: '🎨 **Canvas & Vizual Kartlar**', value: '> `👋 Qarşılama & Vida` — Yeni üzvlər üçün xüsusi şəkillər.\n> `👤 İstifadəçi Məlumatı` — Avatar, rollar, status, qoşulma tarixi.\n> `📈 Riyaziyyat Qrafiki` — f(x) funksiyalarını vizuallaşdır.\n> `💘 Ship` — İki nəfərin sevgi faizini ölç.\n> `📊 Stat Kartı` — İstifadəçinin mesaj və səs statistikası.', inline: false },
      { name: '🎉 **Əyləncə & Kommunal**', value: '> `🎁 Çekiliş` — Butonlu, avtomatik qalib seçən sistem.\n> `📊 Anket (Poll)` — Səsvermə və nəticələr.\n> `🎭 Reaksiya Rolları` — Emoji ilə rol al.\n> `🎫 Ticket Sistemi` — Dəstək taleyi aç.\n> `🎵 Səsli Mesaj (TTS)` — Mətni səsə çevir.\n> `🎲 Oyunlar` — Zar, yazı-tura, random, sual-tap, ship və s.', inline: false },
      { name: '⚙️ **Sistem & İdarəetmə**', value: '> `📝 Log Sistemi` — Bütün hadisələr qeydə alınır.\n> `📨 Dəvət İzləmə` — Kim kimi dəvət edib?\n> `🌐 Veb Panel` — Bütün kanalları, loqları idarə et.\n> `🔒 Kanal Kilidi` — Müəyyən kanalları bağla/aç.\n> `🛠️ Embed Builder` — Xüsusi mesajlar yarat.', inline: false },
      { name: '📊 **Canlı Statistika**', value: `> 🏠 **Server:** \`${totalGuilds}\`\n> 👥 **İstifadəçi:** \`${totalUsers.toLocaleString('az-AZ')}\`\n> ⏱️ **Uptime:** \`${days}g ${hours}s ${minutes}d\`\n> 📡 **Ping:** \`${client.ws.ping}ms\``, inline: true },
      { name: '⚙️ **Texnologiya**', value: `> Node.js (v${process.version.replace('v', '')})\n> Discord.js v14\n> @napi-rs/canvas\n> mathjs & Canvas`, inline: true }
    )
    .setFooter({ text: `ASTROL • Sorğu edən: ${author.tag}`, iconURL: author.displayAvatarURL() })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Botu Dəvət Et').setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`).setStyle(ButtonStyle.Link).setEmoji('🚀'),
    new ButtonBuilder().setLabel('Veb Panel').setURL(process.env.RENDER_EXTERNAL_URL || 'https://your-app.onrender.com').setStyle(ButtonStyle.Link).setEmoji('🌐'),
    new ButtonBuilder().setLabel('Dəstək Serveri').setURL('https://discord.gg/SENIN_SERVER_LINKIN').setStyle(ButtonStyle.Link).setEmoji('💬')
  );

  await target.reply({ embeds: [embed], components: [row] });
}

module.exports = {
  name: 'haqqinda',
  aliases: ['botbilgi', 'info', 'astrol'],
  async execute(message, args, client, ctx) {
    await sendInfoEmbed(message, client, message.author);
  },
  sendInfoEmbed // Emoji üçün bunu export edirik
};
