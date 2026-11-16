const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { formatTime, xpForLevel } = require('./helpers');

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

async function createXPProfileCard(user, data, rank) {
  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 900, 300);
  g.addColorStop(0, '#0f0c29'); g.addColorStop(0.5, '#302b63'); g.addColorStop(1, '#24243e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 300);
  ctx.fillStyle = '#5865F2'; ctx.fillRect(0, 0, 12, 300);
  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath(); ctx.arc(120, 150, 80, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(avatar, 40, 70, 160, 160); ctx.restore();
    ctx.strokeStyle = '#5865F2'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(120, 150, 80, 0, Math.PI * 2); ctx.stroke();
  } catch {
    ctx.fillStyle = '#5865F2';
    ctx.beginPath(); ctx.arc(120, 150, 80, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 34px Sans'; ctx.fillText(user.username, 230, 80);
  ctx.fillStyle = '#5865F2'; ctx.font = 'bold 26px Sans'; ctx.fillText(`Seviye ${data.level}`, 230, 125);
  ctx.fillStyle = '#b9bbbe'; ctx.font = '22px Sans'; ctx.fillText(`Sıralama: #${rank}`, 380, 125);
  const currentLevelXP = xpForLevel(data.level);
  const nextLevelXP = xpForLevel(data.level + 1);
  const progressXP = data.xp - currentLevelXP;
  const neededXP = nextLevelXP - currentLevelXP;
  const progress = Math.min(Math.max(progressXP / neededXP, 0), 1);
  ctx.fillStyle = '#fff'; ctx.font = '20px Sans';
  ctx.fillText(`XP: ${data.xp} / ${nextLevelXP}`, 230, 170);
  ctx.fillStyle = '#2f3136';
  ctx.beginPath(); ctx.roundRect(230, 190, 580, 28, 14); ctx.fill();
  if (progress > 0) {
    const bg = ctx.createLinearGradient(230, 0, 230 + 580 * progress, 0);
    bg.addColorStop(0, '#5865F2'); bg.addColorStop(1, '#7289da');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(230, 190, 580 * progress, 28, 14); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Sans';
  ctx.fillText(`${Math.floor(progress * 100)}%`, 500, 210);
  ctx.fillStyle = '#72767d'; ctx.font = '18px Sans';
  ctx.fillText(`Mesaj: ${data.messages}  |  Ses: ${formatTime(data.voiceTime)}`, 230, 260);
  return canvas.toBuffer('image/png');
}

async function createStatCard(user, data) {
  const canvas = createCanvas(800, 280);
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 800, 280);
  g.addColorStop(0, '#1e1e2f'); g.addColorStop(1, '#2a2a40');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 280);
  ctx.fillStyle = '#00b894'; ctx.fillRect(0, 0, 10, 280);
  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath(); ctx.arc(110, 140, 70, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(avatar, 40, 70, 140, 140); ctx.restore();
    ctx.strokeStyle = '#00b894'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(110, 140, 70, 0, Math.PI * 2); ctx.stroke();
  } catch {
    ctx.fillStyle = '#00b894';
    ctx.beginPath(); ctx.arc(110, 140, 70, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Sans'; ctx.fillText(user.username, 210, 80);
  ctx.fillStyle = '#00b894'; ctx.font = 'bold 24px Sans'; ctx.fillText('İSTATİSTİKLER', 210, 120);
  ctx.fillStyle = '#2f3136';
  ctx.beginPath(); ctx.roundRect(210, 145, 250, 80, 12); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '18px Sans'; ctx.fillText('Mesaj Sayısı', 230, 175);
  ctx.font = 'bold 28px Sans'; ctx.fillText(String(data.messages), 230, 210);
  ctx.fillStyle = '#2f3136';
  ctx.beginPath(); ctx.roundRect(480, 145, 250, 80, 12); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '18px Sans'; ctx.fillText('Ses Süresi', 500, 175);
  ctx.font = 'bold 24px Sans'; ctx.fillText(formatTime(data.voiceTime), 500, 210);
  return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeCard, createLeaveCard, createXPProfileCard, createStatCard };