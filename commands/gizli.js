module.exports = {
  name: 'gizli',
  aliases: ['msg', 'gizli-mesaj', 'secret'],
  async execute(message, args, client, ctx) {
    // Mesajı götür
    const content = args.join(' ');
    
    // Əgər mesaj yoxdursa
    if (!content) {
      return message.reply('❌ İstifadə qaydası: `.gizli <mesaj>`\nMəsələn: `.gizli Sabah görüşək`');
    }

    // Mesajın uzunluğunu yoxla (Discord limiti 2000)
    if (content.length > 2000) {
      return message.reply('❌ Mesaj maksimum 2000 simvol ola bilər.');
    }

    // Əvvəlcə kanaldakı mesajı sil (istifadəçi mesajı)
    await message.delete().catch(() => {});

    try {
      // Mesajı DM-dən göndər
      await message.author.send(
        `🤫 **Gizli Mesajınız:**\n\n> ${content.replace(/\n/g, '\n> ')}\n\n*Bu mesaj yalnız sizə görünür. Serverdə heç kim görmədi.*`
      );
      
      // Kanalda qısa bir təsdiq mesajı yaz
      const confirm = await message.channel.send(`✅ ${message.author}, gizli mesajınız DM-inizə göndərildi!`);
      
      // 5 saniyə sonra təsdiq mesajını da sil
      setTimeout(() => confirm.delete().catch(() => {}), 5000);
      
    } catch (error) {
      // Əgər DM bağlıdırsa, Spoiler formatında yaz
      console.error('Gizli mesaj xətası:', error.message);
      
      const spoilerMsg = await message.channel.send({
        content: `🤫 ${message.author} DM-i bağlı olduğu üçün mesajı gizli formada yazıram:\n||${content}||`
      });
      
      // 10 saniyə sonra spoiler mesajını sil
      setTimeout(() => spoilerMsg.delete().catch(() => {}), 10000);
    }
  }
};
