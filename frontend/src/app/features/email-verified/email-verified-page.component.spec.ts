import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { EmailVerifiedPageComponent } from './email-verified-page.component';
import { TranslationService } from '@core/services/translation.service';

class FakeRouter {
  navigate = vi.fn();
}

class FakeTranslationService {
  translate = (key: string) => key;
}

describe('EmailVerifiedPageComponent', () => {
  let fixture: ComponentFixture<EmailVerifiedPageComponent>;
  let component: EmailVerifiedPageComponent;
  let routerMock: FakeRouter;

  beforeEach(async () => {
    routerMock = new FakeRouter();

    await TestBed.configureTestingModule({
      imports: [EmailVerifiedPageComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: TranslationService, useValue: new FakeTranslationService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailVerifiedPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('renders the title', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="email-verified-title"]'))).not.toBeNull();
    });

    it('renders the message', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="email-verified-message"]'))).not.toBeNull();
    });

    it('navigates to / when the action button is clicked', () => {
      fixture.debugElement.query(By.css('[data-cy="email-verified-action"]')).nativeElement.click();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
