const VALID_CATEGORIES = [
  'marathon', 'street_jam', 'tournament', 'book_club',
  'literary_festival', 'group_trip', 'food_meetup', 'hobby_meetup', 'other',
];

/**
 * validateEvent — checks required fields for create/update event.
 */
function validateEvent(req, res, next) {
  const { title, category, event_date, location } = req.body;
  const errors = [];

  if (!title || title.trim().length < 3) errors.push('title must be at least 3 characters');
  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!event_date || isNaN(Date.parse(event_date))) errors.push('event_date must be a valid date (YYYY-MM-DD)');
  if (!location || location.trim().length < 3) errors.push('location is required');

  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  next();
}

/**
 * validateUser — basic checks for user registration.
 */
function validateUser(req, res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) errors.push('name must be at least 2 characters');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('valid email is required');
  if (!password || password.length < 6) errors.push('password must be at least 6 characters');

  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  next();
}

module.exports = { validateEvent, validateUser };
