import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import { DashboardPageComponent } from './dashboard-page.component';
import { SpendingService } from '../../services/spending.service';
import { Spending, CreateSpendingInput, UpdateSpendingInput } from '../../models/spending.model';

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(public callback: IntersectionObserverCallback) {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

class FakeSpendingService {
  getAll = vi.fn();
  create = vi.fn();
  delete = vi.fn();
  update = vi.fn();
}

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let component: DashboardPageComponent;
  let spendingServiceMock: FakeSpendingService;

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

  beforeEach(async () => {
    spendingServiceMock = new FakeSpendingService();

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        { provide: SpendingService, useValue: spendingServiceMock },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    // NOTE: detectChanges() is called per-test to control when ngOnInit runs
  });

  it('should create', () => {
    spendingServiceMock.getAll.mockReturnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getAll with the first and last day of the current month', () => {
      spendingServiceMock.getAll.mockReturnValue(of([]));
      fixture.detectChanges();

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      const expectedFrom = `${y}-${m}-01`;
      const expectedTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

      expect(spendingServiceMock.getAll).toHaveBeenCalledWith(expectedFrom, expectedTo);
    });

    it('sets spendings signal with the returned array on success', () => {
      spendingServiceMock.getAll.mockReturnValue(of([mockSpending]));
      fixture.detectChanges();
      expect(component.spendings()).toEqual([mockSpending]);
    });

    it('sets isLoading to true while the request is pending', () => {
      const subject = new Subject<Spending[]>();
      spendingServiceMock.getAll.mockReturnValue(subject.asObservable());
      fixture.detectChanges();
      expect(component.isLoading()).toBe(true);
      subject.next([]);
      subject.complete();
    });

    it('sets isLoading to false after successful load', () => {
      spendingServiceMock.getAll.mockReturnValue(of([]));
      fixture.detectChanges();
      expect(component.isLoading()).toBe(false);
    });

    it('sets error signal and isLoading to false on service error', () => {
      spendingServiceMock.getAll.mockReturnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();
      expect(component.error()).toBeTruthy();
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('onSpendingCreatedOptimistic', () => {
    const input: CreateSpendingInput = { name: 'Tea', category: 'Drinks', price: 2.0 };

    beforeEach(() => {
      spendingServiceMock.getAll.mockReturnValue(of([]));
      fixture.detectChanges();
    });

    it('immediately prepends a temp spending to spendings before API resolves', () => {
      const subject = new Subject<Spending>();
      spendingServiceMock.create.mockReturnValue(subject.asObservable());
      component.onSpendingCreatedOptimistic(input);
      expect(component.spendings()).toHaveLength(1);
      expect(component.spendings()[0].name).toBe('Tea');
      expect(String(component.spendings()[0].id).startsWith('temp-')).toBe(true);
    });

    it('replaces temp spending with real spending on API success', () => {
      spendingServiceMock.create.mockReturnValue(of(mockSpending));
      component.onSpendingCreatedOptimistic(input);
      expect(component.spendings()).toHaveLength(1);
      expect(component.spendings()[0].id).toBe(mockSpending.id);
    });

    it('removes temp spending on API error', () => {
      spendingServiceMock.create.mockReturnValue(throwError(() => new Error('fail')));
      component.onSpendingCreatedOptimistic(input);
      expect(component.spendings()).toHaveLength(0);
    });

    it('calls spendingService.create with the input', () => {
      spendingServiceMock.create.mockReturnValue(of(mockSpending));
      component.onSpendingCreatedOptimistic(input);
      expect(spendingServiceMock.create).toHaveBeenCalledWith(input);
    });
  });

  describe('onSpendingUpdated', () => {
    const updatedSpending: Spending = { ...mockSpending, name: 'Updated Coffee', price: 4.0 };
    const changes: UpdateSpendingInput = { name: 'Updated Coffee', category: 'Food', price: 4.0, date: '2026-03-15' };

    beforeEach(() => {
      spendingServiceMock.getAll.mockReturnValue(of([mockSpending]));
      fixture.detectChanges();
    });

    it('applies optimistic update to spendings immediately before API resolves', () => {
      const subject = new Subject<Spending>();
      spendingServiceMock.update.mockReturnValue(subject.asObservable());
      component.onSpendingUpdated({ spending: mockSpending, changes });
      // Signal updated before subject emits
      expect(component.spendings()[0].name).toBe('Updated Coffee');
      expect(component.spendings()[0].price).toBe(4.0);
    });

    it('calls spendingService.update with spending id and changes', () => {
      spendingServiceMock.update.mockReturnValue(of(updatedSpending));
      component.onSpendingUpdated({ spending: mockSpending, changes });
      expect(spendingServiceMock.update).toHaveBeenCalledWith(mockSpending.id, changes);
    });

    it('replaces the matching spending with server response on success', () => {
      spendingServiceMock.update.mockReturnValue(of(updatedSpending));
      component.onSpendingUpdated({ spending: mockSpending, changes });
      expect(component.spendings()).toEqual([updatedSpending]);
    });

    it('schedules a retry after 5 seconds on first error', () => {
      vi.useFakeTimers();
      spendingServiceMock.update
        .mockReturnValueOnce(throwError(() => new Error('fail')))
        .mockReturnValue(of(updatedSpending));

      component.onSpendingUpdated({ spending: mockSpending, changes });
      expect(spendingServiceMock.update).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);
      expect(spendingServiceMock.update).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('removes id from failedUpdateIds and updates list when retry succeeds', () => {
      vi.useFakeTimers();
      component.failedUpdateIds.set([mockSpending.id]);
      spendingServiceMock.update
        .mockReturnValueOnce(throwError(() => new Error('fail')))
        .mockReturnValue(of(updatedSpending));

      component.onSpendingUpdated({ spending: mockSpending, changes });
      vi.advanceTimersByTime(5000);

      expect(component.failedUpdateIds()).not.toContain(mockSpending.id);
      expect(component.spendings()).toEqual([updatedSpending]);
      vi.useRealTimers();
    });

    it('adds id to failedUpdateIds and shows toast when retry also fails', () => {
      vi.useFakeTimers();
      spendingServiceMock.update.mockReturnValue(throwError(() => new Error('fail')));

      component.onSpendingUpdated({ spending: mockSpending, changes });
      vi.advanceTimersByTime(5000);

      expect(component.failedUpdateIds()).toContain(mockSpending.id);
      expect(component.updateErrorVisible()).toBe(true);
      vi.useRealTimers();
    });

    it('does not duplicate id in failedUpdateIds on repeated retries', () => {
      vi.useFakeTimers();
      spendingServiceMock.update.mockReturnValue(throwError(() => new Error('fail')));
      component.failedUpdateIds.set([mockSpending.id]);

      component.onSpendingUpdated({ spending: mockSpending, changes });
      vi.advanceTimersByTime(5000);

      expect(component.failedUpdateIds().filter(i => i === mockSpending.id)).toHaveLength(1);
      vi.useRealTimers();
    });
  });

  describe('onDismissUpdateError', () => {
    it('clears updateErrorVisible and failedUpdateIds', () => {
      component.updateErrorVisible.set(true);
      component.failedUpdateIds.set(['uuid-1', 'uuid-2']);
      component.onDismissUpdateError();
      expect(component.updateErrorVisible()).toBe(false);
      expect(component.failedUpdateIds()).toEqual([]);
    });
  });

  describe('onSpendingDeleted', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      spendingServiceMock.getAll.mockReturnValue(of([mockSpending]));
      spendingServiceMock.delete.mockReturnValue(of(undefined));
      fixture.detectChanges();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('removes the spending from the list immediately', () => {
      component.onSpendingDeleted(mockSpending);
      expect(component.spendings()).toEqual([]);
    });

    it('sets pendingDelete with the removed spending', () => {
      component.onSpendingDeleted(mockSpending);
      expect(component.pendingDelete()).not.toBeNull();
      expect(component.pendingDelete()!.spending).toEqual(mockSpending);
    });

    it('calls delete after 3.5 seconds', () => {
      spendingServiceMock.delete.mockReturnValue(of(undefined));
      component.onSpendingDeleted(mockSpending);
      vi.advanceTimersByTime(3500);
      expect(spendingServiceMock.delete).toHaveBeenCalledWith(mockSpending.id);
      expect(component.pendingDelete()).toBeNull();
    });

    it('does not call delete before 3.5 seconds', () => {
      spendingServiceMock.delete.mockReturnValue(of(undefined));
      component.onSpendingDeleted(mockSpending);
      vi.advanceTimersByTime(3499);
      expect(spendingServiceMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('onUndoDelete', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      spendingServiceMock.getAll.mockReturnValue(of([mockSpending]));
      fixture.detectChanges();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('restores the spending to its original position', () => {
      const s1: Spending = { ...mockSpending, id: 'uuid-1', name: 'Coffee' };
      const s2: Spending = { ...mockSpending, id: 'uuid-2', name: 'Tea' };
      component.spendings.set([s1, s2]);

      component.onSpendingDeleted(s1);
      expect(component.spendings()).toEqual([s2]);

      component.onUndoDelete();
      expect(component.spendings()).toEqual([s1, s2]);
    });

    it('clears pendingDelete', () => {
      component.onSpendingDeleted(mockSpending);
      component.onUndoDelete();
      expect(component.pendingDelete()).toBeNull();
    });

    it('does not call delete service after undo', () => {
      spendingServiceMock.delete.mockReturnValue(of(undefined));
      component.onSpendingDeleted(mockSpending);
      component.onUndoDelete();
      vi.advanceTimersByTime(3500);
      expect(spendingServiceMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('template', () => {
    it('shows loading paragraph while request is pending', () => {
      const subject = new Subject<Spending[]>();
      spendingServiceMock.getAll.mockReturnValue(subject.asObservable());
      fixture.detectChanges();
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('p'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('app-spending-list'))).toBeNull();
      subject.next([]);
      subject.complete();
    });

    it('renders app-spending-list when spendings is empty', () => {
      spendingServiceMock.getAll.mockReturnValue(of([]));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-spending-list'))).toBeTruthy();
    });

    it('renders app-spending-list when spendings are present', () => {
      spendingServiceMock.getAll.mockReturnValue(of([mockSpending]));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-spending-list'))).toBeTruthy();
    });

    it('does not render app-spending-list on error', () => {
      spendingServiceMock.getAll.mockReturnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-spending-list'))).toBeNull();
    });

    it('renders app-chart-panel when spendings are non-empty', () => {
      spendingServiceMock.getAll.mockReturnValue(of([mockSpending]));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-chart-panel'))).toBeTruthy();
    });

    it('does not render app-chart-panel when spendings is empty', () => {
      spendingServiceMock.getAll.mockReturnValue(of([]));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-chart-panel'))).toBeNull();
    });

    it('shows toast when pendingDelete is set', () => {
      vi.useFakeTimers();
      spendingServiceMock.getAll.mockReturnValue(of([mockSpending]));
      spendingServiceMock.delete.mockReturnValue(of(undefined));
      fixture.detectChanges();

      component.onSpendingDeleted(mockSpending);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[data-cy="delete-toast"]'))).not.toBeNull();
      vi.useRealTimers();
    });

    it('hides toast after undo', () => {
      vi.useFakeTimers();
      spendingServiceMock.getAll.mockReturnValue(of([mockSpending]));
      fixture.detectChanges();

      component.onSpendingDeleted(mockSpending);
      fixture.detectChanges();
      component.onUndoDelete();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[data-cy="delete-toast"]'))).toBeNull();
      vi.useRealTimers();
    });
  });
});
