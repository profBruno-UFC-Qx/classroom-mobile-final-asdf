package spending

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"cofi-finance/backend/internal/domain"
	"cofi-finance/backend/internal/middleware"
	"cofi-finance/backend/internal/platform/response"

	"github.com/go-chi/chi/v5"
)

// Handler holds the HTTP handlers for the spending domain.
type Handler struct {
	svc Service
}

// NewHandler returns a new spending Handler.
func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// Create creates a new spending for the authenticated user.
//
// @Summary      Create spending
// @Description  Creates a new spending for the authenticated user.
// @Tags         spending
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      CreateSpendingInput  true  "Spending data"
// @Success      201   {object}  Spending
// @Failure      400   {object}  response.ErrorResponse
// @Failure      401   {object}  response.ErrorResponse
// @Failure      500   {object}  response.ErrorResponse
// @Router       /api/spendings [post]
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.UserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var input CreateSpendingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	s, err := h.svc.Create(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, domain.ErrBadRequest) {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response.JSON(w, http.StatusCreated, s)
}

// GetByUserID returns all spendings for the authenticated user.
//
// @Summary      List spendings
// @Description  Returns all spendings for the authenticated user, ordered by most recent first. Optionally filter by creation date using 'from' and/or 'to' query parameters (format: YYYY-MM-DD). The 'to' date is inclusive (includes the full day).
// @Tags         spending
// @Produce      json
// @Security     BearerAuth
// @Param        from  query     string  false  "Filter spendings created on or after this date (YYYY-MM-DD)"
// @Param        to    query     string  false  "Filter spendings created on or before this date, inclusive (YYYY-MM-DD)"
// @Success      200   {array}   Spending
// @Failure      400   {object}  response.ErrorResponse  "Invalid date format"
// @Failure      401   {object}  response.ErrorResponse
// @Failure      500   {object}  response.ErrorResponse
// @Router       /api/spendings [get]
func (h *Handler) GetByUserID(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.UserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var filter SpendingFilter
	if v := r.URL.Query().Get("from"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "invalid 'from' date, expected YYYY-MM-DD")
			return
		}
		filter.From = &t
	}
	if v := r.URL.Query().Get("to"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "invalid 'to' date, expected YYYY-MM-DD")
			return
		}
		endOfDay := t.Add(24*time.Hour - time.Nanosecond)
		filter.To = &endOfDay
	}

	spendings, err := h.svc.GetByUserID(r.Context(), userID, filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response.JSON(w, http.StatusOK, spendings)
}

// Delete deletes a spending by ID for the authenticated user.
//
// @Summary      Delete spending
// @Description  Deletes the spending with the given ID if it belongs to the authenticated user.
// @Tags         spending
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Spending ID"
// @Success      204  "No Content"
// @Failure      401  {object}  response.ErrorResponse
// @Failure      404  {object}  response.ErrorResponse  "Spending not found"
// @Failure      500  {object}  response.ErrorResponse
// @Router       /api/spendings/{id} [delete]
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.UserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")

	if err := h.svc.Delete(r.Context(), userID, id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			response.Error(w, http.StatusNotFound, "spending not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Update updates an existing spending for the authenticated user.
//
// @Summary      Update spending
// @Description  Updates the spending with the given ID if it belongs to the authenticated user. The spent_at field must be in RFC3339 format (e.g. 2026-03-15T00:00:00Z).
// @Tags         spending
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string               true  "Spending ID"
// @Param        body  body      UpdateSpendingInput  true  "Updated spending data"
// @Success      200   {object}  Spending
// @Failure      400   {object}  response.ErrorResponse  "Invalid request body"
// @Failure      401   {object}  response.ErrorResponse
// @Failure      404   {object}  response.ErrorResponse  "Spending not found"
// @Failure      500   {object}  response.ErrorResponse
// @Router       /api/spendings/{id} [patch]
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, err := middleware.UserIDFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")

	var input UpdateSpendingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	s, err := h.svc.Update(r.Context(), userID, id, input)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			response.Error(w, http.StatusNotFound, "spending not found")
			return
		}
		if errors.Is(err, domain.ErrBadRequest) {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response.JSON(w, http.StatusOK, s)
}
