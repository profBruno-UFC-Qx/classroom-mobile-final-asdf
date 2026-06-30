import { Spending } from '../models/spending.model';

export const makeSpending = (overrides: Partial<Spending> = {}): Spending => ({
  id: 'uuid-1',
  user_id: 1,
  name: 'Coffee',
  category: 'Food',
  price: 3.5,
  observation: null,
  date: '2026-03-15T12:00:00Z',
  order_number: 1,
  created_at: '2026-03-15T12:00:00Z',
  updated_at: '2026-03-15T12:00:00Z',
  ...overrides,
});
