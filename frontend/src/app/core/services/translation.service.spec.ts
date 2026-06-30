import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranslationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('defaults', () => {
    it('defaults to English', () => {
      expect(service.currentLang()).toBe('en');
    });
  });

  describe('translate()', () => {
    it('translates a key in English', () => {
      expect(service.translate('home.title')).toBe('CoFi Finance');
    });

    it('translates a nested key in English', () => {
      expect(service.translate('home.form.email.label')).toBe('Email');
    });

    it('returns the key itself when translation is not found', () => {
      expect(service.translate('nonexistent.key')).toBe('nonexistent.key');
    });
  });

  describe('setLanguage()', () => {
    it('translates a key in Portuguese after setLanguage', () => {
      service.setLanguage('pt');
      expect(service.translate('home.subtitle')).toBe('Entre na sua conta');
    });

    it('translates nested keys in Portuguese', () => {
      service.setLanguage('pt');
      expect(service.translate('home.form.password.label')).toBe('Senha');
    });
  });

  describe('currentLang signal', () => {
    it('updates when setLanguage is called', () => {
      service.setLanguage('pt');
      expect(service.currentLang()).toBe('pt');
    });
  });
});
