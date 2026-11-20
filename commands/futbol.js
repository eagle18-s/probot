const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCanvas } = require('@napi-rs/canvas');

// ESPN API — API Key tələb etmir
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

// Komandanın son 5 oyununu gətirən funksiya
async function getLastMatches(teamName) {
  try {
    // ESPN-də komanda axtarışı üçün əvvəlcə liqaları yoxlaya bilərik, amma ən asanı birbaşa komandanın oyunlarını axtarmaqdır.
    // ESPN-in "search" endpoint-i olmadığı üçün, istifadəçinin yazdığı komanda adını birbaşa sorğuya əlavə edirik.
    // Daha dəqiq nəticə üçün liqanı da təxmin edə bilərik, amma sadəlik üçün bütün liqalarda axtarırıq.
    
    // Əvvəlcə komandanın ID-sini tapmaq üçün ESPN-in ümumi komanda axtarışından istifadə edirik
    const searchRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/teams?limit=1000`);
    const searchData = await searchRes.json();
    
    // Bütün liqalardakı komandaları yoxlayırıq
    let foundTeam = null;
    if (searchData.sports && searchData.sports[0] && searchData.sports[0].leagues) {
      for (const league of searchData.sports[0].leagues) {
        const teamsRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/teams`);
        const teamsData = await teamsRes.json();
        if (teamsData.sports && teamsData.sports[0] && teamsData.sports[0].leagues) {
          const teams = teamsData.sports[0].leagues[0].teams;
          if (teams) {
            const match = teams.find(t => 
              t.team.displayName.toLowerCase().includes(teamName.toLowerCase()) ||
              t.team.name.toLowerCase().includes(teamName.toLowerCase()) ||
              t.team.shortDisplayName.toLowerCase().includes(teamName.toLowerCase())
            );
            if (match) {
              foundTeam = { ...match.team, leagueSlug: league.slug };
              break;
            }
          }
        }
        if (foundTeam) break;
      }
    }

    if (!foundTeam) return null;

    // Komandanın son 5 oyununu gətiririk
    const scheduleRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${foundTeam.leagueSlug}/teams/${foundTeam.id}/schedule`);
    const scheduleData = await scheduleRes.json();
    
    if (!scheduleData.events) return null;
    
    // Son 5 oyunu götürürük (tarixə görə sıralayırıq)
    const events = scheduleData.events
      .filter(e => e.competitions && e.competitions[0].status.type.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return { team: foundTeam, events, leagueSlug: foundTeam.leagueSlug };
  } catch (err) {
    console.error('ESPN API Xətası:', err);
    return null;
  }
}

// Son 5 oyunu Canvas ilə çəkən funksiya
async function createFixturesCanvas(teamName, events, teamId) {
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
    
    const homeName = home.team.displayName;
    const awayName = away.team.displayName;
    const homeScore = home.score || '-';
    const awayScore = away.score || '-';
    
    // Tarix formatı
    const date = new Date(event.date).toLocaleDateString('az-AZ');
    // Liqa adı (event-dən götürürük)
    const league = event.season?.slug || 'Liqa';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(50, y - 30, 700, 80, 10);
    ctx.fill();

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px Sans';
    ctx.textAlign = 'left';
    ctx.fillText(`${league.toUpperCase()} • ${date}`, 70, y - 5);

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

// Oyunun hadisələrini gətirən funksiya
async function getMatchEvents(leagueSlug, eventId) {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${eventId}`);
    const data = await res.json();
    
    if (!data.commentary) return [];
    
    // ESPN-in commentary formatını sadələşdiririk
    return data.commentary.map(c => {
      // ESPN-də hadisələr "play" obyektində gəlir
      const play = c.play;
      if (!play) return null;
      
      return {
        minute: play.clock?.displayValue || '',
        type: play.type?.text || '',
        text: play.text || '',
        team: play.team?.displayName || '',
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
    const query = args.join(' ');
    if (!query) {
      return message.reply('❌ İstifadə qaydası: `.futbol <komanda adı>`\nMəsələn: `.futbol Liverpool`');
    }

    await message.channel.sendTyping();

    try {
      const result = await getLastMatches(query);
      if (!result || !result.events.length) {
        return message.reply(`❌ **${query}** adlı komanda və ya son oyunlar tapılmadı.`);
      }

      const buffer = await createFixturesCanvas(query, result.events, result.team.id);
      const attachment = new AttachmentBuilder(buffer, { name: 'futbol.png' });

      // Select Menu — hər oyun üçün bir seçim
      const options = result.events.map((event, index) => {
        const comp = event.competitions[0];
        const home = comp.competitors.find(c => c.homeAway === 'home');
        const away = comp.competitors.find(c => c.homeAway === 'away');
        const homeScore = home.score || '-';
        const awayScore = away.score || '-';
        const date = new Date(event.date).toLocaleDateString('az-AZ');
        
        return {
          label: `${home.team.displayName} ${homeScore} - ${awayScore} ${away.team.displayName}`.slice(0, 100),
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
        .setTitle(`⚽ ${query} - Son 5 Oyun`)
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
              eventText = '*Bu oyunda heç bir hadisə qeydə alınmayıb.*';
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
