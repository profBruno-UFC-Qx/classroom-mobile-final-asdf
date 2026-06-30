package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"cofi-finance/backend/internal/platform/config"
	_ "github.com/lib/pq"
)

const migrationsDir = "migrations"

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: migrate <up|down>")
	}
	direction := os.Args[1]

	cfg := config.Load()
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("opening database: %v", err)
	}
	defer db.Close()

	if err := ensureMigrationsTable(db); err != nil {
		log.Fatalf("creating migrations table: %v", err)
	}

	switch direction {
	case "up":
		if err := migrateUp(db); err != nil {
			log.Fatalf("migrate up: %v", err)
		}
	case "down":
		if err := migrateDown(db); err != nil {
			log.Fatalf("migrate down: %v", err)
		}
	default:
		log.Fatalf("unknown direction %q — use 'up' or 'down'", direction)
	}
}

func ensureMigrationsTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func migrateUp(db *sql.DB) error {
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.up.sql"))
	if err != nil {
		return err
	}
	sort.Strings(files)

	for _, f := range files {
		version := migrationVersion(f)
		var exists bool
		db.QueryRow(`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&exists)
		if exists {
			log.Printf("skip %s (already applied)", version)
			continue
		}

		content, err := os.ReadFile(f)
		if err != nil {
			return fmt.Errorf("reading %s: %w", f, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("applying %s: %w", f, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
		log.Printf("applied %s", version)
	}
	return nil
}

func migrateDown(db *sql.DB) error {
	var version string
	err := db.QueryRow(`SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1`).Scan(&version)
	if err == sql.ErrNoRows {
		log.Println("nothing to roll back")
		return nil
	}
	if err != nil {
		return err
	}

	downFile := filepath.Join(migrationsDir, version+".down.sql")
	content, err := os.ReadFile(downFile)
	if err != nil {
		return fmt.Errorf("reading %s: %w", downFile, err)
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec(string(content)); err != nil {
		tx.Rollback()
		return fmt.Errorf("rolling back %s: %w", version, err)
	}
	if _, err := tx.Exec(`DELETE FROM schema_migrations WHERE version = $1`, version); err != nil {
		tx.Rollback()
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	log.Printf("rolled back %s", version)
	return nil
}

func migrationVersion(path string) string {
	base := filepath.Base(path)
	return strings.TrimSuffix(base, ".up.sql")
}
