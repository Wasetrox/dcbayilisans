const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');

// Tokenleri dosyadan oku
const tokens = fs.readFileSync('token.txt', 'utf8').split('\n');

// Rastgele bir token seç
const randomToken = tokens[Math.floor(Math.random() * tokens.length)].trim();

const client = new Client();

client.on('ready', async () => {
  console.log(`${client.user.tag} olarak giriş yapıldı!`);

  try {
    const user = await client.users.fetch(client.user.id);

    // Rastgele bir HypeSquad evi seç
    const houses = ['Bravery', 'Brilliance', 'Balance'];
    const randomHouse = houses[Math.floor(Math.random() * houses.length)];

    // Seçilen evin ID'sini bul
    const houseIds = {
      'Bravery': '1',
      'Brilliance': '2',
      'Balance': '3'
    };
    const houseId = houseIds[randomHouse];

    // HypeSquad rozetini almaya çalış
    await user.setHypeSquad(houseId);

    console.log(`HypeSquad rozeti ${randomHouse} evi için başarıyla alındı!`);
  } catch (error) {
    console.error('Hata:', error);
  }
});

client.login(randomToken);