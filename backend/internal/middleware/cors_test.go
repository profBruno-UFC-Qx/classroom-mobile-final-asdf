package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCORS(t *testing.T) {
	allowedOrigins := []string{"http://localhost:4200", "http://192.168.100.4:4200"}
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := CORS(allowedOrigins)(next)

	tests := []struct {
		name                    string
		method                  string
		origin                  string
		expectedStatus          int
		expectAllowOriginHeader bool
		expectedAllowOrigin     string
	}{
		{
			name:                    "allowed origin localhost",
			method:                  http.MethodGet,
			origin:                  "http://localhost:4200",
			expectedStatus:          http.StatusOK,
			expectAllowOriginHeader: true,
			expectedAllowOrigin:     "http://localhost:4200",
		},
		{
			name:                    "allowed origin LAN IP",
			method:                  http.MethodGet,
			origin:                  "http://192.168.100.4:4200",
			expectedStatus:          http.StatusOK,
			expectAllowOriginHeader: true,
			expectedAllowOrigin:     "http://192.168.100.4:4200",
		},
		{
			name:                    "disallowed origin",
			method:                  http.MethodGet,
			origin:                  "http://evil.example.com",
			expectedStatus:          http.StatusOK,
			expectAllowOriginHeader: false,
		},
		{
			name:                    "no origin header",
			method:                  http.MethodGet,
			origin:                  "",
			expectedStatus:          http.StatusOK,
			expectAllowOriginHeader: false,
		},
		{
			name:                    "OPTIONS preflight allowed origin",
			method:                  http.MethodOptions,
			origin:                  "http://localhost:4200",
			expectedStatus:          http.StatusNoContent,
			expectAllowOriginHeader: true,
			expectedAllowOrigin:     "http://localhost:4200",
		},
		{
			name:                    "OPTIONS preflight disallowed origin",
			method:                  http.MethodOptions,
			origin:                  "http://evil.example.com",
			expectedStatus:          http.StatusNoContent,
			expectAllowOriginHeader: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.expectAllowOriginHeader {
				assert.Equal(t, tt.expectedAllowOrigin, w.Header().Get("Access-Control-Allow-Origin"))
				assert.Equal(t, "Origin", w.Header().Get("Vary"))
			} else {
				assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
			}
		})
	}
}
