const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const axios = require('axios');

const config = require("./wasonf.json");

const tokens = fs.readFileSync('tokens.txt', 'utf-8')
    .split('\n')
    .map(token => token.trim())
    .filter(token => token.length > 0);

const channelId = config.kanalId;
const messageId = config.mesajId;

async function clickFirstButton(client, token, channelId, messageId, index) {
    try {
        const channel = client.channels.cache.get(channelId);
        if (!channel || channel.type !== 'GUILD_TEXT') {
            console.log(`Self-Bot ${index + 1}: Kanal bulunamadı veya metin kanalı değil.`);
            return;
        }

        const message = await channel.messages.fetch(messageId, { cache: false, force: true });
        if (!message.author.bot) {
            console.log(`Self-Bot ${index + 1}: Mesaj bir bot tarafından gönderilmemiş.`);
            return;
        }

        if (!message.components || message.components.length === 0) {
            console.log(`Self-Bot ${index + 1}: Mesajda buton bulunamadı. Components:`, message.components);
            return;
        }

        const buttons = message.components.flatMap(comp => comp.components.filter(component => {
            return component.type === 'BUTTON' || component.type === 2;
        }));

        if (buttons.length === 0) {
            console.log(`Self-Bot ${index + 1}: Mesajda tıklanabilir buton yok.`);
            return;
        }

        const firstButton = buttons[0];
        const customId = firstButton.customId;
        console.log(`Self-Bot ${index + 1}: Bulunan buton customId: ${customId}`);

        const applicationId = config.applicationId || message.applicationId;
        if (!applicationId) {
            console.log(`Self-Bot ${index + 1}: application_id bulunamadı. Lütfen config dosyasına applicationId ekleyin.`);
            return;
        }

        const guildId = client.guilds.cache.find(g => g.channels.cache.has(channelId))?.id;
        if (!guildId) {
            console.log(`Self-Bot ${index + 1}: guildId bulunamadı.`);
            return;
        }

        const sessionId = client.ws.sessionId || Math.random().toString(36).substring(2, 15);
        const payload = {
            type: 3,
            application_id: applicationId,
            guild_id: guildId,
            channel_id: channelId,
            message_id: messageId,
            session_id: sessionId, // Session ID eklendi
            data: {
                component_type: 2,
                custom_id: customId
            },
            nonce: Math.random().toString(36).substring(2, 15)
        };

        const response = await axios({
            method: 'POST',
            url: `https://discord.com/api/v10/interactions`,
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            data: payload
        });
        console.log(`Self-Bot ${index + 1}: Butona tıklandı (${customId}) - Durum: ${response.status}`);
    } catch (error) {
        console.error(`Self-Bot ${index + 1}: Butona tıklama hatası - ${error.response?.data?.message || error.message}`);
        if (error.response?.data) {
            console.log(`Hata detayları:`, error.response.data);
        }
    }
}

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
                await clickFirstButton(client, token, channelId, messageId, index);
                console.log(`Self-Bot ${index + 1}: İşlem tamamlandı.`);
                setTimeout(() => client.destroy(), 3000);
            } catch (error) {
                console.error(`Self-Bot ${index + 1} hata:`, error.message);
                client.destroy();
            }
        });

        client.login(token).catch(err => {
            console.error(`Self-Bot ${index + 1} giriş hatası: ${err.message}`);
        });

        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

(async () => {
    console.log('Program başlatılıyor...');
    await startSelfBots();
})();