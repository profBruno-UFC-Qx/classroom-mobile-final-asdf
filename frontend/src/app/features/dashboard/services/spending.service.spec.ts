import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SpendingService } from './spending.service';
import { Spending, CreateSpendingInput, UpdateSpendingInput } from '../models/spending.model';
import { environment } from '@env';

describe('SpendingService', () => {
  let service: SpendingService;
  let httpTesting: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/api/spendings`;

  const mockSpending: Spending = {
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
  };

  const apiSpending = {
    id: 'uuid-1',
    user_id: 1,
    name: 'Coffee',
    category: 'Food',
    price: 3.5,
    observation: null,
    spent_at: '2026-03-15T12:00:00Z',
    order_number: 1,
    created_at: '2026-03-15T12:00:00Z',
    updated_at: '2026-03-15T12:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SpendingService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  describe('getAll', () => {
    it('GETs /api/spendings with no query params when called with no arguments', () => {
      service.getAll().subscribe();
      const req = httpTesting.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush({ data: [] });
    });

    it('includes both from and to as query params', () => {
      service.getAll('2026-03-01', '2026-03-31').subscribe();
      const req = httpTesting.expectOne(r => r.url === baseUrl);
      expect(req.request.params.get('from')).toBe('2026-03-01');
      expect(req.request.params.get('to')).toBe('2026-03-31');
      req.flush({ data: [] });
    });

    it('includes only from param when to is omitted', () => {
      service.getAll('2026-03-01').subscribe();
      const req = httpTesting.expectOne(r => r.url === baseUrl);
      expect(req.request.params.get('from')).toBe('2026-03-01');
      expect(req.request.params.has('to')).toBe(false);
      req.flush({ data: [] });
    });

    it('includes only to param when from is undefined', () => {
      service.getAll(undefined, '2026-03-31').subscribe();
      const req = httpTesting.expectOne(r => r.url === baseUrl);
      expect(req.request.params.has('from')).toBe(false);
      expect(req.request.params.get('to')).toBe('2026-03-31');
      req.flush({ data: [] });
    });

    it('maps spent_at from API to date in the Spending model', () => {
      let result: Spending[] | undefined;
      service.getAll().subscribe(s => (result = s));
      httpTesting.expectOne(baseUrl).flush({ data: [apiSpending] });
      expect(result).toEqual([mockSpending]);
    });
  });

  describe('create', () => {
    it('POSTs to /api/spendings with the input body', () => {
      const input: CreateSpendingInput = { name: 'Coffee', category: 'Food', price: 3.5 };
      service.create(input).subscribe();
      const req = httpTesting.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Coffee', category: 'Food', price: 3.5 });
      req.flush({ data: apiSpending });
    });

    it('sends spent_at when date is provided in input', () => {
      const input: CreateSpendingInput = { name: 'Coffee', category: 'Food', price: 3.5, date: '2026-03-10' };
      service.create(input).subscribe();
      const req = httpTesting.expectOne(baseUrl);
      expect(req.request.body.spent_at).toBe('2026-03-10T00:00:00Z');
      expect(req.request.body.date).toBeUndefined();
      req.flush({ data: apiSpending });
    });

    it('returns the created spending mapped from the response envelope', () => {
      let result: Spending | undefined;
      service.create({ name: 'Coffee', category: 'Food', price: 3.5 }).subscribe(s => (result = s));
      httpTesting.expectOne(baseUrl).flush({ data: apiSpending });
      expect(result).toEqual(mockSpending);
    });
  });

  describe('delete', () => {
    it('sends DELETE to /api/spendings/:id', () => {
      service.delete('uuid-42').subscribe();
      const req = httpTesting.expectOne(`${baseUrl}/uuid-42`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('completes without error on success', () => {
      let completed = false;
      service.delete('uuid-1').subscribe({ complete: () => (completed = true) });
      httpTesting.expectOne(`${baseUrl}/uuid-1`).flush(null);
      expect(completed).toBe(true);
    });
  });

  describe('update', () => {
    it('sends PATCH to /api/spendings/:id with correct body', () => {
      const input: UpdateSpendingInput = { name: 'Coffee', category: 'Food', price: 4.0, date: '2026-03-15' };
      service.update('uuid-1', input).subscribe();
      const req = httpTesting.expectOne(`${baseUrl}/uuid-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.spent_at).toBe('2026-03-15T00:00:00Z');
      expect(req.request.body.date).toBeUndefined();
      req.flush({ data: apiSpending });
    });

    it('normalizes ISO date string to midnight UTC', () => {
      const input: UpdateSpendingInput = { name: 'Coffee', category: 'Food', price: 4.0, date: '2026-03-15T12:00:00Z' };
      service.update('uuid-1', input).subscribe();
      const req = httpTesting.expectOne(`${baseUrl}/uuid-1`);
      expect(req.request.body.spent_at).toBe('2026-03-15T00:00:00Z');
      req.flush({ data: apiSpending });
    });

    it('returns the updated spending mapped from the response envelope', () => {
      let result: Spending | undefined;
      service.update('uuid-1', { name: 'Coffee', category: 'Food', price: 3.5, date: '2026-03-15' }).subscribe(s => (result = s));
      httpTesting.expectOne(`${baseUrl}/uuid-1`).flush({ data: apiSpending });
      expect(result).toEqual(mockSpending);
    });
  });
});
