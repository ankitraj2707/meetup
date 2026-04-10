const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorizeOrganizer } = require('../middleware/auth');
const { validateEvent } = require('../middleware/validators');

// ─── Helper: spots remaining ─────────────────────────────────
const withSpots = (event) => ({
  ...event,
  spots_remaining: event.max_participants - (event.rsvp_count || 0),
  is_full: (event.rsvp_count || 0) >= event.max_participants,
});

// ─── GET /api/events ─ List all events (with optional filters) ──
router.get('/', async (req, res, next) => {
  try {
    const { category, status = 'upcoming', limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT
        e.*,
        u.name     AS organizer_name,
        u.avatar_emoji AS organizer_avatar,
        COUNT(r.id) AS rsvp_count
      FROM events e
      JOIN users u ON u.id = e.organizer_id
      LEFT JOIN rsvps r ON r.event_id = e.id
      WHERE e.status = ?
    `;
    const params = [status];

    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }

    sql += ' GROUP BY e.id ORDER BY e.event_date ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(sql, params);
    res.json({ data: rows.map(withSpots), total: rows.length });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/events/:id ─ Single event detail ───────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        e.*,
        u.name         AS organizer_name,
        u.avatar_emoji AS organizer_avatar,
        u.bio          AS organizer_bio,
        COUNT(r.id)    AS rsvp_count
      FROM events e
      JOIN users u ON u.id = e.organizer_id
      LEFT JOIN rsvps r ON r.event_id = e.id
      WHERE e.id = ?
      GROUP BY e.id
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json({ data: withSpots(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/events ─ Create a new event ───────────────────
router.post('/', authenticate, authorizeOrganizer, validateEvent, async (req, res, next) => {
  try {
    const {
      title, category, event_date, location,
      max_participants = 50, entry_fee = 0, description,
    } = req.body;

    const [result] = await db.query(`
      INSERT INTO events
        (organizer_id, title, category, event_date, location, max_participants, entry_fee, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, title, category, event_date, location, max_participants, entry_fee, description]);

    res.status(201).json({
      message: 'Event created successfully',
      data: { id: result.insertId },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/events/:id ─ Update event ──────────────────────
router.put('/:id', authenticate, authorizeOrganizer, validateEvent, async (req, res, next) => {
  try {
    const { title, category, event_date, location, max_participants, entry_fee, description, status } = req.body;

    // Only the event's own organizer (or admin) can update
    const [check] = await db.query('SELECT organizer_id FROM events WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ error: 'Event not found' });
    if (check[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: not your event' });
    }

    await db.query(`
      UPDATE events
      SET title=?, category=?, event_date=?, location=?, max_participants=?, entry_fee=?, description=?, status=?
      WHERE id=?
    `, [title, category, event_date, location, max_participants, entry_fee, description, status || 'upcoming', req.params.id]);

    res.json({ message: 'Event updated successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/events/:id ─ Cancel/delete event ────────────
router.delete('/:id', authenticate, authorizeOrganizer, async (req, res, next) => {
  try {
    const [check] = await db.query('SELECT organizer_id FROM events WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ error: 'Event not found' });
    if (check[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: not your event' });
    }

    await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;