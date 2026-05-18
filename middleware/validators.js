// ─── validateEvent ────────────────────────────────────────────
// Validates required fields before creating / updating an event
function validateEvent(req, res, next) {
  const { title, category, event_date, location } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('title is required');
  }

  const VALID_CATEGORIES = [
    'marathon', 'street_jam', 'tournament', 'book_club',
    'literary_festival', 'group_trip', 'food_meetup', 'hobby_meetup', 'coding_competition', 'other',
  ];
  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (!event_date) {
    errors.push('event_date is required');
  } else {
    const d = new Date(event_date);
    if (isNaN(d.getTime())) errors.push('event_date must be a valid date');
  }

  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    errors.push('location is required');
  }

  if (errors.length) {
    return res.status(400).json({ error: errors.join('; ') });
  }

  next();
}

module.exports = { validateEvent };