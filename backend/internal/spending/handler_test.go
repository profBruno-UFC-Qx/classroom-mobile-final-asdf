package spending_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cofi-finance/backend/internal/domain"
	"cofi-finance/backend/internal/middleware"
	"cofi-finance/backend/internal/spending"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockService is a test double for spending.Service.
type mockService struct {
	created   *spending.Spending
	createErr error
	spendings []spending.Spending
	listErr   error
	deleteErr error
	updated   *spending.Spending
	updateErr error
}

func (m *mockService) Create(_ context.Context, _ int64, _ spending.CreateSpendingInput) (*spending.Spending, error) {
	return m.created, m.createErr
}

func (m *mockService) GetByUserID(_ context.Context, _ int64, _ spending.SpendingFilter) ([]spending.Spending, error) {
	return m.spendings, m.listErr
}

func (m *mockService) Delete(_ context.Context, _ int64, _ string) error {
	return m.deleteErr
}

func (m *mockService) Update(_ context.Context, _ int64, _ string, _ spending.UpdateSpendingInput) (*spending.Spending, error) {
	return m.updated, m.updateErr
}

// noopBlacklist is a test double for middleware.BlacklistChecker that never blacklists.
type noopBlacklist struct{}

func (noopBlacklist) IsBlacklisted(_ context.Context, _ string) (bool, error) {
	return false, nil
}

// withAuthContext wraps a request with a valid auth context (userID=1).
func withAuthContext(r *http.Request) *http.Request {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   float64(1),
		"email": "user@example.com",
		"jti":   "test-jti",
		"exp":   time.Now().Add(time.Hour).Unix(),
	})
	signed, _ := token.SignedString([]byte("test"))

	handler := middleware.Authenticate("test", noopBlacklist{})(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		// capture context
		*r = *req
	}))
	w := httptest.NewRecorder()
	req := httptest.NewRequest(r.Method, r.URL.String(), r.Body)
	req.Header = r.Header.Clone()
	req.Header.Set("Authorization", "Bearer "+signed)
	handler.ServeHTTP(w, req)
	return r
}

func TestHandler_Create(t *testing.T) {
	now := time.Now()
	validSpending := &spending.Spending{
		ID: "550e8400-e29b-41d4-a716-446655440000", UserID: 1, Name: "Coffee", Category: "Food", Price: 3.50,
		OrderNumber: 1, SpentAt: now, CreatedAt: now, UpdatedAt: now,
	}

	tests := []struct {
		name       string
		body       any
		svc        *mockService
		noAuth     bool
		wantStatus int
	}{
		{
			name:       "401 when no auth context",
			body:       map[string]any{"name": "Coffee", "category": "Food", "price": 3.50},
			svc:        &mockService{},
			noAuth:     true,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "400 on invalid JSON body",
			body:       "not-json",
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 when service returns ErrBadRequest",
			body:       map[string]any{"name": "", "category": "Food", "price": 3.50},
			svc:        &mockService{createErr: domain.ErrBadRequest},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "500 when service returns unexpected error",
			body:       map[string]any{"name": "Coffee", "category": "Food", "price": 3.50},
			svc:        &mockService{createErr: errors.New("db error")},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:       "201 on success",
			body:       map[string]any{"name": "Coffee", "category": "Food", "price": 3.50},
			svc:        &mockService{created: validSpending},
			wantStatus: http.StatusCreated,
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

			r := httptest.NewRequest(http.MethodPost, "/api/spendings", bytes.NewReader(bodyBytes))
			r.Header.Set("Content-Type", "application/json")

			if !tc.noAuth {
				r = withAuthContext(r)
			}

			w := httptest.NewRecorder()
			handler := spending.NewHandler(tc.svc)
			handler.Create(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)
		})
	}
}

func TestHandler_GetByUserID(t *testing.T) {
	now := time.Now()
	spendings := []spending.Spending{
		{ID: "550e8400-e29b-41d4-a716-446655440000", UserID: 1, Name: "Coffee", Category: "Food", Price: 3.50, OrderNumber: 1, SpentAt: now, CreatedAt: now, UpdatedAt: now},
	}

	tests := []struct {
		name       string
		url        string
		svc        *mockService
		noAuth     bool
		wantStatus int
		wantArray  bool
	}{
		{
			name:       "401 when no auth context",
			url:        "/api/spendings",
			svc:        &mockService{},
			noAuth:     true,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "500 when service returns error",
			url:        "/api/spendings",
			svc:        &mockService{listErr: errors.New("db error")},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:       "200 with array on success",
			url:        "/api/spendings",
			svc:        &mockService{spendings: spendings},
			wantStatus: http.StatusOK,
			wantArray:  true,
		},
		{
			name:       "200 with from filter",
			url:        "/api/spendings?from=2026-03-01",
			svc:        &mockService{spendings: spendings},
			wantStatus: http.StatusOK,
			wantArray:  true,
		},
		{
			name:       "200 with to filter",
			url:        "/api/spendings?to=2026-03-31",
			svc:        &mockService{spendings: spendings},
			wantStatus: http.StatusOK,
			wantArray:  true,
		},
		{
			name:       "200 with from and to filters",
			url:        "/api/spendings?from=2026-03-01&to=2026-03-31",
			svc:        &mockService{spendings: spendings},
			wantStatus: http.StatusOK,
			wantArray:  true,
		},
		{
			name:       "400 on invalid from date",
			url:        "/api/spendings?from=not-a-date",
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 on invalid to date",
			url:        "/api/spendings?to=not-a-date",
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, tc.url, nil)

			if !tc.noAuth {
				r = withAuthContext(r)
			}

			w := httptest.NewRecorder()
			handler := spending.NewHandler(tc.svc)
			handler.GetByUserID(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)

			if tc.wantArray {
				var resp map[string]any
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				data, ok := resp["data"].([]any)
				assert.True(t, ok, "expected data array in response")
				assert.Len(t, data, 1)
			}
		})
	}
}

func TestHandler_Delete(t *testing.T) {
	tests := []struct {
		name       string
		id         string
		svc        *mockService
		noAuth     bool
		wantStatus int
	}{
		{
			name:       "401 when no auth context",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			svc:        &mockService{},
			noAuth:     true,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "404 when service returns ErrNotFound",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			svc:        &mockService{deleteErr: domain.ErrNotFound},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "500 when service returns unexpected error",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			svc:        &mockService{deleteErr: errors.New("db error")},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:       "204 on success",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			svc:        &mockService{},
			wantStatus: http.StatusNoContent,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodDelete, "/api/spendings/"+tc.id, nil)

			if !tc.noAuth {
				r = withAuthContext(r)
			}

			chiCtx := chi.NewRouteContext()
			chiCtx.URLParams.Add("id", tc.id)
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, chiCtx))

			w := httptest.NewRecorder()
			handler := spending.NewHandler(tc.svc)
			handler.Delete(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)
		})
	}
}

func TestHandler_Update(t *testing.T) {
	now := time.Now()
	validSpending := &spending.Spending{
		ID: "550e8400-e29b-41d4-a716-446655440000", UserID: 1, Name: "Coffee", Category: "Food", Price: 3.50,
		OrderNumber: 1, SpentAt: now, CreatedAt: now, UpdatedAt: now,
	}
	validBody := map[string]any{
		"name": "Coffee", "category": "Food", "price": 3.50, "spent_at": now.Format(time.RFC3339),
	}

	tests := []struct {
		name       string
		id         string
		body       any
		svc        *mockService
		noAuth     bool
		wantStatus int
	}{
		{
			name:       "401 when no auth context",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			body:       validBody,
			svc:        &mockService{},
			noAuth:     true,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "400 on invalid JSON body",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			body:       "not-json",
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 when service returns ErrBadRequest",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			body:       validBody,
			svc:        &mockService{updateErr: domain.ErrBadRequest},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "404 when service returns ErrNotFound",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			body:       validBody,
			svc:        &mockService{updateErr: domain.ErrNotFound},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "500 when service returns unexpected error",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			body:       validBody,
			svc:        &mockService{updateErr: errors.New("db error")},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:       "400 on plain date format for spent_at (YYYY-MM-DD)",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			body:       map[string]any{"name": "Coffee", "category": "Food", "price": 3.50, "spent_at": "2026-03-15"},
			svc:        &mockService{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "200 on success",
			id:         "550e8400-e29b-41d4-a716-446655440000",
			body:       validBody,
			svc:        &mockService{updated: validSpending},
			wantStatus: http.StatusOK,
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

			r := httptest.NewRequest(http.MethodPatch, "/api/spendings/"+tc.id, bytes.NewReader(bodyBytes))
			r.Header.Set("Content-Type", "application/json")

			if !tc.noAuth {
				r = withAuthContext(r)
			}

			chiCtx := chi.NewRouteContext()
			chiCtx.URLParams.Add("id", tc.id)
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, chiCtx))

			w := httptest.NewRecorder()
			handler := spending.NewHandler(tc.svc)
			handler.Update(w, r)

			assert.Equal(t, tc.wantStatus, w.Code)
		})
	}
}
