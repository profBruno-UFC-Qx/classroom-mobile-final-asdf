import { Directive, ElementRef, EventEmitter, HostListener, inject, Output } from '@angular/core';

@Directive({
  selector: '[appTableNav]',
  standalone: true,
})
export class TableNavDirective {
  private el = inject(ElementRef);

  @Output() pastLastRow = new EventEmitter<string>();

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;

    const target = event.target as HTMLElement;
    const field = target.getAttribute('data-field');
    if (!field) return;

    event.preventDefault();
    const currentRow = target.closest('tr');
    if (!currentRow) return;

    if (event.shiftKey) {
      const prevRow = currentRow.previousElementSibling as HTMLElement | null;
      prevRow?.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus();
    } else {
      const nextRow = currentRow.nextElementSibling as HTMLElement | null;
      const nextInput = nextRow?.querySelector<HTMLElement>(`[data-field="${field}"]`);
      if (nextInput) {
        nextInput.focus();
      } else {
        this.pastLastRow.emit(field);
      }
    }
  }

  focusCell(position: 'first' | 'last', field: string): void {
    const rows = this.el.nativeElement.querySelectorAll('tr') as NodeListOf<HTMLElement>;
    const row = position === 'last' ? rows[rows.length - 1] : rows[0];
    (row?.querySelector(`[data-field="${field}"]`) as HTMLElement | null)?.focus();
  }
}
