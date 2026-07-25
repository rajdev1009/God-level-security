const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// We export or attach routes using express app reference via server context or routing. 
// Since app is instantiated in server.js, let's bind routes cleanly.
// Wait, we can export a function or attach to express app. Let's do a clean setup:
