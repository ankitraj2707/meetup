const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// ─── Razorpay client ──────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.rzp_test_Sm9mJrNhes6e9u,
  key_secret: process.env.Hi961Wc6EobsEDX8dLb2fv8t,
});

// ─── POST /api/payments/create-order ─────────────────────────
// Creates a Razorpay order for a paid event
router.post('/create-order', authenticate, async (req, res, next) => {
  try {
    const { event_id } = req.body;
    const userId = req.user.id;

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    // Fetch event
    const [events] = await db.query(`
      SELECT e.id, e.title, e.entry_fee, e.status, e.max_participants, COUNT(r.id) AS rsvp_count
      FROM events e
      LEFT JOIN rsvps r ON r.event_id = e.id
      WHERE e.id = ?
      GROUP BY e.id
    `, [event_id]);

    if (!events.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];

    if (event.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot pay for a non-upcoming event' });
    }

    if (parseFloat(event.entry_fee) === 0) {
      return res.status(400).json({ error: 'This event is free. Use the RSVP endpoint instead.' });
    }

    if (event.rsvp_count >= event.max_participants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Check if already RSVPed
    const [existingRsvp] = await db.query(
      'SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?',
      [event_id, userId]
    );
    if (existingRsvp.length) {
      return res.status(409).json({ error: 'You are already registered for this event' });
    }

    // Check if a pending order already exists
    const [existingOrder] = await db.query(
      `SELECT razorpay_order_id FROM payments
       WHERE event_id = ? AND user_id = ? AND status = 'created'`,
      [event_id, userId]
    );
    if (existingOrder.length) {
      return res.json({
        message: 'Pending order already exists',
        order_id: existingOrder[0].razorpay_order_id,
        amount: Math.round(parseFloat(event.entry_fee) * 100),
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY_ID,
      });
    }

    // Create Razorpay order (amount in paise)
    const amountPaise = Math.round(parseFloat(event.entry_fee) * 100);
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `evt_${event_id}_usr_${userId}_${Date.now()}`,
      notes: {
        event_id: String(event_id),
        user_id:  String(userId),
        event_title: event.title,
      },
    });

    // Store the order in DB
    await db.query(
      `INSERT INTO payments (user_id, event_id, razorpay_order_id, amount, currency, status)
       VALUES (?, ?, ?, ?, 'INR', 'created')`,
      [userId, event_id, order.id, event.entry_fee]
    );

    res.status(201).json({
      message:   'Order created',
      order_id:  order.id,
      amount:    amountPaise,
      currency:  'INR',
      key_id:    process.env.RAZORPAY_KEY_ID,
      event:     { id: event.id, title: event.title },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/payments/verify ────────────────────────────────
// Verifies Razorpay signature, marks payment paid, auto-RSVPs user
router.post('/verify', authenticate, async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required' });
    }

    // Fetch our stored payment record
    const [payments] = await db.query(
      `SELECT * FROM payments WHERE razorpay_order_id = ? AND user_id = ?`,
      [razorpay_order_id, req.user.id]
    );

    if (!payments.length) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = payments[0];

    if (payment.status === 'paid') {
      return res.status(409).json({ error: 'Payment already verified and RSVP confirmed' });
    }

    // Verify signature:  HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Mark as failed
      await db.query(
        `UPDATE payments SET status = 'failed' WHERE razorpay_order_id = ?`,
        [razorpay_order_id]
      );
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Update payment record to paid
    await db.query(
      `UPDATE payments
       SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'paid'
       WHERE razorpay_order_id = ?`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // Auto-RSVP the user (ignore if already exists due to race condition)
    await db.query(
      `INSERT IGNORE INTO rsvps (event_id, user_id) VALUES (?, ?)`,
      [payment.event_id, payment.user_id]
    );

    // Fetch event title for response
    const [events] = await db.query('SELECT title FROM events WHERE id = ?', [payment.event_id]);
    const eventTitle = events.length ? events[0].title : 'the event';

    res.json({
      message: `Payment verified! You're registered for "${eventTitle}".`,
      data: {
        event_id:           payment.event_id,
        user_id:            payment.user_id,
        razorpay_order_id,
        razorpay_payment_id,
        amount:             payment.amount,
        currency:           payment.currency,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/payments/my ─────────────────────────────────────
// List all payments made by the authenticated user
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.id, p.razorpay_order_id, p.razorpay_payment_id,
        p.amount, p.currency, p.status, p.created_at,
        e.id AS event_id, e.title AS event_title,
        e.event_date, e.location, e.category
      FROM payments p
      JOIN events e ON e.id = p.event_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    res.json({ data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/payments/event/:eventId ────────────────────────
// List all payments for an event (organizer/admin only)
router.get('/event/:eventId', authenticate, async (req, res, next) => {
  try {
    const eventId = req.params.eventId;

    const [events] = await db.query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
    if (!events.length) return res.status(404).json({ error: 'Event not found' });
    if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: organizer access only' });
    }

    const [rows] = await db.query(`
      SELECT
        p.id, p.razorpay_order_id, p.razorpay_payment_id,
        p.amount, p.currency, p.status, p.created_at,
        u.id AS user_id, u.name AS user_name, u.email AS user_email, u.avatar_emoji
      FROM payments p
      JOIN users u ON u.id = p.user_id
      WHERE p.event_id = ? AND p.status = 'paid'
      ORDER BY p.created_at ASC
    `, [eventId]);

    res.json({ data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;