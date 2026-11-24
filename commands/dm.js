const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const EFENDIM_ID = '1375956621229821992'; 

module.exports = {
  name: 'dm',
  aliases: ['mesaj-gonder-dm'],
  async execute(message, args, client, ctx) {
    // Yalnız botun DM-də işləməlidir
    if (message.guild) return; 
    
    // Yalnız Admin (Sən) istifadə edə bilərsən
    if (message.author.id !== EFENDIM_ID) {
      return message.reply('❌ Bu əmri yalnız botun sahibi istifadə edə bilər.');
    }

    const targetId = args[0];
    if (!targetId || !/^\d{17,20}$/.test(targetId)) {
      return message.reply('❌ Zəhmət olmasa düzgün bir İstifadəçi ID-si yaz.\nMəsələn: `.dm 123456789012345678`');
    }

    try {
      const targetUser = await client.users.fetch(targetId);
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dm_open_modal_${targetId}`)
          .setLabel(`Mesaj Göndər: ${targetUser.tag}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📩')
      );

      await message.reply({ 
        content: `**${targetUser.tag}** (ID: \`${targetId}\`) istifadəçisinə mesaj göndərmək üçün aşağıdakı düyməyə bas:`,
        components: [row] 
      });
    } catch (e) {
      return message.reply(`❌ **${targetId}** ID-li istifadəçi tapılmadı.`);
    }
  }
};
