import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '@core/services/auth.service';

class FakeAuthService {
  isAuthenticated = vi.fn().mockReturnValue(true);
}

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;

  async function setup(authenticated = true) {
    const fakeAuth = new FakeAuthService();
    fakeAuth.isAuthenticated.mockReturnValue(authenticated);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: fakeAuth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  describe('open/close state', () => {
    it('does not show overlay when closed', async () => {
      await setup();
      const overlay = fixture.debugElement.query(By.css('.overlay'));
      expect(overlay.classes['overlay--visible']).toBeFalsy();
    });

    it('shows overlay when open', async () => {
      await setup();
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      const overlay = fixture.debugElement.query(By.css('.overlay'));
      expect(overlay.classes['overlay--visible']).toBe(true);
    });

    it('sidebar panel does not have open class when closed', async () => {
      await setup();
      const nav = fixture.debugElement.query(By.css('.sidebar'));
      expect(nav.classes['sidebar--open']).toBeFalsy();
    });

    it('sidebar panel has open class when open', async () => {
      await setup();
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      const nav = fixture.debugElement.query(By.css('.sidebar'));
      expect(nav.classes['sidebar--open']).toBe(true);
    });
  });

  describe('interaction', () => {
    it('emits closed when overlay is clicked', async () => {
      await setup();
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      let emitted = false;
      component.closed.subscribe(() => (emitted = true));
      fixture.debugElement.query(By.css('.overlay')).triggerEventHandler('click', null);
      expect(emitted).toBe(true);
    });
  });

  describe('auth-based rendering', () => {
    it('renders private nav list when authenticated', async () => {
      await setup(true);
      expect(fixture.debugElement.query(By.css('[data-cy="nav-dashboard"]'))).toBeTruthy();
    });

    it('renders public nav list when not authenticated', async () => {
      await setup(false);
      expect(fixture.debugElement.query(By.css('[data-cy="nav-login"]'))).toBeTruthy();
    });
  });
});
