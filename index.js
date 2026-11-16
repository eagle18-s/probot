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

// ==================== EXPRESS ====================
const app = express();
app.get('/', (req, res) => res.send(`ASTROL Bot aktif | ${new Date().toLocaleString('tr-TR')}`));
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server ${PORT}`));

// ==================== KEEP-ALIVE + JSON CHECK (hər 2 dəq) ====================
setInterval(async () => {
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  try {
    const res = await fetch(url);
    console.log(`[keep-alive] ${res.status} — ${new Date().toISOString()}`);
  } catch (e) {
    console.error('[keep-alive] xəta:', e.message);
  }
  try {
    await checkJsonHealth(client);
  } catch (e) {
    console.error('[json-check] xəta:', e.message);
  }
}, 2 * 60 * 1000);

// ==================== QLOBAL XƏTA TUTMA ====================
process.on('unhandledRejection', (err) => console.error('unhandledRejection:', err));
process.on('uncaughtException', (err) => console.error('uncaughtException:', err));
process.on('SIGTERM', () => { storage.flushAll(); process.exit(0); });
process.on('SIGINT', () => { storage.flushAll(); process.exit(0); });

client.login(process.env.DISCORD_TOKEN);