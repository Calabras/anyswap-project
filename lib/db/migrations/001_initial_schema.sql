-- lib/db/migrations/001_initial_schema.sql
-- Initial database schema for AnySwap platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  wallet_address VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_code VARCHAR(6),
  email_verification_expires TIMESTAMP,
  auth_type VARCHAR(20) NOT NULL CHECK (auth_type IN ('email', 'wallet')),
  balance_usd DECIMAL(20, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  ip_address VARCHAR(45),
  is_active BOOLEAN DEFAULT TRUE,
  is_banned BOOLEAN DEFAULT FALSE
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role)
);

-- Liquidity pools table
CREATE TABLE IF NOT EXISTS liquidity_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_address VARCHAR(255) NOT NULL UNIQUE,
  network VARCHAR(50) NOT NULL,
  token0_symbol VARCHAR(20) NOT NULL,
  token1_symbol VARCHAR(20) NOT NULL,
  token0_address VARCHAR(255) NOT NULL,
  token1_address VARCHAR(255) NOT NULL,
  fee_tier INTEGER NOT NULL,
  tvl_usd DECIMAL(20, 2) DEFAULT 0.00,
  volume_24h_usd DECIMAL(20, 2) DEFAULT 0.00,
  fees_24h_usd DECIMAL(20, 2) DEFAULT 0.00,
  apr DECIMAL(10, 4) DEFAULT 0.00,
  version VARCHAR(10) NOT NULL DEFAULT 'v3',
  is_active BOOLEAN DEFAULT TRUE,
  uniswap_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User positions table
CREATE TABLE IF NOT EXISTS user_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
  position_id VARCHAR(255) UNIQUE,
  amount_usd DECIMAL(20, 2) NOT NULL,
  min_price DECIMAL(30, 10),
  max_price DECIMAL(30, 10),
  is_full_range BOOLEAN DEFAULT FALSE,
  collected_fees_usd DECIMAL(20, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'position_open', 'position_close', 'fee_collection')),
  amount_usd DECIMAL(20, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50),
  currency VARCHAR(20),
  wallet_address VARCHAR(255),
  transaction_hash VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(20) NOT NULL,
  network VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  amount_usd DECIMAL(20, 2) NOT NULL,
  commission_percent DECIMAL(5, 2) DEFAULT 3.00,
  total_amount DECIMAL(20, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  admin_notes TEXT,
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- Payment systems table
CREATE TABLE IF NOT EXISTS payment_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('cryptomus', 'vanilapay', 'wallet', 'test')),
  is_active BOOLEAN DEFAULT TRUE,
  api_key TEXT,
  api_secret TEXT,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_liquidity_pools_network ON liquidity_pools(network);
CREATE INDEX IF NOT EXISTS idx_liquidity_pools_is_active ON liquidity_pools(is_active);
CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_pool_id ON user_positions(pool_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_status ON user_positions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

