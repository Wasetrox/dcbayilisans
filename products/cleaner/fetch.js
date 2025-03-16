const axios = require('axios');
const fs = require('fs');

class HQFriendsFetcher {
    constructor(configPath) {
        this.config = this.loadConfig(configPath);
        this.discordWebhook = this.config.discordWebhook;
        this.discordToken = this.config.discordToken;
        this.rareBadges = {
            "certified_moderator": "<:4m_b:1081854928701636669>",
            "hypesquad": "<:3hs_e:1081855010813513748>",
            "staff": "<:0ds:1081867631230976050>",
            "bug_hunter_level_1": "<:1bh_b:1081867522434945104>",
            "bug_hunter_level_2": "<:1bh_a:1081867578361786419>",
            "verified_developer": "<:6bd:1081727568891367424>",
            "early_supporter": "<:5es:1081853288804257883>",
            "partner": "<:2pso:1081867357993058434>",
            "guild_booster_lvl1": "<:00x:1081867925184598017>",
            "guild_booster_lvl2": "<:00w:1081867964199997520>",
            "guild_booster_lvl3": "<:00v:1081868059142266880>",
            "guild_booster_lvl4": "<:00u:1081868112749666334>",
            "guild_booster_lvl5": "<:00t:1081868147407192104>",
            "guild_booster_lvl6": "<:00s:1081868190835019886>",
            "guild_booster_lvl7": "<:00r:1081868226625024030>",
            "guild_booster_lvl8": "<:00q:1081868265095172097>",
            "guild_booster_lvl9": "<:00p:1081868343155376148>",
            "premium": "<:00y:1081867778052591627>"
        };
        this.commonBadges = {
            "hypesquad_house_1": "<:8hs_a:1081726656424726558>",
            "hypesquad_house_2": "<:8hs_b:1081726530276819055>",
            "hypesquad_house_3": "<:8hs_c:1081726373367922709>",
            "active_developer": "<:7ad:1084699621453987850>",
            "legacy_username": "<:legacy_username:1272413595350863882>",
            "quest_completed": "<:7ae:1236821832460664845>"
        };
        this.validateConfig();

        // Headers burada direkt nesne olarak tanımlanmış
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
            "Accept": "*/*",
            "Authorization": this.discordToken,
            "X-Discord-Locale": "en-US"
        };
    }

    loadConfig(filePath) {
        try {
            const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return config;
        } catch (error) {
            console.error("Error loading config:", error);
            process.exit(1);
        }
    }

    validateConfig() {
        if (!this.discordWebhook.match(/^https?:\/\//)) {
            console.error("Invalid Discord Webhook URL.");
            process.exit(1);
        }
        if (!(this.discordToken.length >= 50 && this.discordToken.length <= 80)) {
            console.error("Invalid Discord Token.");
            process.exit(1);
        }
    }

    // Arkadaşları sadece doğru şekilde alacak şekilde güncellenmiş
    async fetchFriends() {
        try {
            const response = await axios.get("https://ptb.discord.com/api/v10/users/@me/relationships", { headers: this.headers });
            const friends = response.data.filter(friend => friend.type === 1); 
            console.log(`Total valid friends: ${friends.length}`);
            return friends;
        } catch (error) {
            console.error("Error fetching friends:", error);
            return [];
        }
    }

    // Kullanıcıyı badge'leri ile birlikte alır
    async fetchUser(userId, badgeCounts) {
        try {
            const response = await axios.get(`https://ptb.discord.com/api/v10/users/${userId}/profile?with_mutual_guilds=false&with_mutual_friends=false&with_mutual_friends_count=false`, { headers: this.headers });
            const responseData = response.data;
            const userBadges = responseData.badges || [];
            const badgeNames = userBadges.map(badge => badge.id);

            let allBadges = [];
            let foundRareBadge = false;

            // Rare Badge'leri kontrol et ve say
            for (let [badgeKey, badgeName] of Object.entries(this.rareBadges)) {
                if (badgeNames.includes(badgeKey)) {
                    allBadges.push(badgeName);
                    foundRareBadge = true;
                    if (badgeCounts[badgeName]) badgeCounts[badgeName]++;
                }
            }

            // Common Badge'leri kontrol et ve say
            for (let [badgeKey, badgeName] of Object.entries(this.commonBadges)) {
                if (badgeNames.includes(badgeKey)) {
                    allBadges.push(badgeName);
                    if (badgeCounts[badgeName]) badgeCounts[badgeName]++;
                }
            }

            // Early Supporter ve Premium için özel sıralama
            if (this.rareBadges["early_supporter"] && allBadges.includes(this.rareBadges["early_supporter"])) {
                let earlySupporterBadge = this.rareBadges["early_supporter"];
                allBadges = [earlySupporterBadge, ...allBadges.filter(badge => badge !== earlySupporterBadge)];
            }

            if (this.commonBadges["premium"] && allBadges.includes(this.commonBadges["premium"])) {
                let premiumBadge = this.commonBadges["premium"];
                allBadges = [premiumBadge, ...allBadges.filter(badge => badge !== premiumBadge)];
            }

            const userInfo = responseData.user || {};
            const avatar = userInfo.avatar || "https://i.imgur.com/D9fpQBp.png";
            const username = userInfo.username || "Unknown";

            if (!foundRareBadge) {
                console.log(`Skipping user ${userId} (no rare badges found)`);
                return false;
            }

            // Badge'leri debug ederek yazdıralım
            console.log(`Badges found for ${username}: ${allBadges.join(', ')}`);
            await this.sendToWebhook(userId, username, avatar, allBadges);

            return { username, avatar, allBadges };
        } catch (error) {
            console.error("Error fetching user:", error);
            return false;
        }
    }

    // Webhook'a gönderme işlemi
    async sendToWebhook(userId, username, avatar, badges) {
        if (!badges || badges.length === 0) return;

        const data = {
            embeds: [{
                description: `Username: \`\`\`${username}\`\`\`\nID: ${userId}\nBadges: ${badges.join(' ')}`,
                footer: { text: "Ahmet HQ Fetcher" },
                thumbnail: { url: `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png` }
            }],
            avatar_url: "https://media.istockphoto.com/id/1175673630/vector/nerd-face-emoji-clever-emoticon-with-glasses-geek-or-student.jpg?s=612x612&w=0&k=20&c=lvpX0IJPN1HzPN99miKab_CmMnjexTUREjdYJH5X7F0="
        };

        try {
            await axios.post(`${this.discordWebhook}?wait=true`, data);
        } catch (error) {
            console.error("Error sending to webhook:", error);
        }
    }

    // Badge sayımlarını göndermek için
    async sendSummaryToWebhook(badgeCounts) {
        const descriptionLines = Object.entries(badgeCounts)
            .filter(([badge, count]) => count > 0)
            .map(([badge, count]) => `${count}x ${badge}`)
            .join("\n") || "*None*";

        const data = {
            embeds: [{
                description: descriptionLines,
                footer: { text: "Ahmet HQ Fetcher" }
            }],
            avatar_url: "https://i.imgur.com/rTNA25H.jpeg"
        };

        try {
            await axios.post(`${this.discordWebhook}?wait=true`, data);
        } catch (error) {
            console.error("Error sending summary to webhook:", error);
        }
    }

    // Ana çalışma fonksiyonu
    async run() {
        const friends = await this.fetchFriends();
        const totalFriends = friends.length;
        const badgeCounts = Object.values(this.rareBadges).reduce((acc, badge) => {
            acc[badge] = 0;
            return acc;
        }, {});

        for (let index = 0; index < totalFriends; index++) {
            const friend = friends[index];
            const userId = friend.id;
            console.log(`Fetching friend ${index + 1} of ${totalFriends}...`);
            
            const result = await this.fetchUser(userId, badgeCounts); 
            if (result) {
                const { username, avatar, allBadges } = result;
                allBadges.forEach(badge => {
                    if (badgeCounts[badge]) badgeCounts[badge]++;
                });
            } else {
                console.log(`User ${userId} skipped`);
            }
        }

        // Kod tamamlandıktan sonra özet gönder
        await this.sendSummaryToWebhook(badgeCounts);
        console.log('DONE');
    }
}

// Botu çalıştır
const fetcher = new HQFriendsFetcher('config.json');
fetcher.run();