const express = require('express');
const { services } = require('./jsondb');

const router = express.Router();

router.get('/', async (req, res) => {
	const list = await services.all();
	list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
	res.json(list);
});

router.post('/', async (req, res) => {
	try {
		const { name, description, price, slug, videoSrc, person, rating, gender } = req.body || {};
		if (!name) return res.status(400).json({ error: 'name required' });
		const now = new Date().toISOString();
		const svc = await services.insert({ 
			name, 
			description, 
			price, 
			slug, 
			videoSrc, 
			person, 
			rating, 
			gender: gender || 'all', // 'male', 'female', or 'all'
			createdAt: now, 
			updatedAt: now 
		});
		res.status(201).json(svc);
	} catch (err) {
		res.status(500).json({ error: 'Create failed' });
	}
});

router.put('/:id', async (req, res) => {
	try {
		const id = req.params.id;
		const update = { ...req.body, updatedAt: new Date().toISOString() };
		const num = await services.update({ _id: id }, { $set: update });
		if (!num) return res.status(404).json({ error: 'Not found' });
		const docList = await services.all();
		const doc = docList.find(x => x._id === id);
		res.json(doc);
	} catch (err) {
		res.status(500).json({ error: 'Update failed' });
	}
});

router.delete('/:id', async (req, res) => {
	try {
		const id = req.params.id;
		const num = await services.remove({ _id: id });
		if (!num) return res.status(404).json({ error: 'Not found' });
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: 'Delete failed' });
	}
});

module.exports = router;
