package auth

import (
	"time"

	"cofi-finance/backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/httprate"
)

// RegisterRoutes mounts all auth routes onto the given router.
func RegisterRoutes(r chi.Router, h *Handler, jwtSecret string, bl middleware.BlacklistChecker, rateLimitAuth int) {
	r.Route("/auth", func(r chi.Router) {
		r.Use(httprate.LimitByIP(rateLimitAuth, time.Minute))

		r.Post("/register", h.Register)       // Create a new user account
		r.Post("/login", h.Login)             // Authenticate user with email and password
		r.Post("/renew", h.RenewToken)        // Exchange a refresh token for a new token pair
		r.Get("/verify-email", h.VerifyEmail) // Confirm email address via one-time token

		r.Group(func(r chi.Router) {
			r.Use(middleware.Authenticate(jwtSecret, bl))
			r.Post("/logout", h.Logout) // Revoke access and refresh tokens
		})
	})
}
