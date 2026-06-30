package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"

	"cofi-finance/backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type service struct {
	repo       Repository
	jwtSecret  []byte
	blacklist  TokenBlacklist
	emailSvc   EmailService
	appURL     string
	verifStore VerificationStore
	verifTTL   time.Duration
}

func NewService(
	repo Repository,
	jwtSecret string,
	bl TokenBlacklist,
	emailSvc EmailService,
	appURL string,
	verifStore VerificationStore,
	verifTTL time.Duration,
) Service {
	return &service{
		repo:       repo,
		jwtSecret:  []byte(jwtSecret),
		blacklist:  bl,
		emailSvc:   emailSvc,
		appURL:     appURL,
		verifStore: verifStore,
		verifTTL:   verifTTL,
	}
}

func (s *service) Register(ctx context.Context, input RegisterInput) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user, err := s.repo.Create(ctx, input.Email, string(hash))
	if err != nil {
		return err
	}
	s.sendVerificationEmail(ctx, user)
	return nil
}

// sendVerificationEmail generates a one-time token, stores it in Redis, and emails the link.
// Best-effort: logs failures instead of propagating them — registration succeeds regardless.
func (s *service) sendVerificationEmail(ctx context.Context, user *User) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return
	}
	token := hex.EncodeToString(tokenBytes)
	if err := s.verifStore.StoreToken(ctx, token, user.ID, s.verifTTL); err != nil {
		log.Printf("email verification: failed to store token for user %d: %v", user.ID, err)
		return
	}
	verificationURL := fmt.Sprintf("%s/api/auth/verify-email?token=%s", s.appURL, token)
	if err := s.emailSvc.SendVerificationEmail(user.Email, verificationURL); err != nil {
		log.Printf("email verification: failed to send to %s: %v", user.Email, err)
	}
}

func (s *service) Login(ctx context.Context, input LoginInput) (*TokenPair, error) {
	user, err := s.repo.GetByEmail(ctx, input.Email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrUnauthorized
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, domain.ErrUnauthorized
	}

	if user.EmailVerifiedAt == nil {
		return nil, domain.ErrEmailNotVerified
	}

	return s.issueTokenPair(user)
}

func (s *service) RenewToken(ctx context.Context, input RenewInput) (*TokenPair, error) {
	claims, err := s.parseJWT(input.RefreshToken)
	if err != nil {
		return nil, domain.ErrUnauthorized
	}

	oldJTI, _ := claims["jti"].(string)
	if oldJTI == "" {
		return nil, domain.ErrUnauthorized
	}

	blacklisted, err := s.blacklist.IsBlacklisted(ctx, oldJTI)
	if err != nil {
		return nil, err
	}
	if blacklisted {
		return nil, domain.ErrUnauthorized
	}

	subFloat, ok := claims["sub"].(float64)
	if !ok {
		return nil, domain.ErrUnauthorized
	}

	user, err := s.repo.GetByID(ctx, int64(subFloat))
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrUnauthorized
		}
		return nil, err
	}

	pair, err := s.issueTokenPair(user)
	if err != nil {
		return nil, err
	}

	// Blacklist the old refresh token (rotation — it can no longer be reused).
	oldExp := int64(claims["exp"].(float64))
	ttl := time.Until(time.Unix(oldExp, 0))
	return pair, s.blacklist.Add(ctx, oldJTI, ttl)
}

func (s *service) Logout(ctx context.Context, accessJTI string, accessExp int64, input LogoutInput) error {
	// Revoke the access token.
	if err := s.blacklist.Add(ctx, accessJTI, time.Until(time.Unix(accessExp, 0))); err != nil {
		return err
	}

	// Revoke the refresh token if provided.
	if input.RefreshToken == "" {
		return nil
	}

	claims, err := s.parseJWT(input.RefreshToken)
	if err != nil {
		return domain.ErrUnauthorized
	}

	refreshJTI, _ := claims["jti"].(string)
	if refreshJTI == "" {
		return domain.ErrUnauthorized
	}

	refreshExp := int64(claims["exp"].(float64))
	return s.blacklist.Add(ctx, refreshJTI, time.Until(time.Unix(refreshExp, 0)))
}

func (s *service) VerifyEmail(ctx context.Context, token string) error {
	userID, err := s.verifStore.GetUserID(ctx, token)
	if err != nil {
		return err
	}

	if err := s.repo.MarkEmailVerified(ctx, userID); err != nil {
		return err
	}

	// Delete the token so it cannot be reused (best-effort).
	if err := s.verifStore.DeleteToken(ctx, token); err != nil {
		log.Printf("email verification: failed to delete token after use: %v", err)
	}

	return nil
}

// parseJWT validates an HS256-signed JWT against the service secret and returns its claims.
// Returns domain.ErrUnauthorized for any invalid, expired, or malformed token.
func (s *service) parseJWT(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domain.ErrUnauthorized
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, domain.ErrUnauthorized
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, domain.ErrUnauthorized
	}
	return claims, nil
}

// issueTokenPair generates a new access token (2h) and refresh token (7d) for the given user.
// Each token includes a unique jti claim for revocation support.
func (s *service) issueTokenPair(user *User) (*TokenPair, error) {
	now := time.Now()

	accessJTI, err := newJTI()
	if err != nil {
		return nil, err
	}
	refreshJTI, err := newJTI()
	if err != nil {
		return nil, err
	}

	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"jti":   accessJTI,
		"iat":   now.Unix(),
		"exp":   now.Add(2 * time.Hour).Unix(),
	}).SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID,
		"jti": refreshJTI,
		"iat": now.Unix(),
		"exp": now.Add(7 * 24 * time.Hour).Unix(),
	}).SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

// newJTI generates a cryptographically random 16-byte hex string.
func newJTI() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
