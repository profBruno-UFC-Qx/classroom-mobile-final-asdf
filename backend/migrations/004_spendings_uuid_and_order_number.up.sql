CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add new UUID column alongside the old integer id
ALTER TABLE spendings ADD COLUMN new_id UUID NOT NULL DEFAULT gen_random_uuid();

-- Add order_number column (will be backfilled to 0 for existing rows)
ALTER TABLE spendings ADD COLUMN order_number INT NOT NULL DEFAULT 0;

-- Swap primary key from old integer id → UUID
ALTER TABLE spendings DROP CONSTRAINT spendings_pkey;
ALTER TABLE spendings DROP COLUMN id;
ALTER TABLE spendings RENAME COLUMN new_id TO id;
ALTER TABLE spendings ADD PRIMARY KEY (id);
