const express = require('express');
const session = require('cookie-session');
const storage = require('./storage');
const https = require('https');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const REDIRECT_URI = `${BASE_URL}/auth/callback`;

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
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Adminə DM göndərən köməkçi funksiya
async function sendDM(client, userId, guildName, action, detail) {
  try {
    const user = await client.users.fetch(userId);
    const embed = {
      title: '⚙️ Panel Dəyişikliyi',
      color: 0x5865F2,
      fields: [
        { name: 'Server', value: guildName, inline: true },
        { name: 'Əməliyyat', value: action, inline: true },
        { name: 'Yeni Dəyər', value: detail, inline: false }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'ASTROL Panel' }
    };
    await user.send({ embeds: [embed] });
  } catch (e) {
    console.error('DM göndərilmədi:', e.message);
  }
}

function setupWebPanel(app, client) {
  app.use(session({
    name: 'astrol_session',
    keys: [process.env.SESSION_SECRET || 'astrol-secret-key-123'],
    maxAge: 24 * 60 * 60 * 1000
  }));

  // ==================== ANA SƏHİFƏ (LOGIN) ====================
  app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.send(`
      <!DOCTYPE html><html lang="az"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ASTROL Panel</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;800&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
        body{background:#09090b;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
        
        /* Animasiyalı Arxa Fon */
        .bg{position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;background:linear-gradient(45deg,#09090b,#1a1a2e,#16213e);background-size:400% 400%;animation:gradientBG 15s ease infinite}
        @keyframes gradientBG{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        
        .login-box{text-align:center;padding:60px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:24px;backdrop-filter:blur(20px);box-shadow:0 20px 50px rgba(0,0,0,0.5);animation:floatIn 1s ease forwards;opacity:0;transform:translateY(30px)}
        @keyframes floatIn{to{opacity:1;transform:translateY(0)}}
        
        h1{font-size:3.5rem;margin-bottom:10px;background:-webkit-linear-gradient(45deg,#5865F2,#a1a1ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px}
        p{color:#a1a1a1;margin-bottom:40px;font-weight:300}
        
        .btn{display:inline-block;padding:15px 45px;background:#5865F2;color:white;text-decoration:none;border-radius:30px;font-weight:600;font-size:1.1rem;transition:0.3s;box-shadow:0 10px 20px rgba(88,101,242,0.3);position:relative;overflow:hidden}
        .btn::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);transition:0.5s}
        .btn:hover::after{left:100%}
        .btn:hover{transform:translateY(-5px);box-shadow:0 15px 30px rgba(88,101,242,0.6)}
      </style></head><body>
      <div class="bg"></div>
      <div class="login-box"><h1>ASTROL</h1><p>Botun idarəetmə panelinə xoş gəlmisən!</p>
      <a href="https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds" class="btn">Discord ilə Daxil Ol</a></div>
      </body></html>`);
  });

  // ==================== OAUTH2 ====================
  app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send('❌ Kod yoxdur.');
    try {
      const tokenBody = new URLSearchParams({
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI
      }).toString();
      const tokenData = await new Promise((resolve, reject) => {
        const r = https.request({ hostname: 'discord.com', path: '/api/oauth2/token', method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, (rs) => { let d = ''; rs.on('data', c => d += c); rs.on('end', () => resolve(JSON.parse(d))); });
        r.on('error', reject); r.write(tokenBody); r.end();
      });
      const user = await discordRequest('/users/@me', tokenData.access_token);
      req.session.user = user; req.session.accessToken = tokenData.access_token;
      res.redirect('/dashboard');
    } catch (e) { res.send('❌ Giriş xətası.'); }
  });

  // ==================== DASHBOARD ====================
  app.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const userGuilds = await discordRequest('/users/@me/guilds', req.session.accessToken);
    const botGuildIds = new Set(client.guilds.cache.map(g => g.id));
    const adminGuilds = (userGuilds || []).filter(g => {
      const perms = BigInt(g.permissions || 0);
      return (perms & 0x8n) === 0x8n && botGuildIds.has(g.id);
    });

    const guildCards = adminGuilds.map(g => `
      <a href="/server/${g.id}" class="guild-card">
        <div class="guild-icon">
          <img src="${g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="">
        </div>
        <span>${g.name}</span>
      </a>`).join('');

    res.send(`
      <!DOCTYPE html><html lang="az"><head><meta charset="UTF-8"><title>Dashboard</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;800&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
        body{background:#09090b;color:#fff;min-height:100vh;padding:40px;position:relative;overflow-x:hidden}
        .bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;background:radial-gradient(circle at 50% 0%,#1a1a2e 0%,#09090b 70%)}
        
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:50px;background:rgba(255,255,255,0.03);padding:20px 30px;border-radius:20px;border:1px solid rgba(255,255,255,0.05);backdrop-filter:blur(10px)}
        .header h1{background:-webkit-linear-gradient(45deg,#fff,#a1a1a1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .user-info{display:flex;align-items:center;gap:15px}
        .user-info img{width:45px;height:45px;border-radius:50%;border:2px solid #5865F2}
        .logout{color:#ff5555;text-decoration:none;padding:8px 15px;border-radius:10px;background:rgba(255,85,85,0.1);transition:0.3s}
        .logout:hover{background:rgba(255,85,85,0.2)}
        
        .guilds{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:25px}
        .guild-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);padding:25px;border-radius:20px;text-align:center;text-decoration:none;color:#fff;transition:0.4s;backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;gap:15px}
        .guild-card:hover{transform:translateY(-8px);background:rgba(255,255,255,0.08);box-shadow:0 15px 30px rgba(88,101,242,0.2);border-color:#5865F2}
        .guild-icon{width:80px;height:80px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#5865F2,#a1a1ff)}
        .guild-icon img{width:100%;height:100%;border-radius:50%;object-fit:cover;background:#09090b}
        .guild-card span{font-weight:600;font-size:1.1rem}
      </style></head><body>
      <div class="bg"></div>
      <div class="header">
        <h1>⚙️ ASTROL Panel</h1>
        <div class="user-info">
          <img src="https://cdn.discordapp.com/avatars/${req.session.user.id}/${req.session.user.avatar}.png">
          <span>${req.session.user.username}</span>
          <a href="/logout" class="logout">Çıxış</a>
        </div>
      </div>
      <h2 style="margin-bottom:25px;font-weight:400;color:#a1a1a1">İdarə etdiyin serverlər (<b style="color:#5865F2">${adminGuilds.length}</b>)</h2>
      <div class="guilds">${guildCards || '<p style="color:#a1a1a1;">Heç bir server tapılmadı.</p>'}</div>
      </body></html>`);
  });

  // ==================== SERVER AYARLARI ====================
  app.get('/server/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const guildId = req.params.id;
    const userGuilds = await discordRequest('/users/@me/guilds', req.session.accessToken);
    const guild = (userGuilds || []).find(g => g.id === guildId);
    const perms = BigInt(guild?.permissions || 0);
    if (!guild || (perms & 0x8n) !== 0x8n) return res.send('❌ Giriş yoxdur.');
    
    const botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) return res.send('❌ Bot bu serverdə deyil.');

    const config = storage.load('config', {});
    const gcfg = config[guildId] || {};
    
    const textChannels = botGuild.channels.cache.filter(c => c.type === 0).map(c => 
      `<option value="${c.id}" ${c.id === gcfg.logChannel ? 'selected' : ''}>#${c.name}</option>`).join('');
    
    const welcomeChannels = botGuild.channels.cache.filter(c => c.type === 0).map(c => 
      `<option value="${c.id}" ${c.id === gcfg.welcomeLeaveChannel ? 'selected' : ''}>#${c.name}</option>`).join('');

    // Çekilişlər
    const giveaways = storage.load('giveaways', {});
    const guildGiveaways = Object.values(giveaways).filter(g => g.channelId && botGuild.channels.cache.has(g.channelId));
    const giveawayList = guildGiveaways.map(g => `
      <div class="giveaway ${g.ended ? 'ended' : ''}">
        <div class="gw-info">
          <span class="gw-prize">🎁 ${g.prize}</span>
          <span class="gw-stats">${g.participants.length} qatılımcı • ${g.ended ? '✅ Bitdi' : '⏳ Aktiv'}</span>
        </div>
        ${!g.ended ? `<button onclick="deleteGiveaway('${g.id}')" class="del-btn">Sil</button>` : ''}
      </div>`).join('');

    res.send(`
      <!DOCTYPE html><html lang="az"><head><meta charset="UTF-8"><title>${guild.name} - ASTROL</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;800&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
        body{background:#09090b;color:#fff;min-height:100vh;padding:40px;position:relative;overflow-x:hidden}
        .bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;background:radial-gradient(circle at 50% 0%,#1a1a2e 0%,#09090b 70%)}
        
        .container{max-width:900px;margin:0 auto;position:relative}
        .back{color:#a1a1a1;text-decoration:none;display:inline-flex;align-items:center;gap:5px;margin-bottom:20px;padding:10px 20px;background:rgba(255,255,255,0.03);border-radius:12px;transition:0.3s}
        .back:hover{background:rgba(255,255,255,0.1);color:#fff}
        h1{margin-bottom:30px;background:-webkit-linear-gradient(45deg,#fff,#a1a1a1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        @media(max-width:768px){.grid{grid-template-columns:1fr}}
        
        .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);padding:30px;border-radius:20px;backdrop-filter:blur(10px);transition:0.3s}
        .card:hover{border-color:rgba(88,101,242,0.3)}
        .card h3{display:flex;align-items:center;gap:10px;margin-bottom:20px;font-weight:600;color:#fff}
        
        label{display:block;margin-bottom:10px;color:#a1a1a1;font-size:0.9rem}
        select,button{width:100%;padding:14px;border-radius:12px;border:none;font-size:1rem;font-family:'Poppins',sans-serif}
        select{background:#12121a;color:#fff;border:1px solid rgba(255,255,255,0.1);margin-bottom:15px;outline:none;transition:0.3s}
        select:focus{border-color:#5865F2;box-shadow:0 0 0 3px rgba(88,101,242,0.2)}
        
        button{background:#5865F2;color:#fff;cursor:pointer;font-weight:600;transition:0.3s;position:relative;overflow:hidden}
        button::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);transition:0.5s}
        button:hover::after{left:100%}
        button:hover{background:#4752c4;transform:translateY(-2px);box-shadow:0 10px 20px rgba(88,101,242,0.3)}
        
        .giveaway{display:flex;justify-content:space-between;align-items:center;padding:15px;border-radius:12px;background:rgba(255,255,255,0.02);margin-bottom:10px;border:1px solid rgba(255,255,255,0.05);transition:0.3s}
        .giveaway:hover{background:rgba(255,255,255,0.05)}
        .giveaway.ended{opacity:0.5}
        .gw-info{display:flex;flex-direction:column;gap:5px}
        .gw-prize{font-weight:600;color:#fff}
        .gw-stats{font-size:0.85rem;color:#a1a1a1}
        .del-btn{background:#ff5555;width:auto;padding:8px 20px;font-size:0.9rem}
        .del-btn:hover{background:#e74c3c}
        
        .toast{position:fixed;bottom:30px;right:30px;background:#00ff88;color:#000;padding:15px 30px;border-radius:12px;font-weight:600;transform:translateY(100px);opacity:0;transition:0.4s;z-index:1000}
        .toast.show{transform:translateY(0);opacity:1}
      </style></head><body>
      <div class="bg"></div>
      <div class="container">
        <a href="/dashboard" class="back">← Geri</a>
        <h1>⚙️ ${guild.name}</h1>
        
        <div class="grid">
          <div class="card">
            <h3>📝 Log Kanalı</h3>
            <form id="logForm">
              <label>Bütün hadisələr bu kanala yazılacaq</label>
              <select id="logSelect"><option value="">-- Seç --</option>${textChannels}</select>
              <button type="submit">Yadda Saxla</button>
            </form>
          </div>

          <div class="card">
            <h3>👋 Qarşılama Kanalı (Canvas)</h3>
            <form id="welcomeForm">
              <label>Yeni üzvlər üçün Canvas şəkli bu kanala gedəcək</label>
              <select id="welcomeSelect"><option value="">-- Seç --</option>${welcomeChannels}</select>
              <button type="submit">Yadda Saxla</button>
            </form>
          </div>
        </div>

        <div class="card" style="margin-top:20px;">
          <h3>🎉 Aktiv Çekilişlər</h3>
          ${giveawayList || '<p style="color:#a1a1a1;">Aktiv çekiliş yoxdur.</p>'}
        </div>
      </div>
      
      <div class="toast" id="toast">✅ Yadda saxlanıldı!</div>

      <script>
        function showToast(msg) {
          const t = document.getElementById('toast');
          t.innerText = msg;
          t.classList.add('show');
          setTimeout(() => t.classList.remove('show'), 3000);
        }

        document.getElementById('logForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const channelId = document.getElementById('logSelect').value;
          if (!channelId) return;
          await fetch('/server/${guildId}/log', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({channelId}) });
          showToast('✅ Log kanalı yeniləndi!');
        });

        document.getElementById('welcomeForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const channelId = document.getElementById('welcomeSelect').value;
          if (!channelId) return;
          await fetch('/server/${guildId}/welcome', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({channelId}) });
          showToast('✅ Qarşılama kanalı yeniləndi!');
        });

        async function deleteGiveaway(id) {
          if (!confirm('Bu çekilişi silmək istədiyinə əminsən?')) return;
          await fetch('/server/${guildId}/giveaway/' + id, { method: 'DELETE' });
          showToast('✅ Çekiliş silindi!');
          setTimeout(() => location.reload(), 1000);
        }
      </script>
      </body></html>`);
  });

  // ==================== POST: LOG ====================
  app.post('/server/:id/log', async (req, res) => {
    if (!req.session.user) return res.status(401).send('Yetkisiz');
    const guildId = req.params.id;
    const userGuilds = await discordRequest('/users/@me/guilds', req.session.accessToken);
    const guild = (userGuilds || []).find(g => g.id === guildId);
    if (!guild || (BigInt(guild.permissions) & 0x8n) !== 0x8n) return res.status(403).send('Yetkisiz');
    
    const config = storage.load('config', {});
    if (!config[guildId]) config[guildId] = {};
    config[guildId].logChannel = req.body.channelId;
    storage.save('config', config);

    // DM göndər
    const botGuild = client.guilds.cache.get(guildId);
    const channel = botGuild?.channels.cache.get(req.body.channelId);
    await sendDM(client, req.session.user.id, guild.name, 'Log Kanalı Dəyişdirildi', channel ? `#${channel.name}` : req.body.channelId);

    res.json({ ok: true });
  });

  // ==================== POST: WELCOME ====================
  app.post('/server/:id/welcome', async (req, res) => {
    if (!req.session.user) return res.status(401).send('Yetkisiz');
    const guildId = req.params.id;
    const userGuilds = await discordRequest('/users/@me/guilds', req.session.accessToken);
    const guild = (userGuilds || []).find(g => g.id === guildId);
    if (!guild || (BigInt(guild.permissions) & 0x8n) !== 0x8n) return res.status(403).send('Yetkisiz');
    
    const config = storage.load('config', {});
    if (!config[guildId]) config[guildId] = {};
    config[guildId].welcomeLeaveChannel = req.body.channelId;
    storage.save('config', config);

    // DM göndər
    const botGuild = client.guilds.cache.get(guildId);
    const channel = botGuild?.channels.cache.get(req.body.channelId);
    await sendDM(client, req.session.user.id, guild.name, 'Qarşılama Kanalı Dəyişdirildi', channel ? `#${channel.name}` : req.body.channelId);

    res.json({ ok: true });
  });

  // ==================== DELETE: GIVEAWAY ====================
  app.delete('/server/:id/giveaway/:gid', async (req, res) => {
    if (!req.session.user) return res.status(401).send('Yetkisiz');
    const guildId = req.params.id;
    const userGuilds = await discordRequest('/users/@me/guilds', req.session.accessToken);
    const guild = (userGuilds || []).find(g => g.id === guildId);
    if (!guild || (BigInt(guild.permissions) & 0x8n) !== 0x8n) return res.status(403).send('Yetkisiz');
    
    const giveaways = storage.load('giveaways', {});
    if (giveaways[req.params.gid]) {
      const prize = giveaways[req.params.gid].prize;
      delete giveaways[req.params.gid];
      storage.save('giveaways', giveaways);

      // DM göndər
      await sendDM(client, req.session.user.id, guild.name, 'Çekiliş Silindi', `🎁 ${prize}`);
    }
    res.json({ ok: true });
  });

  // ==================== ÇIXIŞ ====================
  app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
  });
}

module.exports = { setupWebPanel };
