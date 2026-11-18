const storage = require('../utils/storage');

module.exports = {
  name: 'guildDelete',
  async execute(guild, client) {
    console.log(`⚠️ Bot "${guild.name}" (${guild.id}) serverindən atıldı/silinib.`);

    // Təmizlənəcək bütün JSON faylları
    const filesToClean = [
      'config', 'warns', 'jailData', 'reactionRoles', 
      'polls', 'invites', 'cases', 'giveaways', 'snipe'
    ];

    for (const file of filesToClean) {
      try {
        const data = storage.load(file, {});
        
        // Əgər həmin faylda bu serverin ID-si varsa, sil
        if (data[guild.id]) {
          delete data[guild.id];
          storage.save(file, data);
          console.log(`🗑️ [${file}.json] içindən "${guild.name}" məlumatları silindi.`);
        }
      } catch (e) {
        console.error(`[guildDelete] ${file} təmizlənərkən xəta:`, e.message);
      }
    }
  }
};
