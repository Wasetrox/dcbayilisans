const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const cnf = require('./config.json');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages] });

// Discord rozetlerinin bit değerleri ve karşılık gelen emojiler
const BADGES = {
    DISCORD_EMPLOYEE: { bit: 1 << 0, emoji: "<:discord_staff:1338478456219893823>" },
    PARTNERED_SERVER_OWNER: { bit: 1 << 1, emoji: "<:partner:1338478550864498709>" },
    HYPESQUAD_EVENTS: { bit: 1 << 2, emoji: "<:hypesquad:1338478749196222544>" },
    BUG_HUNTER_LEVEL_1: { bit: 1 << 3, emoji: "<:bughunter_1:1338478902330265652>" },
    EARLY_SUPPORTER: { bit: 1 << 9, emoji: "<:early:1338479061185466432>" },
    VERIFIED_DEVELOPER: { bit: 1 << 17, emoji: "<:verified_dev:1338479275715723348>" },
    CERTIFIED_MODERATOR: { bit: 1 << 18, emoji: "<:certified_moderator:1338479351431168021>" },
    ACTIVE_DEVELOPER: { bit: 1 << 22, emoji: "<:active_developer:1338479442087116933>" },
    NITRO: { bit: 1 << 19, emoji: "<:nitro:1338507690925621299>" },
    HYPESQUAD_BRAVERY: { bit: 1 << 6, emoji: "<:hypesquad_bravery:1338505553726406751>" },
    HYPESQUAD_BRILLIANCE: { bit: 1 << 7, emoji: "<:hypesquad_brilliance:1338505555404259360>" },
    HYPESQUAD_BALANCE: { bit: 1 << 8, emoji: "<:hypesquad_balance:1338505556536856616>" },
    BUG_HUNTER_LEVEL_2: { bit: 1 << 14, emoji: "<:bughunter_2:1338479351431168021>" },
};

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'panel') {
        const token = interaction.options.getString('token');
        if (!token) return interaction.reply({ content: 'Lütfen geçerli bir token girin!', ephemeral: true });

        try {
            // Kullanıcı bilgilerini çek
            const userResponse = await axios.get('https://discord.com/api/v9/users/@me', {
                headers: { Authorization: token }
            });

            const user = userResponse.data;
            const username = user.username;
            const avatarURL = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=1024`;
            const flags = user.public_flags;
            const premiumType = user.premium_type;

            console.log(`Premium Type: ${premiumType}`); // Premium Type'ı konsola yazdırın
            console.log(`User Flags: ${flags}`); // Kullanıcı bayraklarını da loglayalım

            // Rozetleri listele
            const badges = listUserBadges(flags, premiumType);

            const embed = new EmbedBuilder()
                .setTitle('Özel Panel')
                .setDescription(`Token: **${token}**`)
                .setColor(0x00AE86)
                .setThumbnail(avatarURL)
                .addFields(
                    { name: 'Kullanıcı Adı', value: username, inline: true },
                    { name: 'Rozetler', value: badges || 'Rozet bulunmuyor.', inline: true }
                );

            const clearFriendsButton = new ButtonBuilder()
                .setLabel('Arkadaşları Temizle')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('clear_friends');

            const leaveServersButton = new ButtonBuilder()
                .setLabel('Sunuculardan Ayrıl')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('leave_servers');

            const comboButton = new ButtonBuilder()
                .setLabel('Combo')
                .setStyle(ButtonStyle.Success)
                .setCustomId('combo');

            const listBadgesButton = new ButtonBuilder()
                .setLabel('Arkadaş Rozetlerini Listele')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('list_badges');

            const row = new ActionRowBuilder().addComponents(clearFriendsButton, leaveServersButton, comboButton, listBadgesButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async (i) => {
                await i.deferUpdate();

                try {
                    if (i.customId === 'list_badges') {
                        const friendResponse = await axios.get('https://discord.com/api/v9/users/@me/relationships', {
                            headers: { Authorization: token }
                        });

                        const friends = friendResponse.data.filter(rel => rel.type === 1); // type 1: friend
                        let badgesList = [];

                        friends.forEach(element => {
                            const flags = element.user.public_flags;
                            const premiumType = element.user.premium_type;
                            const badges = listUserBadges(flags, premiumType);
                            badgesList.push({
                                name: `${element.user.username}#${element.user.discriminator}`,
                                value: badges || 'Rozet bulunmuyor.',
                                inline: true
                            });
                        });

                        const badgesEmbed = new EmbedBuilder()
                            .setTitle('Arkadaşların Rozetleri')
                            .setDescription('Arkadaşların sahip olduğu rozetler aşağıda listelenmiştir.')
                            .setColor(0x00AE86)
                            .addFields(badgesList);

                        await interaction.user.send({ embeds: [badgesEmbed] });
                        await i.editReply({ content: 'Arkadaşların rozetleri DM olarak gönderildi.', components: [] });

                    } else {
                        await i.editReply({ content: 'Geçersiz işlem.', components: [] });
                    }
                } catch (error) {
                    console.error(error);
                    await i.editReply({ content: 'Rozetler alınırken bir hata oluştu!', components: [] });
                }
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Kullanıcı bilgileri alınırken bir hata oluştu!', ephemeral: true });
        }
    }
});

client.on('ready', async () => {
    console.log("Bot Aktif!");
    const guild = await client.guilds.fetch(cnf.sunucuId); // Sunucu ID'sini .env'den al
    const commands = guild.commands;
    console.log("Komutlar Yüklendi!");

    commands.create(
        new SlashCommandBuilder()
            .setName('panel')
            .setDescription('Token bilgisi gösteren özel panel ve arkadaş/sunucu işlemleri')
            .addStringOption(option =>
                option.setName('token')
                    .setDescription('Gösterilecek token')
                    .setRequired(true))
            .toJSON()
    );
});

client.login(cnf.token);

// Rozetleri listeleme fonksiyonu
function listUserBadges(flags, premiumType) {
    let badges = [];

    for (const [key, value] of Object.entries(BADGES)) {
        if ((flags & value.bit) !== 0) {
            badges.push(value.emoji);
        }
    }

    // Nitro rozetini kontrol et
    if (premiumType === 1 || premiumType === 2) {
        badges.push(BADGES.NITRO.emoji);
    }

    return badges.length > 0 ? badges.join(' ') : 'Rozet bulunmuyor.';
}
