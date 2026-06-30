import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SpendingListComponent } from './spending-list.component';
import { TableNavDirective } from '@shared/directives/table-nav.directive';
import { Spending, CreateSpendingInput, UpdateSpendingInput } from '../../models/spending.model';
import { formatLocalDate } from '@shared/utils/date.utils';
import { TranslationService } from '@core/services/translation.service';
import { makeSpending } from '../../testing/spending.factory';

describe('SpendingListComponent', () => {
  let fixture: ComponentFixture<SpendingListComponent>;
  let component: SpendingListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpendingListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SpendingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function getInput(rowIdx: number, field: string): HTMLInputElement {
    const rows = fixture.debugElement.queryAll(By.css('[data-cy="spending-row"]'));
    return rows[rowIdx].query(By.css(`[data-field="${field}"]`)).nativeElement;
  }

  function pressEnter(el: HTMLElement, shiftKey = false): void {
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, bubbles: true });
    el.dispatchEvent(event);
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('always renders data-cy="add-spending-btn"', () => {
    expect(fixture.debugElement.query(By.css('[data-cy="add-spending-btn"]'))).not.toBeNull();
  });

  it('always renders data-cy="add-spending-btn-bottom"', () => {
    expect(fixture.debugElement.query(By.css('[data-cy="add-spending-btn-bottom"]'))).not.toBeNull();
  });

  it('clicking add-spending-btn sets draftRow() to non-null', () => {
    const btn = fixture.debugElement.query(By.css('[data-cy="add-spending-btn"]'));
    btn.triggerEventHandler('click', {});
    expect(component.draftRow()).not.toBeNull();
  });

  it('clicking add-spending-btn-bottom sets draftRow() to non-null', () => {
    const btn = fixture.debugElement.query(By.css('[data-cy="add-spending-btn-bottom"]'));
    btn.triggerEventHandler('click', {});
    expect(component.draftRow()).not.toBeNull();
  });

  it('shows empty-state when spendings is [] and draft is closed', () => {
    fixture.componentRef.setInput('spendings', []);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-cy="empty-state"]'))).not.toBeNull();
  });

  it('hides empty-state when draft row is open', () => {
    fixture.componentRef.setInput('spendings', []);
    fixture.detectChanges();
    component.openDraftRow();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-cy="empty-state"]'))).toBeNull();
  });

  it('renders a table with 6 column headers', () => {
    const headers = fixture.debugElement.queryAll(By.css('thead th'));
    expect(headers).toHaveLength(6); // name, category, price, date, obs (blank), actions (blank)
  });

  it('renders one row per spending', () => {
    fixture.componentRef.setInput('spendings', [makeSpending({ id: 'uuid-1' }), makeSpending({ id: 'uuid-2' })]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('tbody tr'))).toHaveLength(2);
  });

  it('renders no rows when spendings is empty', () => {
    fixture.componentRef.setInput('spendings', []);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('tbody tr'))).toHaveLength(0);
  });

  it('renders a delete button for each spending row', () => {
    fixture.componentRef.setInput('spendings', [makeSpending({ id: 'uuid-1' }), makeSpending({ id: 'uuid-2' })]);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('[data-cy="delete-spending-btn"]'));
    expect(buttons).toHaveLength(2);
  });

  it('emits spendingDeleted with the correct spending when delete button is clicked', () => {
    const spending = makeSpending({ id: 'uuid-5', name: 'Tea' });
    fixture.componentRef.setInput('spendings', [spending]);
    fixture.detectChanges();

    let emitted: Spending | undefined;
    component.spendingDeleted.subscribe(s => (emitted = s));

    const btn = fixture.debugElement.query(By.css('[data-cy="delete-spending-btn"]'));
    btn.triggerEventHandler('click', {});

    expect(emitted).toEqual(spending);
  });

  describe('failedUpdateIds highlight', () => {
    it('adds row--update-failed class when id is in failedUpdateIds', () => {
      fixture.componentRef.setInput('spendings', [makeSpending({ id: 'uuid-7' })]);
      fixture.componentRef.setInput('failedUpdateIds', ['uuid-7']);
      fixture.detectChanges();
      const row = fixture.debugElement.query(By.css('[data-cy="spending-row"]'));
      expect(row.nativeElement.classList).toContain('row--update-failed');
    });

    it('does not add row--update-failed class when id is not in failedUpdateIds', () => {
      fixture.componentRef.setInput('spendings', [makeSpending({ id: 'uuid-7' })]);
      fixture.componentRef.setInput('failedUpdateIds', ['uuid-99']);
      fixture.detectChanges();
      const row = fixture.debugElement.query(By.css('[data-cy="spending-row"]'));
      expect(row.nativeElement.classList).not.toContain('row--update-failed');
    });

    it('does not add row--update-failed class when failedUpdateIds is empty', () => {
      fixture.componentRef.setInput('spendings', [makeSpending({ id: 'uuid-7' })]);
      fixture.componentRef.setInput('failedUpdateIds', []);
      fixture.detectChanges();
      const row = fixture.debugElement.query(By.css('[data-cy="spending-row"]'));
      expect(row.nativeElement.classList).not.toContain('row--update-failed');
    });
  });

  describe('inline editing', () => {
    const spending = makeSpending({ id: 'uuid-1', name: 'Coffee' });

    beforeEach(() => {
      fixture.componentRef.setInput('spendings', [spending]);
      fixture.detectChanges();
    });

    it('always renders inputs for all editable fields', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="edit-name"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('[data-cy="edit-category"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('[data-cy="edit-price"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('[data-cy="edit-date"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('[data-cy="edit-observation"]'))).not.toBeNull();
    });

    it('renders a currency symbol alongside the price input', () => {
      const symbol = fixture.debugElement.query(By.css('.currency-symbol'));
      expect(symbol).not.toBeNull();
    });

    it('currency symbol is $ by default (English)', () => {
      const symbol = fixture.debugElement.query(By.css('.currency-symbol'));
      expect(symbol.nativeElement.textContent.trim()).toBe('$');
    });

    it('currency symbol updates to R$ after switching to Portuguese', () => {
      const translationService = TestBed.inject(TranslationService);
      translationService.setLanguage('pt');
      fixture.detectChanges();
      const symbol = fixture.debugElement.query(By.css('.currency-symbol'));
      expect(symbol.nativeElement.textContent.trim()).toBe('R$');
    });

    it('Enter on draft name field calls onSaveDraft', () => {
      const spy = vi.spyOn(component, 'onSaveDraft');
      component.draftRow.set({ name: '', category: '', price: '', date: '', observation: '' });
      component.onDraftKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 'name');
      expect(spy).toHaveBeenCalled();
    });

    it('Escape key cancels edit and reverts localSpendings without emitting', () => {
      vi.useFakeTimers();

      fixture.componentRef.setInput('spendings', [spending]);
      fixture.detectChanges();

      const inputEvent = { target: { value: 'New Name' } } as unknown as Event;
      component.onFieldInput(spending.id, 'name', inputEvent);
      expect(component.localSpendings()[0].name).toBe('New Name');

      let emitted: unknown;
      component.spendingUpdated.subscribe(e => (emitted = e));

      const mockInput = { value: 'New Name' } as HTMLInputElement;
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(escEvent, 'target', { value: { ...mockInput, blur: vi.fn() } });

      component.onCellEscape(escEvent, spending, 'name');

      vi.runAllTimers();

      expect(component.localSpendings()[0].name).toBe('Coffee');
      expect(emitted).toBeUndefined();

      vi.useRealTimers();
    });

    it('spendingUpdated emits after 1-second debounce on input', () => {
      vi.useFakeTimers();

      let emitted: { spending: Spending; changes: UpdateSpendingInput } | undefined;
      component.spendingUpdated.subscribe(e => (emitted = e));

      const inputEvent = { target: { value: 'New Coffee' } } as unknown as Event;
      component.onFieldInput(spending.id, 'name', inputEvent);

      expect(emitted).toBeUndefined();

      vi.advanceTimersByTime(1000);

      expect(emitted).toBeDefined();
      expect(emitted!.changes.name).toBe('New Coffee');
      expect(emitted!.spending.name).toBe('New Coffee');

      vi.useRealTimers();
    });

    it('spendingUpdated does not emit before 1 second has passed', () => {
      vi.useFakeTimers();

      let emitted: unknown;
      component.spendingUpdated.subscribe(e => (emitted = e));

      const inputEvent = { target: { value: 'New Coffee' } } as unknown as Event;
      component.onFieldInput(spending.id, 'name', inputEvent);
      vi.advanceTimersByTime(999);

      expect(emitted).toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe('keyboard navigation', () => {
    const s1 = makeSpending({ id: 'uuid-1', name: 'Coffee', date: '2026-03-10T00:00:00Z', order_number: 1 });
    const s2 = makeSpending({ id: 'uuid-2', name: 'Tea', date: '2026-03-11T00:00:00Z', order_number: 2 });
    const s3 = makeSpending({ id: 'uuid-3', name: 'Juice', date: '2026-03-12T00:00:00Z', order_number: 3 });

    beforeEach(() => {
      fixture.componentRef.setInput('spendings', [s1, s2, s3]);
      fixture.detectChanges();
    });

    it('Enter focuses the next row\'s same field', () => {
      const input = getInput(0, 'name');
      input.focus();
      pressEnter(input);
      expect(document.activeElement).toBe(getInput(1, 'name'));
    });

    it('Enter at last row opens the draft row', () => {
      const input = getInput(2, 'name');
      input.focus();
      pressEnter(input);
      expect(component.draftRow()).not.toBeNull();
    });

    it('Shift+Enter focuses the previous row\'s same field', () => {
      const input = getInput(1, 'category');
      input.focus();
      pressEnter(input, true);
      expect(document.activeElement).toBe(getInput(0, 'category'));
    });

    it('Shift+Enter at first row does nothing', () => {
      const input = getInput(0, 'name');
      input.focus();
      pressEnter(input, true);
      expect(document.activeElement).toBe(input);
    });
  });

  describe('keyboard navigation with sorting', () => {
    // order_numbers chosen so sorted order differs from input order
    const s1 = makeSpending({ id: 'uuid-1', name: 'Banana', date: '2026-03-20T00:00:00Z', order_number: 3 });
    const s2 = makeSpending({ id: 'uuid-2', name: 'Apple', date: '2026-03-10T00:00:00Z', order_number: 1 });
    const s3 = makeSpending({ id: 'uuid-3', name: 'Cherry', date: '2026-03-15T00:00:00Z', order_number: 2 });

    beforeEach(() => {
      fixture.componentRef.setInput('spendings', [s1, s2, s3]);
      fixture.detectChanges();
    });

    it('default sort is order_number ascending, so visual order is s2, s3, s1', () => {
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.id)).toEqual(['uuid-2', 'uuid-3', 'uuid-1']);
    });

    it('Enter on visually-last sorted row opens draft', () => {
      // visually last row is s1 (uuid-1, order_number=3)
      const lastInput = getInput(2, 'name');
      lastInput.focus();
      pressEnter(lastInput);
      expect(component.draftRow()).not.toBeNull();
    });

    it('Enter navigates to next visual row regardless of original order', () => {
      // Row 0 is s2 (Apple), row 1 is s3 (Cherry)
      const firstInput = getInput(0, 'name');
      firstInput.focus();
      pressEnter(firstInput);
      expect(document.activeElement).toBe(getInput(1, 'name'));
    });

    it('closeDraftRow focuses last sorted row via directive', () => {
      vi.useFakeTimers();

      component.draftRow.set({ name: '', category: '', price: '', date: '', observation: '' });
      fixture.detectChanges();

      component.onDraftKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'name');
      fixture.detectChanges();

      vi.runAllTimers();

      // Last sorted row is s1 (Banana, order_number=3) — should focus its name input
      const lastInput = getInput(2, 'name');
      expect(document.activeElement).toBe(lastInput);

      vi.useRealTimers();
    });
  });

  describe('draft row', () => {
    it('is hidden initially', () => {
      fixture.componentRef.setInput('spendings', [makeSpending()]);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="draft-row"]'))).toBeNull();
    });

    it('appears after Enter on the last row', () => {
      const s = makeSpending({ id: 'uuid-1' });
      fixture.componentRef.setInput('spendings', [s]);
      fixture.detectChanges();
      const input = fixture.debugElement.query(By.css('[data-field="name"]')).nativeElement as HTMLElement;
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="draft-row"]'))).not.toBeNull();
    });

    it('Escape on draft field removes the draft row', () => {
      component.draftRow.set({ name: '', category: '', price: '', date: '', observation: '' });
      fixture.detectChanges();
      component.onDraftKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'name');
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="draft-row"]'))).toBeNull();
    });

    it('isDraftValid is false when name is empty', () => {
      component.draftRow.set({ name: '', category: 'Food', price: '3.5', date: '', observation: '' });
      expect(component.isDraftValid).toBe(false);
    });

    it('isDraftValid is false when price is missing', () => {
      component.draftRow.set({ name: 'Tea', category: 'Drinks', price: '', date: '', observation: '' });
      expect(component.isDraftValid).toBe(false);
    });

    it('isDraftValid is true when name, category, price are filled', () => {
      component.draftRow.set({ name: 'Tea', category: 'Drinks', price: '1.5', date: '', observation: '' });
      expect(component.isDraftValid).toBe(true);
    });

    it('emits spendingCreated and resets draft to empty row when onSaveDraft is called with valid data', () => {
      let emitted: CreateSpendingInput | undefined;
      component.spendingCreated.subscribe(e => (emitted = e));
      component.draftRow.set({ name: 'Lunch', category: 'Food', price: '12.5', date: '2026-03-20', observation: '' });
      component.onSaveDraft();
      expect(emitted).toEqual({ name: 'Lunch', category: 'Food', price: 12.5, date: '2026-03-20', observation: undefined });
      const draft = component.draftRow();
      expect(draft).not.toBeNull();
      expect(draft!.name).toBe('');
      expect(draft!.category).toBe('');
      expect(draft!.price).toBe('');
    });

    it('does not emit spendingCreated when draft is invalid', () => {
      let emitted = false;
      component.spendingCreated.subscribe(() => (emitted = true));
      component.draftRow.set({ name: '', category: 'Food', price: '3', date: '', observation: '' });
      component.onSaveDraft();
      expect(emitted).toBe(false);
    });

    it('sets draftSubmitAttempted when save is attempted with invalid draft', () => {
      component.draftRow.set({ name: '', category: 'Food', price: '3.5', date: '', observation: '' });
      component.onSaveDraft();
      expect(component.draftSubmitAttempted()).toBe(true);
    });

    it('resets draftSubmitAttempted after successful save', () => {
      component.spendingCreated.subscribe(() => {});
      component.draftRow.set({ name: 'Tea', category: 'Drinks', price: '1.5', date: '', observation: '' });
      component.onSaveDraft();
      expect(component.draftSubmitAttempted()).toBe(false);
    });

    it('shows draft-name-required error when submitted with empty name', () => {
      component.draftRow.set({ name: '', category: 'Food', price: '3.5', date: '', observation: '' });
      component.draftSubmitAttempted.set(true);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="draft-name-required"]'))).not.toBeNull();
    });

    it('shows draft-price-required error when submitted with empty price', () => {
      component.draftRow.set({ name: 'Tea', category: 'Food', price: '', date: '', observation: '' });
      component.draftSubmitAttempted.set(true);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="draft-price-required"]'))).not.toBeNull();
    });

    it('onSaveDraft resets draft to empty row for continuous entry', () => {
      vi.useFakeTimers();
      const querySpy = vi.spyOn(document, 'querySelector');
      const mockEl = { focus: vi.fn(), scrollIntoView: vi.fn() } as unknown as HTMLElement;
      querySpy.mockReturnValue(mockEl);

      component.spendingCreated.subscribe(() => {});
      component.draftRow.set({ name: 'Lunch', category: 'Food', price: '5', date: '2026-03-20', observation: '' });
      component.onSaveDraft();

      const draft = component.draftRow();
      expect(draft).not.toBeNull();
      expect(draft!.name).toBe('');
      expect(draft!.category).toBe('');
      expect(draft!.price).toBe('');
      expect(draft!.observation).toBe('');

      vi.runAllTimers();
      expect(querySpy).toHaveBeenCalledWith('[data-cy="draft-name"]');
      expect(mockEl.focus).toHaveBeenCalled();

      querySpy.mockRestore();
      vi.useRealTimers();
    });

    it('Shift+Enter closes the draft row and focuses last spending row', () => {
      vi.useFakeTimers();

      fixture.componentRef.setInput('spendings', [makeSpending({ id: 'uuid-7' })]);
      fixture.detectChanges();
      component.draftRow.set({ name: '', category: '', price: '', date: '', observation: '' });
      fixture.detectChanges();

      const focusSpy = vi.spyOn(component.tableNav, 'focusCell');

      component.onDraftKeydown(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }), 'name');

      expect(component.draftRow()).toBeNull();

      vi.runAllTimers();
      expect(focusSpy).toHaveBeenCalledWith('last', 'name');

      vi.useRealTimers();
    });

    it('openDraftRow focuses draft name when draft is already open', () => {
      vi.useFakeTimers();
      const querySpy = vi.spyOn(document, 'querySelector');
      const mockEl = { focus: vi.fn(), scrollIntoView: vi.fn() } as unknown as HTMLElement;
      querySpy.mockReturnValue(mockEl);

      const s = makeSpending({ id: 'uuid-1' });
      fixture.componentRef.setInput('spendings', [s]);
      fixture.detectChanges();

      // Open draft the first time via DOM Enter on the row
      const input = fixture.debugElement.query(By.css('[data-field="name"]')).nativeElement as HTMLElement;
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(component.draftRow()).not.toBeNull();

      vi.runAllTimers();
      querySpy.mockClear();
      mockEl.focus = vi.fn();

      // Try to open again
      component.openDraftRow();
      expect(component.draftRow()).not.toBeNull();

      vi.runAllTimers();
      expect(querySpy).toHaveBeenCalledWith('[data-cy="draft-name"]');
      expect(mockEl.focus).toHaveBeenCalled();

      querySpy.mockRestore();
      vi.useRealTimers();
    });

    it('closeDraftRow resets draftSubmitAttempted', () => {
      fixture.componentRef.setInput('spendings', [makeSpending({ id: 'uuid-1' })]);
      fixture.detectChanges();
      component.draftRow.set({ name: '', category: '', price: '', date: '', observation: '' });
      component.draftSubmitAttempted.set(true);

      component.onDraftKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'name');

      expect(component.draftRow()).toBeNull();
      expect(component.draftSubmitAttempted()).toBe(false);
    });

    it('resetDraftRow sets today\'s local date', () => {
      vi.useFakeTimers();
      // March 21, 2026 02:00 UTC = March 20, 2026 23:00 UTC-3
      vi.setSystemTime(new Date('2026-03-21T02:00:00Z'));

      const querySpy = vi.spyOn(document, 'querySelector');
      const mockEl = { focus: vi.fn(), scrollIntoView: vi.fn() } as unknown as HTMLElement;
      querySpy.mockReturnValue(mockEl);

      const s = makeSpending({ id: 'uuid-1' });
      fixture.componentRef.setInput('spendings', [s]);
      fixture.detectChanges();

      // Open draft via DOM Enter
      const input = fixture.debugElement.query(By.css('[data-field="name"]')).nativeElement as HTMLElement;
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      vi.runAllTimers();

      const draft = component.draftRow();
      expect(draft).not.toBeNull();
      expect(draft!.date).toBe(formatLocalDate(new Date('2026-03-21T02:00:00Z')));

      querySpy.mockRestore();
      vi.useRealTimers();
    });

    it('resetDraftRow scrolls page to bottom when draft name opens', () => {
      vi.useFakeTimers();
      const querySpy = vi.spyOn(document, 'querySelector');
      const mockEl = { focus: vi.fn() } as unknown as HTMLElement;
      querySpy.mockReturnValue(mockEl);
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
      vi.spyOn(document.body, 'scrollHeight', 'get').mockReturnValue(2000);
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);

      const s = makeSpending({ id: 'uuid-1' });
      fixture.componentRef.setInput('spendings', [s]);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('[data-field="name"]')).nativeElement as HTMLElement;
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      vi.runAllTimers();

      expect(scrollToSpy).toHaveBeenCalled();

      scrollToSpy.mockRestore();
      querySpy.mockRestore();
      vi.useRealTimers();
    });

    it('save button is disabled when draft is invalid', () => {
      component.draftRow.set({ name: '', category: '', price: '', date: '', observation: '' });
      fixture.detectChanges();
      const btn = fixture.debugElement.query(By.css('[data-cy="save-draft-btn"]'));
      expect(btn.nativeElement.disabled).toBe(true);
    });

    it('save button is enabled when draft is valid', () => {
      component.draftRow.set({ name: 'Tea', category: 'Drinks', price: '1.5', date: '', observation: '' });
      fixture.detectChanges();
      const btn = fixture.debugElement.query(By.css('[data-cy="save-draft-btn"]'));
      expect(btn.nativeElement.disabled).toBe(false);
    });
  });

  describe('column sorting', () => {
    const s1 = makeSpending({ id: 'uuid-1', name: 'Banana', category: 'Food', price: 2.0, date: '2026-03-10T00:00:00Z', order_number: 2 });
    const s2 = makeSpending({ id: 'uuid-2', name: 'Apple', category: 'Groceries', price: 5.0, date: '2026-03-05T00:00:00Z', order_number: 1 });
    const s3 = makeSpending({ id: 'uuid-3', name: 'Coffee', category: 'Drinks', price: 1.0, date: '2026-03-20T00:00:00Z', order_number: 3 });

    beforeEach(() => {
      fixture.componentRef.setInput('spendings', [s1, s2, s3]);
      fixture.detectChanges();
    });

    it('default sort is order_number ascending', () => {
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.id)).toEqual(['uuid-2', 'uuid-1', 'uuid-3']);
    });

    it('toggleSort sets sortColumn and direction to asc', () => {
      component.toggleSort('name');
      expect(component.sortColumn()).toBe('name');
      expect(component.sortDirection()).toBe('asc');
    });

    it('clicking same column toggles asc to desc', () => {
      component.toggleSort('name');
      component.toggleSort('name');
      expect(component.sortColumn()).toBe('name');
      expect(component.sortDirection()).toBe('desc');
    });

    it('clicking same column a third time resets to default', () => {
      component.toggleSort('name');
      component.toggleSort('name');
      component.toggleSort('name');
      expect(component.sortColumn()).toBeNull();
    });

    it('clicking a different column resets to asc on that column', () => {
      component.toggleSort('name');
      component.toggleSort('name'); // desc
      component.toggleSort('price');
      expect(component.sortColumn()).toBe('price');
      expect(component.sortDirection()).toBe('asc');
    });

    it('sorts by name ascending', () => {
      component.toggleSort('name');
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.name)).toEqual(['Apple', 'Banana', 'Coffee']);
    });

    it('sorts by name descending', () => {
      component.toggleSort('name');
      component.toggleSort('name');
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.name)).toEqual(['Coffee', 'Banana', 'Apple']);
    });

    it('sorts by price ascending', () => {
      component.toggleSort('price');
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.price)).toEqual([1.0, 2.0, 5.0]);
    });

    it('sorts by price descending', () => {
      component.toggleSort('price');
      component.toggleSort('price');
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.price)).toEqual([5.0, 2.0, 1.0]);
    });

    it('sorts by category ascending', () => {
      component.toggleSort('category');
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.category)).toEqual(['Drinks', 'Food', 'Groceries']);
    });

    it('sorts by date descending', () => {
      component.toggleSort('date');
      component.toggleSort('date');
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.id)).toEqual(['uuid-3', 'uuid-1', 'uuid-2']);
    });

    it('shows sort indicator on active column header', () => {
      component.toggleSort('name');
      fixture.detectChanges();
      const indicator = fixture.debugElement.query(By.css('[data-cy="sort-name"] .sort-indicator'));
      expect(indicator).not.toBeNull();
    });

    it('does not show sort indicator when no column is active', () => {
      fixture.detectChanges();
      const indicator = fixture.debugElement.query(By.css('.sort-indicator'));
      expect(indicator).toBeNull();
    });

    it('sort indicator has desc class when direction is desc', () => {
      component.toggleSort('name');
      component.toggleSort('name');
      fixture.detectChanges();
      const indicator = fixture.debugElement.query(By.css('[data-cy="sort-name"] .sort-indicator'));
      expect(indicator.nativeElement.classList).toContain('sort-indicator--desc');
    });

    it('clicking header in template triggers sort', () => {
      const th = fixture.debugElement.query(By.css('[data-cy="sort-price"]'));
      th.triggerEventHandler('click', {});
      fixture.detectChanges();
      const sorted = component.sortedSpendings();
      expect(sorted.map(s => s.price)).toEqual([1.0, 2.0, 5.0]);
    });
  });
});
