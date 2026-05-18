const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendOtpEmail } = require('../config/mailer');
const { authenticate } = require('../middleware/auth');

const SALT_ROUNDS = 10;
const JWT_SECRET  = process.env.JWT_SECRET  || 'commune_super_secret_change_in_prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const OTP_TTL_MIN = 10;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

async function sendNewOtp(email, name) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  await db.query('UPDATE otp_verifications SET used = 1 WHERE email = ?', [email]);
  await db.query(
    'INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)',
    [email, otp, expiresAt]
  );
  if (!name) {
    const [rows] = await db.query('SELECT name FROM users WHERE email = ?', [email]);
    name = rows.length ? rows[0].name : 'there';
  }
  await sendOtpEmail(email, name, otp);
}

// ─── POST /api/users/register ────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, avatar_emoji = '👤', role = 'user' } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email, and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'password must be at least 6 characters' });

    const [existing] = await db.query('SELECT id, email_verified FROM users WHERE email = ?', [email]);
    if (existing.length) {
      if (!existing[0].email_verified) {
        await sendNewOtp(email, name);
        return res.status(200).json({
          needsVerification: true,
          message: 'Account exists but email not verified. A new OTP has been sent.',
        });
      }
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const safeRole = ['user', 'organizer'].includes(role) ? role : 'user';

    await db.query(
      'INSERT INTO users (name, email, password_hash, avatar_emoji, role, email_verified) VALUES (?, ?, ?, ?, ?, 0)',
      [name, email, password_hash, avatar_emoji, safeRole]
    );

    await sendNewOtp(email, name);

    res.status(201).json({
      needsVerification: true,
      message: 'Account created! Check your email for a 6-digit verification code.',
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/users/verify-otp ──────────────────────────────
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'email and otp are required' });

    const [otpRows] = await db.query(
      `SELECT * FROM otp_verifications
       WHERE email = ? AND otp = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp.toString().trim()]
    );

    if (!otpRows.length)
      return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });

    await db.query('UPDATE otp_verifications SET used = 1 WHERE id = ?', [otpRows[0].id]);
    await db.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);

    const [users] = await db.query(
      'SELECT id, name, email, avatar_emoji, role FROM users WHERE email = ?', [email]
    );
    const user = users[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      message: 'Email verified! Welcome to Commune.',
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar_emoji: user.avatar_emoji, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/users/resend-otp ──────────────────────────────
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const [users] = await db.query('SELECT name, email_verified FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(404).json({ error: 'No account found for this email' });
    if (users[0].email_verified) return res.status(400).json({ error: 'Email already verified' });

    await sendNewOtp(email, users[0].name);
    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/users/login ───────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.email_verified) {
      await sendNewOtp(email, user.name);
      return res.status(403).json({
        error: 'Email not verified',
        needsVerification: true,
        message: 'Please verify your email. A new OTP has been sent.',
      });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar_emoji: user.avatar_emoji, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/users/me ───────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, avatar_emoji, bio, role, email_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!users.length) return res.status(404).json({ error: 'User not found' });

    const [events] = await db.query(`
      SELECT e.id, e.title, e.category, e.event_date, e.status, COUNT(r.id) AS rsvp_count
      FROM events e LEFT JOIN rsvps r ON r.event_id = e.id
      WHERE e.organizer_id = ? GROUP BY e.id ORDER BY e.event_date DESC
    `, [req.user.id]);

    const [rsvps] = await db.query(`
      SELECT e.id, e.title, e.category, e.event_date, e.location, e.status
      FROM rsvps rv JOIN events e ON e.id = rv.event_id
      WHERE rv.user_id = ? ORDER BY e.event_date ASC
    `, [req.user.id]);

    res.json({ data: { ...users[0], events_organized: events, events_rsvped: rsvps } });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/users/me ───────────────────────────────────────
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { name, bio, avatar_emoji } = req.body;
    await db.query('UPDATE users SET name=?, bio=?, avatar_emoji=? WHERE id=?',
      [name, bio, avatar_emoji, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/users/:id ──────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, avatar_emoji, bio, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!users.length) return res.status(404).json({ error: 'User not found' });

    const [events] = await db.query(`
      SELECT e.id, e.title, e.category, e.event_date, e.status
      FROM events e WHERE e.organizer_id = ? AND e.status = 'upcoming'
      ORDER BY e.event_date ASC LIMIT 10
    `, [req.params.id]);

    res.json({ data: { ...users[0], upcoming_events: events } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;