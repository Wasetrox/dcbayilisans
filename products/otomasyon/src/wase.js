const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const config = require('../config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

// Komutları yükle
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// Eventleri yükle
const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    console.log("eventler yükleniyor!")
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Komut işleyici
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Bir hata oluştu!', ephemeral: true });
    }
});

// Komutları Discord'a yükle
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const commands = client.commands.map(({ name, description }) => ({ name, description }));
const rest = new REST({ version: '9' }).setToken(config.token);

(async () => {
    try {
        console.log('Komutlar yükleniyor...');
        await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
        console.log('Komutlar başarıyla yüklendi.');
    } catch (error) {
        console.error(error);
    }
})();

client.login(config.token);