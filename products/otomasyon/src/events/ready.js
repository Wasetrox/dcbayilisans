const Rest = require("@discordjs/rest");
const config = require('../../config.json');
const DiscordApi = require("discord-api-types/v10");
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Logged in as ${client.user.tag}`);

        // Belirli bir ses kanalına bağlanma
        const voiceChannelId = config.sesId; // Ses kanalı ID'si config dosyasından alınır
        const guildId = config.sunucuId; // Sunucu ID'si config dosyasından alınır
        const guild = client.guilds.cache.get(guildId);
        const voiceChannel = guild.channels.cache.get(voiceChannelId);

        // Ses kanalının geçerli olup olmadığını kontrol et
        if (voiceChannel && voiceChannel.type === DiscordApi.ChannelType.GuildVoice) {
            joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
            });
            console.log(`Bot ${voiceChannel.name} adlı ses kanalına bağlandı.`);
        } else {
            console.log('Belirtilen ses kanalı bulunamadı veya ses kanalı değil.');
        }

        // Oynuyor durumunu 5 saniyede bir değiştirme
        const statuses = [
            { name: '🤍 Wasetrox Was Here', type: DiscordApi.ActivityType.Streaming, url: 'https://twitch.tv/wasetrox' },
            { name: '🚀 Made In NovaDev.', type: DiscordApi.ActivityType.Streaming, url: 'https://twitch.tv/wasetrox' },
        ];

        let currentStatus = 0;
        setInterval(() => {
            client.user.setActivity(statuses[currentStatus]);
            currentStatus = (currentStatus + 1) % statuses.length; // Status döngüsünü devam ettir
        }, 5000); // 5000 milisaniye = 5 saniye
    }
}