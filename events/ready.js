const { ActivityType } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ ${client.user.tag} aktif!`);
    client.user.setActivity('KETO⚡', { type: ActivityType.Watching });

    // Yaddaşdakı bütün JSON-ları yoxla
    const keys = storage.allKeys();
    console.log(`📂 ${keys.length} JSON fayl tapıldı.`);

    // Aktiv çekilişləri bərpa et
    try { require('../utils/giveawayManager').restore(client); } catch {}
  }
};