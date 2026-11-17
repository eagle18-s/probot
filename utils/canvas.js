const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createWelcomeCard(member, memberCount) {
  const canvas = createCanvas(1000, 400);
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 1000, 400);
  g.addColorStop(0, '#1a1a2e'); g.addColorStop(1, '#16213e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 400);
  ctx.strokeStyle = '#5865F2'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1000, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 400); ctx.lineTo(1000, 400); ctx.stroke();
  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath(); ctx.arc(180, 200, 100, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(avatar, 80, 100, 200, 200); ctx.restore();
    ctx.strokeStyle = '#5865F2'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(180, 200, 100, 0, Math.PI * 2); ctx.stroke();
  } catch {
    ctx.fillStyle = '#5865F2';
    ctx.beginPath(); ctx.arc(180, 200, 100, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 42px Sans'; ctx.fillText('HOŞ GELDİN!', 320, 130);
  ctx.fillStyle = '#5865F2'; ctx.font = 'bold 36px Sans'; ctx.fillText(member.user.username, 320, 190);
  ctx.fillStyle = '#b9bbbe'; ctx.font = '28px Sans'; ctx.fillText('Sunucuya katıldı!', 320, 240);
  ctx.fillStyle = '#fff'; ctx.font = '24px Sans'; ctx.fillText(`Toplam Üye: ${memberCount}`, 320, 300);
  ctx.fillStyle = '#72767d'; ctx.font = '20px Sans'; ctx.fillText(member.guild.name, 320, 340);
  return canvas.toBuffer('image/png');
}

async function createLeaveCard(user, memberCount, guildName) {
  const canvas = createCanvas(1000, 400);
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 1000, 400);
  g.addColorStop(0, '#2e1a1a'); g.addColorStop(1, '#3e1621');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 400);
  ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1000, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 400); ctx.lineTo(1000, 400); ctx.stroke();
  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath(); ctx.arc(180, 200, 100, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(avatar, 80, 100, 200, 200); ctx.restore();
    ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(180, 200, 100, 0, Math.PI * 2); ctx.stroke();
  } catch {
    ctx.fillStyle = '#ff5555';
    ctx.beginPath(); ctx.arc(180, 200, 100, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 42px Sans'; ctx.fillText('GÖRÜŞÜRÜZ!', 320, 130);
  ctx.fillStyle = '#ff5555'; ctx.font = 'bold 36px Sans'; ctx.fillText(user.username, 320, 190);
  ctx.fillStyle = '#b9bbbe'; ctx.font = '28px Sans'; ctx.fillText('Sunucudan ayrıldı.', 320, 240);
  ctx.fillStyle = '#fff'; ctx.font = '24px Sans'; ctx.fillText(`Kalan Üye: ${memberCount}`, 320, 300);
  return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeCard, createLeaveCard };
