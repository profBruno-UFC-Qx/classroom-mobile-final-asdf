import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '@core/services/translation.service';

@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);

  transform(key: string): string {
    return this.translationService.translate(key);
  }
}
