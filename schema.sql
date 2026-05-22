-- Run this in MySQL to set up the commune_db database
-- mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS commune_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE commune_db;

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,
  avatar_emoji   VARCHAR(10)   DEFAULT '👤',
  bio            TEXT,
  role           ENUM('user', 'organizer', 'admin') DEFAULT 'user',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── EVENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  organizer_id     INT NOT NULL,
  title            VARCHAR(200) NOT NULL,
  category         ENUM('marathon','street_jam','tournament','book_club','literary_festival','group_trip','food_meetup','hobby_meetup','coding_competition','other') NOT NULL,
  event_date       DATETIME NOT NULL,
  location         VARCHAR(200) NOT NULL,
  description      TEXT,
  max_participants INT DEFAULT 50,
  entry_fee        DECIMAL(10,2) DEFAULT 0.00,
  status           ENUM('upcoming','ongoing','completed','cancelled') DEFAULT 'upcoming',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── RSVPS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rsvps (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  event_id   INT NOT NULL,
  user_id    INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rsvp (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- ─── SAMPLE DATA (optional — remove if not needed) ───────────
INSERT IGNORE INTO users (name, email, password_hash, avatar_emoji, role) VALUES
('Demo Organizer', 'organizer@commune.dev', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '🎯', 'organizer');
-- password for demo account is: password

INSERT IGNORE INTO events (organizer_id, title, category, event_date, location, description, max_participants, entry_fee, status) VALUES
(1, 'Sunrise Marathon 2026', 'marathon', DATE_ADD(NOW(), INTERVAL 7 DAY), 'Jubilee Park, Jamshedpur', 'Join us for a morning run through the city. All fitness levels welcome!', 100, 0.00, 'upcoming'),
(1, 'Jam Street Fest', 'street_jam', DATE_ADD(NOW(), INTERVAL 14 DAY), 'Main Chowk, Bistupur', 'An open-air music festival featuring local bands and artists.', 200, 50.00, 'upcoming'),
(1, 'Chapters & Chai Book Club', 'book_club', DATE_ADD(NOW(), INTERVAL 21 DAY), 'City Library, Jamshedpur', 'Monthly book discussion over chai. This month: The God of Small Things.', 20, 0.00, 'upcoming');