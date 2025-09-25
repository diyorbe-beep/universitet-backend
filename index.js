const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const authRoutes = require('./routes.auth');
const servicesRoutes = require('./routes.services');
const ordersRoutes = require('./routes.orders');
const notificationsRoutes = require('./routes.notifications');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
	}
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

app.get('/api/health', (req, res) => {
	res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/notifications', notificationsRoutes);

// JSON 404 handler
app.use((req, res) => {
	console.warn('404 Not Found:', req.method, req.url);
	res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
	console.log(`API server listening on http://localhost:${PORT}`);
});
