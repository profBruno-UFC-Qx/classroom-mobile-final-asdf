package redis

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"cofi-finance/backend/internal/domain"

	goredis "github.com/redis/go-redis/v9"
)

const verifKeyPrefix = "verif:token:"

// VerificationStore stores one-time email verification tokens in Redis with TTL-based expiry.
type VerificationStore struct {
	client *goredis.Client
}

func NewVerificationStore(client *goredis.Client) *VerificationStore {
	return &VerificationStore{client: client}
}

// StoreToken persists token → userID with the given TTL.
func (s *VerificationStore) StoreToken(ctx context.Context, token string, userID int64, ttl time.Duration) error {
	if err := s.client.Set(ctx, verifKeyPrefix+token, userID, ttl).Err(); err != nil {
		return fmt.Errorf("storing verification token: %w", err)
	}
	return nil
}

// GetUserID retrieves the user ID associated with the token.
// Returns domain.ErrNotFound if the token is absent or has expired.
func (s *VerificationStore) GetUserID(ctx context.Context, token string) (int64, error) {
	val, err := s.client.Get(ctx, verifKeyPrefix+token).Result()
	if errors.Is(err, goredis.Nil) {
		return 0, domain.ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("getting verification token: %w", err)
	}
	userID, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parsing user ID from verification token: %w", err)
	}
	return userID, nil
}

// DeleteToken removes the token so it cannot be reused.
func (s *VerificationStore) DeleteToken(ctx context.Context, token string) error {
	if err := s.client.Del(ctx, verifKeyPrefix+token).Err(); err != nil {
		return fmt.Errorf("deleting verification token: %w", err)
	}
	return nil
}
