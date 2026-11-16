const { EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { serverLog } = require('../utils/logger');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    const snipe = storage.load('snipe', {});
    if (!snipe[message.channel.id]) snipe[message.channel.id] = [];
    snipe[message.channel.id].unshift({
      content: message.content,
      author: message.author?.tag || 'Bilinmeyen',
      avatar: message.author?.displayAvatarURL() || null,
      date: Date.now(),
      image: message.attachments.first()?.proxyURL || null
    });
    snipe[message.channel.id] = snipe[message.channel.id].slice(0, 10); // son 10
    storage.save('snipe', snipe);

    const config = storage.load('config', {});
    const embed = new EmbedBuilder()
      .setTitle('Mesaj Silindi')
      .setDescription(`**Kanal:** ${message.channel}\n**Yazar:** ${message.author}\n**İçerik:** ${message.content || '*Boş*'}`)
      .setColor(0xff0000).setTimestamp();
    serverLog(message.guild, embed, config);
  }
};