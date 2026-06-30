package auth

import (
	"context"
	"database/sql"
	"errors"

	"cofi-finance/backend/internal/domain"

	"github.com/lib/pq"
)

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetByEmail(ctx context.Context, email string) (*User, error) {
	u := &User{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, email_verified_at FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerifiedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *repository) GetByID(ctx context.Context, id int64) (*User, error) {
	u := &User{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *repository) Create(ctx context.Context, email, passwordHash string) (*User, error) {
	u := &User{}
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
		email, passwordHash,
	).Scan(&u.ID, &u.Email)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, domain.ErrConflict
		}
		return nil, err
	}
	return u, nil
}

func (r *repository) MarkEmailVerified(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
		userID,
	)
	return err
}
