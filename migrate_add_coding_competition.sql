-- ============================================================
--  Migration: Add 'coding_competition' category to events
--  Run against your existing commune_db:
--    mysql -u root -p commune_db < migrate_add_coding_competition.sql
-- ============================================================

USE commune_db;

ALTER TABLE events
  MODIFY COLUMN category ENUM(
    'marathon',
    'street_jam',
    'tournament',
    'book_club',
    'literary_festival',
    'group_trip',
    'food_meetup',
    'hobby_meetup',
    'coding_competition',
    'other'
  ) NOT NULL DEFAULT 'other';