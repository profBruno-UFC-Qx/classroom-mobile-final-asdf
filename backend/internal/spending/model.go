package spending

import "time"

// Spending represents a user's spending record.
type Spending struct {
	ID          string    `json:"id"`
	UserID      int64     `json:"user_id"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Price       float64   `json:"price"`
	Observation *string   `json:"observation"`
	SpentAt     time.Time `json:"spent_at" example:"2026-03-15T00:00:00Z"`
	OrderNumber int       `json:"order_number"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
