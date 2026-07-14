package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"cofi-finance/backend/internal/platform/response"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey int

const (
	contextKeyUserID contextKey = iota
	contextKeyEmail
	contextKeyJTI
	contextKeyExp
)

// BlacklistChecker is satisfied by any token blacklist implementation.
type BlacklistChecker interface {
	IsBlacklisted(ctx context.Context, jti string) (bool, error)
}

// Authenticate returns a middleware that validates a Bearer JWT, checks the
// token blacklist, and stores userID, email, JTI and expiry in the request context.
func Authenticate(jwtSecret string, bl BlacklistChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.Error(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				response.Error(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}

			tokenString := parts[1]
			token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errors.New("unexpected signing method")
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				response.Error(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				response.Error(w, http.StatusUnauthorized, "invalid token claims")
				return
			}

			jti, _ := claims["jti"].(string)
			if jti == "" {
				response.Error(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			blacklisted, err := bl.IsBlacklisted(r.Context(), jti)
			if err != nil || blacklisted {
				response.Error(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			userID := int64(claims["sub"].(float64))
			email, _ := claims["email"].(string)
			exp := int64(claims["exp"].(float64))

			ctx := context.WithValue(r.Context(), contextKeyUserID, userID)
			ctx = context.WithValue(ctx, contextKeyEmail, email)
			ctx = context.WithValue(ctx, contextKeyJTI, jti)
			ctx = context.WithValue(ctx, contextKeyExp, exp)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext extracts the authenticated user's ID from the request context.
func UserIDFromContext(ctx context.Context) (int64, error) {
	userID, ok := ctx.Value(contextKeyUserID).(int64)
	if !ok {
		return 0, errors.New("user ID not found in context")
	}
	return userID, nil
}

// JTIFromContext extracts the JWT ID of the authenticated token from the request context.
func JTIFromContext(ctx context.Context) (string, error) {
	jti, ok := ctx.Value(contextKeyJTI).(string)
	if !ok || jti == "" {
		return "", errors.New("JTI not found in context")
	}
	return jti, nil
}

// ExpFromContext extracts the token expiry (Unix seconds) from the request context.
func ExpFromContext(ctx context.Context) (int64, error) {
	exp, ok := ctx.Value(contextKeyExp).(int64)
	if !ok {
		return 0, errors.New("exp not found in context")
	}
	return exp, nil
}
