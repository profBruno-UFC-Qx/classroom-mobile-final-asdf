package redis

import (
	"context"
	"errors"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const keyPrefix = "blacklist:jti:"

// Blacklist stores revoked JWT IDs in Redis with automatic TTL-based expiry.
type Blacklist struct {
	client *goredis.Client
}

func NewBlacklist(client *goredis.Client) *Blacklist {
	return &Blacklist{client: client}
}

// Add marks a JTI as blacklisted for the given duration.
func (b *Blacklist) Add(ctx context.Context, jti string, ttl time.Duration) error {
	if ttl <= 0 {
		return nil // token already expired — no need to store
	}
	if err := b.client.Set(ctx, keyPrefix+jti, "1", ttl).Err(); err != nil {
		return fmt.Errorf("blacklisting token: %w", err)
	}
	return nil
}

// IsBlacklisted reports whether the given JTI has been revoked.
func (b *Blacklist) IsBlacklisted(ctx context.Context, jti string) (bool, error) {
	n, err := b.client.Exists(ctx, keyPrefix+jti).Result()
	if err != nil && !errors.Is(err, goredis.Nil) {
		return false, fmt.Errorf("checking token blacklist: %w", err)
	}
	return n > 0, nil
}
