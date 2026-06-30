import { Component, Input, signal } from '@angular/core';
import { Spending } from '../../models/spending.model';
import { ChartType } from '../../models/chart.model';
import { SpendingChartComponent } from '../spending-chart/spending-chart.component';
import { SpendingSummaryComponent } from '../spending-summary/spending-summary.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-chart-panel',
  standalone: true,
  imports: [SpendingChartComponent, SpendingSummaryComponent, TranslatePipe],
  templateUrl: './chart-panel.component.html',
  styleUrl: './chart-panel.component.scss',
})
export class ChartPanelComponent {
  @Input() spendings: Spending[] = [];

  readonly chartType = signal<ChartType>('by-category');
  readonly chartTypes: ChartType[] = ['by-category'];

  selectType(type: ChartType): void {
    this.chartType.set(type);
  }

  chartTypeKey(type: ChartType): string {
    const keys: Record<ChartType, string> = {
      'by-category': 'dashboard.chart.types.byCategory',
    };
    return keys[type];
  }
}
