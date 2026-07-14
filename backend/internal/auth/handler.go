package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"

	"cofi-finance/backend/internal/domain"
	"cofi-finance/backend/internal/middleware"
	"cofi-finance/backend/internal/platform/response"
)

// emailRegex is a basic sanity check: something@something.something.
var emailRegex = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// Handler holds the HTTP handlers for the auth domain.
type Handler struct {
	svc         Service
	frontendURL string
}

func NewHandler(svc Service, frontendURL string) *Handler {
	return &Handler{svc: svc, frontendURL: frontendURL}
}

// Login authenticates a user and returns an access token (2h) and a refresh token (7d).
//
// @Summary      Login
// @Description  Authenticate user with email and password. Returns a JWT access token (2h) and a refresh token (7d).
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      LoginInput   true  "Login credentials"
// @Success      200   {object}  TokenPair
// @Failure      400   {object}  response.ErrorResponse  "Missing or malformed request body"
// @Failure      401   {object}  response.ErrorResponse  "Invalid credentials"
// @Failure      403   {object}  response.ErrorResponse  "Email not verified"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /api/auth/login [post]
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var input LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if input.Email == "" || input.Password == "" {
		response.Error(w, http.StatusBadRequest, "email and password are required")
		return
	}

	tokens, err := h.svc.Login(r.Context(), input)
	if err != nil {
		if errors.Is(err, domain.ErrEmailNotVerified) {
			response.Error(w, http.StatusForbidden, "email not verified")
			return
		}
		if errors.Is(err, domain.ErrUnauthorized) {
			response.Error(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response.JSON(w, http.StatusOK, tokens)
}

// RenewToken issues a new access token and refresh token using a valid refresh token.
//
// @Summary      Renew tokens
// @Description  Exchange a valid refresh token for a new access token (2h) and refresh token (7d).
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      RenewInput   true  "Refresh token"
// @Success      200   {object}  TokenPair
// @Failure      400   {object}  response.ErrorResponse  "Missing or malformed request body"
// @Failure      401   {object}  response.ErrorResponse  "Invalid or expired refresh token"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /api/auth/renew [post]
func (h *Handler) RenewToken(w http.ResponseWriter, r *http.Request) {
	var input RenewInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if input.RefreshToken == "" {
		response.Error(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	tokens, err := h.svc.RenewToken(r.Context(), input)
	if err != nil {
		if errors.Is(err, domain.ErrUnauthorized) {
			response.Error(w, http.StatusUnauthorized, "invalid or expired refresh token")
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response.JSON(w, http.StatusOK, tokens)
}

// Logout revokes the caller's access token and, optionally, a refresh token.
//
// @Summary      Logout
// @Description  Revoke the current access token and optionally a refresh token. Both tokens are blacklisted in Redis until they naturally expire.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      LogoutInput  false  "Optional refresh token to revoke"
// @Success      204   "Logged out successfully"
// @Failure      401   {object}  response.ErrorResponse  "Missing, invalid, or blacklisted access token; or invalid refresh token"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /api/auth/logout [post]
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	accessJTI, err := middleware.JTIFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "missing authorization")
		return
	}

	accessExp, err := middleware.ExpFromContext(r.Context())
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "missing authorization")
		return
	}

	var input LogoutInput
	// Body is optional — ignore decode errors (empty body is valid).
	_ = json.NewDecoder(r.Body).Decode(&input)

	if err := h.svc.Logout(r.Context(), accessJTI, accessExp, input); err != nil {
		if errors.Is(err, domain.ErrUnauthorized) {
			response.Error(w, http.StatusUnauthorized, "invalid refresh token")
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Register creates a new user account and sends a verification email.
//
// @Summary      Register
// @Description  Create a new user account with email and password. A verification email is sent to the provided address. The account must be verified before sign-in is allowed.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      RegisterInput  true  "Registration data"
// @Success      201   "Account created. Verification email sent."
// @Failure      400   {object}  response.ErrorResponse  "Missing, malformed, or invalid fields"
// @Failure      409   {object}  response.ErrorResponse  "Email already in use"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /api/auth/register [post]
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var input RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if !emailRegex.MatchString(input.Email) {
		response.Error(w, http.StatusBadRequest, "invalid email address")
		return
	}

	if len(input.Password) < 8 {
		response.Error(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	if err := h.svc.Register(r.Context(), input); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			response.Error(w, http.StatusConflict, "email already in use")
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// VerifyEmail marks a user's email as verified and redirects to the frontend confirmation page.
//
// @Summary      Verify email
// @Description  Confirm a user's email address using the token from the verification email. The token is single-use and expires in 24 hours. On success, redirects to the frontend /email-verified page.
// @Tags         auth
// @Produce      json
// @Param        token  query     string  true  "Verification token"
// @Success      303    "Redirect to frontend /email-verified page"
// @Failure      400    {object}  response.ErrorResponse  "Missing, invalid, expired, or already-used token"
// @Failure      500    {object}  response.ErrorResponse  "Internal server error"
// @Router       /api/auth/verify-email [get]
func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		response.Error(w, http.StatusBadRequest, "token is required")
		return
	}

	if err := h.svc.VerifyEmail(r.Context(), token); err != nil {
		if errors.Is(err, domain.ErrNotFound) || errors.Is(err, domain.ErrBadRequest) {
			response.Error(w, http.StatusBadRequest, "invalid or expired verification token")
			return
		}
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}

	http.Redirect(w, r, h.frontendURL+"/email-verified", http.StatusSeeOther)
}
