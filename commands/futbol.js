const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCanvas } = require('@napi-rs/canvas');

// Komanda adlarını ESPN liqa kodu və komanda ID-si ilə əlaqələndirən xəritə
const TEAM_MAP = {
  'liverpool': { id: 364, league: 'eng.1', name: 'Liverpool' },
  'barcelona': { id: 83, league: 'esp.1', name: 'Barcelona' },
  'real madrid': { id: 86, league: 'esp.1', name: 'Real Madrid' },
  'manchester united': { id: 360, league: 'eng.1', name: 'Manchester United' },
  'manchester city': { id: 382, league: 'eng.1', name: 'Manchester City' },
  'arsenal': { id: 359, league: 'eng.1', name: 'Arsenal' },
  'chelsea': { id: 363, league: 'eng.1', name: 'Chelsea' },
  'bayern munich': { id: 132, league: 'ger.1', name: 'Bayern Munich' },
  'juventus': { id: 111, league: 'ita.1', name: 'Juventus' },
  'psg': { id: 160, league: 'fra.1', name: 'Paris Saint-Germain' },
};

async function getLastMatches(teamKey) {
  const team = TEAM_MAP[teamKey.toLowerCase()];
  if (!team) return null;

  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${team.league}/teams/${team.id}/schedule`);
    const data = await res.json();
    
    if (!data.events) return null;
    
    const events = data.events
      .filter(e => e.competitions && e.competitions[0].status.type.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return { team, events, leagueSlug: team.league };
  } catch (err) {
    console.error('ESPN API Xətası:', err);
    return null;
  }
}

async function createFixturesCanvas(teamName, events) {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 800, 600);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(1, '#302b63');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 600);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(`${teamName} - Son 5 Oyun`, 400, 60);

  let y = 120;
  for (const event of events) {
    const comp = event.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    
    const homeName = home?.team?.displayName || home?.team?.name || 'Bilinməyən';
    const awayName = away?.team?.displayName || away?.team?.name || 'Bilinməyən';
    const homeScore = home?.score?.displayValue || home?.score || '-';
    const awayScore = away?.score?.displayValue || away?.score || '-';
    const date = new Date(event.date).toLocaleDateString('az-AZ');

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(50, y - 30, 700, 80, 10);
    ctx.fill();

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px Sans';
    ctx.textAlign = 'left';
    ctx.fillText(`${event.season?.slug || 'Liqa'} • ${date}`, 70, y - 5);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Sans';
    ctx.textAlign = 'right';
    ctx.fillText(homeName, 300, y + 25);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`${homeScore} - ${awayScore}`, 400, y + 25);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(awayName, 500, y + 25);

    y += 100;
  }

  ctx.fillStyle = '#72767d';
  ctx.font = '16px Sans';
  ctx.textAlign = 'center';
  ctx.fillText('ASTROL • Futbol Mərkəzi (ESPN)', 400, 570);

  return canvas.toBuffer('image/png');
}

async function getMatchEvents(leagueSlug, eventId) {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${eventId}`);
    const data = await res.json();
    
    // ESPN bəzən hadisələri "commentary", bəzən isə "keyEvents" kimi qaytarır
    const rawEvents = data.commentary || data.keyEvents || data.plays || [];
    
    if (!rawEvents.length) return [];
    
    return rawEvents.map(c => {
      const play = c.play || c;
      if (!play) return null;
      
      // Hadisə mətnini və tipini təhlükəsiz çıxarırıq
      const text = play.text || play.shortText || play.description || 'Hadisə mətni yoxdur';
      const type = play.type?.text || play.type?.description || '';
      
      return {
        minute: play.clock?.displayValue || play.clock?.minutes || '',
        type: type,
        text: text,
        scoringPlay: play.scoringPlay || false
      };
    }).filter(Boolean);
  } catch (err) {
    console.error('ESPN Hadisə Xətası:', err);
    return [];
  }
}

module.exports = {
  name: 'futbol',
  aliases: ['futbol', 'match', 'oyun'],
  async execute(message, args, client, ctx) {
    const query = args.join(' ').trim();
    if (!query) {
      return message.reply('❌ İstifadə qaydası: `.futbol <komanda adı>`\nMəsələn: `.futbol Liverpool`');
    }

    await message.channel.sendTyping();

    try {
      const result = await getLastMatches(query);
      if (!result || !result.events.length) {
        return message.reply(`❌ **${query}** adlı komanda tapılmadı.\nDəstəklənən komandalar: Liverpool, Barcelona, Real Madrid, Manchester United, Arsenal, Chelsea və s.`);
      }

      const buffer = await createFixturesCanvas(result.team.name, result.events);
      const attachment = new AttachmentBuilder(buffer, { name: 'futbol.png' });

      const options = result.events.map((event, index) => {
        const comp = event.competitions[0];
        const home = comp.competitors.find(c => c.homeAway === 'home');
        const away = comp.competitors.find(c => c.homeAway === 'away');
        
        const homeName = home?.team?.displayName || home?.team?.name || 'Bilinməyən';
        const awayName = away?.team?.displayName || away?.team?.name || 'Bilinməyən';
        const homeScore = home?.score?.displayValue || home?.score || '-';
        const awayScore = away?.score?.displayValue || away?.score || '-';
        const date = new Date(event.date).toLocaleDateString('az-AZ');
        
        return {
          label: `${homeName} ${homeScore} - ${awayScore} ${awayName}`.slice(0, 100),
          description: `${event.season?.slug || 'Liqa'} • ${date}`.slice(0, 100),
          value: `futbol_detay_${event.id}_${result.leagueSlug}`
        };
      });

      const menu = new StringSelectMenuBuilder()
        .setCustomId('futbol_menu')
        .setPlaceholder('📋 Detallı baxmaq üçün oyun seçin...')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(menu);

      const embed = new EmbedBuilder()
        .setTitle(`⚽ ${result.team.name} - Son 5 Oyun`)
        .setDescription('Aşağıdakı menyudan oyun seçərək hadisələrə baxa bilərsiniz.')
        .setColor(0x5865F2)
        .setImage('attachment://futbol.png')
        .setFooter({ text: 'ASTROL Bot • Futbol Mərkəzi (ESPN)' });

      const msg = await message.reply({ embeds: [embed], files: [attachment], components: [row] });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 10 * 60 * 1000
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'futbol_menu') {
          const selectedValue = i.values[0];
          const parts = selectedValue.split('_');
          const eventId = parts[2];
          const leagueSlug = parts[3];
          
          await i.deferReply();

          try {
            const events = await getMatchEvents(leagueSlug, eventId);
            
            let eventText = '';
            if (!events.length) {
              eventText = '*Bu oyun üçün ESPN detallı hadisə məlumatı təqdim etmir.*';
            } else {
              eventText = events.map(ev => {
                let icon = '📌';
                if (ev.scoringPlay) icon = '⚽';
                else if (ev.type.toLowerCase().includes('card')) icon = '🟨';
                else if (ev.type.toLowerCase().includes('substitution')) icon = '🔄';
                
                return `${icon} **${ev.minute}** - ${ev.text}`;
              }).join('\n');
            }

            const detailEmbed = new EmbedBuilder()
              .setTitle(`⚽ Oyun Detalları`)
              .setDescription(`**Hadisələr:**\n${eventText}`)
              .setColor(0x00ff88)
              .setFooter({ text: 'ASTROL Bot • Futbol Mərkəzi (ESPN)' });

            await i.editReply({ embeds: [detailEmbed] });

          } catch (err) {
            console.error('ESPN Detay Xətası:', err);
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
