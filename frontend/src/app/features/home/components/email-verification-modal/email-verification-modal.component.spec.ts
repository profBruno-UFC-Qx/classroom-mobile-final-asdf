import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EmailVerificationModalComponent } from './email-verification-modal.component';
import { TranslationService } from '@core/services/translation.service';

class FakeTranslationService {
  translate = (key: string) => key;
}

describe('EmailVerificationModalComponent', () => {
  let fixture: ComponentFixture<EmailVerificationModalComponent>;
  let component: EmailVerificationModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailVerificationModalComponent],
      providers: [
        { provide: TranslationService, useValue: new FakeTranslationService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailVerificationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('visibility', () => {
    it('does not render when visible is false', () => {
      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="verification-modal"]'))).toBeNull();
    });

    it('renders when visible is true', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-cy="verification-modal"]'))).not.toBeNull();
    });
  });

  describe('interaction', () => {
    it('emits close when action button is clicked', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);
      fixture.debugElement.query(By.css('[data-cy="verification-modal-action"]')).nativeElement.click();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
