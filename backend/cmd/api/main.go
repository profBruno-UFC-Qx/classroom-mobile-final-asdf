// @title           CoFi Finance API
// @version         1.0
// @description     SaaS finance management API.
// @host            localhost:8080
// @BasePath        /
// @schemes         http
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	_ "cofi-finance/backend/docs/swagger"
	"cofi-finance/backend/internal/auth"
	"cofi-finance/backend/internal/middleware"
	"cofi-finance/backend/internal/platform/config"
	"cofi-finance/backend/internal/platform/database"
	"cofi-finance/backend/internal/platform/email"
	platformredis "cofi-finance/backend/internal/platform/redis"
	"cofi-finance/backend/internal/spending"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
	"github.com/joho/godotenv"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

func main() {
	_ = godotenv.Load() // best-effort; missing .env is not an error
	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connecting to database: %v", err)
	}
	defer db.Close()

	redisClient, err := platformredis.Connect(cfg.RedisURL)
	if err != nil {
		log.Fatalf("connecting to redis: %v", err)
	}
	defer redisClient.Close()

	blacklist := platformredis.NewBlacklist(redisClient)

	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.CORS(cfg.AllowedOrigins))
	r.Use(httprate.LimitByIP(cfg.RateLimitGlobal, time.Minute))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	if cfg.IsDev() {
		r.Get("/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("/swagger/doc.json"),
		))
		log.Println("swagger UI available at http://localhost:" + cfg.Port + "/swagger/index.html")
	}

	r.Route("/api", func(r chi.Router) {
		authRepo := auth.NewRepository(db)
		emailClient := email.NewClient(cfg.ResendAPIKey)
		verifStore := platformredis.NewVerificationStore(redisClient)
		authSvc := auth.NewService(authRepo, cfg.JWTSecret, blacklist, emailClient, cfg.AppURL, verifStore, cfg.EmailVerificationTTL)
		authHandler := auth.NewHandler(authSvc, cfg.FrontendURL)
		auth.RegisterRoutes(r, authHandler, cfg.JWTSecret, blacklist, cfg.RateLimitAuth)

		spendingRepo := spending.NewRepository(db)
		spendingSvc := spending.NewService(spendingRepo)
		spendingHandler := spending.NewHandler(spendingSvc)
		spending.RegisterRoutes(r, spendingHandler, cfg.JWTSecret, blacklist)
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("server listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
