import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  function createService(platformId = 'browser'): ThemeService {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platformId }],
    });
    return TestBed.inject(ThemeService);
  }

  describe('initial state', () => {
    it('defaults to light when no localStorage and system prefers light', () => {
      mockMatchMedia(false);
      const service = createService();
      TestBed.flushEffects();
      expect(service.isDark()).toBe(false);
    });

    it('defaults to dark when system prefers dark and no localStorage', () => {
      mockMatchMedia(true);
      const service = createService();
      TestBed.flushEffects();
      expect(service.isDark()).toBe(true);
    });

    it('restores saved light theme from localStorage over system dark preference', () => {
      mockMatchMedia(true);
      localStorage.setItem('theme', 'light');
      const service = createService();
      TestBed.flushEffects();
      expect(service.isDark()).toBe(false);
    });

    it('restores saved dark theme from localStorage', () => {
      mockMatchMedia(false);
      localStorage.setItem('theme', 'dark');
      const service = createService();
      TestBed.flushEffects();
      expect(service.isDark()).toBe(true);
    });
  });

  describe('toggle()', () => {
    beforeEach(() => mockMatchMedia(false));

    it('switches from light to dark', () => {
      const service = createService();
      TestBed.flushEffects();
      service.toggle();
      TestBed.flushEffects();
      expect(service.isDark()).toBe(true);
    });

    it('switches back from dark to light on second toggle', () => {
      const service = createService();
      TestBed.flushEffects();
      service.toggle();
      TestBed.flushEffects();
      service.toggle();
      TestBed.flushEffects();
      expect(service.isDark()).toBe(false);
    });
  });

  describe('DOM effect', () => {
    beforeEach(() => mockMatchMedia(false));

    it('adds dark class to <html> when toggled to dark', () => {
      const service = createService();
      TestBed.flushEffects();
      service.toggle();
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from <html> when toggled back to light', () => {
      localStorage.setItem('theme', 'dark');
      const service = createService();
      TestBed.flushEffects();
      service.toggle();
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    beforeEach(() => mockMatchMedia(false));

    it('writes dark to localStorage after toggle', () => {
      const service = createService();
      TestBed.flushEffects();
      service.toggle();
      TestBed.flushEffects();
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('writes light to localStorage after toggling back', () => {
      const service = createService();
      TestBed.flushEffects();
      service.toggle();
      TestBed.flushEffects();
      service.toggle();
      TestBed.flushEffects();
      expect(localStorage.getItem('theme')).toBe('light');
    });
  });

  describe('SSR safety', () => {
    it('does not throw on server platform', () => {
      expect(() => createService('server')).not.toThrow();
    });

    it('stays in light mode on server platform', () => {
      const service = createService('server');
      expect(service.isDark()).toBe(false);
    });
  });
});
