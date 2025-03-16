const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'banaffı',
    description: 'Tüm banları kaldırır.',
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
            // Tüm banlı kullanıcıları al
            const bans = await sideServer.bans.fetch();
            if (bans.size === 0) {
                return interaction.reply({ content: 'Yan sunucuda banlı kullanıcı bulunmuyor.', ephemeral: true });
            }

            // Tüm banları kaldır
            for (const ban of bans.values()) {
                await sideServer.bans.remove(ban.user.id);
            }

            await interaction.reply({ content: 'Tüm banlar başarıyla kaldırıldı.', ephemeral: false });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Banlar kaldırılırken bir hata oluştu.', ephemeral: true });
        }
    },
};
