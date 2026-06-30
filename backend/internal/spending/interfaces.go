package spending

import "context"

// Repository is the data-access contract for the spending domain.
type Repository interface {
	Create(ctx context.Context, s *Spending) (*Spending, error)
	GetByUserID(ctx context.Context, userID int64, filter SpendingFilter) ([]Spending, error)
	DeleteByID(ctx context.Context, id string, userID int64) error
	Update(ctx context.Context, id string, userID int64, input UpdateSpendingInput) (*Spending, error)
}

// Service is the business-logic contract for the spending domain.
type Service interface {
	Create(ctx context.Context, userID int64, input CreateSpendingInput) (*Spending, error)
	GetByUserID(ctx context.Context, userID int64, filter SpendingFilter) ([]Spending, error)
	Delete(ctx context.Context, userID int64, id string) error
	Update(ctx context.Context, userID int64, id string, input UpdateSpendingInput) (*Spending, error)
}
