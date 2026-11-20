const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_HOST = 'v3.football.api-sports.io';

// Komandanın son 5 oyununu gətirən funksiya
async function getLastMatches(teamName) {
  // Əvvəlcə komandanın ID-sini tapırıq
  const teamRes = await fetch(`https://${API_HOST}/teams?search=${encodeURIComponent(teamName)}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  const teamData = await teamRes.json();
  if (!teamData.response || teamData.response.length === 0) return null;
  
  const teamId = teamData.response[0].team.id;

  // Son 5 oyunu gətiririk
  const fixturesRes = await fetch(`https://${API_HOST}/fixtures?team=${teamId}&last=5`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  const fixturesData = await fixturesRes.json();
  
  if (!fixturesData.response || fixturesData.response.length === 0) return null;
  return fixturesData.response;
}

// Son 5 oyunu Canvas ilə çəkən funksiya
async function createFixturesCanvas(teamName, fixtures) {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  // Arxa fon
  const gradient = ctx.createLinearGradient(0, 0, 800, 600);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(1, '#302b63');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 600);

  // Başlıq
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(`${teamName} - Son 5 Oyun`, 400, 60);

  // Hər oyunu sıra ilə çək
  let y = 120;
  for (const fix of fixtures) {
    const home = fix.teams.home.name;
    const away = fix.teams.away.name;
    const homeGoals = fix.goals.home ?? '-';
    const awayGoals = fix.goals.away ?? '-';
    const date = new Date(fix.fixture.date).toLocaleDateString('az-AZ');
    const league = fix.league.name;

    // Oyun kartı arxa fonu
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(50, y - 30, 700, 80, 10);
    ctx.fill();

    // Liqa və tarix
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px Sans';
    ctx.textAlign = 'left';
    ctx.fillText(`${league} • ${date}`, 70, y - 5);

    // Komandalar və hesab
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Sans';
    ctx.textAlign = 'center';
    
    // Ev sahibi
    ctx.textAlign = 'right';
    ctx.fillText(home, 300, y + 25);
    
    // Hesab
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`${homeGoals} - ${awayGoals}`, 400, y + 25);
    
    // Qonaq
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(away, 500, y + 25);

    y += 100;
  }

  // Alt hissə
  ctx.fillStyle = '#72767d';
  ctx.font = '16px Sans';
  ctx.textAlign = 'center';
  ctx.fillText('ASTROL • Futbol Mərkəzi', 400, 570);

  return canvas.toBuffer('image/png');
}

// Oyunun hadisələrini gətirən funksiya
async function getMatchEvents(fixtureId) {
  const res = await fetch(`https://${API_HOST}/fixtures/events?fixture=${fixtureId}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  const data = await res.json();
  return data.response || [];
}

module.exports = {
  name: 'futbol',
  aliases: ['futbol', 'match', 'oyun'],
  async execute(message, args, client, ctx) {
    if (!API_KEY) return message.reply('❌ API açarı yoxdur. Zəhmət olmasa `FOOTBALL_API_KEY` əlavə edin.');

    const query = args.join(' ');
    if (!query) {
      return message.reply('❌ İstifadə qaydası: `.futbol <komanda adı>`\nMəsələn: `.futbol Liverpool`');
    }

    await message.channel.sendTyping();

    try {
      const fixtures = await getLastMatches(query);
      if (!fixtures) {
        return message.reply(`❌ **${query}** adlı komanda və ya son oyunlar tapılmadı.`);
      }

      // Canvas şəklini yarat
      const buffer = await createFixturesCanvas(query, fixtures);
      const attachment = new AttachmentBuilder(buffer, { name: 'futbol.png' });

      // Select Menu üçün seçimlər (son 5 oyun)
      const options = fixtures.map((fix, index) => {
        const home = fix.teams.home.name;
        const away = fix.teams.away.name;
        const homeGoals = fix.goals.home ?? '-';
        const awayGoals = fix.goals.away ?? '-';
        const date = new Date(fix.fixture.date).toLocaleDateString('az-AZ');
        
        return {
          label: `${home} ${homeGoals} - ${awayGoals} ${away}`.slice(0, 100),
          description: `${fix.league.name} • ${date}`.slice(0, 100),
          value: `futbol_detay_${fix.fixture.id}_${index}` // ID-ni yadda saxlayırıq
        };
      });

      const menu = new StringSelectMenuBuilder()
        .setCustomId('futbol_menu')
        .setPlaceholder('📋 Detallı baxmaq üçün oyun seçin...')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(menu);

      const embed = new EmbedBuilder()
        .setTitle(`⚽ ${query} - Son 5 Oyun`)
        .setDescription('Aşağıdakı menyudan oyun seçərək hadisələrə baxa bilərsiniz.')
        .setColor(0x5865F2)
        .setImage('attachment://futbol.png')
        .setFooter({ text: 'ASTROL Bot • Futbol Mərkəzi' });

      // Menyunun işləməsi üçün məlumatları yadda saxlayırıq
      const msg = await message.reply({ embeds: [embed], files: [attachment], components: [row] });

      // Menyu seçildikdə işləyəcək collector
      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 10 * 60 * 1000 // 10 dəqiqə
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'futbol_menu') {
          const selectedValue = i.values[0];
          // Dəyərdən fixture ID-ni çıxarırıq: futbol_detay_12345_0
          const parts = selectedValue.split('_');
          const fixtureId = parts[2];
          
          const fixture = fixtures.find(f => f.fixture.id == fixtureId);
          if (!fixture) return i.reply({ content: '❌ Oyun tapılmadı.', ephemeral: true });

          await i.deferReply();

          try {
            const events = await getMatchEvents(fixtureId);
            
            // Hadisələri sırala (dəqiqəyə görə)
            events.sort((a, b) => (a.time.elapsed || 0) - (b.time.elapsed || 0));

            let eventText = '';
            if (events.length === 0) {
              eventText = '*Bu oyunda heç bir hadisə qeydə alınmayıb.*';
            } else {
              eventText = events.map(ev => {
                let icon = '📌';
                let text = `${ev.time.elapsed}' `;
                
                if (ev.type === 'Goal') {
                  icon = '⚽';
                  text += `**Qol!** ${ev.player.name} (${ev.team.name})`;
                  if (ev.detail === 'Penalty') text += ' (Penalti)';
                  if (ev.detail === 'Own Goal') text += ' (Öz qapısına)';
                } else if (ev.type === 'Card') {
                  if (ev.detail === 'Yellow Card') { icon = '🟨'; text += `Sarı kart: ${ev.player.name}`; }
                  else if (ev.detail === 'Red Card') { icon = '🟥'; text += `Qırmızı kart: ${ev.player.name}`; }
                  else { icon = '🟨'; text += `Kart: ${ev.player.name}`; }
                } else if (ev.type === 'subst') {
                  icon = '🔄';
                  text += `Dəyişiklik: ${ev.player.name} ➡️ ${ev.assist.name}`;
                } else if (ev.type === 'Var') {
                  icon = '📺';
                  text += `VAR: ${ev.detail}`;
                }
                
                return `${icon} ${text}`;
              }).join('\n');
            }

            // Oyunun əsas məlumatları
            const home = fixture.teams.home.name;
            const away = fixture.teams.away.name;
            const homeGoals = fixture.goals.home ?? '-';
            const awayGoals = fixture.goals.away ?? '-';
            const date = new Date(fixture.fixture.date).toLocaleDateString('az-AZ', { 
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            const league = fixture.league.name;
            const status = fixture.fixture.status.long;

            const detailEmbed = new EmbedBuilder()
              .setTitle(`⚽ ${home} ${homeGoals} - ${awayGoals} ${away}`)
              .setDescription(`**Liqa:** ${league}\n**Tarix:** ${date}\n**Status:** ${status}\n\n**Hadisələr:**\n${eventText}`)
              .setColor(0x00ff88)
              .setFooter({ text: 'ASTROL Bot • Futbol Mərkəzi' });

            await i.editReply({ embeds: [detailEmbed] });

          } catch (err) {
            console.error('Futbol detay xətası:', err);
            await i.editReply({ content: '❌ Oyun detalları yüklənərkən xəta baş verdi.' });
          }
        }
      });

      collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
      });

    } catch (error) {
      console.error('Futbol xətası:', error);
      message.reply('❌ Futbol məlumatları yüklənərkən xəta baş verdi.');
    }
  }
};
