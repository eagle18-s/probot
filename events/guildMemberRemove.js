const { AttachmentBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { createLeaveCard } = require('../utils/canvas');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const config = storage.load('config', {});
    const gcfg = config[member.guild.id] || {};
    if (gcfg.welcomeLeaveChannel) {
      try {
        const ch = member.guild.channels.cache.get(gcfg.welcomeLeaveChannel);
        if (ch) {
          const buf = await createLeaveCard(member.user, member.guild.memberCount, member.guild.name);
          const att = new AttachmentBuilder(buf, { name: 'hosca-kal.png' });
          await ch.send({ files: [att] });
        }
      } catch (e) { console.error('[leave]', e.message); }
    }
  }
};