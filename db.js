const Datastore = require('nedb-promises');
const path = require('path');

const dbDir = path.join(__dirname, 'data');

const users = Datastore.create({ filename: path.join(dbDir, 'users.db'), autoload: true });
const services = Datastore.create({ filename: path.join(dbDir, 'services.db'), autoload: true });
const orders = Datastore.create({ filename: path.join(dbDir, 'orders.db'), autoload: true });

users.ensureIndex({ fieldName: 'email', unique: true });
services.ensureIndex({ fieldName: 'slug', unique: true });
orders.ensureIndex({ fieldName: 'createdAt' });

module.exports = { users, services, orders };
