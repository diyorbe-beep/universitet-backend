const express = require('express');
const { orders } = require('./jsondb');

const router = express.Router();

router.get('/', async (req, res) => {
	const list = await orders.all();
	list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
	res.json(list);
});

router.post('/', async (req, res) => {
	try {
		const { firstName, lastName, middleName, organization, address, phone, phone2, position, message, service, userEmail } = req.body || {};
		if (!firstName || !lastName || !phone) return res.status(400).json({ error: 'Required fields missing' });
		const now = new Date().toISOString();
		const order = await orders.insert({ 
			firstName, 
			lastName, 
			middleName, 
			organization, 
			address, 
			phone, 
			phone2, 
			position, 
			message, 
			service, 
			userEmail, // Add userEmail to track who made the order
			status: 'pending', 
			createdAt: now, 
			updatedAt: now 
		});
		
		// Send notification to admin about new order
		if (userEmail) {
			const { notifications } = require('./jsondb');
			await notifications.insert({
				userEmail: 'admin@local', // Admin notification
				title: 'Yangi buyurtma!',
				message: `${firstName} ${lastName} tomonidan "${service?.name || 'xizmat'}" uchun yangi buyurtma berildi.`,
				type: 'info',
				read: false,
				createdAt: now
			});
		}
		
		const io = req.app.get('io');
		io.emit('orders:new', order);
		res.status(201).json(order);
	} catch (err) {
		res.status(500).json({ error: 'Create order failed' });
	}
});

router.put('/:id/status', async (req, res) => {
	try {
		const id = req.params.id;
		const { status } = req.body || {};
		if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
		
		await orders.update({ _id: id }, { $set: { status, updatedAt: new Date().toISOString() } });
		const list = await orders.all();
		const order = list.find(o => o._id === id);
		
		// Send notification to user if order has userEmail
		if (order && order.userEmail) {
			const { notifications } = require('./jsondb');
			let title, message;
			
			if (status === 'approved') {
				title = 'Buyurtma qabul qilindi!';
				message = `Sizning "${order?.service?.name || 'xizmat'}" buyurtmangiz muvaffaqiyatli qabul qilindi. Tez orada siz bilan bog'lanishadi.`;
			} else if (status === 'rejected') {
				title = 'Buyurtma rad etildi';
				message = `Afsuski, sizning "${order?.service?.name || 'xizmat'}" buyurtmangiz rad etildi. Batafsil ma'lumot uchun biz bilan bog'laning.`;
			}
			
			if (title && message) {
				const notification = await notifications.insert({
					userEmail: order.userEmail,
					title,
					message,
					type: status === 'approved' ? 'success' : 'warning',
					read: false,
					createdAt: new Date().toISOString()
				});
				
				// Emit real-time notification
				const io = req.app.get('io');
				io.emit('notification:new', notification);
			}
		}
		
		const io = req.app.get('io');
		io.emit('orders:updated', order);
		res.json(order);
	} catch (err) {
		res.status(500).json({ error: 'Update status failed' });
	}
});

router.delete('/:id', async (req, res) => {
	try {
		const id = req.params.id;
		const removed = await orders.remove({ _id: id });
		if (removed === 0) {
			return res.status(404).json({ error: 'Order not found' });
		}
		
		// Emit real-time update
		const io = req.app.get('io');
		io.emit('orders:deleted', { id });
		
		res.json({ success: true, message: 'Order deleted successfully' });
	} catch (err) {
		res.status(500).json({ error: 'Delete order failed' });
	}
});

module.exports = router;
