const fs = require('fs');
const path = require('path'); // path modülünü ekleyin

module.exports = {
    name: 'guildMemberRemove', // Event adı
    once: false, // Bu event her üyelik çıkışında tetiklenir (false)
    async execute(member, client) {
        // Çıkan üyenin ana sunucudan mı çıktığını kontrol et
        try {
            console.log(`${member.user.tag} adlı kullanıcı, ${member.guild.name} sunucusundan ayrıldı.`);
            
            // Burada çıkış yapan kullanıcıyla ilgili işlem yapılabilir, örneğin:
            // Eğer başka bir sunucuya yasaklama yapılacaksa
            const dataFile = path.resolve(__dirname, '../../serverData.json'); // path modülünü kullanarak dosya yolunu alıyoruz
            let data;
            
            try {
                data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
            } catch (error) {
                console.error('JSON dosyasını okurken hata oluştu:', error);
                return;
            }

            if (member.guild.id === data.mainServer) {
                const sideServer = client.guilds.cache.get(data.sideServer);
                if (!sideServer) {
                    console.error('Yan sunucu bulunamadı.');
                    return;
                }

                await sideServer.members.ban(member.id, { reason: 'Ana sunucudan ayrıldı' });
                console.log(`Kullanıcı ${member.user.tag} yan sunucudan yasaklandı.`);

                // Yasaklanan kullanıcıyı data.bannedUsers dizisine ekle
                if (!data.bannedUsers.includes(member.id)) {
                    data.bannedUsers.push(member.id);
                }

                // JSON dosyasını güncelle
                fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
                console.log('Veriler başarıyla kaydedildi.');
            }
        } catch (error) {
            console.error('GuildMemberRemove eventi sırasında hata oluştu:', error);
        }
    },
};