const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createShipCard(user1, user2, percentage) {
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');

  // Arxa fon (Tünd bənövşəyi gradient)
  const gradient = ctx.createLinearGradient(0, 0, 800, 400);
  gradient.addColorStop(0, '#2b1055');
  gradient.addColorStop(1, '#7597de');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 400);

  // Ürək və ulduz effektləri
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 800, Math.random() * 400, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 1-ci Avatar
  try {
    const avatar1 = await loadImage(user1.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar1, 100, 100, 200, 200);
    ctx.restore();
    
    // Çərçivə
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, Math.PI * 2);
    ctx.stroke();
  } catch (e) {
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2-ci Avatar
  try {
    const avatar2 = await loadImage(user2.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(600, 200, 100, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar2, 500, 100, 200, 200);
    ctx.restore();

    // Çərçivə
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(600, 200, 100, 0, Math.PI * 2);
    ctx.stroke();
  } catch (e) {
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(600, 200, 100, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ortadakı Ürək
  ctx.fillStyle = '#ff3366';
  ctx.font = 'bold 80px Sans';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❤️', 400, 200);

  // Faiz və Rəng
  let color = '#ff3366';
  let text = '';
  if (percentage < 20) { color = '#ff0000'; text = 'Heç şans yoxdur 😭'; }
  else if (percentage < 40) { color = '#ff8800'; text = 'Çox az şans var 😕'; }
  else if (percentage < 60) { color = '#ffff00'; text = 'Yaxşıdır, amma... 🤔'; }
  else if (percentage < 80) { color = '#00ff88'; text = 'Yaxşı cütlüksünüz! 😊'; }
  else { color = '#ff00ff'; text = 'MÜKEMMEL CÜTLÜK! 💖'; }

  // Faiz yazısı
  ctx.fillStyle = color;
  ctx.font = 'bold 60px Sans';
  ctx.fillText(`%${percentage}`, 400, 320);

  // Alt yazı
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Sans';
  ctx.fillText(text, 400, 370);

  // İstifadəçi adları
  ctx.font = 'bold 22px Sans';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(user1.username, 200, 360);
  ctx.fillText(user2.username, 600, 360);

  return canvas.toBuffer('image/png');
}

module.exports = {
  name: 'ship',
  aliases: ['aşk', 'sevgi'],
  async execute(message, args, client, ctx) {
    let target1 = message.mentions.users.first();
    let target2 = message.mentions.users.at(1);

    // Əgər heç kim etiketlənməyibsə
    if (!target1) {
      target1 = message.author;
      // Serverdən random adam seç (botlar və özü xaric)
      const members = await message.guild.members.fetch();
      const possible = members.filter(m => !m.user.bot && m.id !== target1.id);
      
      if (possible.size === 0) return message.reply('❌ Serverdə başqa insan yoxdur ki, səni kiminləsə ship edim!');
      
      target2 = possible.random().user;
    } 
    // Yalnız 1 nəfər etiketlənibsə
    else if (!target2) {
      target2 = message.author;
      if (target1.id === target2.id) {
        target1 = message.author;
        const members = await message.guild.members.fetch();
        const possible = members.filter(m => !m.user.bot && m.id !== target1.id);
        if (possible.size === 0) return message.reply('❌ Serverdə başqa insan yoxdur!');
        target2 = possible.random().user;
      }
    }

    // Şans faizini hesabla (0 - 100)
    const percentage = Math.floor(Math.random() * 101);
    
    try {
      const buffer = await createShipCard(target1, target2, percentage);
      const attachment = new AttachmentBuilder(buffer, { name: 'ship.png' });
      
      const embed = new EmbedBuilder()
        .setTitle('💘 Ship Nəticəsi')
        .setDescription(`**${target1.username}** və **${target2.username}** arasındakı sevgi faizi: **%${percentage}**`)
        .setColor(percentage < 30 ? 0xff0000 : percentage < 70 ? 0xffaa00 : 0xff00ff)
        .setImage('attachment://ship.png')
        .setFooter({ text: `İstəyən: ${message.author.tag}` });

      await message.reply({ embeds: [embed], files: [attachment] });
    } catch (err) {
      console.error('Ship xətası:', err);
      message.reply('❌ Şəkil yaradılarkən xəta baş verdi.');
    }
  }
};
