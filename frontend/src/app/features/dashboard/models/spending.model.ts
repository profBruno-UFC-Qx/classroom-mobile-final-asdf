export interface Spending {
  id: string;
  user_id: number;
  name: string;
  category: string;
  price: number;
  observation: string | null;
  date: string; // mapped from API's spent_at (ISO date string)
  order_number: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSpendingInput {
  name: string;
  category: string;
  price: number;
  observation?: string;
  date?: string; // sent as spent_at to the API
}

export interface UpdateSpendingInput {
  name: string;
  category: string;
  price: number;
  observation?: string | null;
  date: string; // sent as spent_at to the API
}
