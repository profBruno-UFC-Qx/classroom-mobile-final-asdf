package auth

import (
	"testing"
	"time"

	"cofi-finance/backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func makeTestJWT(t *testing.T, secret string, method jwt.SigningMethod, claims jwt.MapClaims) string {
	t.Helper()
	token, err := jwt.NewWithClaims(method, claims).SignedString([]byte(secret))
	require.NoError(t, err)
	return token
}

func TestService_parseJWT(t *testing.T) {
	const secret = "test-secret"

	validClaims := jwt.MapClaims{
		"sub": float64(42),
		"jti": "test-jti",
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(time.Hour).Unix(),
	}

	tests := []struct {
		name        string
		tokenString string
		wantErr     error
		checkClaims func(t *testing.T, claims jwt.MapClaims)
	}{
		{
			name:        "returns claims for a valid token",
			tokenString: makeTestJWT(t, secret, jwt.SigningMethodHS256, validClaims),
			checkClaims: func(t *testing.T, claims jwt.MapClaims) {
				t.Helper()
				assert.EqualValues(t, 42, claims["sub"])
				assert.Equal(t, "test-jti", claims["jti"])
				assert.NotEmpty(t, claims["exp"])
			},
		},
		{
			name: "returns ErrUnauthorized for expired token",
			tokenString: makeTestJWT(t, secret, jwt.SigningMethodHS256, jwt.MapClaims{
				"sub": float64(1),
				"jti": "jti",
				"exp": time.Now().Add(-time.Hour).Unix(),
			}),
			wantErr: domain.ErrUnauthorized,
		},
		{
			name: "returns ErrUnauthorized for wrong secret",
			tokenString: makeTestJWT(t, "wrong-secret", jwt.SigningMethodHS256, jwt.MapClaims{
				"sub": float64(1),
				"jti": "jti",
				"exp": time.Now().Add(time.Hour).Unix(),
			}),
			wantErr: domain.ErrUnauthorized,
		},
		{
			name:        "returns ErrUnauthorized for malformed token",
			tokenString: "not.a.jwt",
			wantErr:     domain.ErrUnauthorized,
		},
		{
			name:        "returns ErrUnauthorized for empty string",
			tokenString: "",
			wantErr:     domain.ErrUnauthorized,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := &service{jwtSecret: []byte(secret)}
			claims, err := svc.parseJWT(tc.tokenString)

			if tc.wantErr != nil {
				assert.ErrorIs(t, err, tc.wantErr)
				assert.Nil(t, claims)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, claims)
			if tc.checkClaims != nil {
				tc.checkClaims(t, claims)
			}
		})
	}
}
