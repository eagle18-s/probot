const { ChannelType, PermissionFlagsBits } = require('discord.js');
const storage = require('../utils/storage');
const { xpForLevel } = require('../utils/helpers');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const config = storage.load('config', {});
    const gcfg = config[newState.guild.id] || {};

    // ===== Özel oda =====
    if (gcfg.özelOdaSetupChannel && gcfg.özelOdaCategory) {
      const member = newState.member || await newState.guild.members.fetch(newState.id).catch(() => null);
      if (member && newState.channelId === gcfg.özelOdaSetupChannel) {
        try {
          const channel = await newState.guild.channels.create({
            name: `🔊 ${member.user.username}`.slice(0, 100),
            type: ChannelType.GuildVoice,
            parent: gcfg.özelOdaCategory,
            permissionOverwrites: [
              { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect] },
              { id: newState.guild.id, allow: [PermissionFlagsBits.Connect] }
            ]
          });
          await newState.setChannel(channel);
        } catch (e) { console.error('[özeloda]', e.message); }
      }
      if (oldState.channel && oldState.channel.parentId === gcfg.özelOdaCategory && oldState.channel.id !== gcfg.özelOdaSetupChannel) {
        if (oldState.channel.members.size === 0) await oldState.channel.delete().catch(() => {});
      }
    }

    // ===== Səs XP =====
    const guildId = newState.guild.id;
    const userId = newState.member?.id || oldState.member?.id;
    if (!userId || newState.member?.user?.bot) return;

    const sessions = storage.load('voiceSessions', {});
    const key = `${guildId}-${userId}`;

    if (!oldState.channelId && newState.channelId) {
      sessions[key] = Date.now();
      storage.save('voiceSessions', sessions);
    }
    if (oldState.channelId && (!newState.channelId || oldState.channelId !== newState.channelId)) {
      const start = sessions[key];
      if (start) {
        const sec = Math.floor((Date.now() - start) / 1000);
        if (sec >= 30) {
          const xpData = storage.load('xp', {});
          if (!xpData[guildId]) xpData[guildId] = {};
          if (!xpData[guildId][userId]) xpData[guildId][userId] = { xp: 0, level: 0, messages: 0, voiceTime: 0, lastMessage: 0 };
          const u = xpData[guildId][userId];
          u.voiceTime += sec;
          u.xp += Math.floor(sec / 60) * 5;
          while (u.xp >= xpForLevel(u.level + 1)) u.level++;
          storage.save('xp', xpData);
        }
        delete sessions[key];
        storage.save('voiceSessions', sessions);
      }
      if (newState.channelId) {
        sessions[key] = Date.now();
        storage.save('voiceSessions', sessions);
      }
    }
  }
};