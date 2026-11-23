const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createUserCard(member) {
  const user = member.user;
  const canvas = createCanvas(900, 650);
  const ctx = canvas.getContext('2d');

  // 🔴 STATUS-U ƏN YUXARIDA TƏYİN EDİRİK (Xətanın həlli)
  const status = member.presence?.status || 'offline';

  // ===== 1. ARXA FON =====
  const gradient = ctx.createLinearGradient(0, 0, 900, 650);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(0.5, '#302b63');
  gradient.addColorStop(1, '#24243e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 650);

  // ===== 2. BANNER =====
  try {
    if (user.bannerURL()) {
      const banner = await loadImage(user.bannerURL({ extension: 'png', size: 1024 }));
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.drawImage(banner, 0, 0, 900, 250);
      ctx.restore();
      
      const bannerGrad = ctx.createLinearGradient(0, 150, 0, 250);
      bannerGrad.addColorStop(0, 'rgba(15,12,41,0)');
      bannerGrad.addColorStop(1, 'rgba(15,12,41,1)');
      ctx.fillStyle = bannerGrad;
      ctx.fillRect(0, 150, 900, 100);
    }
  } catch (e) {
    console.log('Banner xətası:', e.message);
  }

  // ===== 3. AVATAR =====
  const avatarX = 80;
  const avatarY = 150;
  const avatarRadius = 80;
  
  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.restore();

    ctx.strokeStyle = member.displayHexColor !== '#000000' ? member.displayHexColor : '#5865F2';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Status nöqtəsi
    const statusColors = {
      online: '#00ff88',
      idle: '#ffaa00',
      dnd: '#ff5555',
      offline: '#72767d'
    };
    ctx.fillStyle = statusColors[status] || '#72767d';
    ctx.beginPath();
    ctx.arc(avatarX + 60, avatarY + 60, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f0c29';
    ctx.lineWidth = 4;
    ctx.stroke();
  } catch (e) {
    console.log('Avatar xətası:', e.message);
  }

  // ===== 4. AD VƏ TAG =====
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px Sans';
  ctx.textAlign = 'left';
  ctx.fillText(member.displayName, 190, 145);

  ctx.fillStyle = '#a1a1a1';
  ctx.font = '22px Sans';
  ctx.fillText(`@${user.username}`, 190, 185);

  // ===== 5. STATUS MƏTNİ =====
  const statusText = {
    online: '🟢 Onlayn',
    idle: '🟡 Boşta',
    dnd: '🔴 Rahatsız Etməyin',
    offline: '⚫ Oflayn'
  }[status] || '⚫ Oflayn';
  
  ctx.fillStyle = '#a1a1a1';
  ctx.font = '18px Sans';
  ctx.fillText(statusText, 190, 220);

  // ===== 6. ROLLAR =====
  const roles = member.roles.cache
    .filter(r => r.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .first(8);

  if (roles.length > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Sans';
    ctx.fillText('🎭 Rollar', 60, 290);

    let roleX = 60;
    let roleY = 320;
    for (const role of roles) {
      const roleName = role.name.length > 15 ? role.name.substring(0, 15) + '...' : role.name;
      ctx.font = '16px Sans';
      const textWidth = ctx.measureText(roleName).width;
      const boxWidth = textWidth + 30;

      if (roleX + boxWidth > 840) {
        roleX = 60;
        roleY += 40;
        if (roleY > 380) break;
      }

      ctx.fillStyle = role.hexColor === '#000000' ? 'rgba(255,255,255,0.1)' : role.hexColor + '33';
      ctx.beginPath();
      ctx.roundRect(roleX, roleY - 20, boxWidth, 30, 15);
      ctx.fill();

      ctx.fillStyle = role.hexColor === '#000000' ? '#ffffff' : role.hexColor;
      ctx.fillText(roleName, roleX + 15, roleY);
      
      roleX += boxWidth + 10;
    }
  }

  // ===== 7. STATİSTİKA QUTULARI =====
  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const statData = [
    { icon: '🆔', label: 'İstifadəçi ID', value: user.id },
    { icon: '📅', label: 'Hesab Yaradılma', value: formatDate(user.createdTimestamp) },
    { icon: '📥', label: 'Serverə Qoşulma', value: formatDate(member.joinedTimestamp) },
    { icon: '🏷️', label: 'Ləqəb', value: member.nickname || 'Yoxdur' },
    { icon: '🎨', label: 'Rol Rəngi', value: member.displayHexColor },
    { icon: '🤖', label: 'Bot?', value: user.bot ? 'Bəli' : 'Xeyr' },
  ];

  let statY = 420;
  for (let i = 0; i < statData.length; i++) {
    const stat = statData[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 60 + col * 270;
    const y = statY + row * 70;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(x, y - 30, 250, 60, 12);
    ctx.fill();

    ctx.fillStyle = '#a1a1a1';
    ctx.font = '14px Sans';
    ctx.fillText(`${stat.icon} ${stat.label}`, x + 15, y - 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Sans';
    const val = String(stat.value).length > 20 ? String(stat.value).substring(0, 20) + '...' : String(stat.value);
    ctx.fillText(val, x + 15, y + 18);
  }

  // ===== 8. ALT YAZI =====
  ctx.fillStyle = '#72767d';
  ctx.font = '16px Sans';
  ctx.textAlign = 'center';
  ctx.fillText('ASTROL • İstifadəçi Məlumat Kartı', 450, 620);

  return canvas.toBuffer('image/png');
}

module.exports = {
  name: 'iuser',
  aliases: ['userinfo', 'infouser', 'kim'],
  async execute(message, args, client, ctx) {
    const target = message.mentions.members.first() || message.member;

    try {
      const buffer = await createUserCard(target);
      const attachment = new AttachmentBuilder(buffer, { name: 'iuser.png' });

      const embed = new EmbedBuilder()
        .setTitle(`👤 ${target.user.tag} - İstifadəçi Məlumatları`)
        .setColor(target.displayHexColor !== '#000000' ? target.displayHexColor : 0x5865F2)
        .setImage('attachment://iuser.png')
        .setFooter({ text: `Sorğu: ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error('iuser xətası:', error);
      message.reply('❌ Şəkil yaradılarkən xəta baş verdi.');
    }
  }
};
