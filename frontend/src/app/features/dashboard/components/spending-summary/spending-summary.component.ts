import { Component, Input, computed, inject } from '@angular/core';
import { Spending } from '../../models/spending.model';
import { TranslationService } from '@core/services/translation.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

export interface CategoryTotal {
  category: string;
  total: number;
}

@Component({
  selector: 'app-spending-summary',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './spending-summary.component.html',
  styleUrl: './spending-summary.component.scss',
})
export class SpendingSummaryComponent {
  @Input() spendings: Spending[] = [];

  private readonly translationService = inject(TranslationService);

  readonly currencySymbol = computed(() =>
    this.translationService.translate('currency.symbol')
  );

  get total(): number {
    return this.spendings.reduce((sum, s) => sum + s.price, 0);
  }

  get byCategory(): CategoryTotal[] {
    const map = new Map<string, number>();
    for (const s of this.spendings) {
      map.set(s.category, (map.get(s.category) ?? 0) + s.price);
    }
    return [...map.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  formatAmount(value: number): string {
    return `${this.currencySymbol()} ${value.toFixed(2)}`;
  }
}
