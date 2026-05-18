const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// ─── POST /api/rsvps/:eventId ─ RSVP to a FREE event ────────
router.post('/:eventId', authenticate, async (req, res, next) => {
  try {
    const eventId = Number(req.params.eventId);
    const userId = req.user.id;

    const [events] = await db.query(`
      SELECT e.id, e.title, e.max_participants, e.status, e.entry_fee, COUNT(r.id) AS rsvp_count
      FROM events e
      LEFT JOIN rsvps r ON r.event_id = e.id
      WHERE e.id = ?
      GROUP BY e.id
    `, [eventId]);

    if (!events.length) return res.status(404).json({ error: 'Event not found' });

    const event = events[0];

    if (event.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot RSVP to a non-upcoming event' });
    }

    // ── Block RSVP for paid events — must go through /api/payments ──
    if (parseFloat(event.entry_fee) > 0) {
      return res.status(400).json({
        error: `This event has an entry fee of ₹${parseFloat(event.entry_fee).toFixed(2)}. Please complete payment at /api/payments/create-order to register.`,
      });
    }

    if (event.rsvp_count >= event.max_participants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    const [existing] = await db.query(
      'SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Already RSVPed to this event' });
    }

    await db.query(
      'INSERT INTO rsvps (event_id, user_id) VALUES (?, ?)',
      [eventId, userId]
    );

    res.status(201).json({
      message: `You're registered for "${event.title}"!`,
      data: { event_id: eventId, user_id: userId },
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/rsvps/:eventId ─ Cancel RSVP ───────────────
router.delete('/:eventId', authenticate, async (req, res, next) => {
  try {
    const [result] = await db.query(
      'DELETE FROM rsvps WHERE event_id = ? AND user_id = ?',
      [req.params.eventId, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No RSVP found to cancel' });
    }
    res.json({ message: 'RSVP cancelled' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rsvps/:eventId ─ List attendees (organizer only) ─
router.get('/:eventId', authenticate, async (req, res, next) => {
  try {
    const eventId = req.params.eventId;

    const [events] = await db.query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
    if (!events.length) return res.status(404).json({ error: 'Event not found' });
    if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: organizer access only' });
    }

    const [attendees] = await db.query(`
      SELECT u.id, u.name, u.email, u.avatar_emoji, r.created_at AS rsvp_at
      FROM rsvps r
      JOIN users u ON u.id = r.user_id
      WHERE r.event_id = ?
      ORDER BY r.created_at ASC
    `, [eventId]);

    res.json({ data: attendees, total: attendees.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;