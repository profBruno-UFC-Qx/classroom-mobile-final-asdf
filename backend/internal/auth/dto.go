package auth

// LoginInput holds the credentials submitted by the client.
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterInput holds the data required to create a new account.
type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RenewInput holds the refresh token submitted by the client.
type RenewInput struct {
	RefreshToken string `json:"refresh_token"`
}

// LogoutInput holds the optional refresh token to revoke on logout.
type LogoutInput struct {
	RefreshToken string `json:"refresh_token"`
}
