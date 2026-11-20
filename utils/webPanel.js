const express = require('express');
const session = require('cookie-session');
const storage = require('./storage');
const https = require('https');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const REDIRECT_URI = `${BASE_URL}/auth/callback`;

// Discord API sorğusu üçün köməkçi funksiya
function discordRequest(path, token, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api${path}`,
      method,
      headers: { 'Authorization': `Bearer ${token}` }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function setupWebPanel(app, client) {
  app.use(session({
    name: 'astrol_session',
    keys: [process.env.SESSION_SECRET || 'astrol-secret-key-123'],
    maxAge: 24 * 60 * 60 * 1000 // 1 gün
  }));

  // ===== ANA SƏHİFƏ (Əgər giriş etməyibsə, OAuth2 linki göstər) =====
  app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    
    res.send(`
      <!DOCTYPE html>
      <html lang="az">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ASTROL Panel</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
          body {
            background: linear-gradient(135deg, #0d0d14, #1a1a2e);
            color: #fff; min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
          }
          .login-box {
            text-align: center; padding: 60px; 
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px; backdrop-filter: blur(10px);
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          }
          h1 { font-size: 3rem; margin-bottom: 10px; color: #5865F2; }
          p { color: #a1a1a1; margin-bottom: 40px; }
          .btn {
            display: inline-block; padding: 15px 40px;
            background: #5865F2; color: white; text-decoration: none;
            border-radius: 30px; font-weight: 600; font-size: 1.1rem;
            transition: 0.3s; box-shadow: 0 10px 20px rgba(88,101,242,0.3);
          }
          .btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(88,101,242,0.5); }
        </style>
      </head>
      <body>
        <div class="login-box">
          <h1>ASTROL</h1>
          <p>Botun idarəetmə panelinə xoş gəlmisən!</p>
          <a href="https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds" class="btn">
            Discord ilə Daxil Ol
          </a>
        </div>
      </body>
      </html>
    `);
  });

  // ===== OAUTH2 CALLBACK =====
  app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send('❌ Kod yoxdur.');

    try {
      // 1. Token al
      const tokenBody = new URLSearchParams({
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code', code,
        redirect_uri: REDIRECT_URI
      }).toString();

      const tokenData = await new Promise((resolve, reject) => {
        const r = https.request({
          hostname: 'discord.com',
          path: '/api/oauth2/token',
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, (rs) => {
          let d = ''; rs.on('data', c => d += c);
          rs.on('end', () => resolve(JSON.parse(d)));
        });
        r.on('error', reject); r.write(tokenBody); r.end();
      });

      // 2. İstifadəçi məlumatlarını al
      const user = await discordRequest('/users/@me', tokenData.access_token);
      
      req.session.user = user;
      req.session.accessToken = tokenData.access_token;
      res.redirect('/dashboard');
    } catch (e) {
      console.error('OAuth xətası:', e);
      res.send('❌ Giriş zamanı xəta baş verdi.');
    }
  });

  // ===== DASHBOARD =====
  app.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/');

    // İstifadəçinin serverlərini al
    const userGuilds = await discordRequest('/users/@me/guilds', req.session.accessToken);
    if (!userGuilds) return res.send('Server siyahısı alınmadı.');

    // Yalnız admin olduğu və botun olduğu serverləri seç
    const botGuildIds = new Set(client.guilds.cache.map(g => g.id));
    const adminGuilds = userGuilds.filter(g => {
      const perms = BigInt(g.permissions || 0);
      const isAdmin = (perms & 0x8n) === 0x8n; // Administrator yetkisi
      return isAdmin && botGuildIds.has(g.id);
    });

    // HTML yaradılması
    const guildCards = adminGuilds.map(g => `
      <a href="/server/${g.id}" class="guild-card">
        <img src="${g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${g.name}">
        <span>${g.name}</span>
      </a>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="az">
      <head>
        <meta charset="UTF-8">
        <title>Dashboard - ASTROL</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
          body { background: #0d0d14; color: #fff; min-height: 100vh; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
          .header h1 { color: #5865F2; }
          .user-info { display: flex; align-items: center; gap: 10px; }
          .user-info img { width: 40px; height: 40px; border-radius: 50%; }
          .guilds { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
          .guild-card {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
            padding: 20px; border-radius: 15px; text-align: center;
            text-decoration: none; color: #fff; transition: 0.3s;
          }
          .guild-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.1); }
          .guild-card img { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px; }
          .logout { color: #ff5555; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚙️ ASTROL Panel</h1>
          <div class="user-info">
            <img src="https://cdn.discordapp.com/avatars/${req.session.user.id}/${req.session.user.avatar}.png" alt="">
            <span>${req.session.user.username}</span>
            <a href="/logout" class="logout">Çıxış</a>
          </div>
        </div>
        <h2 style="margin-bottom: 20px;">İdarə etdiyin serverlər (${adminGuilds.length})</h2>
        <div class="guilds">${guildCards || '<p>Heç bir server tapılmadı.</p>'}</div>
      </body>
      </html>
    `);
  });

  // ===== SERVER AYARLARI =====
  app.get('/server/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const guildId = req.params.id;

    // Yetki yoxlaması
    const userGuilds = await discordRequest('/users/@me/guilds', req.session.accessToken);
    const guild = userGuilds?.find(g => g.id === guildId);
    const perms = BigInt(guild?.permissions || 0);
    if (!guild || (perms & 0x8n) !== 0x8n) return res.send('❌ Bu serverə girişin yoxdur.');

    const botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) return res.send('❌ Bot bu serverdə deyil.');

    // Mövcud ayarları yüklə
    const config = storage.load('config', {});
    const gcfg = config[guildId] || {};
    const logChannel = gcfg.logChannel ? botGuild.channels.cache.get(gcfg.logChannel) : null;

    // Serverdəki bütün mətn kanalları
    const textChannels = botGuild.channels.cache.filter(c => c.type === 0).map(c => 
      `<option value="${c.id}" ${c.id === gcfg.logChannel ? 'selected' : ''}>#${c.name}</option>`
    ).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="az">
      <head>
        <meta charset="UTF-8">
        <title>${guild.name} - ASTROL</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
          body { background: #0d0d14; color: #fff; min-height: 100vh; padding: 40px; }
          .container { max-width: 800px; margin: 0 auto; }
          .back { color: #5865F2; text-decoration: none; display: inline-block; margin-bottom: 20px; }
          h1 { margin-bottom: 30px; }
          .card {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
            padding: 30px; border-radius: 15px; margin-bottom: 20px;
          }
          label { display: block; margin-bottom: 10px; color: #a1a1a1; }
          select, button {
            width: 100%; padding: 12px; border-radius: 8px; border: none;
            font-size: 1rem; font-family: 'Poppins', sans-serif;
          }
          select { background: #1a1a2e; color: #fff; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px; }
          button { background: #5865F2; color: #fff; cursor: pointer; font-weight: 600; transition: 0.3s; }
          button:hover { background: #4752c4; }
          .success { color: #00ff88; margin-top: 15px; }
          .status { color: #a1a1a1; margin-top: 10px; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/dashboard" class="back">← Geri</a>
          <h1>⚙️ ${guild.name}</h1>
          
          <div class="card">
            <h3>📝 Log Kanalı</h3>
            <p class="status">Hazırkı: ${logChannel ? `<b>${logChannel.name}</b>` : '*Ayarlanmayıb*'}</p>
            <form id="logForm" style="margin-top: 20px;">
              <label>Yeni log kanalı seç:</label>
              <select id="channelSelect">
                <option value="">-- Seç --</option>
                ${textChannels}
              </select>
              <button type="submit">Yadda Saxla</button>
            </form>
            <p id="msg" class="success" style="display:none;">✅ Yadda saxlanıldı!</p>
          </div>
        </div>
        <script>
          document.getElementById('logForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const channelId = document.getElementById('channelSelect').value;
            if (!channelId) return;
            
            const res = await fetch('/server/${guildId}/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channelId })
            });
            
            if (res.ok) {
              document.getElementById('msg').style.display = 'block';
              setTimeout(() => location.reload(), 1000);
            } else {
              alert('❌ Xəta!');
            }
          });
        </script>
      </body>
      </html>
    `);
  });

  // ===== LOG KANALINI YADDA SAXLA =====
  app.post('/server/:id/log', async (req, res) => {
    if (!req.session.user) return res.status(401).send('Yetkisiz');
    const guildId = req.params.id;
    const { channelId } = req.body;

    // Yetki yoxlaması (təkrar)
    const userGuilds = await discordRequest('/users/@me/guilds', req.session.accessToken);
    const guild = userGuilds?.find(g => g.id === guildId);
    const perms = BigInt(guild?.permissions || 0);
    if (!guild || (perms & 0x8n) !== 0x8n) return res.status(403).send('Yetkisiz');

    // Config-i yenilə
    const config = storage.load('config', {});
    if (!config[guildId]) config[guildId] = {};
    config[guildId].logChannel = channelId;
    storage.save('config', config);

    res.json({ ok: true });
  });

  // ===== ÇIXIŞ =====
  app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
  });
}

module.exports = { setupWebPanel };
