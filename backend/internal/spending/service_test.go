package spending_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"cofi-finance/backend/internal/domain"
	"cofi-finance/backend/internal/spending"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockRepository is a test double for spending.Repository.
type mockRepository struct {
	created      *spending.Spending
	createErr    error
	spendings    []spending.Spending
	listErr      error
	deleteErr    error
	updated      *spending.Spending
	updateErr    error
	createCalled bool
	deleteCalled bool
	updateCalled bool
}

func (m *mockRepository) Create(_ context.Context, s *spending.Spending) (*spending.Spending, error) {
	m.createCalled = true
	return m.created, m.createErr
}

func (m *mockRepository) GetByUserID(_ context.Context, _ int64, _ spending.SpendingFilter) ([]spending.Spending, error) {
	return m.spendings, m.listErr
}

func (m *mockRepository) DeleteByID(_ context.Context, _ string, _ int64) error {
	m.deleteCalled = true
	return m.deleteErr
}

func (m *mockRepository) Update(_ context.Context, _ string, _ int64, _ spending.UpdateSpendingInput) (*spending.Spending, error) {
	m.updateCalled = true
	return m.updated, m.updateErr
}

func TestService_Create(t *testing.T) {
	obs := "a note"
	tooLongObs := string(make([]byte, 201))
	now := time.Now()
	expected := &spending.Spending{
		ID: "550e8400-e29b-41d4-a716-446655440000", UserID: 5, Name: "Coffee", Category: "Food", Price: 3.50, Observation: &obs,
		OrderNumber: 1, SpentAt: now, CreatedAt: now, UpdatedAt: now,
	}

	tests := []struct {
		name       string
		input      spending.CreateSpendingInput
		repo       *mockRepository
		wantErr    bool
		wantErrIs  error
		wantCalled bool
	}{
		{
			name:       "valid input creates spending",
			input:      spending.CreateSpendingInput{Name: "Coffee", Category: "Food", Price: 3.50, Observation: &obs},
			repo:       &mockRepository{created: expected},
			wantCalled: true,
		},
		{
			name:      "empty name returns bad request",
			input:     spending.CreateSpendingInput{Name: "", Category: "Food", Price: 10},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "empty category returns bad request",
			input:     spending.CreateSpendingInput{Name: "Coffee", Category: "", Price: 10},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "zero price returns bad request",
			input:     spending.CreateSpendingInput{Name: "Coffee", Category: "Food", Price: 0},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "name too long returns bad request",
			input:     spending.CreateSpendingInput{Name: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Category: "Food", Price: 10},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "category too long returns bad request",
			input:     spending.CreateSpendingInput{Name: "Coffee", Category: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Price: 10},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "observation too long returns bad request",
			input:     spending.CreateSpendingInput{Name: "Coffee", Category: "Food", Price: 10, Observation: &tooLongObs},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := spending.NewService(tc.repo)
			got, err := svc.Create(context.Background(), 5, tc.input)
			if tc.wantErr {
				assert.Error(t, err)
				if tc.wantErrIs != nil {
					assert.ErrorIs(t, err, tc.wantErrIs)
				}
				assert.False(t, tc.repo.createCalled)
			} else {
				require.NoError(t, err)
				assert.Equal(t, expected, got)
				assert.True(t, tc.repo.createCalled)
			}
		})
	}
}

func TestService_GetByUserID(t *testing.T) {
	from := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 31, 23, 59, 59, 0, time.UTC)
	expected := []spending.Spending{
		{ID: "uuid-1", UserID: 5, Name: "Coffee", Category: "Food", Price: 3.50},
	}

	tests := []struct {
		name          string
		repo          *mockRepository
		filter        spending.SpendingFilter
		wantSpendings []spending.Spending
		wantErr       bool
	}{
		{
			name:          "returns spendings for user",
			repo:          &mockRepository{spendings: expected},
			filter:        spending.SpendingFilter{},
			wantSpendings: expected,
		},
		{
			name:          "returns spendings with date filter",
			repo:          &mockRepository{spendings: expected},
			filter:        spending.SpendingFilter{From: &from, To: &to},
			wantSpendings: expected,
		},
		{
			name:    "propagates repository error",
			repo:    &mockRepository{listErr: errors.New("db error")},
			filter:  spending.SpendingFilter{},
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := spending.NewService(tc.repo)
			got, err := svc.GetByUserID(context.Background(), 5, tc.filter)
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.wantSpendings, got)
			}
		})
	}
}

func TestService_Delete(t *testing.T) {
	tests := []struct {
		name       string
		repo       *mockRepository
		wantErr    bool
		wantErrIs  error
		wantCalled bool
	}{
		{
			name:       "deletes successfully",
			repo:       &mockRepository{},
			wantCalled: true,
		},
		{
			name:       "propagates not found error",
			repo:       &mockRepository{deleteErr: domain.ErrNotFound},
			wantErr:    true,
			wantErrIs:  domain.ErrNotFound,
			wantCalled: true,
		},
		{
			name:       "propagates repository error",
			repo:       &mockRepository{deleteErr: errors.New("db error")},
			wantErr:    true,
			wantCalled: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := spending.NewService(tc.repo)
			err := svc.Delete(context.Background(), 10, "uuid-1")
			if tc.wantErr {
				assert.Error(t, err)
				if tc.wantErrIs != nil {
					assert.ErrorIs(t, err, tc.wantErrIs)
				}
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, tc.wantCalled, tc.repo.deleteCalled)
		})
	}
}

func TestService_Update(t *testing.T) {
	now := time.Now()
	tooLongObs := string(make([]byte, 201))
	expected := &spending.Spending{
		ID: "uuid-1", UserID: 5, Name: "Coffee Updated", Category: "Food", Price: 4.00,
		OrderNumber: 1, SpentAt: now, CreatedAt: now, UpdatedAt: now,
	}

	tests := []struct {
		name       string
		input      spending.UpdateSpendingInput
		repo       *mockRepository
		wantErr    bool
		wantErrIs  error
		wantCalled bool
	}{
		{
			name:       "updates successfully",
			input:      spending.UpdateSpendingInput{Name: "Coffee Updated", Category: "Food", Price: 4.00, SpentAt: now},
			repo:       &mockRepository{updated: expected},
			wantCalled: true,
		},
		{
			name:      "empty name returns bad request",
			input:     spending.UpdateSpendingInput{Name: "", Category: "Food", Price: 10, SpentAt: now},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "empty category returns bad request",
			input:     spending.UpdateSpendingInput{Name: "Coffee", Category: "", Price: 10, SpentAt: now},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "zero price returns bad request",
			input:     spending.UpdateSpendingInput{Name: "Coffee", Category: "Food", Price: 0, SpentAt: now},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "name too long returns bad request",
			input:     spending.UpdateSpendingInput{Name: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Category: "Food", Price: 10, SpentAt: now},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "category too long returns bad request",
			input:     spending.UpdateSpendingInput{Name: "Coffee", Category: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Price: 10, SpentAt: now},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:      "observation too long returns bad request",
			input:     spending.UpdateSpendingInput{Name: "Coffee", Category: "Food", Price: 10, SpentAt: now, Observation: &tooLongObs},
			repo:      &mockRepository{},
			wantErr:   true,
			wantErrIs: domain.ErrBadRequest,
		},
		{
			name:       "propagates not found error from repository",
			input:      spending.UpdateSpendingInput{Name: "Coffee", Category: "Food", Price: 3.50, SpentAt: now},
			repo:       &mockRepository{updateErr: domain.ErrNotFound},
			wantErr:    true,
			wantErrIs:  domain.ErrNotFound,
			wantCalled: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := spending.NewService(tc.repo)
			got, err := svc.Update(context.Background(), 5, "uuid-1", tc.input)
			if tc.wantErr {
				assert.Error(t, err)
				if tc.wantErrIs != nil {
					assert.ErrorIs(t, err, tc.wantErrIs)
				}
				assert.Equal(t, tc.wantCalled, tc.repo.updateCalled)
			} else {
				require.NoError(t, err)
				assert.Equal(t, expected, got)
				assert.True(t, tc.repo.updateCalled)
			}
		})
	}
}
