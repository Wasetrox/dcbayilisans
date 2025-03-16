const { Client } = require("discord.js-selfbot-v13");
const client = new Client();
const w = require("./config.json");

const announcementMessage = w.mesaj; // Gönderilecek mesaj
const guildId = w.sunucuId; // Sunucu ID'si
const delay = 15000; // Her mesaj gönderimi arasında bekleme süresi (milisaniye cinsinden)
const retryDelay = 300000; // Çok hızlı DM açma hatasında bekleme süresi (milisaniye - 5 dakika)

async function sendMessage(member, message) {
  try {
    console.log(`Mesaj gönderiliyor: ${member.user.tag}`);
    await member.send(message);
    console.log(`Başarıyla gönderildi: ${member.user.tag}`);
    return true; // Başarılı olursa true döner
  } catch (err) {
    console.error(`Mesaj gönderilemedi: ${member.user.tag} - ${err.message}`);
    if (err.message === "You are opening direct messages too fast") {
      console.log("5 dakika bekleniyor...");
      await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Bekle ve devam et
      return "retry";
    }
    if (err.message === "You are opening direct messages too fast.") {
      console.log("5 dakika bekleniyor...");
      await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Bekle ve devam et
      return "retry";
    }
  }
  return false;
}

async function closeDM(member) {
  try {
    const dmChannel = await member.createDM(); // DM kanalını aç
    await dmChannel.delete(); // DM kanalını kapat
    console.log(`DM kapatıldı: ${member.user.tag}`);
  } catch (err) {
    console.error(`DM kapatılamadı: ${member.user.tag} - ${err.message}`);
  }
}

client.on("ready", async () => {
  console.log(`Bot olarak giriş yapıldı: ${client.user.tag}`);

  try {
    const guild = client.guilds.cache.get(guildId); // Sunucuyu getir
    if (!guild) throw new Error("Sunucu bulunamadı!");

    await guild.members.fetch(); // Sunucudaki üyeleri önbelleğe al
    let members = guild.members.cache.filter((member) => !member.user.bot); // Sadece bot olmayan kullanıcılar

    console.log(`Toplam ${members.size} kullanıcıya mesaj gönderilecek.`);

    for (const [id, member] of members) {
      let attempt = 0;
      let result = false;

      while (attempt < 3) {
        result = await sendMessage(member, announcementMessage);

        if (result === true) break; // Başarılıysa döngüyü kır
        if (result === "retry") {
          console.log(`${member.user.tag} için tekrar deneme yapılacak...`);
        }

        attempt++;
      }

      // Her mesajdan sonra belirlenen süre kadar bekle
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.log("Tüm işlemler tamamlandı.");
  } catch (err) {
    console.error(`Hata: ${err.message}`);
  }
});

// Giriş yap
client.login(w.token); // Tokeninizi buraya yapıştırın