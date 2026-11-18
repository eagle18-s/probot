const { EmbedBuilder } = require('discord.js');

// Aktiv oyunları yaddaşda saxla (kanal ID -> oyun məlumatları)
const aktifOyunlar = new Map();

module.exports = {
  name: 'sual-tap',
  aliases: ['sualtap', 'tap', 'guess'],
  async execute(message, args, client, ctx) {
    const channelId = message.channel.id;

    // Əgər args[0] rəqəmdirsə, istifadəçi təxmin edir
    const guess = parseInt(args[0], 10);

    if (!isNaN(guess)) {
      const oyun = aktifOyunlar.get(channelId);
      
      if (!oyun) {
        return message.reply('❌ Bu kanalda aktiv oyun yoxdur. Başlamaq üçün `.sual-tap` yazın.');
      }
      
      // Təxmin yoxlaması
      oyun.cəhdlər++;
      
      if (guess < 1 || guess > 100) {
        return message.reply('❌ 1-dən 100-ə qədər bir rəqəm yazın.');
      }

      if (guess === oyun.ədəd) {
        // Qalibiyyət!
        const embed = new EmbedBuilder()
          .setTitle('🎉 TƏBİKLƏR!')
          .setDescription(`**${message.author.tag}** ədədi tapdı!\n\n**Tutulan Ədəd:** ${oyun.ədəd}\n**Cəhd sayı:** ${oyun.cəhdlər}\n**Başladan:** ${oyun.başladan}`)
          .setColor(0x00ff00)
          .setTimestamp();
        
        message.reply({ embeds: [embed] });
        aktifOyunlar.delete(channelId); // Oyunu bitir
        return;
      } 
      
      if (guess < oyun.ədəd) {
        return message.reply(`📉 **${guess}** çox kiçikdir! Daha böyük bir rəqəm yoxlayın. (Cəhd: ${oyun.cəhdlər})`);
      } 
      
      if (guess > oyun.ədəd) {
        return message.reply(`📈 **${guess}** çox böyükdür! Daha kiçik bir rəqəm yoxlayın. (Cəhd: ${oyun.cəhdlər})`);
      }
    }

    // Əgər args yoxdursa, yeni oyun başlat
    if (aktifOyunlar.has(channelId)) {
      const oyun = aktifOyunlar.get(channelId);
      return message.reply(`⚠️ Bu kanalda artıq aktiv oyun var! (Başladan: ${oyun.başladan}). Təxmin etmək üçün \`.sual-tap <rəqəm>\` yazın.`);
    }

    // Yeni oyun yarat (1-100 arası təsadüfi ədəd)
    const secretNumber = Math.floor(Math.random() * 100) + 1;
    
    aktifOyunlar.set(channelId, {
      ədəd: secretNumber,
      cəhdlər: 0,
      başladan: message.author.tag,
      başlamaVaxtı: Date.now()
    });

    // 5 dəqiqə sonra oyunu avtomatik sil (yaddaş sızması qarşısı)
    setTimeout(() => {
      if (aktifOyunlar.has(channelId)) {
        const oyun = aktifOyunlar.get(channelId);
        if (oyun.ədəd === secretNumber) {
          aktifOyunlar.delete(channelId);
          message.channel.send(`⏰ **Sual-Tap oyunu bitdi!** Heç kim tapa bilmədi. Tutulan ədəd: **${secretNumber}**`).catch(() => {});
        }
      }
    }, 5 * 60 * 1000);

    const embed = new EmbedBuilder()
      .setTitle('🎯 Sual-Tap Oyunu Başladı!')
      .setDescription(`**${message.author.tag}** tərəfindən bir ədəd tutuldu (1 - 100 arası).\n\nTəxmin etmək üçün: \`.sual-tap <rəqəm>\`\nMəsələn: \`.sual-tap 50\``)
      .setColor(0x5865F2)
      .setFooter({ text: 'Oyun 5 dəqiqə davam edəcək' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};
