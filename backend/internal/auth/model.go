package auth

import "time"

// User represents an authenticated account.
type User struct {
	ID              int64      `json:"id"`
	Email           string     `json:"email"`
	PasswordHash    string     `json:"-"`
	EmailVerifiedAt *time.Time `json:"-"`
}

// TokenPair holds the access and refresh JWTs returned after a successful login.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}
