import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { ThemeToggleComponent } from './theme-toggle.component';
import { ThemeService } from '@core/services/theme.service';
import { TranslationService } from '@core/services/translation.service';

class FakeThemeService {
  isDark = signal(false);
  toggle = vi.fn();
}

class FakeTranslationService {
  translate = (key: string) => key;
}

describe('ThemeToggleComponent', () => {
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let component: ThemeToggleComponent;
  let themeServiceMock: FakeThemeService;

  beforeEach(async () => {
    themeServiceMock = new FakeThemeService();

    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: TranslationService, useValue: new FakeTranslationService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('renders the FAB button', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="theme-toggle"]'))).toBeTruthy();
    });
  });

  describe('icon state', () => {
    it('shows moon icon (no circle) in light mode', () => {
      themeServiceMock.isDark.set(false);
      fixture.detectChanges();
      const svgEl = fixture.debugElement.query(By.css('svg')).nativeElement as SVGElement;
      expect(svgEl).toBeTruthy();
      expect(svgEl.querySelector('circle')).toBeNull();
      expect(svgEl.querySelector('path')).toBeTruthy();
    });

    it('shows sun icon (with circle) in dark mode', () => {
      themeServiceMock.isDark.set(true);
      fixture.detectChanges();
      const svgEl = fixture.debugElement.query(By.css('svg')).nativeElement as SVGElement;
      expect(svgEl).toBeTruthy();
      expect(svgEl.querySelector('circle')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls themeService.toggle() on button click', () => {
      fixture.debugElement.query(By.css('[data-cy="theme-toggle"]')).nativeElement.click();
      expect(themeServiceMock.toggle).toHaveBeenCalledTimes(1);
    });
  });
});
