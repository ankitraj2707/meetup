const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const eventRoutes   = require('./routes/events');
const userRoutes    = require('./routes/users');
const rsvpRoutes    = require('./routes/rsvps');
const searchRoutes  = require('./routes/search');
const paymentRoutes = require('./routes/payments');  // ← NEW

const app = express();
const PORT = process.env.PORT || 5502;

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── SERVE FRONTEND (static) ─────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API ROUTES ──────────────────────────────────────────────
app.use('/api/events',   eventRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/rsvps',    rsvpRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/payments', paymentRoutes);  // ← NEW

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── SPA FALLBACK ────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ─── START (with DB check) ───────────────────────────────────
async function start() {
  try {
    await db.query('SELECT 1');
    console.log('✅  Database connected successfully');
  } catch (err) {
    console.error('❌  Database connection failed:', err.message);
    console.error('    Check your .env file — DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n✅  Commune is running!`);
    console.log(`👉  Open your browser at: http://localhost:${PORT}\n`);
  });
}

start();
module.exports = app;