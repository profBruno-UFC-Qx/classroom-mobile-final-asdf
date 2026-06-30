import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { HeaderComponent } from './header.component';
import { TranslationService } from '@core/services/translation.service';
import { AuthService } from '@core/services/auth.service';

class FakeAuthService {
  logout = vi.fn().mockReturnValue(of(void 0));
}

class FakeRouter {
  navigate = vi.fn();
}

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let translationService: TranslationService;
  let authServiceMock: FakeAuthService;
  let routerMock: FakeRouter;

  beforeEach(async () => {
    authServiceMock = new FakeAuthService();
    routerMock = new FakeRouter();

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    translationService = TestBed.inject(TranslationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('displays the CoFi brand name on the left', () => {
      const brand = fixture.debugElement.query(By.css('.brand'));
      expect(brand.nativeElement.textContent.trim()).toBe('CoFi');
    });

    it('renders the menu toggle button', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="menu-toggle"]'))).toBeTruthy();
    });

    it('renders the user menu button', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="user-menu-btn"]'))).toBeTruthy();
    });
  });

  describe('language selector', () => {
    it('renders a language select', () => {
      expect(fixture.debugElement.query(By.css('select.lang-selector'))).toBeTruthy();
    });

    it('has EN and PT options', () => {
      const options = fixture.debugElement.queryAll(By.css('select.lang-selector option'));
      const values = options.map((o) => o.nativeElement.value);
      expect(values).toContain('en');
      expect(values).toContain('pt');
    });

    it('defaults to EN', () => {
      const select: HTMLSelectElement = fixture.debugElement.query(
        By.css('select.lang-selector'),
      ).nativeElement;
      expect(select.value).toBe('en');
    });

    it('switches language to PT when PT is selected', () => {
      const select: HTMLSelectElement = fixture.debugElement.query(
        By.css('select.lang-selector'),
      ).nativeElement;
      select.value = 'pt';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(translationService.currentLang()).toBe('pt');
    });

    it('reflects the new language in the select after switching', () => {
      translationService.setLanguage('pt');
      fixture.detectChanges();
      const select: HTMLSelectElement = fixture.debugElement.query(
        By.css('select.lang-selector'),
      ).nativeElement;
      expect(select.value).toBe('pt');
    });
  });

  describe('menu toggle', () => {
    it('emits menuToggle when the hamburger button is clicked', () => {
      const spy = vi.fn();
      component.menuToggle.subscribe(spy);
      fixture.debugElement.query(By.css('[data-cy="menu-toggle"]')).triggerEventHandler('click', null);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('user menu', () => {
    it('opens the user dropdown when the avatar button is clicked', () => {
      fixture.debugElement
        .query(By.css('[data-cy="user-menu-btn"]'))
        .triggerEventHandler('click', new MouseEvent('click'));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="user-dropdown"]'))).toBeTruthy();
    });

    it('closes the user dropdown when the avatar button is clicked again', () => {
      const btn = fixture.debugElement.query(By.css('[data-cy="user-menu-btn"]'));
      btn.triggerEventHandler('click', new MouseEvent('click'));
      fixture.detectChanges();
      btn.triggerEventHandler('click', new MouseEvent('click'));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="user-dropdown"]'))).toBeNull();
    });

    it('closes the user dropdown on document click', () => {
      component.userMenuOpen.set(true);
      fixture.detectChanges();
      component.closeUserMenu();
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="user-dropdown"]'))).toBeNull();
    });
  });

  describe('logout', () => {
    it('calls authService.logout and navigates to / when logout is clicked', () => {
      component.userMenuOpen.set(true);
      fixture.detectChanges();

      fixture.debugElement
        .query(By.css('[data-cy="logout-btn"]'))
        .triggerEventHandler('click', null);

      expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
