const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

function filePath(name) {
	return path.join(dataDir, `${name}.json`);
}

function readAll(name) {
	const p = filePath(name);
	if (!fs.existsSync(p)) return [];
	try {
		const txt = fs.readFileSync(p, 'utf-8');
		return txt ? JSON.parse(txt) : [];
	} catch (e) {
		return [];
	}
}

function writeAll(name, arr) {
	const p = filePath(name);
	fs.writeFileSync(p, JSON.stringify(arr, null, 2), 'utf-8');
}

function makeId() {
	return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function collection(name) {
	return {
		async find(query = {}) {
			const all = readAll(name);
			return all.filter(doc => Object.keys(query).every(k => doc[k] === query[k]));
		},
		async findOne(query = {}) {
			const all = readAll(name);
			return all.find(doc => Object.keys(query).every(k => doc[k] === query[k])) || null;
		},
		async insert(doc) {
			const all = readAll(name);
			const toSave = { _id: makeId(), ...doc };
			all.push(toSave);
			writeAll(name, all);
			return toSave;
		},
		async update(where, { $set }) {
			const all = readAll(name);
			let updated = 0;
			for (let i = 0; i < all.length; i++) {
				const match = Object.keys(where).every(k => all[i][k] === where[k]);
				if (match) {
					all[i] = { ...all[i], ...$set };
					updated++;
				}
			}
			if (updated) writeAll(name, all);
			return updated;
		},
		async remove(where) {
			const all = readAll(name);
			const remain = all.filter(doc => !Object.keys(where).every(k => doc[k] === where[k]));
			const removed = all.length - remain.length;
			if (removed) writeAll(name, remain);
			return removed;
		},
		async all() {
			return readAll(name);
		}
	};
}

const users = collection('users');
const services = collection('services');
const orders = collection('orders');
const notifications = collection('notifications');

module.exports = { users, services, orders, notifications };
