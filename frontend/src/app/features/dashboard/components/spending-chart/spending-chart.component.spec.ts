import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SpendingChartComponent } from './spending-chart.component';
import { TranslationService } from '@core/services/translation.service';
import { makeSpending } from '../../testing/spending.factory';

describe('SpendingChartComponent', () => {
  let fixture: ComponentFixture<SpendingChartComponent>;
  let component: SpendingChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpendingChartComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(SpendingChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders data-cy="spending-chart"', () => {
    expect(fixture.debugElement.query(By.css('[data-cy="spending-chart"]'))).not.toBeNull();
  });

  describe('dataLabelFormat', () => {
    it('returns a function that prefixes $ in English', () => {
      const fmt = component.dataLabelFormat();
      expect(fmt(3.5)).toBe('$ 3.50');
    });

    it('returns a function that prefixes R$ when language is pt', () => {
      const translationService = TestBed.inject(TranslationService);
      translationService.setLanguage('pt');
      const fmt = component.dataLabelFormat();
      expect(fmt(3.5)).toBe('R$ 3.50');
    });
  });

  describe('chartData getter', () => {
    it('returns empty array when spendings is empty', () => {
      fixture.componentRef.setInput('spendings', []);
      expect(component.chartData).toEqual([]);
    });

    it('groups spendings by category and sums prices', () => {
      fixture.componentRef.setInput('spendings', [
        makeSpending({ category: 'Food', price: 10 }),
        makeSpending({ id: 'uuid-2', category: 'Food', price: 5 }),
        makeSpending({ id: 'uuid-3', category: 'Transport', price: 20 }),
      ]);
      const data = component.chartData;
      const food = data.find(d => d.name === 'Food');
      const transport = data.find(d => d.name === 'Transport');
      expect(food?.value).toBe(15);
      expect(transport?.value).toBe(20);
    });

    it('sorts results descending by value', () => {
      fixture.componentRef.setInput('spendings', [
        makeSpending({ category: 'Food', price: 10 }),
        makeSpending({ id: 'uuid-2', category: 'Transport', price: 50 }),
        makeSpending({ id: 'uuid-3', category: 'Entertainment', price: 25 }),
      ]);
      const values = component.chartData.map(d => d.value);
      expect(values).toEqual([50, 25, 10]);
    });

    it('produces one entry per unique category', () => {
      fixture.componentRef.setInput('spendings', [
        makeSpending({ category: 'A', price: 1 }),
        makeSpending({ id: 'uuid-2', category: 'B', price: 2 }),
        makeSpending({ id: 'uuid-3', category: 'A', price: 3 }),
      ]);
      expect(component.chartData).toHaveLength(2);
    });
  });
});
