const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const chatController = require('../controllers/chatController');

router.use(authenticateToken);

router.get('/threads', chatController.listThreads);
router.get('/:bookingId', chatController.getMessages);
router.post('/:bookingId', upload.single('image'), chatController.sendMessage);
router.post('/:bookingId/read', chatController.markRead);

module.exports = router;
