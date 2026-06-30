package spending

import (
	"context"
	"database/sql"
	"fmt"

	"cofi-finance/backend/internal/domain"
)

type repository struct {
	db *sql.DB
}

// NewRepository returns a new spending Repository backed by the given database.
func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

// Create inserts a new spending record and returns the created row.
func (r *repository) Create(ctx context.Context, s *Spending) (*Spending, error) {
	const query = `
		INSERT INTO spendings (user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at)
		SELECT $1, $2, $3, $4, $5, $6,
		  COALESCE(MAX(order_number), 0) + 1,
		  NOW(), NOW()
		FROM spendings
		WHERE user_id = $1
		  AND DATE_TRUNC('month', spent_at) = DATE_TRUNC('month', $6::timestamptz)
		RETURNING id, user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at`

	created := &Spending{}
	err := r.db.QueryRowContext(ctx, query,
		s.UserID, s.Name, s.Category, s.Price, s.Observation, s.SpentAt,
	).Scan(
		&created.ID,
		&created.UserID,
		&created.Name,
		&created.Category,
		&created.Price,
		&created.Observation,
		&created.SpentAt,
		&created.OrderNumber,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return created, nil
}

// GetByUserID returns all spendings for the given user, ordered by order_number ascending.
// Optional date range filters can be applied via filter.From and filter.To.
func (r *repository) GetByUserID(ctx context.Context, userID int64, filter SpendingFilter) ([]Spending, error) {
	args := []interface{}{userID}
	where := "user_id = $1"

	if filter.From != nil {
		args = append(args, *filter.From)
		where += fmt.Sprintf(" AND created_at >= $%d", len(args))
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		where += fmt.Sprintf(" AND created_at <= $%d", len(args))
	}

	query := `SELECT id, user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at FROM spendings WHERE ` + where + ` ORDER BY order_number ASC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	spendings := []Spending{}
	for rows.Next() {
		var s Spending
		if err := rows.Scan(
			&s.ID,
			&s.UserID,
			&s.Name,
			&s.Category,
			&s.Price,
			&s.Observation,
			&s.SpentAt,
			&s.OrderNumber,
			&s.CreatedAt,
			&s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		spendings = append(spendings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return spendings, nil
}

// DeleteByID deletes the spending with the given id belonging to userID.
// Returns domain.ErrNotFound if no matching row exists.
func (r *repository) DeleteByID(ctx context.Context, id string, userID int64) error {
	const query = `DELETE FROM spendings WHERE id = $1 AND user_id = $2`

	result, err := r.db.ExecContext(ctx, query, id, userID)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// Update updates an existing spending and returns the updated row.
// Returns domain.ErrNotFound if no matching row exists.
func (r *repository) Update(ctx context.Context, id string, userID int64, input UpdateSpendingInput) (*Spending, error) {
	const query = `
		UPDATE spendings
		SET name=$1, category=$2, price=$3, observation=$4, spent_at=$5, updated_at=NOW()
		WHERE id=$6 AND user_id=$7
		RETURNING id, user_id, name, category, price, observation, spent_at, order_number, created_at, updated_at`

	updated := &Spending{}
	err := r.db.QueryRowContext(ctx, query,
		input.Name, input.Category, input.Price, input.Observation, input.SpentAt, id, userID,
	).Scan(
		&updated.ID,
		&updated.UserID,
		&updated.Name,
		&updated.Category,
		&updated.Price,
		&updated.Observation,
		&updated.SpentAt,
		&updated.OrderNumber,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return updated, nil
}
