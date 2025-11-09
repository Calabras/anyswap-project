-- lib/db/migrations/003_add_admin_and_roles.sql
-- Add admin user and role management

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create admin user (password hash for "admin123" with bcrypt)
-- Password: admin123
-- Generate hash using: bcrypt.hashSync('admin123', 12)
INSERT INTO users (
  email, 
  password_hash, 
  email_verified, 
  auth_type, 
  is_admin,
  nickname,
  created_at
) VALUES (
  'maksimgorkij21@gmail.com',
  '$2a$12$HRddm2QPegbiOtS0sAD81eqkii8e.Z1JHBGVFJ/nl2NjDIW4K8oNC', -- admin123
  TRUE,
  'email',
  TRUE,
  'admin',
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET is_admin = TRUE, email_verified = TRUE;

-- Create index for admin users
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

