const { EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { serverLog } = require('../utils/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMsg, newMsg, client) {
    if (!newMsg.guild || newMsg.author?.bot || oldMsg.content === newMsg.content) return;
    const config = storage.load('config', {});
    const embed = new EmbedBuilder()
      .setTitle('Mesaj Düzenlendi')
      .setDescription(`**Kanal:** ${newMsg.channel}\n**Yazar:** ${newMsg.author}\n**Eski:** ${oldMsg.content || '*Boş*'}\n**Yeni:** ${newMsg.content || '*Boş*'}`)
      .setColor(0xffaa00).setTimestamp();
    serverLog(newMsg.guild, embed, config);
  }
};