package spending

import (
	"cofi-finance/backend/internal/middleware"

	"github.com/go-chi/chi/v5"
)

// RegisterRoutes mounts the spending routes on the given router.
func RegisterRoutes(r chi.Router, h *Handler, jwtSecret string, bl middleware.BlacklistChecker) {
	r.Route("/spendings", func(r chi.Router) {
		r.Use(middleware.Authenticate(jwtSecret, bl))
		r.Post("/", h.Create)       // Create a new spending
		r.Get("/", h.GetByUserID)   // List all spendings for the authenticated user
		r.Delete("/{id}", h.Delete) // Delete a spending by ID
		r.Patch("/{id}", h.Update)  // Update a spending by ID
	})
}
