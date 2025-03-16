const { Client, IntentsBitField, ActivityType } = require('discord.js');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const Obfuscator = require('javascript-obfuscator');
const AdmZip = require('adm-zip');
const readline = require('readline');
const express = require('express');
const w = require('./config.json');
require('dotenv').config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates
  ],
});

const token = w.DISCORD_TOKEN;
const mongoUri = w.MONGO_URI;
const voiceChannelId = w.SES_KANAL_ID; // Ses kanal ID
const logChannelId = w.LOG_KANAL_ID; // Log kanal ID
const allowedUserId = w.YETKILI_KULLANICI_ID; // Yetkili kişinin Discord ID'sini buraya koyun
const port = w.PORT || 3000;
let db;

const app = express();
app.use(express.static('public'));
app.use(express.json());

client.once('ready', async () => {
  console.log('Bot hazır!');
  
  const mongo = await MongoClient.connect(mongoUri, { useUnifiedTopology: true });
  db = mongo.db('licenseDB');

  const channel = client.channels.cache.get(voiceChannelId);
  if (channel && channel.type === 'GUILD_VOICE') {
    channel.join()
      .then(connection => console.log('Ses kanalına bağlandı!'))
      .catch(err => console.error('Ses kanalına bağlanırken hata:', err));
  }

  client.user.setPresence({
    activities: [{
      name: '✨ DcBayi Lisans Sistemi',
      type: ActivityType.Streaming,
      url: 'https://twitch.tv/wasetrox'
    }],
    status: 'dnd'
  });
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('.key') || message.author.bot) return;

  // Yetki kontrolü
  if (message.author.id !== allowedUserId) {
    return message.reply('Bu komutu kullanma yetkiniz yok!');
  }

  const args = message.content.split(' ').slice(1);
  const productName = args[0];
  const user = message.mentions.users.first();

  if (!productName || !user) {
    return message.reply('Lütfen geçerli bir ürün adı ve kullanıcı belirtin. Örnek: `.key otomasyon @kullanici`');
  }

  const licenseKey = crypto.randomBytes(16).toString('hex');
  const createdAt = new Date();
  await db.collection('licenses').insertOne({
    product: productName,
    userId: user.id,
    userTag: user.tag,
    assignedBy: message.author.tag,
    licenseKey: licenseKey,
    createdAt: createdAt,
    lastModified: createdAt,
    hardwareId: null,
  });

  const sourceDir = path.join(__dirname, 'products', productName);
  const tempDir = path.join(__dirname, 'temp', `${productName}_${user.id}`);
  const zipPath = path.join(__dirname, 'zips', `${productName}_${user.id}.zip`);

  try {
    await fs.emptyDir(tempDir);
    await fs.copy(sourceDir, tempDir);

    await addKeyCheckToFiles(tempDir, licenseKey);
    await obfuscateFiles(tempDir);

    const zip = new AdmZip();
    zip.addLocalFolder(tempDir);
    await fs.ensureDir(path.dirname(zipPath));
    zip.writeZip(zipPath);

    const dmMessage = `Merhaba! İşte **${productName}** ürünün için bilgiler:\n\n**Lisans Anahtarı:** \`${licenseKey}\`\n\nDosyayı aşağıdaki linkten indirebilirsin. İlk çalıştırmada bu anahtarı girmen gerekecek.\n**ZIP Dosyası:** (Dosya boyutu nedeniyle manuel olarak yükleniyor.)`;
    await user.send(dmMessage);
    await user.send({ files: [zipPath] });
    message.reply(`${user.tag} kullanıcısına ${productName} için lisans anahtarı ve ZIP dosyası gönderildi.`);

    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) {
      logChannel.send({
        embeds: [{
          title: 'Lisans Oluşturuldu',
          color: 0x00ff00,
          fields: [
            { name: 'Ürün', value: productName, inline: true },
            { name: 'Kullanıcı', value: user.tag, inline: true },
            { name: 'Veren', value: message.author.tag, inline: true },
            { name: 'Lisans Anahtarı', value: `\`${licenseKey}\``, inline: false },
            { name: 'Tarih', value: createdAt.toLocaleString('tr-TR'), inline: false }
          ]
        }]
      });
    }

    await fs.remove(tempDir);
    await fs.remove(zipPath);
  } catch (error) {
    console.error(error);
    message.reply('Bir hata oluştu. Lütfen tekrar deneyin.');
  }
});

async function addKeyCheckToFiles(directory, licenseKey) {
  const files = await fs.readdir(directory, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    if (file.isDirectory()) {
      await addKeyCheckToFiles(fullPath, licenseKey);
    } else if (file.name === 'wase.js' || file.name === 'dcbayi.js') {
      let content = await fs.readFile(fullPath, 'utf8');
      const keyCheckCode = `
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const readline = require('readline');
const mongoUri = '${mongoUri}';

async function checkLicense() {
  const db = (await MongoClient.connect(mongoUri)).db('licenseDB');
  const hardwareId = crypto.createHash('sha256').update(require('os').networkInterfaces().toString()).digest('hex');
  if (fs.existsSync('license.dat')) {
    const savedLicense = fs.readFileSync('license.dat', 'utf8');
    const licenseData = await db.collection('licenses').findOne({ licenseKey: savedLicense });
    if (licenseData && licenseData.hardwareId === hardwareId) {
      console.log('Lisans doğrulandı. Bot çalışıyor...');
      return true;
    }
    console.log('Lisans geçersiz veya başka bir cihazda kullanılıyor.');
    process.exit(1);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('Lisans anahtarınızı girin: ', async (input) => {
      const licenseData = await db.collection('licenses').findOne({ licenseKey: input });
      if (!licenseData || input !== '${licenseKey}') {
        console.log('Geçersiz lisans anahtarı.');
        process.exit(1);
      }
      if (licenseData.hardwareId && licenseData.hardwareId !== hardwareId) {
        console.log('Bu lisans anahtarı başka bir cihazda kullanılıyor.');
        process.exit(1);
      }
      await db.collection('licenses').updateOne({ licenseKey: input }, { $set: { hardwareId } });
      fs.writeFileSync('license.dat', input);
      console.log('Lisans doğrulandı. Bot çalışıyor...');
      rl.close();
      resolve(true);
    });
  });
}

(async () => {
  const isValid = await checkLicense();
  if (!isValid) {
    process.exit(1);
  }
})();
`;
      content = keyCheckCode + content;
      await fs.writeFile(fullPath, content);
    }
  }
}

async function obfuscateFiles(directory) {
  const files = await fs.readdir(directory, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    if (file.isDirectory()) {
      await obfuscateFiles(fullPath);
    } else if (file.name.endsWith('.js')) {
      const content = await fs.readFile(fullPath, 'utf8');
      const obfuscated = Obfuscator.obfuscate(content, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArray: true,
      }).getObfuscatedCode();
      await fs.writeFile(fullPath, obfuscated);
    }
  }
}

app.get('/licenses', async (req, res) => {
  try {
    const licenses = await db.collection('licenses').find().toArray();
    res.json(licenses);
  } catch (error) {
    res.status(500).send('Veriler alınırken hata oluştu');
  }
});

app.post('/delete-license', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    const license = await db.collection('licenses').findOne({ licenseKey });
    if (!license) {
      return res.json({ success: false, message: 'Lisans bulunamadı' });
    }

    const deletedAt = new Date();
    await db.collection('licenses').updateOne(
      { licenseKey },
      { $set: { lastModified: deletedAt } }
    );
    const result = await db.collection('licenses').deleteOne({ licenseKey });

    if (result.deletedCount === 1) {
      const logChannel = client.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [{
            title: 'Lisans Silindi',
            color: 0xff0000,
            fields: [
              { name: 'Ürün', value: license.product, inline: true },
              { name: 'Kullanıcı', value: license.userTag, inline: true },
              { name: 'Veren', value: license.assignedBy, inline: true },
              { name: 'Lisans Anahtarı', value: `\`${licenseKey}\``, inline: false },
              { name: 'Silinme Tarihi', value: deletedAt.toLocaleString('tr-TR'), inline: false }
            ]
          }]
        });
      }
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Lisans bulunamadı' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.listen(port, () => {
  console.log(`Web sunucusu ${port} portunda çalışıyor`);
});

client.login(token);