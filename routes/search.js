const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ─── GET /api/search?q=&category=&location= ─────────────────
router.get('/', async (req, res, next) => {
  try {
    const { q = '', category, location, limit = 20, offset = 0 } = req.query;
    const searchTerm = `%${q}%`;

    let sql = `
      SELECT
        e.*,
        u.name         AS organizer_name,
        u.avatar_emoji AS organizer_avatar,
        COUNT(r.id)    AS rsvp_count
      FROM events e
      JOIN users u ON u.id = e.organizer_id
      LEFT JOIN rsvps r ON r.event_id = e.id
      WHERE e.status = 'upcoming'
        AND (
          e.title       LIKE ? OR
          e.description LIKE ? OR
          e.location    LIKE ?
        )
    `;
    const params = [searchTerm, searchTerm, searchTerm];

    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }
    if (location) {
      sql += ' AND e.location LIKE ?';
      params.push(`%${location}%`);
    }

    sql += ' GROUP BY e.id ORDER BY e.event_date ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(sql, params);

    const data = rows.map(e => ({
      ...e,
      spots_remaining: e.max_participants - (e.rsvp_count || 0),
      is_full: (e.rsvp_count || 0) >= e.max_participants,
    }));

    res.json({ data, total: rows.length, query: q });
  } catch (err) {
    next(err);
  }
});

module.exports = router;