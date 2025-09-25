// Load environment variables from .env
try { require('dotenv').config(); } catch {}

// Simple entry point to run the API with `node server.js`
// Ensures the backend starts on PORT (default 4000)
process.env.PORT = process.env.PORT || '4000';
// SMTP config will be read by routes (no-op defaults kept)
require('./index.js');
