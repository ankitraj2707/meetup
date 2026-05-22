-- Run this in MySQL to add OTP support
-- mysql -u root -p commune_db, then: source otp_schema.sql

USE commune_db;

-- Add email_verified column to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) NOT NULL DEFAULT 0;

-- OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150) NOT NULL,
  otp        VARCHAR(6)   NOT NULL,
  expires_at DATETIME     NOT NULL,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_expires (expires_at)
);