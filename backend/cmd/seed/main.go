package main

import (
	"database/sql"
	"log"
	"os"

	"cofi-finance/backend/internal/platform/config"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type seedUser struct {
	email    string
	password string
}

var users = []seedUser{
	{email: "lucas@mail.com", password: "asdfasdf"},
}

func main() {
	cfg := config.Load()

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("opening database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("pinging database: %v", err)
	}

	for _, u := range users {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("hashing password for %s: %v", u.email, err)
		}

		_, err = db.Exec(
			`INSERT INTO users (email, password_hash) VALUES ($1, $2)
			 ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
			u.email, string(hash),
		)
		if err != nil {
			log.Fatalf("inserting user %s: %v", u.email, err)
		}
		log.Printf("seeded user: %s", u.email)
	}

	log.Printf("seed complete — %d user(s) created", len(users))
	os.Exit(0)
}
