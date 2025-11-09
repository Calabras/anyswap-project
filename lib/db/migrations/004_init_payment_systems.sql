-- lib/db/migrations/004_init_payment_systems.sql
-- Initialize default payment systems

-- Note: This migration should run after 005_update_payment_systems_type.sql
-- which adds 'test' to the allowed types

INSERT INTO payment_systems (name, type, is_active, created_at) VALUES
  ('Cryptomus', 'cryptomus', TRUE, CURRENT_TIMESTAMP),
  ('Russian Bank Cards', 'vanilapay', TRUE, CURRENT_TIMESTAMP),
  ('Wallet', 'wallet', TRUE, CURRENT_TIMESTAMP),
  ('Test Payment', 'test', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

