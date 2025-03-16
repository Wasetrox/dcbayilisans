const { Client } = require('discord.js-selfbot-v13');
const fs = require('node:fs');
const axios = require('axios');

class SelfBot {
    constructor(token) {
        this.client = new Client({
            checkUpdate: false,
        });
        this.token = token;
    }

    async login() {
        await this.client.login(this.token);
        console.log('Self-bot başarıyla giriş yaptı!');
    }

    async fetchUser() {
        try {
            const user = await this.client.user.fetch();
            return user;
        } catch (error) {
            console.error('Kullanıcı bilgileri alınamadı:', error.message);
            return null;
        }
    }

    async clearFriends(user) {
        try {
            const response = await axios.get('https://discord.com/api/v9/users/@me/relationships', {
                headers: {
                    Authorization: this.token,
                },
            });

            const friends = response.data.filter(rel => rel.type === 1); // type 1: friend
            let usernames = "";

            console.log(`Toplam ${friends.length} arkadaş bulundu.`);

            for (const friend of friends) {
                usernames += `${friend.user.username}#${friend.user.discriminator}\n`;
                try {
                    await axios.delete(`https://discord.com/api/v9/users/@me/relationships/${friend.id}`, {
                        headers: {
                            Authorization: this.token,
                        },
                    });
                    console.log(`${friend.user.username}#${friend.user.discriminator} başarıyla silindi.`);
                } catch (error) {
                    console.error(`${friend.user.username}#${friend.user.discriminator} silinirken hata oluştu:`, error.message);
                }
            }

            const filePath = `./friends_list_${user.id}.txt`;
            fs.writeFileSync(filePath, usernames);

            try {
                await user.send({
                    content: 'Arkadaşlar temizlendi. İşte arkadaş listesi:',
                    files: [{ attachment: filePath, name: `friends_list_${user.id}.txt` }],
                });
            } catch (error) {
                console.error('Kullanıcıya DM gönderilemedi:', error);
            }

            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Arkadaşları temizlerken hata oluştu:', error.message);
        }
    }

    async leaveServers(user) {
        const guilds = this.client.guilds.cache;
        let inviteList = "";

        for (const guild of guilds.values()) {
            let invite = "Davet linki oluşturulamadı";

            try {
                // Metin kanalı bul ve davet oluştur
                const textChannel = guild.channels.cache
                    .filter(channel =>
                        channel.type === 'GUILD_TEXT' &&
                        channel.permissionsFor(guild.me).has('CREATE_INSTANT_INVITE')
                    )
                    .first();

                if (textChannel) {
                    const createdInvite = await textChannel.createInvite({
                        maxAge: 0,
                        maxUses: 0,
                    });
                    invite = createdInvite.url;
                }
            } catch (error) {
                console.warn(`${guild.name} için davet oluşturulamadı: ${error.message}`);
            }

            inviteList += `${guild.name}: ${invite}\n`;

            // Sunucudan ayrılma işlemi her durumda devam etsin
            try {
                await guild.leave();
                console.log(`${guild.name} sunucusundan başarıyla ayrıldım.`);
            } catch (error) {
                console.error(`${guild.name} sunucusundan ayrılırken hata oluştu: ${error.message}`);
                inviteList += `${guild.name}: Ayrılma işlemi başarısız\n`;
            }
        }

        const filePath = `./server_invites_${user.id}.txt`;
        fs.writeFileSync(filePath, inviteList);

        try {
            await user.send({
                content: 'Sunuculardan ayrıldım. İşte davet linkleri:',
                files: [{ attachment: filePath, name: `server_invites_${user.id}.txt` }],
            });
        } catch (error) {
            console.error('Kullanıcıya DM gönderilemedi:', error.message);
        }

        fs.unlinkSync(filePath);
    }
}

module.exports = SelfBot;