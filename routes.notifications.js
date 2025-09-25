const express = require('express');
const { notifications } = require('./jsondb');

const router = express.Router();

// Get notifications for a user
router.get('/', async (req, res) => {
	try {
		const { userEmail } = req.query;
		let list = await notifications.all();
		
		if (userEmail) {
			list = list.filter(n => n.userEmail === userEmail);
		}
		
		list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
		res.json(list);
	} catch (err) {
		res.status(500).json({ error: 'Failed to get notifications' });
	}
});

// Create a new notification
router.post('/', async (req, res) => {
	try {
		const { userEmail, title, message, type = 'info' } = req.body || {};
		if (!userEmail || !title || !message) {
			return res.status(400).json({ error: 'userEmail, title, and message are required' });
		}
		
		const now = new Date().toISOString();
		const notification = await notifications.insert({
			userEmail,
			title,
			message,
			type, // 'info', 'success', 'warning', 'error'
			read: false,
			createdAt: now
		});
		
		// Emit real-time notification
		const io = req.app.get('io');
		io.emit('notification:new', notification);
		
		res.status(201).json(notification);
	} catch (err) {
		res.status(500).json({ error: 'Failed to create notification' });
	}
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
	try {
		const id = req.params.id;
		await notifications.update({ _id: id }, { $set: { read: true } });
		const list = await notifications.all();
		const notification = list.find(n => n._id === id);
		res.json(notification);
	} catch (err) {
		res.status(500).json({ error: 'Failed to mark as read' });
	}
});

module.exports = router;