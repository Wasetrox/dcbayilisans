const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const discord = require('discord.js-selfbot');
const chokidar = require('chokidar');

const app = express();
const PORT = 5000;

// ==============================
// Dosya yollarını belirleme
const filePaths = {
  tokens: path.join(__dirname, 'data', 'token.json'),
  voices: path.join(__dirname, 'data', 'voice.json'),
  games: path.join(__dirname, 'data', 'games.json'), // Oyun aktiviteleri
  words: path.join(__dirname, 'data', 'words.json'), // Söz aktiviteleri
  watch: path.join(__dirname, 'data', 'watch.json'), // İzleme aktiviteleri
  listen: path.join(__dirname, 'data', 'listen.json'), // Dinleme aktiviteleri
};

// ==============================
// Statik dosyalar için public klasörünü ayarla
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // JSON verilerini işlemek için

// ==============================
// JSON dosyasını oku
const readJSON = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    throw error;
  }
};

// ==============================
// Asenkron dosya varlık kontrolü
const checkFileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    console.log(`Dosya mevcut: ${filePath}`);
  } catch (error) {
    console.error(`Dosya bulunamadı: ${filePath}`);
    process.exit(1);
  }
};

// Hesap yönetimi için yeni değişkenler
const BATCH_SIZE = 100; // Her grupta işlenecek token sayısı
const BATCH_DELAY = 5000; // Her grup arasındaki bekleme süresi (ms)
let activeClients = new Map(); // Aktif clientları takip etmek için

// Botları başlatacak fonksiyon - yeniden düzenlenmiş hali
async function startBots(tokens, channels) {
  // Önceki bağlantıları temizle
  for (let [token, client] of activeClients) {
    try {
      client.destroy();
      activeClients.delete(token);
    } catch (error) {
      console.error(`Client destroy error for token: ${token}`, error);
    }
  }

  // Tokenleri gruplara böl
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    
    console.log(`Starting batch ${i/BATCH_SIZE + 1} of ${Math.ceil(tokens.length/BATCH_SIZE)}`);
    
    await Promise.all(batch.map(async (token) => {
      try {
        const client = new discord.Client({
          checkUpdate: false,
          messageEditHistoryMaxSize: 1,
          messageCacheMaxSize: 1,
          messageCacheLifetime: 1,
          messageSweepInterval: 1,
          ws: { 
            large_threshold: 1
          }
        });

        // Client olaylarını ayarla
        setupClientEvents(client, channels);
        
        await client.login(token);
        activeClients.set(token, client);
      } catch (error) {
        console.error(`Login failed for token: ${token.substr(0, 20)}...`, error.message);
      }
    }));

    // Bir sonraki grup için bekle
    if (i + BATCH_SIZE < tokens.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }
}

// Client olaylarını ayarlayan fonksiyon - güncellendi
function setupClientEvents(client, channels) {
  client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Önce durum ayarla
    await setRandomStatus(client);
    
    // Sonra aktivite ayarla
    await setRandomActivity(client);
    
    // Son olarak ses kanalına bağlan
    await joinVoiceChannel(client, channels);
    
    // Her 30 dakikada bir durumu yenile
    setInterval(async () => {
      await setRandomStatus(client);
    }, 30 * 60 * 1000);
  });

  client.on('error', (error) => {
    console.error(`Client error for ${client.user?.tag}:`, error.message);
  });
}

// Aktivite ayarlama fonksiyonu
async function setRandomActivity(client) {
  try {
    const games = await readJSON(filePaths.games);
    const words = await readJSON(filePaths.words);
    const watch = await readJSON(filePaths.watch);
    const listen = await readJSON(filePaths.listen);

    const activityOptions = [
      { type: 'PLAYING', items: games },
      { type: 'LISTENING', items: listen },
      { type: 'WATCHING', items: watch },
      { type: 'LISTENING', items: words },
    ];

    const randomActivity = getRandomItem(activityOptions);
    const randomItem = getRandomItem(randomActivity.items);

    await client.user.setActivity(randomItem, { type: randomActivity.type });
  } catch (error) {
    console.error('Activity ayarlanırken hata:', error);
  }
}

// Rastgele liste öğesi seçici
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Rastgele durum seçici - güncellendi
function getRandomStatus() {
  return Math.random() < 0.5 ? 'dnd' : 'idle';
}

// Durum ayarlama fonksiyonu - yeniden düzenlenmiş
async function setRandomStatus(client) {
  try {
    const status = getRandomStatus();
    await client.user.setPresence({
      status: status,
      afk: status === 'idle' ? true : false
    });
    console.log(`Status set for ${client.user.tag}: ${status}`);
  } catch (error) {
    console.error(`Status ayarlanamadı (${client.user.tag}):`, error);
  }
}

// Ses kanalına bağlanma fonksiyonu - ayrı bir fonksiyon olarak
async function joinVoiceChannel(client, channels) {
  try {
    const randomChannelID = getRandomItem(channels);
    const channel = client.channels.cache.get(randomChannelID);

    if (channel) {
      const connection = await channel.join();
      connection.voice.setSelfDeaf(false);
      connection.voice.setSelfMute(false);
      console.log(`${client.user.tag} joined voice channel: ${channel.name}`);
    }
  } catch (error) {
    console.error(`Voice channel error (${client.user.tag}):`, error);
  }
}

// ==============================
// Dosyaların var olup olmadığını kontrol et ve başlat
(async () => {
  await Promise.all([
    checkFileExists(filePaths.tokens),
    checkFileExists(filePaths.voices),
    checkFileExists(filePaths.games),
    checkFileExists(filePaths.words),
    checkFileExists(filePaths.watch),
    checkFileExists(filePaths.listen),
  ]);

  let tokens, channels;

  try {
    tokens = await readJSON(filePaths.tokens);
    channels = await readJSON(filePaths.voices);
  } catch (error) {
    console.error('Dosyaları yüklerken hata oluştu:', error.message);
    process.exit(1);
  }

  startBots(tokens, channels);

  // token.json dosyasını dinlemek için chokidar kullan
  const watcher = chokidar.watch(filePaths.tokens, { persistent: true });

  watcher.on('change', async () => {
    console.log('token.json dosyası değişti!');
    try {
      tokens = await readJSON(filePaths.tokens);
      startBots(tokens, channels);
    } catch (error) {
      console.error('Yeni token dosyasını okurken hata oluştu:', error.message);
    }
  });

  // Dosya izleyici için hata yönetimi ekle
  watcher.on('error', error => {
    console.error('File watcher error:', error);
  });

  // Bellek kullanımını izle
  setInterval(() => {
    const used = process.memoryUsage();
    console.log(`Memory usage: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
  }, 60000);
})();

// ==============================
// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// HTML içeriği
const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discord Token Yönetimi</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --primary-color: #7289da;
            --secondary-color: #99aab5;
            --background-color: #2c2f33;
            --surface-color: #23272a;
            --text-color: #ffffff;
            --text-muted: #72767d;
            --success-color: #43b581;
            --danger-color: #f04747;
            --warning-color: #faa61a;
            --transition: all 0.3s ease;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }

        .container {
            display: flex;
            min-height: 100vh;
        }

        .sidebar {
            width: 260px;
            background-color: var(--surface-color);
            padding: 1.5rem;
            transition: var(--transition);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .logo img {
            width: 40px;
            height: 40px;
        }

        .nav-links {
            list-style: none;
        }

        .nav-links li {
            padding: 0.8rem 1rem;
            margin: 0.5rem 0;
            border-radius: 8px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .nav-links li:hover, .nav-links li.active {
            background-color: var(--primary-color);
        }

        .content {
            flex: 1;
            padding: 2rem;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        .search-bar {
            background-color: var(--surface-color);
            padding: 0.8rem 1.2rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 1rem;
            width: 300px;
        }

        .search-bar input {
            background: none;
            border: none;
            color: var(--text-color);
            width: 100%;
            outline: none;
        }

        .header-right {
            display: flex;
            gap: 1.5rem;
            align-items: center;
        }

        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background-color: var(--surface-color);
            padding: 1.5rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }

        .stat-icon {
            background-color: var(--primary-color);
            width: 50px;
            height: 50px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }

        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 1.5rem;
        }

        .chart-card {
            background-color: var(--surface-color);
            padding: 1.5rem;
            border-radius: 12px;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .page {
            animation: fadeIn 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <nav class="sidebar">
            <div class="logo">
                <i class="fab fa-discord" style="font-size: 2rem;"></i>
                <h1>Token Yönetimi</h1>
            </div>
            <ul class="nav-links">
                <li class="active" data-page="dashboard">
                    <i class="fas fa-home"></i>
                    <span>Dashboard</span>
                </li>
                <li data-page="tokens">
                    <i class="fas fa-key"></i>
                    <span>Tokenler</span>
                </li>
                <li data-page="voice">
                    <i class="fas fa-microphone"></i>
                    <span>Ses Kanalları</span>
                </li>
                <li data-page="activities">
                    <i class="fas fa-gamepad"></i>
                    <span>Aktiviteler</span>
                </li>
                <li data-page="settings">
                    <i class="fas fa-cog"></i>
                    <span>Ayarlar</span>
                </li>
            </ul>
        </nav>

        <main class="content">
            <header>
                <div class="search-bar">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Ara...">
                </div>
                <div class="header-right">
                    <div class="theme-toggle">
                        <i class="fas fa-moon"></i>
                    </div>
                    <div class="notifications">
                        <i class="fas fa-bell"></i>
                        <span class="badge">3</span>
                    </div>
                </div>
            </header>

            <div id="dashboard" class="page active">
                <div class="stats-container">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Aktif Tokenler</h3>
                            <p class="token-count">0</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-microphone"></i>
                        </div>
                        <div class="stat-info">
                            <h3>Ses Kanalları</h3>
                            <p class="voice-count">0</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-memory"></i>
                        </div>
                        <div class="stat-info">
                            <h3>RAM Kullanımı</h3>
                            <p class="memory-usage">0 MB</p>
                        </div>
                    </div>
                </div>

                <div class="charts-container">
                    <div class="chart-card">
                        <h3>Token Durumları</h3>
                        <canvas id="statusChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3>Aktivite Dağılımı</h3>
                        <canvas id="activityChart"></canvas>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Tema değiştirme
            const themeToggle = document.querySelector('.theme-toggle');
            let isDark = true;

            themeToggle.addEventListener('click', () => {
                isDark = !isDark;
                document.body.classList.toggle('light-theme');
                themeToggle.querySelector('i').classList.toggle('fa-sun');
                themeToggle.querySelector('i').classList.toggle('fa-moon');
            });

            // Sayfa geçişleri
            const navLinks = document.querySelectorAll('.nav-links li');
            const pages = document.querySelectorAll('.page');

            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                });
            });

            // Grafikleri oluştur
            const statusCtx = document.getElementById('statusChart').getContext('2d');
            const activityCtx = document.getElementById('activityChart').getContext('2d');

            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Online', 'DND', 'Idle'],
                    datasets: [{
                        data: [30, 40, 30],
                        backgroundColor: ['#43b581', '#f04747', '#faa61a']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    }
                }
            });

            new Chart(activityCtx, {
                type: 'bar',
                data: {
                    labels: ['Oyun', 'Müzik', 'İzleme', 'Diğer'],
                    datasets: [{
                        label: 'Aktivite Sayısı',
                        data: [65, 59, 80, 81],
                        backgroundColor: '#7289da'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#72767d'
                            },
                            ticks: {
                                color: '#ffffff'
                            }
                        },
                        x: {
                            grid: {
                                color: '#72767d'
                            },
                            ticks: {
                                color: '#ffffff'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    }
                }
            });

            // İstatistikleri güncelle
            function updateStats() {
                fetch('/api/stats')
                    .then(response => response.json())
                    .then(data => {
                        document.querySelector('.token-count').textContent = data.activeTokens;
                        document.querySelector('.voice-count').textContent = data.voiceChannels;
                        document.querySelector('.memory-usage').textContent = `${data.memoryUsage} MB`;
                    })
                    .catch(error => console.error('Stats güncellenirken hata:', error));
            }

            setInterval(updateStats, 5000);
        });
    </script>
</body>
</html>`;

// API endpoint'leri
app.get('/', (req, res) => {
    res.send(htmlContent);
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = {
            activeTokens: activeClients.size,
            voiceChannels: (await readJSON(filePaths.voices)).length,
            memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
