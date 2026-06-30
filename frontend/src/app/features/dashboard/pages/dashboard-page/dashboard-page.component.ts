import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { SpendingService } from '../../services/spending.service';
import { Spending, CreateSpendingInput, UpdateSpendingInput } from '../../models/spending.model';
import { SpendingListComponent } from '../../components/spending-list/spending-list.component';
import { ChartPanelComponent } from '../../components/chart-panel/chart-panel.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { formatLocalDate } from '@shared/utils/date.utils';

interface PendingDelete {
  spending: Spending;
  index: number;
  timerId: ReturnType<typeof setTimeout>;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [SpendingListComponent, ChartPanelComponent, TranslatePipe],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly spendingService = inject(SpendingService);

  readonly spendings = signal<Spending[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pendingDelete = signal<PendingDelete | null>(null);
  readonly failedUpdateIds = signal<string[]>([]);
  readonly updateErrorVisible = signal(false);
  ngOnInit(): void {
    this.loadSpendings();
  }

  ngOnDestroy(): void {
    const pending = this.pendingDelete();
    if (pending) {
      clearTimeout(pending.timerId);
      this.commitDelete(pending.spending.id);
    }
  }

  onSpendingCreatedOptimistic(input: CreateSpendingInput): void {
    const tempId = 'temp-' + Date.now();
    const tempSpending: Spending = {
      id: tempId,
      user_id: 0,
      name: input.name,
      category: input.category,
      price: input.price,
      observation: input.observation ?? null,
      date: input.date ?? this.formatDate(new Date()),
      order_number: Number.MAX_SAFE_INTEGER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.spendings.update(prev => [tempSpending, ...prev]);
    this.spendingService.create(input).subscribe({
      next: spending => {
        this.spendings.update(prev => prev.map(s => s.id === tempId ? spending : s));
      },
      error: () => {
        this.spendings.update(prev => prev.filter(s => s.id !== tempId));
      },
    });
  }

  onSpendingDeleted(spending: Spending): void {
    const current = this.pendingDelete();
    if (current) {
      clearTimeout(current.timerId);
      this.commitDelete(current.spending.id);
      this.pendingDelete.set(null);
    }

    const list = this.spendings();
    const index = list.findIndex(s => s.id === spending.id);
    if (index === -1) return;

    this.spendings.update(prev => prev.filter(s => s.id !== spending.id));

    const timerId = setTimeout(() => {
      this.pendingDelete.set(null);
      this.commitDelete(spending.id);
    }, 3500);

    this.pendingDelete.set({ spending, index, timerId });
  }

  onUndoDelete(): void {
    const pending = this.pendingDelete();
    if (!pending) return;

    clearTimeout(pending.timerId);
    this.spendings.update(list => [
      ...list.slice(0, pending.index),
      pending.spending,
      ...list.slice(pending.index),
    ]);
    this.pendingDelete.set(null);
  }

  onSpendingUpdated({ spending, changes }: { spending: Spending; changes: UpdateSpendingInput }): void {
    const optimistic: Spending = {
      ...spending,
      name: changes.name,
      category: changes.category,
      price: changes.price,
      observation: changes.observation ?? null,
      date: changes.date,
    };
    this.spendings.update(list => list.map(s => s.id === spending.id ? optimistic : s));

    this.spendingService.update(spending.id, changes).subscribe({
      next: updated => {
        this.spendings.update(list => list.map(s => s.id === updated.id ? updated : s));
      },
      error: () => this.scheduleRetry(spending.id, changes),
    });
  }

  onDismissUpdateError(): void {
    this.updateErrorVisible.set(false);
    this.failedUpdateIds.set([]);
  }

  private scheduleRetry(id: string, changes: UpdateSpendingInput): void {
    setTimeout(() => {
      this.spendingService.update(id, changes).subscribe({
        next: updated => {
          this.spendings.update(list => list.map(s => s.id === updated.id ? updated : s));
          this.failedUpdateIds.update(ids => ids.filter(i => i !== id));
        },
        error: () => {
          this.failedUpdateIds.update(ids => (ids.includes(id) ? ids : [...ids, id]));
          this.updateErrorVisible.set(true);
        },
      });
    }, 5000);
  }

  private loadSpendings(): void {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.isLoading.set(true);
    this.spendingService.getAll(this.formatDate(from), this.formatDate(to)).subscribe({
      next: spendings => {
        this.spendings.set(spendings);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('dashboard.error');
        this.isLoading.set(false);
      },
    });
  }

  private commitDelete(id: string): void {
    this.spendingService.delete(id).subscribe({
      error: () => this.loadSpendings(),
    });
  }

  private formatDate(d: Date): string {
    return formatLocalDate(d);
  }
}
