import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from './translate.pipe';
import { TranslationService } from '@core/services/translation.service';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let service: TranslationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranslationService);
    pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform()', () => {
    it('transforms a key to English text by default', () => {
      expect(pipe.transform('home.title')).toBe('CoFi Finance');
    });

    it('transforms a nested key', () => {
      expect(pipe.transform('home.form.submit')).toBe('Sign in');
    });

    it('returns the key when translation is not found', () => {
      expect(pipe.transform('missing.key')).toBe('missing.key');
    });
  });

  describe('after setLanguage()', () => {
    it('reflects language change to Portuguese', () => {
      service.setLanguage('pt');
      expect(pipe.transform('home.form.submit')).toBe('Entrar');
    });
  });
});
