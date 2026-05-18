-- ============================================================
--  Commune Platform — Payments Schema (Razorpay)
--  Run:  mysql -u root -p commune_db < payments.sql
-- ============================================================

USE commune_db;

CREATE TABLE IF NOT EXISTS payments (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED      NOT NULL,
  event_id            INT UNSIGNED      NOT NULL,
  razorpay_order_id   VARCHAR(100)      NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(100)      DEFAULT NULL,
  razorpay_signature  VARCHAR(255)      DEFAULT NULL,
  amount              DECIMAL(10,2)     NOT NULL,        -- in INR
  currency            VARCHAR(10)       NOT NULL DEFAULT 'INR',
  status              ENUM('created','paid','failed')    NOT NULL DEFAULT 'created',
  created_at          DATETIME          DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME          DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_user    (user_id),
  INDEX idx_event   (event_id),
  INDEX idx_status  (status)
);