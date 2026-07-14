package redis_test

import (
	"context"
	"testing"
	"time"

	platformredis "cofi-finance/backend/internal/platform/redis"
	"cofi-finance/backend/internal/domain"

	"github.com/alicebob/miniredis/v2"
	goredis "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestVerificationStore(t *testing.T) (*platformredis.VerificationStore, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := goredis.NewClient(&goredis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { client.Close() })
	return platformredis.NewVerificationStore(client), mr
}

func TestVerificationStore_StoreToken(t *testing.T) {
	store, _ := newTestVerificationStore(t)

	err := store.StoreToken(context.Background(), "tok-abc", 42, time.Hour)
	require.NoError(t, err)

	userID, err := store.GetUserID(context.Background(), "tok-abc")
	require.NoError(t, err)
	assert.Equal(t, int64(42), userID)
}

func TestVerificationStore_GetUserID(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(store *platformredis.VerificationStore, mr *miniredis.Miniredis)
		token     string
		wantID    int64
		wantErr   error
	}{
		{
			name: "returns userID for valid token",
			setup: func(store *platformredis.VerificationStore, _ *miniredis.Miniredis) {
				require.NoError(t, store.StoreToken(context.Background(), "valid", 7, time.Hour))
			},
			token:  "valid",
			wantID: 7,
		},
		{
			name:    "returns ErrNotFound for unknown token",
			setup:   func(_ *platformredis.VerificationStore, _ *miniredis.Miniredis) {},
			token:   "unknown",
			wantErr: domain.ErrNotFound,
		},
		{
			name: "returns ErrNotFound after TTL expires",
			setup: func(store *platformredis.VerificationStore, mr *miniredis.Miniredis) {
				require.NoError(t, store.StoreToken(context.Background(), "expiring", 99, time.Second))
				mr.FastForward(2 * time.Second)
			},
			token:   "expiring",
			wantErr: domain.ErrNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store, mr := newTestVerificationStore(t)
			tc.setup(store, mr)

			gotID, err := store.GetUserID(context.Background(), tc.token)

			if tc.wantErr != nil {
				assert.ErrorIs(t, err, tc.wantErr)
				assert.Zero(t, gotID)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.wantID, gotID)
			}
		})
	}
}

func TestVerificationStore_DeleteToken(t *testing.T) {
	store, _ := newTestVerificationStore(t)

	require.NoError(t, store.StoreToken(context.Background(), "del-tok", 5, time.Hour))

	require.NoError(t, store.DeleteToken(context.Background(), "del-tok"))

	_, err := store.GetUserID(context.Background(), "del-tok")
	assert.ErrorIs(t, err, domain.ErrNotFound)
}
