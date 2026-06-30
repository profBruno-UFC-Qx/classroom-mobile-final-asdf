package auth

import (
	"context"
	"time"
)

// Repository is the data-access contract for the auth domain.
type Repository interface {
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id int64) (*User, error)
	Create(ctx context.Context, email, passwordHash string) (*User, error)
	MarkEmailVerified(ctx context.Context, userID int64) error
}

// TokenBlacklist is the contract for revoking tokens by JTI.
type TokenBlacklist interface {
	Add(ctx context.Context, jti string, ttl time.Duration) error
	IsBlacklisted(ctx context.Context, jti string) (bool, error)
}

// EmailService is the contract for sending transactional emails.
type EmailService interface {
	SendVerificationEmail(to, verificationURL string) error
}

// VerificationStore is the contract for storing one-time email verification tokens.
type VerificationStore interface {
	StoreToken(ctx context.Context, token string, userID int64, ttl time.Duration) error
	GetUserID(ctx context.Context, token string) (int64, error)
	DeleteToken(ctx context.Context, token string) error
}

// Service is the business-logic contract for the auth domain.
type Service interface {
	Login(ctx context.Context, input LoginInput) (*TokenPair, error)
	RenewToken(ctx context.Context, input RenewInput) (*TokenPair, error)
	Logout(ctx context.Context, accessJTI string, accessExp int64, input LogoutInput) error
	Register(ctx context.Context, input RegisterInput) error
	VerifyEmail(ctx context.Context, token string) error
}
