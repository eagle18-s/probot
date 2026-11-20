const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  name: 'səsli-mesaj',
  aliases: ['tts', 'səsləndir', 'sesli', 'səs'],
  async execute(message, args, client, ctx) {
    const text = args.join(' ').trim();

    if (!text) {
      return message.reply('❌ Zəhmət olmasa səsləndirmək üçün bir mətn yaz.\nNümunə: `.tts Salam, necəsən?`');
    }

    if (text.length > 500) {
      return message.reply('❌ Mətn çox uzundur! Maksimum 500 simvol ola bilər.');
    }

    await message.channel.sendTyping();
    const tempFilePath = path.join(os.tmpdir(), `astrol-tts-${Date.now()}-${message.author.id}.mp3`);

    try {
      let base64Audio;
      
      // Azərbaycan dilində səsləndirməyə çalışırıq
      try {
        base64Audio = await googleTTS.getAudioBase64(text, {
          lang: 'az',
          slow: false,
          host: 'https://translate.google.com',
          timeout: 10000,
        });
      } catch (error) {
        // Əgər Azərbaycan dili xəta verərsə (bəzən uzun mətnlərdə olur), Türk dilinə keçid edirik
        console.log('[TTS] Azərbaycan dili alınmadı, Türk dilinə keçilir...');
        base64Audio = await googleTTS.getAudioBase64(text, {
          lang: 'tr',
          slow: false,
          host: 'https://translate.google.com',
          timeout: 10000,
        });
      }

      // Base64-ü mp3 faylına çeviririk
      fs.writeFileSync(tempFilePath, Buffer.from(base64Audio, 'base64'));

      const attachment = new AttachmentBuilder(tempFilePath, { name: 'sesli-mesaj.mp3' });

      const embed = new EmbedBuilder()
        .setTitle('🔊 Səsli Mesaj')
        .setDescription(`**Mətn:** ${text}\n**Səsləndirən:** ${message.author}`)
        .setColor(0x5865F2)
        .setFooter({ text: 'ASTROL Bot • Google TTS' });

      // Mesajı göndəririk
      await message.reply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error('TTS Xətası:', error);
      message.reply('❌ Səs yaradılarkən xəta baş verdi. Zəhmət olmasa sonra yenidən cəhd edin.');
    } finally {
      // MÜTLƏQ: Fayl yaranıbsa, həm uğurlu, həm də xəta halında silinməlidir (yaddaş sızması qarşısı)
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          console.error('Müvəqqəti fayl silinərkən xəta:', e.message);
        }
      }
    }
  }
};
