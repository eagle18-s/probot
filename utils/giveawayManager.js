const storage = require('./storage');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const timers = new Map();

function load() { return storage.load('giveaways', {}); }
function save() { storage.save('giveaways', load()); }
function get(id) { return load()[id]; }
function all() { return load(); }

function scheduleEnd(client, id) {
  const g = get(id);
  if (!g) return;
  const delay = Math.max(0, g.endAt - Date.now());
  if (timers.has(id)) clearTimeout(timers.get(id));
  timers.set(id, setTimeout(async () => {
    const cur = get(id);
    if (!cur || cur.ended) return;
    cur.ended = true;
    const data = load(); data[id] = cur; storage.save('giveaways', data);
    const winners = cur.participants.sort(() => 0.5 - Math.random()).slice(0, Math.min(cur.winnersCount, cur.participants.length));
    const embed = new EmbedBuilder()
      .setTitle('🎉 ÇEKİLİŞ SONA ERDİ!')
      .setDescription(`**Ödül:** ${cur.prize}`)
      .setColor(0x00ff00).setTimestamp();
    if (!winners.length) embed.addFields({ name: 'Kazananlar', value: 'Katılımcı yoxdur.' });
    else embed.addFields({ name: 'Kazananlar', value: winners.map(w => `<@${w}>`).join('\n') });
    embed.addFields({ name: 'Toplam Katılımcı', value: `${cur.participants.length}`, inline: true });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('giveaway_ended').setLabel('Bitdi').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    try {
      const ch = await client.channels.fetch(cur.channelId);
      const msg = await ch.messages.fetch(id);
      await msg.edit({ embeds: [embed], components: [row] });
      if (winners.length) await ch.send(`🎉 Təbriklər ${winners.map(w => `<@${w}>`).join(', ')}!\n**Ödül:** ${cur.prize}`);
    } catch (e) { console.error('[giveaway-end]', e.message); }
  }, delay));
}

function restore(client) {
  const allG = all();
  for (const [id, g] of Object.entries(allG)) {
    if (!g.ended) scheduleEnd(client, id);
  }
  console.log(`🎁 ${Object.keys(allG).length} çekiliş bərpa edildi.`);
}

function create(client, data) {
  const all = load();
  all[data.id] = data;
  storage.save('giveaways', all);
  scheduleEnd(client, data.id);
}

module.exports = { load, save, get, all, create, restore, scheduleEnd };