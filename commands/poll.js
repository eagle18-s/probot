const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../utils/storage');
const { makeId } = require('../utils/helpers');

module.exports = {
  name: 'anket',
  aliases: ['poll'],
  async execute(message, args, client, ctx) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply('❌ Mesajları İdarə Et yetkisi.');

    const raw = args.join(' ');
    const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3)
      return message.reply('❌ `.anket Sual | Variant1 | Variant2 | ...` (maks 10 variant, 20 dəq)');

    const question = parts[0];
    const options = parts.slice(1);
    if (options.length > 10) return message.reply('❌ Maks 10 variant.');

    const pollId = makeId(8);
    const embed = new EmbedBuilder()
      .setTitle('📊 ' + question)
      .setDescription(options.map((o, i) => `**${i + 1}.** ${o} — 0 səs`).join('\n'))
      .setColor(0x5865F2)
      .setFooter({ text: 'Səs vermək üçün aşağıdakı butonlara basın • 10 dəq' })
      .setTimestamp();

    const buttons = options.map((o, i) =>
      new ButtonBuilder()
        .setCustomId(`poll_${pollId}_${i}`)
        .setLabel(`${i + 1}. ${o}`.slice(0, 80))
        .setStyle(ButtonStyle.Primary)
    );
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    const sent = await message.channel.send({ embeds: [embed], components: rows });

    const polls = storage.load('polls', {});
    polls[pollId] = {
      question, options,
      multi: false,
      votes: { [pollId]: {} },
      channelId: message.channel.id,
      messageId: sent.id,
      ended: false,
      endAt: Date.now() + 10 * 60 * 1000
    };
    storage.save('polls', polls);

    // 10 dəq sonra bitir
    setTimeout(async () => {
      const p = storage.load('polls', {})[pollId];
      if (!p || p.ended) return;
      p.ended = true;
      storage.save('polls', { ...storage.load('polls', {}), [pollId]: p });
      try {
        const ch = await client.channels.fetch(p.channelId);
        const msg = await ch.messages.fetch(p.messageId);
        const counts = p.options.map((_, i) => {
          let c = 0;
          for (const v of Object.values(p.votes[pollId] || {})) if (v.includes(i)) c++;
          return c;
        });
        const total = counts.reduce((a, b) => a + b, 0) || 1;
        const desc = p.options.map((o, i) => {
          const pct = Math.round((counts[i] / total) * 100);
          return `**${o}** — ${counts[i]} səs (${pct}%)`;
        }).join('\n');
        await msg.edit({
          embeds: [EmbedBuilder.from(msg.embeds[0]).setDescription(`${p.question}\n\n${desc}\n\n**Bitdi**`).setFooter({ text: 'Anket bitdi' })],
          components: []
        });
      } catch {}
    }, 10 * 60 * 1000);

    message.reply(`✅ Anket yaradıldı: ${sent.url}`);
  }
};