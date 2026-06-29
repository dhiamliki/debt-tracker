CREATE TABLE saved_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  monthly_budget DECIMAL(15,2) NOT NULL,
  debts_snapshot JSONB NOT NULL,
  snowball_result JSONB,
  avalanche_result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
