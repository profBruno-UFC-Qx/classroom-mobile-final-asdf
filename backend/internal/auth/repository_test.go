package auth_test

import (
	"context"
	"testing"
	"time"

	"cofi-finance/backend/internal/auth"
	"cofi-finance/backend/internal/domain"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRepository_GetByEmail(t *testing.T) {
	verifiedAt := time.Now()

	tests := []struct {
		name    string
		email   string
		setup   func(mock sqlmock.Sqlmock)
		want    *auth.User
		wantErr error
	}{
		{
			name:  "returns verified user when found",
			email: "user@example.com",
			setup: func(mock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{"id", "email", "password_hash", "email_verified_at"}).
					AddRow(1, "user@example.com", "$2a$10$hash", verifiedAt)
				mock.ExpectQuery(`SELECT id, email, password_hash, email_verified_at FROM users WHERE email = \$1`).
					WithArgs("user@example.com").
					WillReturnRows(rows)
			},
			want: &auth.User{ID: 1, Email: "user@example.com", PasswordHash: "$2a$10$hash", EmailVerifiedAt: &verifiedAt},
		},
		{
			name:  "returns unverified user when email_verified_at is NULL",
			email: "unverified@example.com",
			setup: func(mock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{"id", "email", "password_hash", "email_verified_at"}).
					AddRow(2, "unverified@example.com", "$2a$10$hash", nil)
				mock.ExpectQuery(`SELECT id, email, password_hash, email_verified_at FROM users WHERE email = \$1`).
					WithArgs("unverified@example.com").
					WillReturnRows(rows)
			},
			want: &auth.User{ID: 2, Email: "unverified@example.com", PasswordHash: "$2a$10$hash", EmailVerifiedAt: nil},
		},
		{
			name:  "returns ErrNotFound when user does not exist",
			email: "ghost@example.com",
			setup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`SELECT id, email, password_hash, email_verified_at FROM users WHERE email = \$1`).
					WithArgs("ghost@example.com").
					WillReturnRows(sqlmock.NewRows([]string{"id", "email", "password_hash", "email_verified_at"}))
			},
			wantErr: domain.ErrNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tc.setup(mock)

			repo := auth.NewRepository(db)
			got, err := repo.GetByEmail(context.Background(), tc.email)

			if tc.wantErr != nil {
				assert.ErrorIs(t, err, tc.wantErr)
				assert.Nil(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.want.ID, got.ID)
				assert.Equal(t, tc.want.Email, got.Email)
				assert.Equal(t, tc.want.PasswordHash, got.PasswordHash)
				if tc.want.EmailVerifiedAt == nil {
					assert.Nil(t, got.EmailVerifiedAt)
				} else {
					assert.NotNil(t, got.EmailVerifiedAt)
				}
			}
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestRepository_GetByID(t *testing.T) {
	tests := []struct {
		name    string
		id      int64
		setup   func(mock sqlmock.Sqlmock)
		want    *auth.User
		wantErr error
	}{
		{
			name: "returns user when found",
			id:   1,
			setup: func(mock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{"id", "email"}).
					AddRow(1, "user@example.com")
				mock.ExpectQuery(`SELECT id, email FROM users WHERE id = \$1`).
					WithArgs(int64(1)).
					WillReturnRows(rows)
			},
			want: &auth.User{ID: 1, Email: "user@example.com"},
		},
		{
			name: "returns ErrNotFound when user does not exist",
			id:   99,
			setup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`SELECT id, email FROM users WHERE id = \$1`).
					WithArgs(int64(99)).
					WillReturnRows(sqlmock.NewRows([]string{"id", "email"}))
			},
			wantErr: domain.ErrNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tc.setup(mock)

			repo := auth.NewRepository(db)
			got, err := repo.GetByID(context.Background(), tc.id)

			if tc.wantErr != nil {
				assert.ErrorIs(t, err, tc.wantErr)
				assert.Nil(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.want, got)
			}
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestRepository_Create(t *testing.T) {
	tests := []struct {
		name         string
		email        string
		passwordHash string
		setup        func(mock sqlmock.Sqlmock)
		want         *auth.User
		wantErr      error
	}{
		{
			name:         "returns created user on successful insert",
			email:        "new@example.com",
			passwordHash: "$2a$10$hash",
			setup: func(mock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{"id", "email"}).
					AddRow(1, "new@example.com")
				mock.ExpectQuery(`INSERT INTO users \(email, password_hash\) VALUES \(\$1, \$2\) RETURNING id, email`).
					WithArgs("new@example.com", "$2a$10$hash").
					WillReturnRows(rows)
			},
			want: &auth.User{ID: 1, Email: "new@example.com"},
		},
		{
			name:         "returns ErrConflict on duplicate email",
			email:        "taken@example.com",
			passwordHash: "$2a$10$hash",
			setup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`INSERT INTO users \(email, password_hash\) VALUES \(\$1, \$2\) RETURNING id, email`).
					WithArgs("taken@example.com", "$2a$10$hash").
					WillReturnError(&pq.Error{Code: "23505"})
			},
			wantErr: domain.ErrConflict,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tc.setup(mock)

			repo := auth.NewRepository(db)
			got, err := repo.Create(context.Background(), tc.email, tc.passwordHash)

			if tc.wantErr != nil {
				assert.ErrorIs(t, err, tc.wantErr)
				assert.Nil(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.want, got)
			}
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestRepository_MarkEmailVerified(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(mock sqlmock.Sqlmock)
		wantErr bool
	}{
		{
			name: "updates email_verified_at for user",
			setup: func(mock sqlmock.Sqlmock) {
				mock.ExpectExec(`UPDATE users SET email_verified_at`).
					WithArgs(int64(10)).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
		},
		{
			name: "propagates database error",
			setup: func(mock sqlmock.Sqlmock) {
				mock.ExpectExec(`UPDATE users SET email_verified_at`).
					WithArgs(int64(10)).
					WillReturnError(assert.AnError)
			},
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tc.setup(mock)

			repo := auth.NewRepository(db)
			err = repo.MarkEmailVerified(context.Background(), 10)

			if tc.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
			}
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
