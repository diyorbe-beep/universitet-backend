const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');

const authRoutes = require('./routes.auth');
const servicesRoutes = require('./routes.services');
const ordersRoutes = require('./routes.orders');
const notificationsRoutes = require('./routes.notifications');
const newsRoutes = require('./routes.news');
const suggestionsRoutes = require('./routes.suggestions');
const { users } = require('./jsondb');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
	},
	// Add namespace configuration
	path: '/socket.io'
});

app.set('io', io);
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use(cookieParser());

// Simple request logger
app.use((req, _res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
	return next();
});

// Root endpoint
app.get('/', (req, res) => {
	res.json({ 
		message: 'Universitet Backend API', 
		version: '1.0.0',
		endpoints: {
			health: '/api/health',
			auth: '/api/auth/*',
			services: '/api/services',
			orders: '/api/orders',
			notifications: '/api/notifications'
		}
	});
});

app.get('/api/health', (req, res) => {
	res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/suggestions', suggestionsRoutes);

// JSON 404 handler
app.use((req, res) => {
	console.warn('404 Not Found:', req.method, req.url);
	res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
	console.log(`API server listening on http://localhost:${PORT}`);

	// Auto-seed superadmin on startup
	try {
		const SUPER_ADMIN_EMAIL = 'superadmin@gmail.com';
		const SUPER_ADMIN_PASSWORD = 'admin123';
		let existing = await users.findOne({ email: SUPER_ADMIN_EMAIL });
		if (!existing) {
			const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
			await users.insert({
				name: 'Super Admin',
				firstName: 'Super',
				lastName: 'Admin',
				email: SUPER_ADMIN_EMAIL,
				passwordHash,
				role: 'katta_admin',
				gender: 'male',
				verified: true,
				createdAt: new Date().toISOString()
			});
			console.log(`✅ Superadmin yaratildi: ${SUPER_ADMIN_EMAIL}`);
		} else {
			console.log(`ℹ️  Superadmin allaqachon mavjud: ${SUPER_ADMIN_EMAIL}`);
		}
	} catch (err) {
		console.error('❌ Superadmin seed xatoligi:', err);
	}
});

