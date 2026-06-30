import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ChartPanelComponent } from './chart-panel.component';

describe('ChartPanelComponent', () => {
  let fixture: ComponentFixture<ChartPanelComponent>;
  let component: ChartPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartPanelComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders data-cy="chart-panel"', () => {
    expect(fixture.debugElement.query(By.css('[data-cy="chart-panel"]'))).not.toBeNull();
  });

  it('renders app-spending-chart inside', () => {
    expect(fixture.debugElement.query(By.css('app-spending-chart'))).not.toBeNull();
  });

  it('renders app-spending-summary inside', () => {
    expect(fixture.debugElement.query(By.css('app-spending-summary'))).not.toBeNull();
  });

  it('carousel renders one button for by-category', () => {
    const buttons = fixture.debugElement.queryAll(By.css('[data-cy^="chart-type-btn-"]'));
    expect(buttons).toHaveLength(1);
    expect(buttons[0].nativeElement.getAttribute('data-cy')).toBe('chart-type-btn-by-category');
  });

  it('by-category button has active class by default', () => {
    const btn = fixture.debugElement.query(By.css('[data-cy="chart-type-btn-by-category"]'));
    expect(btn.nativeElement.classList.contains('chart-panel__type-btn--active')).toBe(true);
  });

  it('clicking by-category button keeps chartType as by-category', () => {
    const btn = fixture.debugElement.query(By.css('[data-cy="chart-type-btn-by-category"]'));
    btn.nativeElement.click();
    expect(component.chartType()).toBe('by-category');
  });
});
