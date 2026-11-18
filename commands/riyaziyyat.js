const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas } = require('@napi-rs/canvas');
const math = require('mathjs');

// Qrafik çəkmək üçün funksiya (Birdən çox funksiya və kəsişmə nöqtələri ilə)
async function plotFunctions(functions) {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');
  
  // Arxa fon (Tünd rəng)
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, 800, 600);

  // Koordinat sistemi mərkəzi
  const centerX = 400;
  const centerY = 300;
  const scale = 40; // 1 vahid = 40 piksel

  // X və Y oxlarını çək
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(800, centerY);
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, 600);
  ctx.stroke();

  // Şəbəkə xətləri
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    if (i === 0) continue;
    ctx.beginPath();
    ctx.moveTo(centerX + i * scale, 0);
    ctx.lineTo(centerX + i * scale, 600);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, centerY + i * scale);
    ctx.lineTo(800, centerY + i * scale);
    ctx.stroke();
  }

  // Eksenlərə rəqəmləri yaz
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  for (let i = -10; i <= 10; i++) {
    if (i === 0) continue;
    ctx.fillText(i.toString(), centerX + i * scale, centerY + 20);
    ctx.fillText((i * -1).toString(), centerX + 20, centerY + i * scale);
  }

  // Rənglər palitrası
  const colors = ['#00ff88', '#ff5555', '#00bfff', '#ffaa00', '#ff00ff'];
  let colorIndex = 0;
  const legends = [];
  const roots = [];

  // Hər funksiyanı çək
  for (const expression of functions) {
    const compiled = math.compile(expression);
    const color = colors[colorIndex % colors.length];
    colorIndex++;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    let isFirstPoint = true;
    let prevY = null;
    
    // Kökləri (sıfırları) tapmaq üçün
    for (let pixelX = 0; pixelX <= 800; pixelX += 1) {
      const x = (pixelX - centerX) / scale;
      try {
        const y = compiled.evaluate({ x: x });
        if (typeof y !== 'number' || !isFinite(y)) {
          isFirstPoint = true;
          prevY = null;
          continue;
        }
        
        // Kök tapma (y dəyəri işarəni dəyişirsə)
        if (prevY !== null && Math.sign(y) !== Math.sign(prevY) && Math.abs(y) < 5 && Math.abs(prevY) < 5) {
          const rootX = x - (y * (x - ((pixelX - 1 - centerX) / scale)) / (y - prevY));
          roots.push({ x: rootX.toFixed(2), func: expression, color: color });
        }
        prevY = y;

        const pixelY = centerY - (y * scale);
        
        if (pixelY >= 0 && pixelY <= 600) {
          if (isFirstPoint) {
            ctx.moveTo(pixelX, pixelY);
            isFirstPoint = false;
          } else {
            ctx.lineTo(pixelX, pixelY);
          }
        } else {
          isFirstPoint = true;
        }
      } catch (e) {
        isFirstPoint = true;
        prevY = null;
      }
    }
    ctx.stroke();
    legends.push({ expression, color });
  }

  // Başlıq
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Qrafik: f(x)`, 20, 40);

  // Legend (Rənglərin mənası)
  ctx.font = '16px Arial';
  let legendY = 70;
  for (const l of legends) {
    ctx.fillStyle = l.color;
    ctx.fillRect(20, legendY - 12, 20, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`f(x) = ${l.expression}`, 50, legendY + 3);
    legendY += 30;
  }

  // Kökləri şəkildə işarələ
  ctx.textAlign = 'center';
  for (const root of roots) {
    const rootX = centerX + parseFloat(root.x) * scale;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(rootX, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`x=${root.x}`, rootX, centerY - 15);
  }

  return { buffer: canvas.toBuffer('image/png'), roots, legends };
}

module.exports = {
  name: 'riyaziyyat',
  aliases: ['math', 'hesabla', 'calc', 'solve', 'denklem', 'qrafik'],
  async execute(message, args, client, ctx) {
    const query = args.join(' ').trim();
    if (!query) {
      return message.reply('❌ İstifadə qaydası:\n**Hesablama:** `.riyaziyyat 5 + 5 * 2`\n**Tənlik:** `.riyaziyyat 3x + 5 = 20`\n**Qrafik:** `.riyaziyyat f(x) = x^2 - 4` (və ya birdən çox: `f(x)=x^2, g(x)=2x`)');
    }

    // 1. QRAFİK REJİMİ
    if (query.toLowerCase().includes('f(x)') || query.toLowerCase().includes('y=')) {
      // Birdən çox funksiyanı vergüllə ayır
      const functionParts = query.split(',').map(s => s.trim());
      const expressions = [];
      
      for (const part of functionParts) {
        const expr = part.replace(/f\(x\)\s*=|g\(x\)\s*=|h\(x\)\s*=|y\s*=/i, '').trim();
        if (!expr) continue;
        
        try {
          math.parse(expr); // Sintaksis yoxlaması
          expressions.push(expr);
        } catch (e) {
          return message.reply(`❌ Funksiya sintaksis xətası (\`${expr}\`): ${e.message}`);
        }
      }

      if (expressions.length === 0) return message.reply('❌ Heç bir düzgün funksiya tapılmadı.');
      if (expressions.length > 5) return message.reply('❌ Bir dəfəyə maksimum 5 funksiya çəkmək olar.');

      try {
        message.channel.sendTyping();
        const { buffer, roots, legends } = await plotFunctions(expressions);
        const attachment = new AttachmentBuilder(buffer, { name: 'qrafik.png' });
        
        let desc = legends.map(l => `**f(x) = ${l.expression}**`).join('\n');
        if (roots.length > 0) {
          desc += `\n\n**Kəsişmə nöqtələri (Köklər):**\n`;
          desc += roots.map(r => `x = **${r.x}** (${r.func})`).join('\n');
        } else {
          desc += `\n\n*Göstərilən aralıqda kök tapılmadı.*`;
        }

        const embed = new EmbedBuilder()
          .setTitle('📈 Funksiya Qrafiki')
          .setDescription(desc)
          .setColor(0x00ff88)
          .setImage('attachment://qrafik.png')
          .setFooter({ text: `Hesablayan: ${message.author.tag}` });

        await message.reply({ embeds: [embed], files: [attachment] });
        return;
      } catch (e) {
        return message.reply(`❌ Qrafik xətası: ${e.message}`);
      }
    }

    // 2. TƏNLİK HƏLLİ (məsələn: 3x + 5 = 20)
    if (query.includes('=') && !query.includes('==')) {
      try {
        const parts = query.split('=');
        if (parts.length === 2) {
          const left = parts[0].trim();
          const right = parts[1].trim();
          
          // Tənliyi 0-a bərabərləşdir: left - right = 0
          const equation = `(${left}) - (${right})`;
          
          // x-i təcrid etmək üçün mathjs-in "simplify" və "solve" funksiyaları
          // Sadə xətti tənliklər üçün: a*x + b = 0 → x = -b/a
          try {
            // Əgər tənlikdə yalnız x varsa, onu həll etməyə çalışaq
            const roots = [];
            const testValues = [];
            for (let i = -100; i <= 100; i += 0.1) testValues.push(i);
            
            let found = null;
            let prevVal = null;
            for (const x of testValues) {
              const val = math.evaluate(equation, { x });
              if (prevVal !== null && Math.sign(val) !== Math.sign(prevVal) && isFinite(val) && isFinite(prevVal)) {
                // Təqribi kök
                const root = x - (val * 0.1) / (val - prevVal);
                if (!found) found = root;
              }
              prevVal = val;
            }

            const embed = new EmbedBuilder()
              .setTitle('🧮 Tənlik Həlli')
              .addFields(
                { name: 'Tənlik', value: `\`${query}\``, inline: false },
                { name: 'Nəticə', value: found !== null ? `\`x ≈ ${found.toFixed(4)}\`` : '`Həqiqi kök tapılmadı`', inline: false }
              )
              .setColor(0x5865F2)
              .setFooter({ text: `Hesablayan: ${message.author.tag}` });

            return message.reply({ embeds: [embed] });
          } catch (e) {
            return message.reply(`❌ Tənlik həlli xətası: ${e.message}`);
          }
        }
      } catch (e) {
        return message.reply(`❌ Tənlik formatı səhvdir: ${e.message}`);
      }
    }

    // 3. SADƏ HESABLAMA
    try {
      const result = math.evaluate(query);
      
      const embed = new EmbedBuilder()
        .setTitle('🧮 Riyazi Nəticə')
        .addFields(
          { name: 'İfadə', value: `\`${query}\``, inline: false },
          { name: 'Nəticə', value: `\`${result}\``, inline: false }
        )
        .setColor(0x5865F2)
        .setFooter({ text: `Hesablayan: ${message.author.tag}` });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply(`❌ Riyazi xəta: \`${error.message}\`\nDüzgün format nümunəsi: \`.riyaziyyat 5 * (2 + 3)\``);
    }
  }
};
