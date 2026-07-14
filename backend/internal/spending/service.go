package spending

import (
	"context"
	"time"

	"cofi-finance/backend/internal/domain"
)

type service struct {
	repo Repository
}

// NewService returns a new spending Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// Create validates the input and creates a new spending for the given user.
func (s *service) Create(ctx context.Context, userID int64, input CreateSpendingInput) (*Spending, error) {
	if input.Name == "" {
		return nil, domain.ErrBadRequest
	}
	if len(input.Name) > 50 {
		return nil, domain.ErrBadRequest
	}
	if input.Category == "" {
		return nil, domain.ErrBadRequest
	}
	if len(input.Category) > 50 {
		return nil, domain.ErrBadRequest
	}
	if input.Price <= 0 {
		return nil, domain.ErrBadRequest
	}
	if input.Observation != nil && len(*input.Observation) > 200 {
		return nil, domain.ErrBadRequest
	}

	spentAt := time.Now()
	if input.SpentAt != nil {
		spentAt = *input.SpentAt
	}

	sp := &Spending{
		UserID:      userID,
		Name:        input.Name,
		Category:    input.Category,
		Price:       input.Price,
		Observation: input.Observation,
		SpentAt:     spentAt,
	}
	return s.repo.Create(ctx, sp)
}

// GetByUserID delegates to the repository.
func (s *service) GetByUserID(ctx context.Context, userID int64, filter SpendingFilter) ([]Spending, error) {
	return s.repo.GetByUserID(ctx, userID, filter)
}

// Delete removes a spending by ID for the given user.
func (s *service) Delete(ctx context.Context, userID int64, id string) error {
	return s.repo.DeleteByID(ctx, id, userID)
}

// Update validates the input and updates an existing spending for the given user.
func (s *service) Update(ctx context.Context, userID int64, id string, input UpdateSpendingInput) (*Spending, error) {
	if input.Name == "" {
		return nil, domain.ErrBadRequest
	}
	if len(input.Name) > 50 {
		return nil, domain.ErrBadRequest
	}
	if input.Category == "" {
		return nil, domain.ErrBadRequest
	}
	if len(input.Category) > 50 {
		return nil, domain.ErrBadRequest
	}
	if input.Price <= 0 {
		return nil, domain.ErrBadRequest
	}
	if input.Observation != nil && len(*input.Observation) > 200 {
		return nil, domain.ErrBadRequest
	}
	return s.repo.Update(ctx, id, userID, input)
}
