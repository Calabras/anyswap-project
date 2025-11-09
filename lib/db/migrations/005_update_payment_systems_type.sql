-- lib/db/migrations/005_update_payment_systems_type.sql
-- Update payment_systems type constraint to include 'test'

-- Drop existing constraint
ALTER TABLE payment_systems DROP CONSTRAINT IF EXISTS payment_systems_type_check;

-- Add new constraint with 'test' type
ALTER TABLE payment_systems ADD CONSTRAINT payment_systems_type_check 
  CHECK (type IN ('cryptomus', 'vanilapay', 'wallet', 'test'));

