package auth_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"cofi-finance/backend/internal/auth"
	"cofi-finance/backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// mockRepository is a test double for auth.Repository.
type mockRepository struct {
	user            *auth.User
	err             error
	byIDUser        *auth.User
	byIDErr         error
	createdUser     *auth.User
	createErr       error
	markVerifiedErr error
}

func (m *mockRepository) GetByEmail(_ context.Context, _ string) (*auth.User, error) {
	return m.user, m.err
}

func (m *mockRepository) GetByID(_ context.Context, _ int64) (*auth.User, error) {
	return m.byIDUser, m.byIDErr
}

func (m *mockRepository) Create(_ context.Context, _, _ string) (*auth.User, error) {
	return m.createdUser, m.createErr
}

func (m *mockRepository) MarkEmailVerified(_ context.Context, _ int64) error {
	return m.markVerifiedErr
}

// mockBlacklist is a test double for auth.TokenBlacklist.
type mockBlacklist struct {
	addErr           error
	isBlacklisted    bool
	isBlacklistedErr error
	addedJTIs        []string
}

func (m *mockBlacklist) Add(_ context.Context, jti string, _ time.Duration) error {
	m.addedJTIs = append(m.addedJTIs, jti)
	return m.addErr
}

func (m *mockBlacklist) IsBlacklisted(_ context.Context, _ string) (bool, error) {
	return m.isBlacklisted, m.isBlacklistedErr
}

// mockEmailService is a test double for auth.EmailService.
type mockEmailService struct {
	err error
}

func (m *mockEmailService) SendVerificationEmail(_, _ string) error {
	return m.err
}

// mockVerificationStore is a test double for auth.VerificationStore.
type mockVerificationStore struct {
	userID      int64
	getUserErr  error
	storeErr    error
	deleteErr   error
}

func (m *mockVerificationStore) StoreToken(_ context.Context, _ string, _ int64, _ time.Duration) error {
	return m.storeErr
}

func (m *mockVerificationStore) GetUserID(_ context.Context, _ string) (int64, error) {
	return m.userID, m.getUserErr
}

func (m *mockVerificationStore) DeleteToken(_ context.Context, _ string) error {
	return m.deleteErr
}

func hashPassword(t *testing.T, plain string) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.MinCost)
	require.NoError(t, err)
	return string(h)
}

const testSecret = "test-secret"

func newTestService(repo auth.Repository, bl auth.TokenBlacklist) auth.Service {
	return auth.NewService(repo, testSecret, bl, &mockEmailService{}, "http://localhost", &mockVerificationStore{}, 24*time.Hour)
}

func TestService_Login(t *testing.T) {
	verifiedAt := time.Now()

	tests := []struct {
		name    string
		repo    *mockRepository
		input   auth.LoginInput
		wantErr error
	}{
		{
			name: "returns token pair on valid credentials",
			repo: &mockRepository{
				user: &auth.User{ID: 1, Email: "user@example.com", EmailVerifiedAt: &verifiedAt},
			},
			input: auth.LoginInput{Email: "user@example.com", Password: "password123"},
		},
		{
			name:    "returns ErrUnauthorized when user not found",
			repo:    &mockRepository{err: domain.ErrNotFound},
			input:   auth.LoginInput{Email: "ghost@example.com", Password: "password123"},
			wantErr: domain.ErrUnauthorized,
		},
		{
			name:    "returns ErrUnauthorized on wrong password",
			repo:    &mockRepository{user: &auth.User{ID: 1, Email: "user@example.com", EmailVerifiedAt: &verifiedAt}},
			input:   auth.LoginInput{Email: "user@example.com", Password: "wrongpassword"},
			wantErr: domain.ErrUnauthorized,
		},
		{
			name:    "returns ErrEmailNotVerified when email is not verified",
			repo:    &mockRepository{user: &auth.User{ID: 1, Email: "user@example.com"}},
			input:   auth.LoginInput{Email: "user@example.com", Password: "password123"},
			wantErr: domain.ErrEmailNotVerified,
		},
		{
			name:    "propagates unexpected repository errors",
			repo:    &mockRepository{err: errors.New("db timeout")},
			input:   auth.LoginInput{Email: "user@example.com", Password: "password123"},
			wantErr: errors.New("db timeout"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Hash password for cases where bcrypt must succeed (all except wrong-password and user-not-found).
			needsHash := tc.repo.user != nil &&
				!errors.Is(tc.wantErr, domain.ErrUnauthorized) ||
				errors.Is(tc.wantErr, domain.ErrEmailNotVerified)
			if needsHash && tc.repo.user != nil {
				tc.repo.user.PasswordHash = hashPassword(t, tc.input.Password)
			}

			svc := newTestService(tc.repo, &mockBlacklist{})
			got, err := svc.Login(context.Background(), tc.input)

			if tc.wantErr != nil {
				assert.Error(t, err)
				if errors.Is(tc.wantErr, domain.ErrUnauthorized) || errors.Is(tc.wantErr, domain.ErrEmailNotVerified) {
					assert.ErrorIs(t, err, tc.wantErr)
				}
				assert.Nil(t, got)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, got)
			assert.NotEmpty(t, got.AccessToken)
			assert.NotEmpty(t, got.RefreshToken)

			accessClaims := jwt.MapClaims{}
			_, err = jwt.ParseWithClaims(got.AccessToken, accessClaims, func(_ *jwt.Token) (any, error) {
				return []byte(testSecret), nil
			})
			require.NoError(t, err)
			assert.EqualValues(t, tc.repo.user.ID, int64(accessClaims["sub"].(float64)))
			assert.Equal(t, tc.repo.user.Email, accessClaims["email"])
			assert.NotEmpty(t, accessClaims["jti"])

			refreshClaims := jwt.MapClaims{}
			_, err = jwt.ParseWithClaims(got.RefreshToken, refreshClaims, func(_ *jwt.Token) (any, error) {
				return []byte(testSecret), nil
			})
			require.NoError(t, err)
			assert.EqualValues(t, tc.repo.user.ID, int64(refreshClaims["sub"].(float64)))
			_, hasEmail := refreshClaims["email"]
			assert.False(t, hasEmail)
			assert.NotEmpty(t, refreshClaims["jti"])

			accessExp := int64(accessClaims["exp"].(float64))
			refreshExp := int64(refreshClaims["exp"].(float64))
			assert.Less(t, accessExp, refreshExp)
		})
	}
}

func makeRefreshToken(t *testing.T, userID int64, secret string, exp time.Time) string {
	t.Helper()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"jti": "test-refresh-jti",
		"iat": time.Now().Unix(),
		"exp": exp.Unix(),
	}).SignedString([]byte(secret))
	require.NoError(t, err)
	return token
}

func TestService_RenewToken(t *testing.T) {
	validUser := &auth.User{ID: 42, Email: "user@example.com"}

	tests := []struct {
		name      string
		repo      *mockRepository
		blacklist *mockBlacklist
		token     string
		wantErr   error
	}{
		{
			name:      "returns new token pair on valid refresh token",
			repo:      &mockRepository{byIDUser: validUser},
			blacklist: &mockBlacklist{},
			token:     makeRefreshToken(t, 42, testSecret, time.Now().Add(time.Hour)),
		},
		{
			name:      "returns ErrUnauthorized on expired refresh token",
			repo:      &mockRepository{},
			blacklist: &mockBlacklist{},
			token:     makeRefreshToken(t, 42, testSecret, time.Now().Add(-time.Hour)),
			wantErr:   domain.ErrUnauthorized,
		},
		{
			name:      "returns ErrUnauthorized on token signed with wrong secret",
			repo:      &mockRepository{},
			blacklist: &mockBlacklist{},
			token:     makeRefreshToken(t, 42, "wrong-secret", time.Now().Add(time.Hour)),
			wantErr:   domain.ErrUnauthorized,
		},
		{
			name:      "returns ErrUnauthorized on malformed token",
			repo:      &mockRepository{},
			blacklist: &mockBlacklist{},
			token:     "not.a.jwt",
			wantErr:   domain.ErrUnauthorized,
		},
		{
			name:      "returns ErrUnauthorized when user not found",
			repo:      &mockRepository{byIDErr: domain.ErrNotFound},
			blacklist: &mockBlacklist{},
			token:     makeRefreshToken(t, 99, testSecret, time.Now().Add(time.Hour)),
			wantErr:   domain.ErrUnauthorized,
		},
		{
			name:      "propagates unexpected repository errors",
			repo:      &mockRepository{byIDErr: errors.New("db timeout")},
			blacklist: &mockBlacklist{},
			token:     makeRefreshToken(t, 42, testSecret, time.Now().Add(time.Hour)),
			wantErr:   errors.New("db timeout"),
		},
		{
			name:      "returns ErrUnauthorized when refresh token is already blacklisted",
			repo:      &mockRepository{byIDUser: validUser},
			blacklist: &mockBlacklist{isBlacklisted: true},
			token:     makeRefreshToken(t, 42, testSecret, time.Now().Add(time.Hour)),
			wantErr:   domain.ErrUnauthorized,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := newTestService(tc.repo, tc.blacklist)
			got, err := svc.RenewToken(context.Background(), auth.RenewInput{RefreshToken: tc.token})

			if tc.wantErr != nil {
				assert.Error(t, err)
				if errors.Is(tc.wantErr, domain.ErrUnauthorized) {
					assert.ErrorIs(t, err, domain.ErrUnauthorized)
				}
				assert.Nil(t, got)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, got)
			assert.NotEmpty(t, got.AccessToken)
			assert.NotEmpty(t, got.RefreshToken)

			accessClaims := jwt.MapClaims{}
			_, err = jwt.ParseWithClaims(got.AccessToken, accessClaims, func(_ *jwt.Token) (any, error) {
				return []byte(testSecret), nil
			})
			require.NoError(t, err)
			assert.EqualValues(t, validUser.ID, int64(accessClaims["sub"].(float64)))
			assert.Equal(t, validUser.Email, accessClaims["email"])

			refreshClaims := jwt.MapClaims{}
			_, err = jwt.ParseWithClaims(got.RefreshToken, refreshClaims, func(_ *jwt.Token) (any, error) {
				return []byte(testSecret), nil
			})
			require.NoError(t, err)
			_, hasEmail := refreshClaims["email"]
			assert.False(t, hasEmail)

			assert.Contains(t, tc.blacklist.addedJTIs, "test-refresh-jti")
		})
	}
}

func makeAccessToken(t *testing.T, userID int64, secret string, jti string, exp time.Time) string {
	t.Helper()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   userID,
		"email": "user@example.com",
		"jti":   jti,
		"iat":   time.Now().Unix(),
		"exp":   exp.Unix(),
	}).SignedString([]byte(secret))
	require.NoError(t, err)
	return token
}

func TestService_Logout(t *testing.T) {
	validRefreshToken := makeRefreshToken(t, 1, testSecret, time.Now().Add(7*24*time.Hour))

	tests := []struct {
		name      string
		blacklist *mockBlacklist
		accessJTI string
		accessExp int64
		input     auth.LogoutInput
		wantErr   error
		wantJTIs  []string
	}{
		{
			name:      "blacklists access token only when no refresh token given",
			blacklist: &mockBlacklist{},
			accessJTI: "access-jti-1",
			accessExp: time.Now().Add(time.Hour).Unix(),
			input:     auth.LogoutInput{},
			wantJTIs:  []string{"access-jti-1"},
		},
		{
			name:      "blacklists both access and refresh tokens",
			blacklist: &mockBlacklist{},
			accessJTI: "access-jti-2",
			accessExp: time.Now().Add(time.Hour).Unix(),
			input:     auth.LogoutInput{RefreshToken: validRefreshToken},
			wantJTIs:  []string{"access-jti-2", "test-refresh-jti"},
		},
		{
			name:      "returns ErrUnauthorized on invalid refresh token",
			blacklist: &mockBlacklist{},
			accessJTI: "access-jti-3",
			accessExp: time.Now().Add(time.Hour).Unix(),
			input:     auth.LogoutInput{RefreshToken: "invalid.token"},
			wantErr:   domain.ErrUnauthorized,
		},
		{
			name:      "returns ErrUnauthorized on expired refresh token",
			blacklist: &mockBlacklist{},
			accessJTI: "access-jti-4",
			accessExp: time.Now().Add(time.Hour).Unix(),
			input:     auth.LogoutInput{RefreshToken: makeRefreshToken(t, 1, testSecret, time.Now().Add(-time.Hour))},
			wantErr:   domain.ErrUnauthorized,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := newTestService(&mockRepository{}, tc.blacklist)
			err := svc.Logout(context.Background(), tc.accessJTI, tc.accessExp, tc.input)

			if tc.wantErr != nil {
				assert.ErrorIs(t, err, tc.wantErr)
				return
			}

			require.NoError(t, err)
			for _, jti := range tc.wantJTIs {
				assert.Contains(t, tc.blacklist.addedJTIs, jti)
			}
		})
	}
}

func TestService_Register(t *testing.T) {
	tests := []struct {
		name       string
		repo       *mockRepository
		emailSvc   *mockEmailService
		verifStore *mockVerificationStore
		input      auth.RegisterInput
		wantErr    error
	}{
		{
			name:       "succeeds on valid registration",
			repo:       &mockRepository{createdUser: &auth.User{ID: 10, Email: "new@example.com"}},
			emailSvc:   &mockEmailService{},
			verifStore: &mockVerificationStore{},
			input:      auth.RegisterInput{Email: "new@example.com", Password: "password123"},
		},
		{
			name:       "succeeds even when email sending fails",
			repo:       &mockRepository{createdUser: &auth.User{ID: 10, Email: "new@example.com"}},
			emailSvc:   &mockEmailService{err: errors.New("smtp error")},
			verifStore: &mockVerificationStore{},
			input:      auth.RegisterInput{Email: "new@example.com", Password: "password123"},
		},
		{
			name:       "succeeds even when token store fails",
			repo:       &mockRepository{createdUser: &auth.User{ID: 10, Email: "new@example.com"}},
			emailSvc:   &mockEmailService{},
			verifStore: &mockVerificationStore{storeErr: errors.New("redis down")},
			input:      auth.RegisterInput{Email: "new@example.com", Password: "password123"},
		},
		{
			name:       "propagates ErrConflict when email is already taken",
			repo:       &mockRepository{createErr: domain.ErrConflict},
			emailSvc:   &mockEmailService{},
			verifStore: &mockVerificationStore{},
			input:      auth.RegisterInput{Email: "taken@example.com", Password: "password123"},
			wantErr:    domain.ErrConflict,
		},
		{
			name:       "propagates unexpected repository errors",
			repo:       &mockRepository{createErr: errors.New("db timeout")},
			emailSvc:   &mockEmailService{},
			verifStore: &mockVerificationStore{},
			input:      auth.RegisterInput{Email: "new@example.com", Password: "password123"},
			wantErr:    errors.New("db timeout"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := auth.NewService(tc.repo, testSecret, &mockBlacklist{}, tc.emailSvc, "http://localhost", tc.verifStore, 24*time.Hour)
			err := svc.Register(context.Background(), tc.input)

			if tc.wantErr != nil {
				assert.Error(t, err)
				if errors.Is(tc.wantErr, domain.ErrConflict) {
					assert.ErrorIs(t, err, domain.ErrConflict)
				}
				return
			}

			require.NoError(t, err)
		})
	}
}

func TestService_VerifyEmail(t *testing.T) {
	tests := []struct {
		name       string
		repo       *mockRepository
		verifStore *mockVerificationStore
		token      string
		wantErr    error
	}{
		{
			name:       "verifies email with valid token",
			repo:       &mockRepository{},
			verifStore: &mockVerificationStore{userID: 10},
			token:      "valid-token",
		},
		{
			name:       "returns ErrNotFound on unknown/expired token",
			repo:       &mockRepository{},
			verifStore: &mockVerificationStore{getUserErr: domain.ErrNotFound},
			token:      "unknown-token",
			wantErr:    domain.ErrNotFound,
		},
		{
			name:       "propagates repo error from MarkEmailVerified",
			repo:       &mockRepository{markVerifiedErr: errors.New("db error")},
			verifStore: &mockVerificationStore{userID: 10},
			token:      "valid-token",
			wantErr:    errors.New("db error"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := auth.NewService(tc.repo, testSecret, &mockBlacklist{}, &mockEmailService{}, "http://localhost", tc.verifStore, 24*time.Hour)
			err := svc.VerifyEmail(context.Background(), tc.token)

			if tc.wantErr != nil {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}
