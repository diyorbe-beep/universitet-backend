const express = require('express');
const bcrypt = require('bcryptjs');
const { users } = require('./jsondb');

const router = express.Router();
const USER_FIXED_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoidXNlciJ9.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';
const ADMIN_FIXED_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWRtaW4ifQ.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';
const SUPER_ADMIN_FIXED_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoia2F0dGFfYWRtaW4ifQ.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

// Simple session storage for current logged in users
const currentSessions = {
	user: null,
	admin: null
};

router.post('/register', async (req, res) => {
	try {
		const { name, email, password, gender } = req.body || {};
		if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
		const exists = await users.findOne({ email });
		if (exists) return res.status(409).json({ error: 'Email already exists' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await users.insert({ 
			name, 
			email, 
			passwordHash, 
			gender: gender || 'not_specified', // 'male', 'female', or 'not_specified'
			role: 'user', 
			verified: true, 
			createdAt: new Date().toISOString() 
		});
		
		// Store current user session
		currentSessions.user = user;
		
		return res.json({ token: USER_FIXED_JWT, user: { id: user._id, name: user.name, email: user.email, gender: user.gender, role: user.role, verified: true } });
	} catch (err) { return res.status(500).json({ error: 'Registration failed' }); }
});

// Backward compatibility: verify endpoint simply returns success
router.post('/verify', async (req, res) => {
	return res.json({ token: USER_FIXED_JWT, message: 'Tasdiqlash talab qilinmaydi' });
});

router.post('/login', async (req, res) => {
	try {
		const { email: loginEmail, password: loginPassword } = req.body || {};
		if (!loginEmail || !loginPassword) return res.status(400).json({ error: 'email, password required' });
		const user = await users.findOne({ email: loginEmail });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await bcrypt.compare(loginPassword || '', user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		
		// Determine token and admin flags based on role
		const isKattaAdmin = user.role === 'katta_admin';
		const isAdmin = user.role === 'admin' || isKattaAdmin;
		let token = USER_FIXED_JWT;
		if (isKattaAdmin) token = SUPER_ADMIN_FIXED_JWT;
		else if (isAdmin) token = ADMIN_FIXED_JWT;

		// Store current session
		if (isAdmin) {
			currentSessions.admin = user;
		} else {
			currentSessions.user = user;
		}
		
		return res.json({ 
			token,
			isAdmin,
			isKattaAdmin,
			user: { id: user._id, name: user.name, email: user.email, gender: user.gender, role: user.role, verified: true } 
		});
	} catch (err) { return res.status(500).json({ error: 'Login failed' }); }
});

router.post('/admin-login', async (req, res) => {
	try {
		let { email: adminEmail, password: adminPassword } = req.body || {};
		adminEmail = (adminEmail || '').trim().toLowerCase();

		const adminUser = await users.findOne({ email: adminEmail, role: { $in: ['admin', 'katta_admin'] } });
		if (!adminUser) return res.status(401).json({ error: 'Noto\'g\'ri email yoki parol' });
		const ok = await bcrypt.compare(adminPassword || '', adminUser.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Noto\'g\'ri email yoki parol' });
		
		// Store current admin session
		currentSessions.admin = adminUser;
		
		const isKattaAdmin = adminUser.role === 'katta_admin';
		
		return res.json({ 
			token: isKattaAdmin ? SUPER_ADMIN_FIXED_JWT : ADMIN_FIXED_JWT, 
			isKattaAdmin,
			user: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role, verified: true } 
		});
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
		if (token === SUPER_ADMIN_FIXED_JWT || token === ADMIN_FIXED_JWT) {
			currentUser = currentSessions.admin;
		} else if (token === USER_FIXED_JWT) {
			currentUser = currentSessions.user;
		} else {
			return res.status(401).json({ error: 'Invalid token' });
		}

		// If no session user, try to find the most recent user of this role
		if (!currentUser) {
			const allUsers = await users.all();
			if (token === SUPER_ADMIN_FIXED_JWT) {
				const kattaAdmins = allUsers.filter(u => u.role === 'katta_admin');
				if (kattaAdmins.length > 0) {
					currentUser = kattaAdmins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
					currentSessions.admin = currentUser;
				}
			} else if (token === ADMIN_FIXED_JWT) {
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
	const adminEmail = 'superadmin@gmail.com';
	const exists = await users.findOne({ email: adminEmail });
	if (!exists) {
		const passwordHash = await bcrypt.hash('admin123', 10);
		await users.insert({ name: 'Super Admin', email: adminEmail, passwordHash, role: 'katta_admin', verified: true, createdAt: new Date().toISOString() });
	}
	res.json({ ok: true });
});

// Admin management routes (Katta Admin only)
router.post('/create-admin', async (req, res) => {
	try {
		const { name, email, password, firstName, lastName, shortDesc, gender } = req.body || {};
		
		if (!email || !password) {
			return res.status(400).json({ error: 'email, password required' });
		}
		
		// Check if email already exists
		const exists = await users.findOne({ email });
		if (exists) {
			return res.status(409).json({ error: 'Email already exists' });
		}
		
		const passwordHash = await bcrypt.hash(password, 10);
		const admin = await users.insert({ 
			name: name || `${firstName || ''} ${lastName || ''}`.trim(), 
			firstName,
			lastName,
			shortDesc,
			gender: gender || 'male',
			email, 
			passwordHash, 
			role: 'admin', // Always create regular admin
			verified: true, 
			createdAt: new Date().toISOString() 
		});
		
		res.json({
			_id: admin._id,
			name: admin.name,
			firstName: admin.firstName,
			lastName: admin.lastName,
			shortDesc: admin.shortDesc,
			gender: admin.gender,
			email: admin.email,
			role: admin.role,
			createdAt: admin.createdAt
		});
	} catch (err) {
		console.error('Create admin error:', err);
		res.status(500).json({ error: 'Failed to create admin' });
	}
});

router.put('/admins/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const { email, password, firstName, lastName, shortDesc, gender } = req.body || {};
		
		const admin = await users.findOne({ _id: id });
		if (!admin) return res.status(404).json({ error: 'Admin topilmadi' });
		
		const updateData = {};
		if (email && email !== admin.email) {
			const exists = await users.findOne({ email });
			if (exists) return res.status(409).json({ error: 'Email already exists' });
			updateData.email = email;
		}
		if (password) {
			updateData.passwordHash = await bcrypt.hash(password, 10);
		}
		if (firstName !== undefined) updateData.firstName = firstName;
		if (lastName !== undefined) updateData.lastName = lastName;
		if (shortDesc !== undefined) updateData.shortDesc = shortDesc;
		if (gender !== undefined) updateData.gender = gender;
		
		if (firstName || lastName) {
			updateData.name = `${firstName || admin.firstName || ''} ${lastName || admin.lastName || ''}`.trim();
		}

		await users.update({ _id: id }, { $set: updateData });
		res.json({ ok: true });
	} catch (err) {
		console.error('Update admin error:', err);
		res.status(500).json({ error: 'Failed to update admin' });
	}
});

router.get('/users-manage', async (req, res) => {
	try {
		const allUsers = await users.all();
		const safeUsers = allUsers.map(u => ({
			_id: u._id,
			name: u.name,
			firstName: u.firstName,
			lastName: u.lastName,
			shortDesc: u.shortDesc,
			gender: u.gender,
			email: u.email,
			role: u.role,
			createdAt: u.createdAt
		}));
		res.json(safeUsers);
	} catch (err) {
		res.status(500).json({ error: 'Failed to fetch users' });
	}
});

router.get('/admins', async (req, res) => {
	try {
		const allUsers = await users.all();
		const admins = allUsers.filter(u => ['admin', 'katta_admin'].includes(u.role));
		
		const adminList = admins.map(admin => ({
			_id: admin._id,
			name: admin.name,
			email: admin.email,
			role: admin.role,
			createdAt: admin.createdAt
		}));
		
		res.json(adminList);
	} catch (err) {
		console.error('Get admins error:', err);
		res.status(500).json({ error: 'Failed to get admins' });
	}
});

router.delete('/admins/:id', async (req, res) => {
	try {
		const { id } = req.params;
		
		if (!id) {
			return res.status(400).json({ error: 'Admin ID required' });
		}
		
		// Find the admin to delete
		const admin = await users.findOne({ _id: id });
		if (!admin) {
			return res.status(404).json({ error: 'Admin not found' });
		}
		
		// Prevent deletion of katta_admin role users
		if (admin.role === 'katta_admin') {
			return res.status(403).json({ error: 'Katta Admin ni o\'chirib bo\'lmaydi' });
		}
		
		// Delete the admin
		await users.delete({ _id: id });
		
		res.json({ ok: true, message: 'Admin o\'chirildi' });
	} catch (err) {
		console.error('Delete admin error:', err);
		res.status(500).json({ error: 'Failed to delete admin' });
	}
});

module.exports = router;
