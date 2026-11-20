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
app.use(express.json()); // Panel üçün JSON body parser

// Panel funksiyasını yüklə
const { setupWebPanel } = require('./utils/webPanel');
setupWebPanel(app, client);

// Köhnə '/' marşrutu artıq paneldədir, amma 'health' qalsın:
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

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
