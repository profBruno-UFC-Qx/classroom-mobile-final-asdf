import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-email-verification-modal',
  imports: [TranslatePipe],
  templateUrl: './email-verification-modal.component.html',
  styleUrl: './email-verification-modal.component.scss',
})
export class EmailVerificationModalComponent {
  @Input() visible = false;
  @Output() readonly close = new EventEmitter<void>();
}
