package auth_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cofi-finance/backend/internal/auth"
	"cofi-finance/backend/internal/domain"
	"cofi-finance/backend/internal/middleware"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockService is a test double for auth.Service.
type mockService struct {
	tokens         *auth.TokenPair
	err            error
	renewTokens    *auth.TokenPair
	renewErr       error
	logoutErr      error
	registerErr    error
	verifyEmailErr error
}

func (m *mockService) Login(_ context.Context, _ auth.LoginInput) (*auth.TokenPair, error) {
	return m.tokens, m.err
}

func (m *mockService) RenewToken(_ context.Context, _ auth.RenewInput) (*auth.TokenPair, error) {
	return m.renewTokens, m.renewErr
}

func (m *mockService) Logout(_ context.Context, _ string, _ int64, _ auth.LogoutInput) error {
	return m.logoutErr
}

func (m *mockService) Register(_ context.Context, _ auth.RegisterInput) error {
	return m.registerErr
}

func (m *mockService) VerifyEmail(_ context.Context, _ string) error {
	return m.verifyEmailErr
}

// mockMiddlewareBlacklist is a test double for middleware.BlacklistChecker.
type mockMiddlewareBlacklist struct {
	blacklisted bool
}

func (m *mockMiddlewareBlacklist) IsBlacklisted(_ context.Context, _ string) (bool, error) {
	return m.blacklisted, nil
}

const testFrontendURL = "http://localhost:4200"

func TestHandler_Login(t *testing.T) {
	validTokens := &auth.TokenPair{AccessToken: "access.token.here", RefreshToken: "refresh.token.here"}

	tests := []struct {
		name       string
		body       any
		svc        *mockService
		wantStatus int
		wantTokens bool
		wantErrMsg string
	}{
		{
			name:       "200 with token pair on valid credentials",
			body:       map[string]string{"email": "user@example.com", "password": "password123"},
			svc:        &mockService{tokens: validTokens},
			wantStatus: http.StatusOK,
			wantTokens: true,
		},
		{
			name:       "400 on missing email",
			body:       map[string]string{"email": "", "password": "password123"},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "email and password are required",
		},
		{
			name:       "400 on missing password",
			body:       map[string]string{"email": "user@example.com", "password": ""},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "email and password are required",
		},
		{
			name:       "400 on malformed JSON",
			body:       "not-json",
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "invalid request body",
		},
		{
			name:       "401 on invalid credentials",
			body:       map[string]string{"email": "user@example.com", "password": "wrong"},
			svc:        &mockService{err: domain.ErrUnauthorized},
			wantStatus: http.StatusUnauthorized,
			wantErrMsg: "invalid credentials",
		},
		{
			name:       "403 on unverified email",
			body:       map[string]string{"email": "user@example.com", "password": "password123"},
			svc:        &mockService{err: domain.ErrEmailNotVerified},
			wantStatus: http.StatusForbidden,
			wantErrMsg: "email not verified",
		},
		{
			name:       "500 on unexpected service error",
			body:       map[string]string{"email": "user@example.com", "password": "password123"},
			svc:        &mockService{err: domain.ErrNotFound},
			wantStatus: http.StatusInternalServerError,
			wantErrMsg: "internal server error",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var bodyBytes []byte
			switch v := tc.body.(type) {
			case string:
				bodyBytes = []byte(v)
			default:
				var err error
				bodyBytes, err = json.Marshal(v)
				require.NoError(t, err)
			}

			r := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(bodyBytes))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler := auth.NewHandler(tc.svc, testFrontendURL)
			handler.Login(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)

			if tc.wantTokens {
				var resp map[string]any
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				data, ok := resp["data"].(map[string]any)
				require.True(t, ok, "expected data object in response")
				assert.NotEmpty(t, data["access_token"], "access_token must be present")
				assert.NotEmpty(t, data["refresh_token"], "refresh_token must be present")
			}
			if tc.wantErrMsg != "" {
				var resp map[string]any
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				assert.Equal(t, tc.wantErrMsg, resp["error"])
			}
		})
	}
}

func TestHandler_RenewToken(t *testing.T) {
	validTokens := &auth.TokenPair{AccessToken: "new.access.token", RefreshToken: "new.refresh.token"}

	tests := []struct {
		name       string
		body       any
		svc        *mockService
		wantStatus int
		wantTokens bool
		wantErrMsg string
	}{
		{
			name:       "200 with new token pair on valid refresh token",
			body:       map[string]string{"refresh_token": "valid.refresh.token"},
			svc:        &mockService{renewTokens: validTokens},
			wantStatus: http.StatusOK,
			wantTokens: true,
		},
		{
			name:       "400 on missing refresh_token",
			body:       map[string]string{"refresh_token": ""},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "refresh_token is required",
		},
		{
			name:       "400 on malformed JSON",
			body:       "not-json",
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "invalid request body",
		},
		{
			name:       "401 on invalid or expired refresh token",
			body:       map[string]string{"refresh_token": "expired.token"},
			svc:        &mockService{renewErr: domain.ErrUnauthorized},
			wantStatus: http.StatusUnauthorized,
			wantErrMsg: "invalid or expired refresh token",
		},
		{
			name:       "500 on unexpected service error",
			body:       map[string]string{"refresh_token": "valid.refresh.token"},
			svc:        &mockService{renewErr: domain.ErrNotFound},
			wantStatus: http.StatusInternalServerError,
			wantErrMsg: "internal server error",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var bodyBytes []byte
			switch v := tc.body.(type) {
			case string:
				bodyBytes = []byte(v)
			default:
				var err error
				bodyBytes, err = json.Marshal(v)
				require.NoError(t, err)
			}

			r := httptest.NewRequest(http.MethodPost, "/api/auth/renew", bytes.NewReader(bodyBytes))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler := auth.NewHandler(tc.svc, testFrontendURL)
			handler.RenewToken(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)

			if tc.wantTokens {
				var resp map[string]any
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				data, ok := resp["data"].(map[string]any)
				require.True(t, ok, "expected data object in response")
				assert.NotEmpty(t, data["access_token"], "access_token must be present")
				assert.NotEmpty(t, data["refresh_token"], "refresh_token must be present")
			}
			if tc.wantErrMsg != "" {
				var resp map[string]any
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				assert.Equal(t, tc.wantErrMsg, resp["error"])
			}
		})
	}
}

// newLogoutChain wraps the Logout handler with the Authenticate middleware so that
// JTI and exp are available in context, matching the real request path.
func newLogoutChain(svc auth.Service, bl middleware.BlacklistChecker) http.Handler {
	h := auth.NewHandler(svc, testFrontendURL)
	return middleware.Authenticate(testSecret, bl)(http.HandlerFunc(h.Logout))
}

func TestHandler_Logout(t *testing.T) {
	validToken := makeAccessToken(t, 1, testSecret, "test-access-jti", time.Now().Add(time.Hour))

	tests := []struct {
		name       string
		authHeader string
		body       any
		svc        *mockService
		bl         *mockMiddlewareBlacklist
		wantStatus int
		wantErrMsg string
	}{
		{
			name:       "204 on successful logout without refresh token",
			authHeader: "Bearer " + validToken,
			body:       map[string]string{},
			svc:        &mockService{},
			bl:         &mockMiddlewareBlacklist{},
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "204 on successful logout with refresh token",
			authHeader: "Bearer " + validToken,
			body:       map[string]string{"refresh_token": "valid.refresh.token"},
			svc:        &mockService{},
			bl:         &mockMiddlewareBlacklist{},
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "401 when access token is missing",
			authHeader: "",
			body:       map[string]string{},
			svc:        &mockService{},
			bl:         &mockMiddlewareBlacklist{},
			wantStatus: http.StatusUnauthorized,
			wantErrMsg: "missing authorization header",
		},
		{
			name:       "401 when access token is blacklisted",
			authHeader: "Bearer " + validToken,
			body:       map[string]string{},
			svc:        &mockService{},
			bl:         &mockMiddlewareBlacklist{blacklisted: true},
			wantStatus: http.StatusUnauthorized,
			wantErrMsg: "invalid or expired token",
		},
		{
			name:       "401 when service returns ErrUnauthorized (bad refresh token)",
			authHeader: "Bearer " + validToken,
			body:       map[string]string{"refresh_token": "invalid.token"},
			svc:        &mockService{logoutErr: domain.ErrUnauthorized},
			bl:         &mockMiddlewareBlacklist{},
			wantStatus: http.StatusUnauthorized,
			wantErrMsg: "invalid refresh token",
		},
		{
			name:       "500 on unexpected service error",
			authHeader: "Bearer " + validToken,
			body:       map[string]string{},
			svc:        &mockService{logoutErr: domain.ErrNotFound},
			bl:         &mockMiddlewareBlacklist{},
			wantStatus: http.StatusInternalServerError,
			wantErrMsg: "internal server error",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			bodyBytes, err := json.Marshal(tc.body)
			require.NoError(t, err)

			r := httptest.NewRequest(http.MethodPost, "/api/auth/logout", bytes.NewReader(bodyBytes))
			r.Header.Set("Content-Type", "application/json")
			if tc.authHeader != "" {
				r.Header.Set("Authorization", tc.authHeader)
			}
			w := httptest.NewRecorder()

			newLogoutChain(tc.svc, tc.bl).ServeHTTP(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)

			if tc.wantErrMsg != "" {
				var resp map[string]any
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				assert.Equal(t, tc.wantErrMsg, resp["error"])
			}
		})
	}
}

func TestHandler_Register(t *testing.T) {
	tests := []struct {
		name       string
		body       any
		svc        *mockService
		wantStatus int
		wantErrMsg string
	}{
		{
			name:       "201 no body on successful registration",
			body:       map[string]string{"email": "new@example.com", "password": "password123"},
			svc:        &mockService{},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "400 on malformed JSON",
			body:       "not-json",
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "invalid request body",
		},
		{
			name:       "400 on missing email",
			body:       map[string]string{"email": "", "password": "password123"},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "invalid email address",
		},
		{
			name:       "400 on email without @",
			body:       map[string]string{"email": "notanemail", "password": "password123"},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "invalid email address",
		},
		{
			name:       "400 on email without domain dot",
			body:       map[string]string{"email": "user@nodot", "password": "password123"},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "invalid email address",
		},
		{
			name:       "400 on missing password",
			body:       map[string]string{"email": "new@example.com", "password": ""},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "password must be at least 8 characters",
		},
		{
			name:       "400 on password shorter than 8 characters",
			body:       map[string]string{"email": "new@example.com", "password": "short"},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "password must be at least 8 characters",
		},
		{
			name:       "409 on duplicate email",
			body:       map[string]string{"email": "taken@example.com", "password": "password123"},
			svc:        &mockService{registerErr: domain.ErrConflict},
			wantStatus: http.StatusConflict,
			wantErrMsg: "email already in use",
		},
		{
			name:       "500 on unexpected service error",
			body:       map[string]string{"email": "new@example.com", "password": "password123"},
			svc:        &mockService{registerErr: domain.ErrNotFound},
			wantStatus: http.StatusInternalServerError,
			wantErrMsg: "internal server error",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var bodyBytes []byte
			switch v := tc.body.(type) {
			case string:
				bodyBytes = []byte(v)
			default:
				var err error
				bodyBytes, err = json.Marshal(v)
				require.NoError(t, err)
			}

			r := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(bodyBytes))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler := auth.NewHandler(tc.svc, testFrontendURL)
			handler.Register(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)

			if tc.wantErrMsg != "" {
				var resp map[string]any
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				assert.Equal(t, tc.wantErrMsg, resp["error"])
			}
		})
	}
}

func TestHandler_VerifyEmail(t *testing.T) {
	tests := []struct {
		name           string
		token          string
		svc            *mockService
		wantStatus     int
		wantErrMsg     string
		wantRedirectTo string
	}{
		{
			name:           "303 redirect to frontend on valid token",
			token:          "valid-token-xyz",
			svc:            &mockService{},
			wantStatus:     http.StatusSeeOther,
			wantRedirectTo: testFrontendURL + "/email-verified",
		},
		{
			name:       "400 on missing token query param",
			token:      "",
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "token is required",
		},
		{
			name:       "400 on invalid or expired token",
			token:      "bad-token",
			svc:        &mockService{verifyEmailErr: domain.ErrBadRequest},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "invalid or expired verification token",
		},
		{
			name:       "400 on unknown token",
			token:      "unknown-token",
			svc:        &mockService{verifyEmailErr: domain.ErrNotFound},
			wantStatus: http.StatusBadRequest,
			wantErrMsg: "invalid or expired verification token",
		},
		{
			name:       "500 on unexpected service error",
			token:      "any-token",
			svc:        &mockService{verifyEmailErr: errors.New("db error")},
			wantStatus: http.StatusInternalServerError,
			wantErrMsg: "internal server error",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			url := "/api/auth/verify-email"
			if tc.token != "" {
				url += "?token=" + tc.token
			}
			r := httptest.NewRequest(http.MethodGet, url, nil)
			w := httptest.NewRecorder()

			handler := auth.NewHandler(tc.svc, testFrontendURL)
			handler.VerifyEmail(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)

			if tc.wantRedirectTo != "" {
				assert.Equal(t, tc.wantRedirectTo, w.Header().Get("Location"))
			}
			if tc.wantErrMsg != "" {
				var resp map[string]any
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				assert.Equal(t, tc.wantErrMsg, resp["error"])
			}
		})
	}
}
