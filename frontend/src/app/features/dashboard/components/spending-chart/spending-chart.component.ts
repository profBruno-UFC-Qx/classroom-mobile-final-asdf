import { Component, Input, computed, inject } from '@angular/core';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { Spending } from '../../models/spending.model';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslationService } from '@core/services/translation.service';

@Component({
  selector: 'app-spending-chart',
  standalone: true,
  imports: [NgxChartsModule, TranslatePipe],
  templateUrl: './spending-chart.component.html',
  styleUrl: './spending-chart.component.scss',
})
export class SpendingChartComponent {
  @Input() spendings: Spending[] = [];

  private readonly translationService = inject(TranslationService);

  readonly dataLabelFormat = computed(() => {
    const symbol = this.translationService.translate('currency.symbol');
    return (value: number) => `${symbol} ${value.toFixed(2)}`;
  });

  readonly colorScheme: Color = {
    name: 'cofi',
    selectable: false,
    group: ScaleType.Ordinal,
    domain: ['#6366f1', '#4f46e5', '#8b5cf6', '#a78bfa', '#c4b5fd'],
  };

  get chartData(): { name: string; value: number }[] {
    const map = new Map<string, number>();
    for (const s of this.spendings) {
      map.set(s.category, (map.get(s.category) ?? 0) + s.price);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }
}
