ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Treat all pre-existing users as already verified.
UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL;
