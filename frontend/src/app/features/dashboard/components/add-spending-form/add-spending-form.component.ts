import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateSpendingInput } from '../../models/spending.model';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-add-spending-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './add-spending-form.component.html',
  styleUrl: './add-spending-form.component.scss',
})
export class AddSpendingFormComponent {
  @Input() isSubmitting = false;
  @Output() readonly spendingAdded = new EventEmitter<CreateSpendingInput>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name:        ['', [Validators.required, Validators.maxLength(50)]],
    category:    ['', [Validators.required, Validators.maxLength(50)]],
    price:       [null as number | null, [Validators.required, Validators.min(0.01)]],
    observation: ['', Validators.maxLength(200)],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const input: CreateSpendingInput = {
      name: value.name!,
      category: value.category!,
      price: value.price!,
    };
    if (value.observation) {
      input.observation = value.observation;
    }
    this.spendingAdded.emit(input);
    this.form.reset();
  }
}
