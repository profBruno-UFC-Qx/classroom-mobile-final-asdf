package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	AllowedOrigins []string
	Env            string
	RedisURL       string
	ResendAPIKey          string
	AppURL                string
	FrontendURL           string
	EmailVerificationTTL  time.Duration
	RateLimitGlobal       int
	RateLimitAuth         int
}

func Load() *Config {
	return &Config{
		Port:                  getEnv("PORT", "8080"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/cofi_finance?sslmode=disable"),
		JWTSecret:             getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		AllowedOrigins:        parseOrigins(getEnv("ALLOWED_ORIGIN", "http://localhost:4200")),
		Env:                   getEnv("ENV", "development"),
		RedisURL:              getEnv("REDIS_URL", "redis://localhost:6379"),
		ResendAPIKey:          getEnv("RESEND_API_KEY", ""),
		AppURL:                getEnv("APP_URL", "http://localhost:8080"),
		FrontendURL:           getEnv("FRONTEND_URL", "http://localhost:4200"),
		EmailVerificationTTL:  parseDuration(getEnv("EMAIL_VERIFICATION_TTL", "24h"), 24*time.Hour),
		RateLimitGlobal:       parseInt(getEnv("RATE_LIMIT_GLOBAL", "200"), 200),
		RateLimitAuth:         parseInt(getEnv("RATE_LIMIT_AUTH", "10"), 10),
	}
}

func parseInt(s string, fallback int) int {
	if n, err := strconv.Atoi(s); err == nil && n > 0 {
		return n
	}
	return fallback
}

func parseDuration(s string, fallback time.Duration) time.Duration {
	if d, err := time.ParseDuration(s); err == nil && d > 0 {
		return d
	}
	return fallback
}

func (c *Config) IsDev() bool {
	return c.Env == "development"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseOrigins(s string) []string {
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
