const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const storage = require('../utils/storage');
const { efendimLog } = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // ==========================================
      // 1. BUTONLAR (Buttons)
      // ==========================================
      if (interaction.isButton()) {
        const id = interaction.customId;

        // --- Ticket Bağlama ---
        if (id === 'ticket_close') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
            return interaction.reply({ content: '❌ Yalnız yetkililer.', ephemeral: true });
          const embed = new EmbedBuilder()
            .setTitle('Problem çözüldü mü?')
            .setDescription('Lütfen seçin. EFENDİM\'e iletilecek.')
            .setColor(0x5865F2);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_yes').setLabel('Evet').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_no').setLabel('Hayır').setStyle(ButtonStyle.Danger)
          );
          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (id === 'ticket_yes' || id === 'ticket_no') {
          if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
            return interaction.reply({ content: '❌ Yalnız yetkililer.', ephemeral: true });
          const resolved = id === 'ticket_yes' ? 'Evet' : 'Hayır';
          const channel = interaction.channel;
          await efendimLog(client, interaction.guild, 'TICKET KAPANDI',
            `**Kanal:** ${channel.name}\n**Kapatan:** ${interaction.user.tag}\n**Çözüldü:** **${resolved}**`,
            resolved === 'Evet' ? 0x00ff00 : 0xff0000);
          await interaction.update({ content: `✅ Qeyd edildi: **${resolved}**\nKanal 5s sonra silinəcək...`, embeds: [], components: [] });
          setTimeout(() => channel.delete().catch(() => {}), 5000);
          return;
        }

        // --- DM Modal Aç ---
        if (id.startsWith('dm_open_modal_')) {
          const targetId = id.replace('dm_open_modal_', '');
          
          const modal = new ModalBuilder()
            .setCustomId(`dm_submit_${targetId}`)
            .setTitle('📩 Mesaj Göndər');

          const titleInput = new TextInputBuilder()
            .setCustomId('dm_title')
            .setLabel('Embed Başlığı')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(true)
            .setPlaceholder('Məsələn: Xoş gəldin!');

          const descInput = new TextInputBuilder()
            .setCustomId('dm_desc')
            .setLabel('Mesaj Mətni')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setRequired(true)
            .setPlaceholder('Mesajınızı bura yazın...');

          const imageInput = new TextInputBuilder()
            .setCustomId('dm_image')
            .setLabel('Şəkil URL (İstəyə bağlı)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('https://...');

          const colorInput = new TextInputBuilder()
            .setCustomId('dm_color')
            .setLabel('Rəng HEX (İstəyə bağlı)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('#5865F2');

          modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(colorInput)
          );

          return interaction.showModal(modal);
        }

        // --- Çekiliş ---
        if (id === 'giveaway_join') {
          const mgr = require('../utils/giveawayManager');
          const giveaway = mgr.get(interaction.message.id);
          if (!giveaway || giveaway.ended) return interaction.reply({ content: '❌ Çekiliş bitib.', ephemeral: true });
          if (giveaway.participants.includes(interaction.user.id))
            return interaction.reply({ content: '❌ Artıq qatılmısınız!', ephemeral: true });
          giveaway.participants.push(interaction.user.id);
          mgr.save();
          const embed = EmbedBuilder.from(interaction.message.embeds[0]);
          embed.spliceFields(0, 1, { name: 'Katılımcı Sayısı', value: `${giveaway.participants.length}`, inline: true });
          await interaction.message.edit({ embeds: [embed] });
          return interaction.reply({ content: '✅ Qatıldınız! Uğurlar 🎉', ephemeral: true });
        }

        // --- Reaction Roles ---
        if (id.startsWith('rr_')) {
          const rrId = id.slice(3);
          const rrData = storage.load('reactionRoles', {});
          const panels = rrData[interaction.guild.id] || {};
          let found = null;
          for (const [msgId, panel] of Object.entries(panels)) {
            if (panel.buttons) {
              const btn = panel.buttons.find(b => b.id === rrId);
              if (btn) { found = btn; break; }
            }
          }
          if (!found) return interaction.reply({ content: '❌ Rol tapılmadı.', ephemeral: true });
          const member = interaction.member;
          const role = interaction.guild.roles.cache.get(found.roleId);
          if (!role) return interaction.reply({ content: '❌ Rol silinib.', ephemeral: true });
          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role).catch(() => {});
            return interaction.reply({ content: `➖ **${role.name}** rolü alındı.`, ephemeral: true });
          } else {
            await member.roles.add(role).catch(() => {});
            return interaction.reply({ content: `➕ **${role.name}** rolü verildi.`, ephemeral: true });
          }
        }

        // --- Poll (Anket) ---
        if (id.startsWith('poll_')) {
          const [, pollId, optIdx] = id.split('_');
          const polls = storage.load('polls', {});
          const poll = polls[pollId];
          if (!poll) return interaction.reply({ content: '❌ Anket tapılmadı.', ephemeral: true });
          if (poll.ended) return interaction.reply({ content: '❌ Anket bitib.', ephemeral: true });
          if (poll.multi) {
            if (!poll.votes[pollId]) poll.votes[pollId] = {};
            const votes = poll.votes[pollId][interaction.user.id] || [];
            const idx = parseInt(optIdx, 10);
            const pos = votes.indexOf(idx);
            if (pos >= 0) votes.splice(pos, 1);
            else votes.push(idx);
            poll.votes[pollId][interaction.user.id] = votes;
          } else {
            poll.votes[pollId] = poll.votes[pollId] || {};
            poll.votes[pollId][interaction.user.id] = [parseInt(optIdx, 10)];
          }
          storage.save('polls', polls);
          const counts = poll.options.map((_, i) => {
            let c = 0;
            for (const v of Object.values(poll.votes[pollId] || {})) if (v.includes(i)) c++;
            return c;
          });
          const total = counts.reduce((a, b) => a + b, 0) || 1;
          const desc = poll.options.map((o, i) => {
            const pct = Math.round((counts[i] / total) * 100);
            const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
            return `**${o}** — ${counts[i]} səs (${pct}%) ${bar}`;
          }).join('\n');
          const embed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(`${poll.question}\n\n${desc}`);
          await interaction.message.edit({ embeds: [embed] }).catch(() => {});
          return interaction.reply({ content: '✅ Səsiniz qeydə alındı.', ephemeral: true });
        }
      }

      // ==========================================
      // 2. SELECT MENYU (String Select Menu)
      // ==========================================
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('rrsel_')) {
          const rrId = interaction.customId.slice(6);
          const rrData = storage.load('reactionRoles', {});
          const panels = rrData[interaction.guild.id] || {};
          let panel = null;
          for (const p of Object.values(panels)) {
            if (p.selectMenuId === rrId) { panel = p; break; }
          }
          if (!panel) return interaction.reply({ content: '❌ Panel tapılmadı.', ephemeral: true });
          const selected = interaction.values;
          const allRoles = panel.options.map(o => o.roleId);
          const member = interaction.member;
          for (const rId of allRoles) {
            if (!selected.includes(rId) && member.roles.cache.has(rId)) {
              await member.roles.remove(rId).catch(() => {});
            }
          }
          for (const rId of selected) {
            if (!member.roles.cache.has(rId)) await member.roles.add(rId).catch(() => {});
          }
          return interaction.reply({ content: '✅ Rollar yeniləndi.', ephemeral: true });
        }
      }

      // ==========================================
      // 3. MODAL SUBMIT (Form Göndərildi)
      // ==========================================
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('dm_submit_')) {
          const targetId = interaction.customId.replace('dm_submit_', '');
          
          const title = interaction.fields.getTextInputValue('dm_title');
          const desc = interaction.fields.getTextInputValue('dm_desc');
          const image = interaction.fields.getTextInputValue('dm_image');
          const colorHex = interaction.fields.getTextInputValue('dm_color') || '#5865F2';

          let color = 0x5865F2;
          if (colorHex.startsWith('#') && colorHex.length === 7) {
            color = parseInt(colorHex.replace('#', ''), 16);
          }

          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: 'ASTROL • Rəsmi Mesaj' });

          if (image && image.startsWith('http')) {
            embed.setImage(image);
          }

          try {
            const target = await client.users.fetch(targetId);
            await target.send({ embeds: [embed] });
            
            await interaction.reply({ content: `✅ Mesaj **${target.tag}** istifadəçisinə uğurla göndərildi!`, ephemeral: true });
          } catch (err) {
            console.error('DM Göndərmə Xətası:', err);
            await interaction.reply({ content: `❌ Mesaj göndərilə bilmədi. İstifadəçinin DM-i bağlı ola bilər.`, ephemeral: true });
          }
        }
      }
    } catch (e) {
      console.error('[interaction]', e);
      if (interaction.replied || interaction.deferred) {
        interaction.followUp({ content: '❌ Xəta.', ephemeral: true }).catch(() => {});
      } else {
        interaction.reply({ content: '❌ Xəta.', ephemeral: true }).catch(() => {});
      }
    }
  }
};
