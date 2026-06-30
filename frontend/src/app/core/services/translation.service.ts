import { Injectable, signal } from '@angular/core';
import en from '../i18n/en.json';
import pt from '../i18n/pt.json';

export type Language = 'en' | 'pt';

type TranslationNode = string | { [key: string]: TranslationNode };
type TranslationTree = { [key: string]: TranslationNode };

const TRANSLATIONS: Record<Language, TranslationTree> = { en, pt };

function lookup(tree: TranslationTree, key: string): string {
  const parts = key.split('.');
  let node: TranslationNode = tree;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return key;
    node = (node as { [k: string]: TranslationNode })[part];
  }
  return typeof node === 'string' ? node : key;
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly lang = signal<Language>('en');
  readonly currentLang = this.lang.asReadonly();

  setLanguage(lang: Language): void {
    this.lang.set(lang);
  }

  translate(key: string): string {
    return lookup(TRANSLATIONS[this.lang()], key);
  }
}
