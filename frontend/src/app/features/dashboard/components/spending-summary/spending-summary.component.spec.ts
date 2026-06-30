import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SpendingSummaryComponent } from './spending-summary.component';
import { TranslationService } from '@core/services/translation.service';
import { makeSpending } from '../../testing/spending.factory';

describe('SpendingSummaryComponent', () => {
  let fixture: ComponentFixture<SpendingSummaryComponent>;
  let component: SpendingSummaryComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpendingSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SpendingSummaryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders data-cy="spending-summary"', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-cy="spending-summary"]'))).not.toBeNull();
  });

  describe('total getter', () => {
    it('returns 0 when spendings is empty', () => {
      fixture.componentRef.setInput('spendings', []);
      expect(component.total).toBe(0);
    });

    it('sums prices correctly', () => {
      fixture.componentRef.setInput('spendings', [
        makeSpending({ price: 10 }),
        makeSpending({ id: 'uuid-2', price: 5.5 }),
        makeSpending({ id: 'uuid-3', price: 2 }),
      ]);
      expect(component.total).toBe(17.5);
    });
  });

  describe('byCategory getter', () => {
    it('groups and sums by category', () => {
      fixture.componentRef.setInput('spendings', [
        makeSpending({ category: 'Food', price: 10 }),
        makeSpending({ id: 'uuid-2', category: 'Food', price: 5 }),
        makeSpending({ id: 'uuid-3', category: 'Transport', price: 20 }),
      ]);
      const food = component.byCategory.find(c => c.category === 'Food');
      const transport = component.byCategory.find(c => c.category === 'Transport');
      expect(food?.total).toBe(15);
      expect(transport?.total).toBe(20);
    });

    it('sorts descending by total', () => {
      fixture.componentRef.setInput('spendings', [
        makeSpending({ category: 'Food', price: 10 }),
        makeSpending({ id: 'uuid-2', category: 'Transport', price: 50 }),
        makeSpending({ id: 'uuid-3', category: 'Entertainment', price: 25 }),
      ]);
      const totals = component.byCategory.map(c => c.total);
      expect(totals).toEqual([50, 25, 10]);
    });
  });

  describe('formatAmount', () => {
    it('returns "$ 3.50" in EN', () => {
      expect(component.formatAmount(3.5)).toBe('$ 3.50');
    });

    it('returns "R$ 3.50" after setLanguage("pt")', () => {
      const translationService = TestBed.inject(TranslationService);
      translationService.setLanguage('pt');
      expect(component.formatAmount(3.5)).toBe('R$ 3.50');
    });
  });

  describe('template', () => {
    it('renders the formatted grand total in data-cy="summary-total"', () => {
      fixture.componentRef.setInput('spendings', [
        makeSpending({ price: 10 }),
        makeSpending({ id: 'uuid-2', price: 5 }),
      ]);
      fixture.detectChanges();
      const el = fixture.debugElement.query(By.css('[data-cy="summary-total"]'));
      expect(el.nativeElement.textContent.trim()).toBe('$ 15.00');
    });

    it('renders data-cy="summary-label"', () => {
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="summary-label"]'))).not.toBeNull();
    });

    it('renders category list items', () => {
      fixture.componentRef.setInput('spendings', [makeSpending()]);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="summary-category-item"]'))).not.toBeNull();
    });
  });
});
