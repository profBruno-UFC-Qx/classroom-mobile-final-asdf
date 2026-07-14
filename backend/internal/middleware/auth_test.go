package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cofi-finance/backend/internal/middleware"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testSecret = "test-secret"

// mockBlacklist is a test double for middleware.BlacklistChecker.
type mockBlacklist struct {
	blacklisted bool
	err         error
}

func (m *mockBlacklist) IsBlacklisted(_ context.Context, _ string) (bool, error) {
	return m.blacklisted, m.err
}

func makeToken(secret string, claims jwt.MapClaims) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		panic(err)
	}
	return signed
}

func TestAuthenticate(t *testing.T) {
	validToken := makeToken(testSecret, jwt.MapClaims{
		"sub":   float64(42),
		"email": "user@example.com",
		"jti":   "test-jti-valid",
		"exp":   time.Now().Add(time.Hour).Unix(),
	})
	expiredToken := makeToken(testSecret, jwt.MapClaims{
		"sub": float64(42),
		"jti": "test-jti-expired",
		"exp": time.Now().Add(-time.Hour).Unix(),
	})
	wrongSignatureToken := makeToken("other-secret", jwt.MapClaims{
		"sub": float64(42),
		"jti": "test-jti-wrong-sig",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	noJTIToken := makeToken(testSecret, jwt.MapClaims{
		"sub": float64(42),
		"exp": time.Now().Add(time.Hour).Unix(),
	})

	tests := []struct {
		name            string
		authHeader      string
		blacklist       *mockBlacklist
		wantStatus      int
		wantUserID      int64
		wantPassThrough bool
	}{
		{
			name:       "401 when no authorization header",
			authHeader: "",
			blacklist:  &mockBlacklist{},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "401 when wrong prefix",
			authHeader: "Basic " + validToken,
			blacklist:  &mockBlacklist{},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "401 when token is expired",
			authHeader: "Bearer " + expiredToken,
			blacklist:  &mockBlacklist{},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "401 when signature is invalid",
			authHeader: "Bearer " + wrongSignatureToken,
			blacklist:  &mockBlacklist{},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "401 when token has no jti claim",
			authHeader: "Bearer " + noJTIToken,
			blacklist:  &mockBlacklist{},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "401 when token is blacklisted",
			authHeader: "Bearer " + validToken,
			blacklist:  &mockBlacklist{blacklisted: true},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:            "200 and context populated on valid token",
			authHeader:      "Bearer " + validToken,
			blacklist:       &mockBlacklist{},
			wantStatus:      http.StatusOK,
			wantUserID:      42,
			wantPassThrough: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var capturedUserID int64
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				id, err := middleware.UserIDFromContext(r.Context())
				require.NoError(t, err)
				capturedUserID = id

				jti, err := middleware.JTIFromContext(r.Context())
				require.NoError(t, err)
				assert.NotEmpty(t, jti)

				exp, err := middleware.ExpFromContext(r.Context())
				require.NoError(t, err)
				assert.Greater(t, exp, int64(0))

				w.WriteHeader(http.StatusOK)
			})

			handler := middleware.Authenticate(testSecret, tc.blacklist)(next)

			r := httptest.NewRequest(http.MethodGet, "/", nil)
			if tc.authHeader != "" {
				r.Header.Set("Authorization", tc.authHeader)
			}
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)
			if tc.wantPassThrough {
				assert.Equal(t, tc.wantUserID, capturedUserID)
			}
		})
	}
}
