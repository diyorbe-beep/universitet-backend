const express = require('express');
const bcrypt = require('bcryptjs');
const { users } = require('./jsondb');

const router = express.Router();
const USER_FIXED_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoidXNlciJ9.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';
const ADMIN_FIXED_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWRtaW4ifQ.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

// Simple session storage for current logged in users
const currentSessions = {
	user: null,
	admin: null
};

router.post('/register', async (req, res) => {
	try {
		const { name, email, password } = req.body || {};
		if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
		const exists = await users.findOne({ email });
		if (exists) return res.status(409).json({ error: 'Email already exists' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await users.insert({ name, email, passwordHash, role: 'user', verified: true, createdAt: new Date().toISOString() });
		
		// Store current user session
		currentSessions.user = user;
		
		return res.json({ token: USER_FIXED_JWT, user: { id: user._id, name: user.name, email: user.email, role: user.role, verified: true } });
	} catch (err) { return res.status(500).json({ error: 'Registration failed' }); }
});

// Backward compatibility: verify endpoint simply returns success
router.post('/verify', async (req, res) => {
	return res.json({ token: USER_FIXED_JWT, message: 'Tasdiqlash talab qilinmaydi' });
});

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body || {};
		if (!email || !password) return res.status(400).json({ error: 'email, password required' });
		const user = await users.findOne({ email });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		
		// Store current user session
		currentSessions.user = user;
		
		return res.json({ token: USER_FIXED_JWT, user: { id: user._id, name: user.name, email: user.email, role: user.role, verified: true } });
	} catch (err) { return res.status(500).json({ error: 'Login failed' }); }
});

router.post('/admin-login', async (req, res) => {
	try {
		let { email, password } = req.body || {};
		email = (email || '').trim().toLowerCase();
		// Always allow admin@local during setup (any password). Ensure user exists/updated.
		if (email === 'admin@local') {
			let admin = await users.findOne({ email: 'admin@local', role: 'admin' });
			const passwordHash = await bcrypt.hash('admin123', 10);
			if (!admin) {
				admin = await users.insert({ name: 'Admin', email: 'admin@local', passwordHash, role: 'admin', verified: true, createdAt: new Date().toISOString() });
			} else {
				await users.update({ _id: admin._id }, { $set: { passwordHash, role: 'admin', verified: true } });
				admin = await users.findOne({ _id: admin._id });
			}
			
			// Store current admin session
			currentSessions.admin = admin;
			
			return res.json({ token: ADMIN_FIXED_JWT, user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, verified: true } });
		}
		// Otherwise need existing admin match
		const user = await users.findOne({ email, role: 'admin' });
		if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });
		const ok = await bcrypt.compare(password || '', user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Invalid admin credentials' });
		
		// Store current admin session
		currentSessions.admin = user;
		
		return res.json({ token: ADMIN_FIXED_JWT, user: { id: user._id, name: user.name, email: user.email, role: user.role, verified: true } });
	} catch (e) { return res.status(500).json({ error: 'Admin login failed' }); }
});

router.get('/me', async (req, res) => {
	try {
		// Get token from Authorization header or cookie
		const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
		
		if (!token) {
			return res.status(401).json({ error: 'No token provided' });
		}

		// Determine user type and get from session
		let currentUser = null;
		if (token === ADMIN_FIXED_JWT) {
			currentUser = currentSessions.admin;
		} else if (token === USER_FIXED_JWT) {
			currentUser = currentSessions.user;
		} else {
			return res.status(401).json({ error: 'Invalid token' });
		}

		// If no session user, try to find the most recent user of this role
		if (!currentUser) {
			const allUsers = await users.all();
			if (token === ADMIN_FIXED_JWT) {
				const admins = allUsers.filter(u => u.role === 'admin');
				if (admins.length > 0) {
					currentUser = admins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
					currentSessions.admin = currentUser;
				}
			} else {
				const regularUsers = allUsers.filter(u => u.role === 'user');
				if (regularUsers.length > 0) {
					currentUser = regularUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
					currentSessions.user = currentUser;
				}
			}
		}

		if (!currentUser) {
			return res.status(404).json({ error: 'User not found' });
		}

		return res.json({ 
			user: { 
				id: currentUser._id, 
				name: currentUser.name, 
				email: currentUser.email, 
				role: currentUser.role, 
				verified: true 
			} 
		});
	} catch (e) { 
		console.error('Error in /me endpoint:', e);
		return res.status(500).json({ error: 'Failed' }); 
	}
});

router.post('/seed-admin', async (_req, res) => {
	const adminEmail = 'admin@local';
	const exists = await users.findOne({ email: adminEmail });
	if (!exists) {
		const passwordHash = await bcrypt.hash('admin123', 10);
		await users.insert({ name: 'Admin', email: adminEmail, passwordHash, role: 'admin', verified: true, createdAt: new Date().toISOString() });
	}
	res.json({ ok: true });
});

module.exports = router;
