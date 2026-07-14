package spending

import "time"

// CreateSpendingInput holds the data required to create a new spending.
type CreateSpendingInput struct {
	Name        string     `json:"name"`
	Category    string     `json:"category"`
	Price       float64    `json:"price"`
	Observation *string    `json:"observation,omitempty"`
	SpentAt     *time.Time `json:"spent_at,omitempty" example:"2026-03-15T00:00:00Z"`
}

// UpdateSpendingInput holds the data required to update an existing spending.
type UpdateSpendingInput struct {
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Price       float64   `json:"price"`
	Observation *string   `json:"observation"`
	// SpentAt must be in RFC3339 format (e.g. 2026-03-15T00:00:00Z).
	SpentAt time.Time `json:"spent_at" example:"2026-03-15T00:00:00Z"`
}

// SpendingFilter holds optional date range filters for listing spendings.
type SpendingFilter struct {
	From *time.Time
	To   *time.Time
}
