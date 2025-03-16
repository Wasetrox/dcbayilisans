const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildVoiceStates],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

const userTimeouts = new Map(); // Zaman aşımı kontrolü için global değişken
const genTimeouts = new Map();
const vgenTimeouts = new Map();
function getDurationMillis(duration) {
    if (duration.endsWith('saat')) return parseInt(duration) * 3600000;
    if (duration.endsWith('gün')) return parseInt(duration) * 86400000;
    if (duration.endsWith('hafta')) return parseInt(duration) * 604800000;
    if (duration.endsWith('ay')) return parseInt(duration) * 2592000000;
    if (duration.endsWith('dakika')) return parseInt(duration) * 60000;
    if (duration.endsWith('saniye')) return parseInt(duration) * 1000;
    return 0;
}
client.once('ready', async () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);

    const commands = [
        new SlashCommandBuilder().setName('ticket').setDescription('Ticket açmak için buton gönderir.'),
        new SlashCommandBuilder()
            .setName('gen')
            .setDescription('Ürün kodu gönderir.')
            .addStringOption(option =>
                option.setName('ürün')
                    .setDescription('Ürün ismini belirtin.')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('vgen')
            .setDescription('VIP kullanıcılar için ürün kodu gönderir.')
            .addStringOption(option =>
                option.setName('ürün')
                    .setDescription('Ürün ismini belirtin.')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('vip')
            .setDescription('Kullanıcıya VIP rolü verir.')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('VIP rolü verilecek kullanıcı.')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('duration')
                    .setDescription('VIP rolünün süresi (1saat/1gün/1hafta/1ay).')
                    .setRequired(true))
    ];

    try {
        await client.application.commands.set(commands);
        console.log('Komutlar başarıyla kaydedildi.');
    } catch (error) {
        console.error('Komutları kaydederken bir hata oluştu:', error);
    }
});

// Ticket butonu göndermek için komut
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand() ) {
        try{
        const { commandName, options, user, member, guild } = interaction;
        if(commandName == 'ticket'){
            const embed = new EmbedBuilder()
            .setTitle('Ticket Sistemi')
            .setDescription('Aşağıdaki butona tıklayarak yeni bir ticket açabilirsiniz.')
            .setColor('Blue')
            .setFooter({ text: 'Ticket Sistemi', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId('openTicket')
            .setLabel('Ticket Aç')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(button);

        await interaction.reply({ embeds: [embed], components: [actionRow] });
        }
        if (commandName === 'gen') {
                            const timeoutDuration = 5 * 60 * 1000; // 5 dakika
                            if (genTimeouts.has(user.id)) {
                                const lastUsed = genTimeouts.get(user.id);
                                if (Date.now() - lastUsed < timeoutDuration) {
                                    const remainingTime = timeoutDuration - (Date.now() - lastUsed);
                                    const minutes = Math.floor(remainingTime / 60000);
                                    const seconds = Math.floor((remainingTime % 60000) / 1000);
                                    await interaction.reply({
                                        content: `Bu komutu tekrar kullanmadan önce lütfen ${minutes} dakika ${seconds} saniye bekleyin.`,
                                        ephemeral: true
                                    });
                                    return;
                                }else{
                                    genTimeouts.delete(user.id)
                                }                                
                            }
                
                            // Kullanıcı komut kullanabilir, zaman aşımını sıfırlıyoruz
                            genTimeouts.set(user.id, Date.now());
                
                            const product = options.getString('ürün');
                            if (!product) {
                                await interaction.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('Hata!')
                                            .setDescription('Lütfen bir ürün ismi belirtin.')
                                            .setColor('Red')
                                    ],
                                    ephemeral: true
                                });
                            }
                
                            const filePath = `./Hesaplar/${product}.txt`;
                            if (!fs.existsSync(filePath)) {
                                await interaction.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('Ürün Bulunamadı!')
                                            .setDescription('Bu ürün için herhangi bir veri bulunamadı.')
                                            .setColor('Red')
                                    ],
                                    ephemeral: true
                                });
                            }
                
                            const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(line => line.trim() !== '');
                            if (lines.length === 0) {
                                await interaction.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('Stok Tükendi!')
                                            .setDescription('Bu ürün şu anda stokta bulunmamaktadır.')
                                            .setColor('Red')
                                    ],
                                    ephemeral: true
                                });
                            }
                
                            // Captcha sorusu oluştur
                            const num1 = Math.floor(Math.random() * 10) + 1;
                            const num2 = Math.floor(Math.random() * 10) + 1;
                            const correctAnswer = num1 + num2;
                
                            const randomWrong1 = correctAnswer + Math.floor(Math.random() * 5) + 1;
                            const randomWrong2 = correctAnswer - Math.floor(Math.random() * 5) - 1;
                            const randomWrong3 = correctAnswer - Math.floor(Math.random() * 5) / 1;
                
                            const answers = [correctAnswer, randomWrong1, randomWrong2, randomWrong3].sort(() => Math.random() - 0.5);
                
                            const row = new ActionRowBuilder()
                                .addComponents(
                                    answers.map((answer, index) =>
                                        new ButtonBuilder()
                                            .setCustomId(`captcha_${answer}_${index}`) // Her buton için benzersiz bir custom_id
                                            .setLabel(answer.toString())
                                            .setStyle(ButtonStyle.Primary)
                                    )
                                );
                
                            await interaction.deferReply({ ephemeral: true }); // İşlemin devam ettiğini belirt
                
                            await interaction.editReply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle('Captcha Doğrulama')
                                        .setDescription(`Lütfen aşağıdaki işlemin sonucunu seçin: **${num1} + ${num2} = ?**`)
                                        .setColor('Yellow')
                                ],
                                components: [row]
                            });
                
                            const filter = (i) => i.user.id === user.id;
                            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
                
                            collector.on('collect', async (i) => {
                                // Doğru cevabı kontrol etmek için custom_id'yi parçalara ayır
                                const selectedAnswer = i.customId.split('_')[1];
                
                                if (selectedAnswer === correctAnswer.toString()) {
                                    collector.stop();
                
                                    const selectedLine = lines[0]; // İlk satırı seç, ancak henüz dosyadan silme
                
                                    const embed = new EmbedBuilder()
                                        .setTitle('Ürün Bilgisi')
                                        .setDescription(`**Ürün:** ${product}\n**Kod:** ${selectedLine}`)
                                        .setColor('Green')
                                        .addFields(
                                            { name: 'Ürün Kategorisi', value: `${product}`, inline: true },
                                            { name: 'Stok Durumu', value: 'Mevcut', inline: true }
                                        )
                                        .setThumbnail('https://example.com/product-image.png')  // Ürünün küçük resmi
                                        .setFooter({ text: 'Ürün Bilgisi Sistemi' })  // Footer kısmı
                                        .setTimestamp();
                
                                    try {
                                        await i.user.send({ embeds: [embed] });
                
                                        // DM gönderimi başarılı olduğunda dosyayı güncelle
                                        lines.shift(); // İlk satırı kaldır
                                        fs.writeFileSync(filePath, lines.join('\n')); // Dosyayı güncelle
                
                                        await i.update({
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setTitle('Doğrulama Başarılı!')
                                                    .setDescription('Doğru cevap! Ürün bilgisi DM olarak gönderildi.')
                                                    .setColor('Green')
                                            ],
                                            components: []
                                        });
                                    } catch (error) {
                                        console.error('DM gönderilirken hata oluştu:', error);
                                        await i.update({
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setTitle('DM Gönderilemedi!')
                                                    .setDescription('DM kutunuz kapalı olduğu için mesaj gönderilemedi.\n\n**DM kutunuzu açmak için:**\n\n1. **Discord Ayarları** > **Gizlilik & Güvenlik**\n2. "Sunucu üyelerinden direkt mesaj al" seçeneğini **Açık** yapın.\n\nDaha sonra tekrar deneyebilirsiniz.')
                                                    .setColor('Red')
                                            ],
                                            components: []
                                        });
                                    }
                                } else {
                                    await i.reply({
                                        embeds: [
                                            new EmbedBuilder()
                                                .setTitle('Yanlış Cevap!')
                                                .setDescription('Lütfen tekrar deneyin.')
                                                .setColor('Red')
                                        ],
                                        ephemeral: true
                                    });}});
                
                            collector.on('end', (collected, reason) => {
                                if (reason === 'time') {
                                    interaction.editReply({
                                        embeds: [
                                            new EmbedBuilder()
                                                .setTitle('Captcha Süresi Doldu!')
                                                .setDescription('Doğrulama süresi doldu. Lütfen tekrar deneyin.')
                                                .setColor('Red')
                                        ],
                                        components: []
                                    });
                                }
                            });
         }
        if (commandName === 'vgen') {
                            const timeoutDuration = 5 * 60 * 1000; // 5 dakika
                            if (vgenTimeouts.has(user.id)) {
                                const lastUsed = vgenTimeouts.get(user.id);
                                if (Date.now() - lastUsed < timeoutDuration) {
                                    const remainingTime = timeoutDuration - (Date.now() - lastUsed);
                                    const minutes = Math.floor(remainingTime / 60000);
                                    const seconds = Math.floor((remainingTime % 60000) / 1000);
                                    await interaction.reply({
                                        content: `Bu komutu tekrar kullanmadan önce lütfen ${minutes} dakika ${seconds} saniye bekleyin.`,
                                        ephemeral: true
                                    });
                                    return;
                                }else{
                                    vgenTimeouts.delete(user.id);
                                }
                            }
                
                            // Kullanıcı komut kullanabilir, zaman aşımını sıfırlıyoruz
                            vgenTimeouts.set(user.id, Date.now());
                
                            const product = options.getString('ürün');
                            if (!product) {
                                await interaction.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('Hata!')
                                            .setDescription('Lütfen bir ürün ismi belirtin.')
                                            .setColor('Red')
                                    ],
                                    ephemeral: true
                                });
                            }
                
                            const vipRole = guild.roles.cache.get(config.vip_role_id);
                            if (!vipRole || !member.roles.cache.has(vipRole.id)) {
                                await interaction.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('Yetki Hatası!')
                                            .setDescription('Bu komutu kullanmak için **VIP** rolüne sahip olmalısınız.')
                                            .setColor('Red')
                                    ],
                                    ephemeral: true
                                });
                            }
                
                            const filePath = `./VIPHesaplar/${product}.txt`;
                            if (!fs.existsSync(filePath)) {
                                await interaction.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('Ürün Bulunamadı!')
                                            .setDescription('Bu ürün için herhangi bir veri bulunamadı.')
                                            .setColor('Red')
                                    ],
                                    ephemeral: true
                                });
                            }
                
                            const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(line => line.trim() !== '');
                            if (lines.length === 0) {
                                await interaction.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('Stok Tükendi!')
                                            .setDescription('Bu ürün şu anda stokta bulunmamaktadır.')
                                            .setColor('Red')
                                    ],
                                    ephemeral: true
                                });
                            }
                
                            // Captcha oluştur
                            const num1 = Math.floor(Math.random() * 10) + 1;
                            const num2 = Math.floor(Math.random() * 10) + 1;
                            const correctAnswer = num1 + num2;
                            const answers = [correctAnswer, correctAnswer + 2, correctAnswer - 2, correctAnswer + 4].sort(() => Math.random() - 0.5);
                
                            const row = new ActionRowBuilder().addComponents(
                                answers.map(answer =>
                                    new ButtonBuilder()
                                        .setCustomId(`captcha_${answer}`)
                                        .setLabel(answer.toString())
                                        .setStyle(ButtonStyle.Primary)
                                )
                            );
                
                            await interaction.deferReply({ ephemeral: true });
                
                            await interaction.editReply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle('Captcha Doğrulama')
                                        .setDescription(`Lütfen aşağıdaki işlemin sonucunu seçin: **${num1} + ${num2} = ?**`)
                                        .setColor('Yellow')
                                ],
                                components: [row]
                            });
                
                            const filter = (i) => i.user.id === user.id;
                            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
                
                            collector.on('collect', async (i) => {
                                const selectedAnswer = i.customId.split('_')[1];
                
                                if (selectedAnswer === correctAnswer.toString()) {
                                    collector.stop();
                                    const selectedLine = lines[0]; // İlk satır seçildi
                                    const embed = new EmbedBuilder()
                                        .setTitle('VIP Ürün Bilgisi')
                                        .setDescription(`**Ürün:** ${product}\n**Kod:** ${selectedLine}`)
                                        .setColor('Green');
                
                                    try {
                                        await i.user.send({ embeds: [embed] });
                                        lines.shift();
                                        fs.writeFileSync(filePath, lines.join('\n')); // Güncelle
                
                                        await i.update({
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setTitle('Doğrulama Başarılı!')
                                                    .setDescription('Doğru cevap! Ürün bilgisi DM olarak gönderildi.')
                                                    .setColor('Green')
                                            ],
                                            components: []
                                        });
                                    } catch (error) {
                                        console.error('DM gönderilirken hata oluştu:', error);
                                        await i.update({
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setTitle('DM Gönderilemedi!')
                                                    .setDescription('DM kutunuz kapalı olduğu için mesaj gönderilemedi.\n\n**DM kutunuzu açmak için:**\n\n1. **Discord Ayarları** > **Gizlilik & Güvenlik**\n2. "Sunucu üyelerinden direkt mesaj al" seçeneğini **Açık** yapın.\n\nDaha sonra tekrar deneyebilirsiniz.')
                                                    .setColor('Red')
                                            ],
                                            components: []
                                        });
                                    }
                                } else {
                                    await i.reply({
                                        embeds: [
                                            new EmbedBuilder()
                                                .setTitle('Yanlış Cevap!')
                                                .setDescription('Lütfen tekrar deneyin.')
                                                .setColor('Red')
                                        ],
                                        ephemeral: true
                                    });
                                }
                            });
                
                            collector.on('end', (collected, reason) => {
                                if (reason === 'time') {
                                    interaction.editReply({
                                        embeds: [
                                            new EmbedBuilder()
                                                .setTitle('Captcha Süresi Doldu!')
                                                .setDescription('Doğrulama süresi doldu. Lütfen tekrar deneyin.')
                                                .setColor('Red')
                                        ],
                                        components: []
                                    });
                                }
                            });
         }
        if (commandName === 'vip') {
                                const targetUser = options.getUser('user');
                                const duration = options.getString('duration');
                        
                                if (!targetUser || !duration) {
                                    await interaction.reply('Kullanım: /vip @kullanıcı [1ay/1saat/1gün/1hafta]');
                                }
                        
                                const role = guild.roles.cache.get(config.vip_role_id);
                                if (!role) {
                                    await interaction.reply('VIP rolü bulunamadı.');
                                }
                        
                                const member = guild.members.cache.get(targetUser.id);
                                if (!member) {
                                    await interaction.reply('Kullanıcı sunucuda bulunamadı.');
                                }
                        
                                try {
                                    // VIP rolü ekleme
                                    await member.roles.add(config.vip_role_id);
                                    interaction.reply(`${targetUser} kullanıcısına VIP rolü verildi! Süre: ${duration}`);
                        
                                    // Log kanalına embed mesaj gönderme
                                    const logChannel = guild.channels.cache.get(config.logChannelId); // Log kanalının ID'si
                                    if (logChannel) {
                                        const embed = new EmbedBuilder()    // EmbedBuilder kullanımı
                                            .setColor('#00FF00') // Yeşil renk
                                            .setTitle('VIP Rolü Verildi')
                                            .addFields(
                                                { name: 'Kullanıcı', value: targetUser.tag },
                                                { name: 'Süre', value: duration },
                                                { name: 'Verilme Zamanı', value: new Date().toLocaleString() },
                                                { name: 'Alınacak Zaman', value: new Date(Date.now() + getDurationMillis(duration)).toLocaleString() }
                                            )
                                            .setFooter({ text: 'VIP rolü işlemi' })
                                            .setTimestamp();
                        
                                        await logChannel.send({ embeds: [embed] });
                                    }
                        
                                    // Süreyi milisaniyeye çevirerek, belirli bir süre sonunda VIP rolünü kaldırma
                                    const time = getDurationMillis(duration);
                                    setTimeout(async () => {
                                        try {
                                            await member.roles.remove(config.vip_role_id);
                                            interaction.channel.send(`${targetUser} kullanıcısının VIP süresi doldu, rolü alındı.`);
                        
                                            // Log kanalına embed mesaj gönderme (rol alındığında)
                                            if (logChannel) {
                                                const embedEnd = new EmbedBuilder()    // EmbedBuilder kullanımı
                                                    .setColor('#FF0000') // Kırmızı renk
                                                    .setTitle('VIP Rolü Alındı')
                                                    .addFields(
                                                        { name: 'Kullanıcı', value: targetUser.tag },
                                                        { name: 'Süresi Bitti', value: duration },
                                                        { name: 'Alındığı Zaman', value: new Date().toLocaleString() }
                                                    )
                                                    .setFooter({ text: 'VIP rolü süresi doldu' })
                                                    .setTimestamp();
                        
                                                await logChannel.send({ embeds: [embedEnd] });
                                            }
                                        } catch (error) {
                                            console.error('Rol alınırken bir hata oluştu:', error);
                                        }
                                    }, time);
                                } catch (error) {
                                    console.error('Rol verilirken bir hata oluştu:', error);
                                    interaction.reply('Rol verilirken bir hata oluştu.');
                                }
         }} catch(error){
            console.log(error)
            interaction.reply({content:'Komut çalışırken bir hata meydana geldi!!!!',flags:MessageFlags.Ephemeral})
         }}

    // Diğer interaction işlemleri (buton, modal, komut vb.)
    if (interaction.isButton()) {
        if(interaction.customId == 'openTicket'){
            const modal = new ModalBuilder()
            .setCustomId('ticketModal')
            .setTitle('Ticket Sebebi')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('reason')
                        .setLabel('Ticket Sebebiniz')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Ticket için sebebinizi yazın.')
                        .setRequired(true)
                )
            );
        await interaction.showModal(modal);
        }
        if (interaction.customId === 'closeTicket') {
            const closedCategory = interaction.guild.channels.cache.get(config.closed_ticket_category_id);
            if (!closedCategory) await interaction.reply({ content: 'Kapanmış ticket kategorisi bulunamadı.', ephemeral: true });

            await interaction.channel.setParent(closedCategory.id);
            await interaction.channel.permissionOverwrites.edit(interaction.user, {
                SendMessages: false,
                AddReactions: false
            });
            await interaction.channel.permissionOverwrites.edit(config.support_role_id, {
                SendMessages: false,
                AddReactions: false
            });

            const embed = new EmbedBuilder()
                .setTitle('Ticket Kapatıldı')
                .setDescription(`Bu ticket ${interaction.user} tarafından kapatıldı.`)
                .setColor('Red');

            interaction.channel.send({ embeds: [embed] });
        } else if (interaction.customId === 'deleteTicket') {
            interaction.channel.delete();
        }
        
    }

    if (interaction.isModalSubmit() ) {
        if(interaction.customId =='ticketModal'){
            const reason = interaction.fields.getTextInputValue('reason');
            const category = interaction.guild.channels.cache.get(config.ticket_category_id);
            if (!category) await interaction.reply({ content: 'Ticket kategorisi bulunamadı.', ephemeral: true });
    
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                parent: category,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    },
                    {
                        id: config.support_role_id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
    
            const embed = new EmbedBuilder()
                .setTitle('Yeni Ticket Açıldı')
                .setDescription(`**Açan:** ${interaction.user}\n**Sebep:** ${reason}`)
                .setColor('Blue');
    
            const closeButton = new ButtonBuilder()
                .setCustomId('closeTicket')
                .setLabel('Kapat')
                .setStyle(ButtonStyle.Danger);
    
            const deleteButton = new ButtonBuilder()
                .setCustomId('deleteTicket')
                .setLabel('Sil')
                .setStyle(ButtonStyle.Secondary);
    
            const actionRow = new ActionRowBuilder().addComponents(closeButton, deleteButton);
            ticketChannel.send({ embeds: [embed], components: [actionRow] });
            interaction.reply({ content: `Ticket oluşturuldu: ${ticketChannel}`, ephemeral: true });
        }

    }
});
client.login(config.token);