const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { createWelcomeCard } = require('../utils/canvas');

const joinTracker = new Map();
const inviteCache = new Map();

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const config = storage.load('config', {});
    const gcfg = config[member.guild.id] || {};
    const now = Date.now();

    // ===== Anti-raid =====
    if (!joinTracker.has(member.guild.id)) joinTracker.set(member.guild.id, []);
    const joins = joinTracker.get(member.guild.id).filter(t => now - t < 10000);
    joins.push(now);
    joinTracker.set(member.guild.id, joins);
    if (joins.length >= 8) {
      const embed = new EmbedBuilder()
        .setTitle('🚨 ANTİ-RAİD')
        .setDescription(`10 saniyede **${joins.length}** qoşulma!`)
        .setColor(0xff0000);
      const logCh = gcfg.logChannel && member.guild.channels.cache.get(gcfg.logChannel);
      if (logCh) logCh.send({ embeds: [embed] }).catch(() => {});
    }

    // ===== Invite tracker =====
    try {
      const invites = await member.guild.invites.fetch();
      const cached = inviteCache.get(member.guild.id) || new Map();
      let usedInvite = null;
      for (const inv of invites.values()) {
        const old = cached.get(inv.code);
        if (old !== undefined && inv.uses > old) {
          usedInvite = { code: inv.code, inviter: inv.inviter, uses: inv.uses };
          break;
        }
      }
      const newCache = new Map();
      invites.forEach(inv => newCache.set(inv.code, inv.uses));
      inviteCache.set(member.guild.id, newCache);

      if (usedInvite) {
        const invitesData = storage.load('invites', {});
        if (!invitesData[member.guild.id]) invitesData[member.guild.id] = {};
        if (!invitesData[member.guild.id][usedInvite.inviter.id]) {
          invitesData[member.guild.id][usedInvite.inviter.id] = { count: 0, joined: [] };
        }
        const rec = invitesData[member.guild.id][usedInvite.inviter.id];
        rec.count++;
        rec.joined.push({ userId: member.id, at: now });
        storage.save('invites', invitesData);

        const invEmbed = new EmbedBuilder()
          .setTitle('📨 Dəvət İzləmə')
          .setDescription(`${member} **${usedInvite.inviter.tag}** tərəfindən dəvət edildi.\nKod: \`${usedInvite.code}\``)
          .setColor(0x5865F2).setTimestamp();
        const logCh = gcfg.logChannel && member.guild.channels.cache.get(gcfg.logChannel);
        if (logCh) logCh.send({ embeds: [invEmbed] }).catch(() => {});
      }
    } catch (e) { console.error('[invite]', e.message); }

    // ===== Welcome card =====
    if (gcfg.welcomeLeaveChannel) {
      try {
        const ch = member.guild.channels.cache.get(gcfg.welcomeLeaveChannel);
        if (ch) {
          const buf = await createWelcomeCard(member, member.guild.memberCount);
          const att = new AttachmentBuilder(buf, { name: 'hosgeldin.png' });
          await ch.send({ files: [att] });
        }
      } catch (e) { console.error('[welcome]', e.message); }
    }
  }
};