import { AfterViewInit, Component, computed, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Spending, CreateSpendingInput, UpdateSpendingInput } from '../../models/spending.model';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { formatLocalDate } from '@shared/utils/date.utils';
import { TableNavDirective } from '@shared/directives/table-nav.directive';

type SortColumn = 'name' | 'category' | 'price' | 'date' | null;

interface DraftRow {
  name: string;
  category: string;
  price: string;
  date: string;
  observation: string;
}

@Component({
  selector: 'app-spending-list',
  imports: [CommonModule, TranslatePipe, TableNavDirective],
  templateUrl: './spending-list.component.html',
  styleUrl: './spending-list.component.scss',
})
export class SpendingListComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() spendings: Spending[] = [];
  @Input() failedUpdateIds: string[] = [];
  @Output() spendingDeleted = new EventEmitter<Spending>();
  @Output() spendingUpdated = new EventEmitter<{ spending: Spending; changes: UpdateSpendingInput }>();
  @Output() spendingCreated = new EventEmitter<CreateSpendingInput>();
  @ViewChild(TableNavDirective) tableNav!: TableNavDirective;

  localSpendings = signal<Spending[]>([]);
  sortColumn = signal<SortColumn>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');
  sortedSpendings = computed(() => {
    const spendings = [...this.localSpendings()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    const mult = dir === 'asc' ? 1 : -1;

    if (col === null) {
      return spendings.sort((a, b) => a.order_number - b.order_number);
    }

    return spendings.sort((a, b) => {
      switch (col) {
        case 'name':
        case 'category':
          return mult * a[col].localeCompare(b[col], undefined, { sensitivity: 'base' });
        case 'price':
          return mult * (a.price - b.price);
        case 'date':
          return mult * a.date.localeCompare(b.date);
      }
    });
  });
  draftRow = signal<DraftRow | null>(null);
  draftSubmitAttempted = signal(false);

  private pendingUpdates = new Map<string, ReturnType<typeof setTimeout>>();

  ngAfterViewInit(): void {
    this.resizeAllObsTextareas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['spendings']) {
      const localMap = new Map(this.localSpendings().map(s => [s.id, s]));
      this.localSpendings.set(
        this.spendings.map(s => this.pendingUpdates.has(s.id) ? (localMap.get(s.id) ?? s) : s)
      );
      setTimeout(() => this.resizeAllObsTextareas());
    }
  }

  ngOnDestroy(): void {
    this.pendingUpdates.forEach(timer => clearTimeout(timer));
  }

  toggleSort(column: 'name' | 'category' | 'price' | 'date'): void {
    if (this.sortColumn() !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    } else if (this.sortDirection() === 'asc') {
      this.sortDirection.set('desc');
    } else {
      this.sortColumn.set(null);
      this.sortDirection.set('asc');
    }
  }

  onDeleteClick(spending: Spending): void {
    this.spendingDeleted.emit(spending);
  }

  onObsInput(id: string, event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    this.resizeTextarea(el);
    this.onFieldInput(id, 'observation', event);
  }

  onFieldInput(id: string, field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.localSpendings.update(spendings =>
      spendings.map(s => {
        if (s.id !== id) return s;
        const updated = { ...s };
        switch (field) {
          case 'name': updated.name = value; break;
          case 'category': updated.category = value; break;
          case 'price': updated.price = parseFloat(value) || s.price; break;
          case 'date': updated.date = value; break;
          case 'observation': updated.observation = value || null; break;
        }
        return updated;
      })
    );

    const existing = this.pendingUpdates.get(id);
    if (existing !== undefined) clearTimeout(existing);
    const timer = setTimeout(() => {
      const spending = this.localSpendings().find(s => s.id === id);
      if (spending) {
        this.spendingUpdated.emit({ spending, changes: this.buildChanges(spending) });
      }
      this.pendingUpdates.delete(id);
    }, 1000);
    this.pendingUpdates.set(id, timer);
  }

  onCellEscape(event: KeyboardEvent, spending: Spending, field: string): void {
    if (event.key !== 'Escape') return;

    const existing = this.pendingUpdates.get(spending.id);
    if (existing !== undefined) clearTimeout(existing);
    this.pendingUpdates.delete(spending.id);
    const original = this.spendings.find(s => s.id === spending.id);
    if (original) {
      this.localSpendings.update(list => list.map(s => s.id === spending.id ? original : s));
      const el = event.target as HTMLInputElement | HTMLTextAreaElement;
      const values: Record<string, string> = {
        name: original.name,
        category: original.category,
        price: String(original.price),
        date: original.date.split('T')[0],
        observation: original.observation ?? '',
      };
      el.value = values[field] ?? '';
      if (field === 'observation' && el instanceof HTMLTextAreaElement) {
        this.resizeTextarea(el);
      }
    }
    (event.target as HTMLElement).blur();
  }

  onDraftFieldInput(field: keyof DraftRow, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.draftRow.update(d => d ? { ...d, [field]: value } : d);
  }

  onDraftKeydown(event: KeyboardEvent, _field: keyof DraftRow): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDraftRow();
      return;
    }
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      this.closeDraftRow();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSaveDraft();
    }
  }

  onSaveDraft(): void {
    const draft = this.draftRow();
    if (!draft) return;
    if (!this.isDraftValid) {
      this.draftSubmitAttempted.set(true);
      return;
    }
    const price = parseFloat(draft.price);
    this.spendingCreated.emit({
      name: draft.name.trim(),
      category: draft.category.trim(),
      price,
      observation: draft.observation.trim() || undefined,
      date: draft.date || undefined,
    });
    this.resetDraftRow();
    this.draftSubmitAttempted.set(false);
  }

  get isDraftValid(): boolean {
    const d = this.draftRow();
    if (!d) return false;
    const price = parseFloat(d.price);
    return d.name.trim().length > 0 && d.category.trim().length > 0 && !isNaN(price) && price > 0;
  }

  formatDate(dateStr: string): string {
    return dateStr ? dateStr.split('T')[0] : '';
  }

  openDraftRow(): void {
    if (this.draftRow()) {
      setTimeout(() => this.focusDraftName());
      return;
    }
    this.resetDraftRow();
  }

  private resetDraftRow(): void {
    this.draftRow.set({ name: '', category: '', price: '', date: formatLocalDate(new Date()), observation: '' });
    setTimeout(() => this.focusDraftName());
  }

  private focusDraftName(): void {
    const el = document.querySelector<HTMLElement>('[data-cy="draft-name"]');
    el?.focus();
    this.smoothScrollToBottom(200);
  }

  private smoothScrollToBottom(duration: number): void {
    const start = window.scrollY;
    const end = document.body.scrollHeight - window.innerHeight;
    const distance = end - start;
    if (distance <= 0) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
      window.scrollTo(0, start + distance * ease);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private closeDraftRow(): void {
    this.draftRow.set(null);
    this.draftSubmitAttempted.set(false);
    if (this.localSpendings().length > 0) {
      setTimeout(() => this.tableNav.focusCell('last', 'name'));
    }
  }

  private resizeTextarea(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  private resizeAllObsTextareas(): void {
    document.querySelectorAll<HTMLTextAreaElement>('[data-field="observation"]')
      .forEach(el => this.resizeTextarea(el));
  }

  private buildChanges(s: Spending): UpdateSpendingInput {
    return {
      name: s.name,
      category: s.category,
      price: s.price,
      observation: s.observation,
      date: s.date,
    };
  }
}
