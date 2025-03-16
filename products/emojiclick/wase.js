const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');

const config = require("./wasonf.json");

// Self-bot tokenları
const tokens = fs.readFileSync('tokens.txt', 'utf-8')
    .split('\n')
    .map(token => token.trim())
    .filter(token => token.length > 0);

const channelId = config.kanalId;
const messageId = config.mesajId;

// Self-bot işlemleri
async function startSelfBots() {
    console.log('Self-botlar başlatılıyor...');
    console.log(`Toplam token sayısı: ${tokens.length}`);

    if (tokens.length === 0) {
        console.error('Hata: tokens.txt dosyasında geçerli token bulunamadı.');
        return;
    }

    for (const [index, token] of tokens.entries()) {
        console.log(`Self-Bot ${index + 1}: İşlem sıraya alındı.`);

        const client = new Client({
            ws: { properties: { $browser: 'Discord Client', $device: 'desktop' } }
        });

        client.once('ready', async () => {
            console.log(`Self-Bot ${index + 1} (${client.user.tag}) aktif!`);

            try {
                const channel = client.channels.cache.get(channelId);
                if (!channel || channel.type !== 'GUILD_TEXT') {
                    console.log(`Self-Bot ${index + 1}: Kanal bulunamadı veya metin kanalı değil.`);
                    client.destroy();
                    return;
                }

                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message) {
                    console.log(`Self-Bot ${index + 1}: Mesaj bulunamadı.`);
                    client.destroy();
                    return;
                }

                const reactions = message.reactions.cache;
                if (reactions.size === 0) {
                    console.log(`Self-Bot ${index + 1}: Mesajda tepki bulunamadı.`);
                    client.destroy();
                    return;
                }

                for (const reaction of reactions.values()) {
                    await message.react(reaction.emoji).catch(err => 
                        console.log(`Self-Bot ${index + 1}: Tepki hatası - ${err.message}`)
                    );
                    console.log(`Self-Bot ${index + 1}: ${reaction.emoji.name} tepkisine tıklandı.`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                console.log(`Self-Bot ${index + 1}: Tüm tepkiler tamamlandı.`);
                setTimeout(() => client.destroy(), 3000);
            } catch (error) {
                console.error(`Self-Bot ${index + 1} hata:`, error.message);
                client.destroy();
            }
        });

        client.login(token).catch(err => {
            console.error(`Self-Bot ${index + 1} giriş hatası: ${err.message}`);
        });

        // Her self-bot arasında 10 saniye bekle
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

(async () => {
    console.log('Program başlatılıyor...');
    await startSelfBots();
})();