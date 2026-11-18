require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');
const storage = require('./utils/storage');
const { checkJsonHealth, PING_ADMIN_ID } = require('./utils/logger');

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN yoxdur! Render Environment-da əlavə et.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildInvites
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

client.commands = new Collection();
client.config = storage.load('config', {});
client.PREFIX = '.';

// ==================== KOMANDLARI YÜKLƏ ====================
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  if (cmd.name) client.commands.set(cmd.name, cmd);
  if (cmd.aliases) cmd.aliases.forEach(a => client.commands.set(a, cmd));
  console.log(`✅ Komanda yüklendi: ${file}`);
}

// ==================== EVENTLƏRİ YÜKLƏ ====================
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const ev = require(`./events/${file}`);
  if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
  else client.on(ev.name, (...args) => ev.execute(...args, client));
  console.log(`✅ Event yüklendi: ${ev.name}`);
}

// ==================== EXPRESS & WEB SITE ====================
const app = express();
const PORT = process.env.PORT || 3000;

// Botun statistikasını API kimi təqdim edirik
app.get('/api/stats', (req, res) => {
  if (!client.isReady()) {
    return res.json({ online: false });
  }
  const guilds = client.guilds.cache.size;
  const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
  const ping = client.ws.ping;
  res.json({
    online: true,
    botName: client.user.username,
    avatar: client.user.displayAvatarURL({ size: 256 }),
    guilds,
    users,
    ping
  });
});

// Mükəmməl Animasiyalı Landing Page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASTROL Bot | Gələcəyin Discord Təcrübəsi</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
        
        body {
            background-color: #0d0d14;
            color: #ffffff;
            overflow-x: hidden;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        /* Dinamik Arxa Fon Animasiyası */
        .bg-animation {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: -1;
            background: linear-gradient(45deg, #0d0d14, #1a1a2e, #16213e, #0f3460);
            background-size: 400% 400%;
            animation: gradientBG 15s ease infinite;
        }

        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Parıldayan Ulduzlar */
        .stars {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: -1; pointer-events: none;
        }
        .star {
            position: absolute; background: white; border-radius: 50%;
            animation: twinkle var(--duration) infinite;
            opacity: 0;
        }
        @keyframes twinkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1); }
        }

        /* Əsas Konteyner */
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            animation: floatIn 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            transform: translateY(50px);
            opacity: 0;
            max-width: 600px;
            width: 90%;
            z-index: 10;
        }

        @keyframes floatIn {
            to { transform: translateY(0); opacity: 1; }
        }

        /* Bot Avatarı */
        .avatar-container {
            position: relative;
            width: 120px; height: 120px;
            margin: 0 auto 20px;
        }
        .avatar {
            width: 100%; height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #5865F2;
            animation: pulse 2s infinite;
            position: relative;
            z-index: 2;
        }
        .avatar-glow {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            border-radius: 50%; background: #5865F2;
            filter: blur(20px); opacity: 0.6; z-index: 1;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.7); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(88, 101, 242, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(88, 101, 242, 0); }
        }

        h1 {
            font-size: 3rem; font-weight: 800; margin-bottom: 10px;
            background: -webkit-linear-gradient(45deg, #fff, #a1a1a1);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            letter-spacing: 2px;
        }

        p.subtitle {
            color: #a1a1a1; font-size: 1.1rem; font-weight: 300;
            margin-bottom: 30px; line-height: 1.6;
        }

        /* Statistika Paneli */
        .stats-grid {
            display: grid; grid-template-columns: repeat(3, 1fr);
            gap: 15px; margin-bottom: 40px;
        }
        .stat-item {
            background: rgba(255, 255, 255, 0.05);
            padding: 15px; border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: transform 0.3s ease, background 0.3s;
        }
        .stat-item:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.1);
        }
        .stat-value {
            font-size: 1.8rem; font-weight: 800; color: #5865F2;
            display: block; margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.8rem; color: #a1a1a1; text-transform: uppercase;
            letter-spacing: 1px; font-weight: 600;
        }

        /* Düymələr */
        .buttons {
            display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;
        }
        .btn {
            padding: 15px 35px; border-radius: 30px;
            font-size: 1.1rem; font-weight: 600; text-decoration: none;
            transition: all 0.3s ease; display: inline-flex;
            align-items: center; justify-content: center;
            border: none; cursor: pointer;
        }
        
        .btn-primary {
            background: #5865F2; color: white;
            box-shadow: 0 10px 20px rgba(88, 101, 242, 0.4);
            position: relative; overflow: hidden;
        }
        .btn-primary::after {
            content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: 0.5s;
        }
        .btn-primary:hover::after { left: 100%; }
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 25px rgba(88, 101, 242, 0.6);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.1); color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-3px);
        }

        /* Status */
        .status-badge {
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(0, 255, 136, 0.1); color: #00ff88;
            padding: 8px 16px; border-radius: 20px;
            font-size: 0.9rem; font-weight: 600; margin-bottom: 25px;
            border: 1px solid rgba(0, 255, 136, 0.2);
        }
        .status-dot {
            width: 10px; height: 10px; background: #00ff88;
            border-radius: 50%; animation: blink 1.5s infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        @media (max-width: 600px) {
            h1 { font-size: 2.2rem; }
            .stats-grid { grid-template-columns: 1fr; }
            .buttons { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="bg-animation"></div>
    <div class="stars" id="stars"></div>

    <div class="container">
        <div class="avatar-container">
            <div class="avatar-glow"></div>
            <img src="" alt="Bot Avatar" class="avatar" id="botAvatar">
        </div>
        
        <h1 id="botName">ASTROL</h1>
        
        <div class="status-badge">
            <div class="status-dot"></div>
            <span id="statusText">Yüklənir...</span>
        </div>

        <p class="subtitle">Gələcəyin Discord təcrübəsi. Moderasiya, AI, oyunlar və daha çoxu bir arada.</p>

        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-value" id="guildCount">0</span>
                <span class="stat-label">Serverlər</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="userCount">0</span>
                <span class="stat-label">İstifadəçilər</span>
            </div>
            <div class="stat-item">
                <span class="stat-value" id="pingCount">0ms</span>
                <span class="stat-label">Ping</span>
            </div>
        </div>

        <div class="buttons">
            <a href="https://discord.com/oauth2/authorize?client_id=${client.user ? client.user.id : 'SENIN_BOT_ID'} &permissions=8&scope=bot%20applications.commands" target="_blank" class="btn btn-primary">
                🚀 Botu Dəvət Et
            </a>
            <a href="https://discord.gg/SENIN_SERVER_LINKIN" target="_blank" class="btn btn-secondary">
                💬 Dəstək Serveri
            </a>
        </div>
    </div>

    <script>
        // Ulduzları yarat
        const starsContainer = document.getElementById('stars');
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.classList.add('star');
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.width = Math.random() * 3 + 'px';
            star.style.height = star.style.width;
            star.style.setProperty('--duration', Math.random() * 3 + 2 + 's');
            star.style.animationDelay = Math.random() * 5 + 's';
            starsContainer.appendChild(star);
        }

        // API-dən statistikaları çək
        async function fetchStats() {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();
                
                if (data.online) {
                    document.getElementById('statusText').innerText = 'Onlayn';
                    document.getElementById('botName').innerText = data.botName;
                    document.getElementById('botAvatar').src = data.avatar;
                    
                    // Rəqəmləri animasiya ilə artır
                    animateValue("guildCount", 0, data.guilds, 1500);
                    animateValue("userCount", 0, data.users, 1500);
                    document.getElementById('pingCount').innerText = data.ping + 'ms';
                    
                    // Dəvət linkini yenilə
                    const inviteBtn = document.querySelector('.btn-primary');
                    inviteBtn.href = \`https://discord.com/oauth2/authorize?client_id=\${data.id}&permissions=8&scope=bot%20applications.commands\`;
                } else {
                    document.getElementById('statusText').innerText = 'Oflayn';
                }
            } catch (e) {
                document.getElementById('statusText').innerText = 'Xəta';
            }
        }

        // Rəqəm artım animasiyası
        function animateValue(id, start, end, duration) {
            const obj = document.getElementById(id);
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                obj.innerHTML = Math.floor(progress * (end - start) + start);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        }

        // İlk yükləmə və hər 30 saniyədən bir yenilə
        fetchStats();
        setInterval(fetchStats, 30000);
    </script>
</body>
</html>
  `);
});

app.listen(PORT, () => console.log(`🌐 Web server ${PORT} portunda işləyir`));

// ==================== KEEP-ALIVE VƏ DM SİSTEMİ ====================
setInterval(async () => {
  // Render xarici URL-i (Environment-də RENDER_EXTERNAL_URL olmalıdır)
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  try {
    const res = await fetch(url);
    
    if (res.ok) {
      console.log(`[Keep-Alive] ✅ Sayt aktivdir (Status: ${res.status})`);
      
      // Adminə DM at
      try {
        const admin = await client.users.fetch(PING_ADMIN_ID);
        const now = Math.floor(Date.now() / 1000);
        
        await admin.send(
          `✅ **ASTROL Bot Keep-Alive**\n\n` +
          `🟢 **Status:** Sayt aktivdir (HTTP ${res.status})\n` +
          `🌐 **URL:** ${url}\n` +
          `⏱️ **Uptime:** ${Math.floor(process.uptime() / 60)} dəqiqə\n` +
          `🕒 **Zaman:** <t:${now}:F>`
        );
      } catch (dmError) {
        console.error('[Keep-Alive] ❌ Adminə DM göndərilmədi (DM bağlı ola bilər):', dmError.message);
      }
    } else {
      console.log(`[Keep-Alive] ⚠️ Sayt cavab verdi amma status uğursuzdur: ${res.status}`);
    }
  } catch (error) {
    console.error('[Keep-Alive] ❌ HTTP sorğu xətası:', error.message);
  }

  // JSON yaddaş yoxlaması (əvvəlki koddan qalıb)
  try {
    await checkJsonHealth(client);
  } catch (e) {
    console.error('[JSON Check] ❌ Xəta:', e.message);
  }
}, 2 * 60 * 1000); // 2 dəqiqə = 120,000 millisaniyə

// ==================== QLOBAL XƏTA TUTMA ====================
process.on('unhandledRejection', (err) => console.error('unhandledRejection:', err));
process.on('uncaughtException', (err) => console.error('uncaughtException:', err));
process.on('SIGTERM', () => { storage.flushAll(); process.exit(0); });
process.on('SIGINT', () => { storage.flushAll(); process.exit(0); });

client.login(process.env.DISCORD_TOKEN);
