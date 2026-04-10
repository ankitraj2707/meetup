-- ============================================================
--  Commune Platform — MySQL Schema
--  Run:  mysql -u root -p < config/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS commune_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE commune_db;

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(120)        NOT NULL,
  email        VARCHAR(180)        NOT NULL UNIQUE,
  password_hash VARCHAR(255)       NOT NULL,
  avatar_emoji VARCHAR(10)         DEFAULT '👤',
  bio          TEXT,
  role         ENUM('user','organizer','admin') DEFAULT 'user',
  created_at   DATETIME            DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME            DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── EVENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organizer_id    INT UNSIGNED        NOT NULL,
  title           VARCHAR(200)        NOT NULL,
  category        ENUM(
                    'marathon',
                    'street_jam',
                    'tournament',
                    'book_club',
                    'literary_festival',
                    'group_trip',
                    'food_meetup',
                    'hobby_meetup',
                    'other'
                  ) NOT NULL DEFAULT 'other',
  event_date      DATE                NOT NULL,
  location        VARCHAR(300)        NOT NULL,
  max_participants INT UNSIGNED       DEFAULT 50,
  entry_fee       DECIMAL(10,2)       DEFAULT 0.00,
  description     TEXT,
  status          ENUM('upcoming','ongoing','completed','cancelled') DEFAULT 'upcoming',
  created_at      DATETIME            DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME            DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category  (category),
  INDEX idx_date      (event_date),
  INDEX idx_status    (status)
);

-- ─── RSVPs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rsvps (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id   INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rsvp (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- ─── SEED DATA ───────────────────────────────────────────────
-- Passwords are all: Password@123
INSERT IGNORE INTO users (id, name, email, password_hash, avatar_emoji, role) VALUES
  (1, 'Arjun Mehta', 'arjun@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '🏃', 'organizer'),
  (2, 'Priya Nair',  'priya@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '🎵', 'organizer'),
  (3, 'Kiran Desai', 'kiran@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '📚', 'organizer'),
  (4, 'Samira Rao',  'samira@example.com','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '🌿', 'organizer'),
  (5, 'Dev Sharma',  'dev@example.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '⚡', 'user');

INSERT IGNORE INTO events
  (id, organizer_id, title, category, event_date, location, max_participants, entry_fee, description, status)
VALUES
  (1, 1, 'Mumbai Dawn Marathon 2026',        'marathon',      '2026-04-20', 'Marine Drive, Mumbai',             500,   0.00, 'The city''s most scenic 21K run starting at sunrise along Marine Drive. Open to all fitness levels.', 'upcoming'),
  (2, 2, 'Koramangala Street Jam',           'street_jam',    '2026-04-19', 'Koramangala 5th Block, Bengaluru', 200, 150.00, 'Live hip-hop and indie acts taking over the street. BYO blanket. Food trucks on site.',              'upcoming'),
  (3, 3, 'Midnight Book Club — Kafka Night', 'book_club',     '2026-04-25', 'Atta Galatta, Bengaluru',           30, 200.00, 'We dig into The Trial. Bring your annotations, your hot takes, and your existential dread.',           'upcoming'),
  (4, 4, 'Coorg Group Trek',                 'group_trip',    '2026-05-03', 'Abbey Falls Trailhead, Coorg',      24, 999.00, 'A 2-day trek through misty coffee estates and waterfalls. All gear included. Beginners welcome.',      'upcoming'),
  (5, 1, 'Bandra Football Tournament',       'tournament',    '2026-04-27', 'Bandra Reclamation Ground, Mumbai', 96, 300.00, 'Six-a-side football. 16 teams compete. Cash prizes for top 3 teams. Register your squad now.',        'upcoming'),
  (6, 2, 'South Indian Street Food Crawl',   'food_meetup',   '2026-04-22', 'Matunga, Mumbai',                   40, 250.00, 'A curated walk through Matunga''s iconic Udupi joints and hidden dosas. Guided by a food historian.', 'upcoming');