CREATE TABLE IF NOT EXISTS spendings (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       NUMERIC(12,2) NOT NULL,
    observation TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spendings_user_id ON spendings (user_id);
CREATE INDEX IF NOT EXISTS idx_spendings_user_created ON spendings (user_id, created_at);
