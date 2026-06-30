import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Spending, CreateSpendingInput, UpdateSpendingInput } from '../models/spending.model';
import { environment } from '@env';

interface ApiSpending {
  id: string;
  user_id: number;
  name: string;
  category: string;
  price: number;
  observation: string | null;
  spent_at: string;
  order_number: number;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class SpendingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/spendings`;

  getAll(from?: string, to?: string): Observable<Spending[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<{ data: ApiSpending[] }>(this.baseUrl, { params }).pipe(
      map(res => res.data.map(s => this.mapSpending(s))),
    );
  }

  create(input: CreateSpendingInput): Observable<Spending> {
    const { date, ...rest } = input;
    const body = date ? { ...rest, spent_at: `${date.split('T')[0]}T00:00:00Z` } : rest;
    return this.http.post<{ data: ApiSpending }>(this.baseUrl, body).pipe(
      map(res => this.mapSpending(res.data)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  update(id: string, input: UpdateSpendingInput): Observable<Spending> {
    const { date, ...rest } = input;
    const body = { ...rest, spent_at: `${date.split('T')[0]}T00:00:00Z` };
    return this.http.patch<{ data: ApiSpending }>(`${this.baseUrl}/${id}`, body).pipe(
      map(res => this.mapSpending(res.data)),
    );
  }

  private mapSpending(s: ApiSpending): Spending {
    return {
      id: s.id,
      user_id: s.user_id,
      name: s.name,
      category: s.category,
      price: s.price,
      observation: s.observation,
      date: s.spent_at,
      order_number: s.order_number,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }
}
