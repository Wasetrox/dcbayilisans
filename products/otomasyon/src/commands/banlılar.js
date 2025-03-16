const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');  // EmbedBuilder'ı doğru şekilde dahil ettiğinizden emin olun

module.exports = {
    name: 'banlılar',
    description: 'Banlı kullanıcıların sayısını gösterir.',
    async execute(interaction, client) {
        // Dosya yolunu ayarla
        const dataFile = path.resolve(__dirname, '../../serverData.json');

        // serverData.json'u oku
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

        // Yan sunucuyu al
        const sideServer = client.guilds.cache.get(data.sideServer);
        if (!sideServer) {
            return interaction.reply({ content: 'Yan sunucu ayarlı değil veya sunucuya erişilemiyor!', ephemeral: true });
        }

        try {
            // Banlı kullanıcıları al
            const bans = await sideServer.bans.fetch();
            console.log(`Banlı kullanıcı sayısı: ${bans.size}`);

            // Embed mesajı oluştur
            const embed = new EmbedBuilder()
                .setTitle('Banlı Kullanıcılar')
                .setDescription(`Yan sunucuda toplam **${bans.size}** banlı kullanıcı bulunuyor.`)
                .setColor('#ff0000')
                .setFooter({ text: 'Banlılar listesi', iconURL: client.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error('Banlı kullanıcıları alırken hata:', error);
            await interaction.reply({ content: 'Banlı kullanıcı bilgisi alınırken bir hata oluştu.', ephemeral: true });
        }
    },
};
