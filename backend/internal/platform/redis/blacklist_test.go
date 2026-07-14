package redis_test

import (
	"context"
	"testing"
	"time"

	platformredis "cofi-finance/backend/internal/platform/redis"

	"github.com/alicebob/miniredis/v2"
	goredis "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestBlacklist(t *testing.T) (*platformredis.Blacklist, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := goredis.NewClient(&goredis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { client.Close() })
	return platformredis.NewBlacklist(client), mr
}

func TestBlacklist_Add(t *testing.T) {
	tests := []struct {
		name    string
		jti     string
		ttl     time.Duration
		wantSet bool
	}{
		{
			name:    "stores jti with positive ttl",
			jti:     "abc-123",
			ttl:     time.Hour,
			wantSet: true,
		},
		{
			name:    "no-ops on zero ttl",
			jti:     "zero-ttl",
			ttl:     0,
			wantSet: false,
		},
		{
			name:    "no-ops on negative ttl",
			jti:     "neg-ttl",
			ttl:     -time.Second,
			wantSet: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			bl, _ := newTestBlacklist(t)
			err := bl.Add(context.Background(), tc.jti, tc.ttl)
			require.NoError(t, err)

			got, err := bl.IsBlacklisted(context.Background(), tc.jti)
			require.NoError(t, err)
			assert.Equal(t, tc.wantSet, got)
		})
	}
}

func TestBlacklist_IsBlacklisted(t *testing.T) {
	tests := []struct {
		name     string
		setup    func(bl *platformredis.Blacklist, mr *miniredis.Miniredis)
		jti      string
		wantBool bool
	}{
		{
			name: "returns true for blacklisted jti",
			setup: func(bl *platformredis.Blacklist, _ *miniredis.Miniredis) {
				require.NoError(t, bl.Add(context.Background(), "listed", time.Hour))
			},
			jti:      "listed",
			wantBool: true,
		},
		{
			name:     "returns false for unknown jti",
			setup:    func(_ *platformredis.Blacklist, _ *miniredis.Miniredis) {},
			jti:      "unknown",
			wantBool: false,
		},
		{
			name: "returns false after ttl expires",
			setup: func(bl *platformredis.Blacklist, mr *miniredis.Miniredis) {
				require.NoError(t, bl.Add(context.Background(), "expired", time.Second))
				mr.FastForward(2 * time.Second)
			},
			jti:      "expired",
			wantBool: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			bl, mr := newTestBlacklist(t)
			tc.setup(bl, mr)

			got, err := bl.IsBlacklisted(context.Background(), tc.jti)
			require.NoError(t, err)
			assert.Equal(t, tc.wantBool, got)
		})
	}
}
