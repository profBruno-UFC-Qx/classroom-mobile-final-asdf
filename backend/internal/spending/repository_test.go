package spending_test

import (
	"context"
	"testing"
	"time"

	"cofi-finance/backend/internal/domain"
	"cofi-finance/backend/internal/spending"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRepository_Create(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	obs := "some note"
	now := time.Now()
	uuid := "550e8400-e29b-41d4-a716-446655440000"

	rows := sqlmock.NewRows([]string{
		"id", "user_id", "name", "category", "price", "observation", "spent_at", "order_number", "created_at", "updated_at",
	}).AddRow(uuid, 10, "Groceries", "Food", 45.50, &obs, now, 1, now, now)

	mock.ExpectQuery(`INSERT INTO spendings`).
		WithArgs(int64(10), "Groceries", "Food", 45.50, &obs, sqlmock.AnyArg()).
		WillReturnRows(rows)

	repo := spending.NewRepository(db)
	s := &spending.Spending{
		UserID:      10,
		Name:        "Groceries",
		Category:    "Food",
		Price:       45.50,
		Observation: &obs,
		SpentAt:     now,
	}

	got, err := repo.Create(context.Background(), s)
	require.NoError(t, err)
	assert.Equal(t, uuid, got.ID)
	assert.Equal(t, int64(10), got.UserID)
	assert.Equal(t, "Groceries", got.Name)
	assert.Equal(t, "Food", got.Category)
	assert.Equal(t, 45.50, got.Price)
	assert.Equal(t, &obs, got.Observation)
	assert.Equal(t, 1, got.OrderNumber)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func newSpendingRows(now time.Time) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "user_id", "name", "category", "price", "observation", "spent_at", "order_number", "created_at", "updated_at",
	}).
		AddRow("uuid-2", 10, "Netflix", "Entertainment", 15.99, nil, now, 2, now, now).
		AddRow("uuid-1", 10, "Groceries", "Food", 45.50, nil, now, 1, now, now)
}

func TestRepository_GetByUserID(t *testing.T) {
	now := time.Now()
	from := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 31, 23, 59, 59, int(time.Nanosecond-1), time.UTC)

	tests := []struct {
		name      string
		userID    int64
		filter    spending.SpendingFilter
		setupMock func(mock sqlmock.Sqlmock)
		wantLen   int
		wantEmpty bool
	}{
		{
			name:   "no filter returns all rows",
			userID: 10,
			filter: spending.SpendingFilter{},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`SELECT id, user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at FROM spendings WHERE user_id = \$1`).
					WithArgs(int64(10)).
					WillReturnRows(newSpendingRows(now))
			},
			wantLen: 2,
		},
		{
			name:   "no filter returns empty slice",
			userID: 99,
			filter: spending.SpendingFilter{},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`SELECT id, user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at FROM spendings WHERE user_id = \$1`).
					WithArgs(int64(99)).
					WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "name", "category", "price", "observation", "spent_at", "order_number", "created_at", "updated_at"}))
			},
			wantEmpty: true,
		},
		{
			name:   "from filter adds created_at >= clause",
			userID: 10,
			filter: spending.SpendingFilter{From: &from},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`SELECT id, user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at FROM spendings WHERE user_id = \$1 AND created_at >= \$2`).
					WithArgs(int64(10), from).
					WillReturnRows(newSpendingRows(now))
			},
			wantLen: 2,
		},
		{
			name:   "to filter adds created_at <= clause",
			userID: 10,
			filter: spending.SpendingFilter{To: &to},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`SELECT id, user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at FROM spendings WHERE user_id = \$1 AND created_at <= \$2`).
					WithArgs(int64(10), to).
					WillReturnRows(newSpendingRows(now))
			},
			wantLen: 2,
		},
		{
			name:   "from and to filter adds both clauses",
			userID: 10,
			filter: spending.SpendingFilter{From: &from, To: &to},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`SELECT id, user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at FROM spendings WHERE user_id = \$1 AND created_at >= \$2 AND created_at <= \$3`).
					WithArgs(int64(10), from, to).
					WillReturnRows(newSpendingRows(now))
			},
			wantLen: 2,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tc.setupMock(mock)

			repo := spending.NewRepository(db)
			got, err := repo.GetByUserID(context.Background(), tc.userID, tc.filter)
			require.NoError(t, err)

			if tc.wantEmpty {
				assert.NotNil(t, got)
				assert.Empty(t, got)
			} else {
				assert.Len(t, got, tc.wantLen)
			}
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestRepository_DeleteByID(t *testing.T) {
	tests := []struct {
		name      string
		id        string
		userID    int64
		setupMock func(mock sqlmock.Sqlmock)
		wantErr   error
	}{
		{
			name:   "success deletes row",
			id:     "uuid-1",
			userID: 10,
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectExec(`DELETE FROM spendings WHERE id = \$1 AND user_id = \$2`).
					WithArgs("uuid-1", int64(10)).
					WillReturnResult(sqlmock.NewResult(0, 1))
			},
			wantErr: nil,
		},
		{
			name:   "returns ErrNotFound when no rows affected",
			id:     "uuid-99",
			userID: 10,
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectExec(`DELETE FROM spendings WHERE id = \$1 AND user_id = \$2`).
					WithArgs("uuid-99", int64(10)).
					WillReturnResult(sqlmock.NewResult(0, 0))
			},
			wantErr: domain.ErrNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tc.setupMock(mock)

			repo := spending.NewRepository(db)
			err = repo.DeleteByID(context.Background(), tc.id, tc.userID)
			if tc.wantErr != nil {
				assert.ErrorIs(t, err, tc.wantErr)
			} else {
				assert.NoError(t, err)
			}
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestRepository_Update(t *testing.T) {
	now := time.Now()
	obs := "updated note"

	tests := []struct {
		name      string
		id        string
		userID    int64
		input     spending.UpdateSpendingInput
		setupMock func(mock sqlmock.Sqlmock)
		wantErr   error
	}{
		{
			name:   "success returns updated spending",
			id:     "uuid-1",
			userID: 10,
			input:  spending.UpdateSpendingInput{Name: "Coffee", Category: "Food", Price: 4.00, Observation: &obs, SpentAt: now},
			setupMock: func(mock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{
					"id", "user_id", "name", "category", "price", "observation", "spent_at", "order_number", "created_at", "updated_at",
				}).AddRow("uuid-1", 10, "Coffee", "Food", 4.00, &obs, now, 1, now, now)

				mock.ExpectQuery(`UPDATE spendings`).
					WithArgs("Coffee", "Food", 4.00, &obs, now, "uuid-1", int64(10)).
					WillReturnRows(rows)
			},
			wantErr: nil,
		},
		{
			name:   "returns ErrNotFound when no rows matched",
			id:     "uuid-99",
			userID: 10,
			input:  spending.UpdateSpendingInput{Name: "Coffee", Category: "Food", Price: 4.00, SpentAt: now},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(`UPDATE spendings`).
					WithArgs("Coffee", "Food", 4.00, nil, now, "uuid-99", int64(10)).
					WillReturnError(sqlmock.ErrCancelled)
			},
			wantErr: domain.ErrNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tc.setupMock(mock)

			repo := spending.NewRepository(db)
			got, err := repo.Update(context.Background(), tc.id, tc.userID, tc.input)

			if tc.wantErr != nil {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, "uuid-1", got.ID)
				assert.Equal(t, "Coffee", got.Name)
				assert.Equal(t, 4.00, got.Price)
				assert.Equal(t, 1, got.OrderNumber)
			}
		})
	}
}
