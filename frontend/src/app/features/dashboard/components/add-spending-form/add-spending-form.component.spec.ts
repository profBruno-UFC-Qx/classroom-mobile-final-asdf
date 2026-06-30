import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AddSpendingFormComponent } from './add-spending-form.component';
import { CreateSpendingInput } from '../../models/spending.model';

describe('AddSpendingFormComponent', () => {
  let fixture: ComponentFixture<AddSpendingFormComponent>;
  let component: AddSpendingFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSpendingFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddSpendingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const submitBtn = (): HTMLButtonElement =>
    fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;

  it('submit button is disabled when form is invalid', () => {
    expect(submitBtn().disabled).toBe(true);
  });

  it('submit button is disabled when isSubmitting is true', () => {
    fixture.componentRef.setInput('isSubmitting', true);
    component.form.setValue({ name: 'Coffee', category: 'Food', price: 3.5, observation: '' });
    fixture.detectChanges();
    expect(submitBtn().disabled).toBe(true);
  });

  it('submit button is enabled when form is valid and not submitting', () => {
    component.form.setValue({ name: 'Coffee', category: 'Food', price: 3.5, observation: '' });
    fixture.detectChanges();
    expect(submitBtn().disabled).toBe(false);
  });

  it('does not emit when form is invalid', () => {
    const spy = vi.fn();
    component.spendingAdded.subscribe(spy);
    component.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('emits CreateSpendingInput without observation when field is empty', () => {
    const spy = vi.fn();
    component.spendingAdded.subscribe(spy);
    component.form.setValue({ name: 'Coffee', category: 'Food', price: 3.5, observation: '' });
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith<[CreateSpendingInput]>({
      name: 'Coffee',
      category: 'Food',
      price: 3.5,
    });
  });

  it('includes observation in the emit when field has a value', () => {
    const spy = vi.fn();
    component.spendingAdded.subscribe(spy);
    component.form.setValue({ name: 'Coffee', category: 'Food', price: 3.5, observation: 'a note' });
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith<[CreateSpendingInput]>({
      name: 'Coffee',
      category: 'Food',
      price: 3.5,
      observation: 'a note',
    });
  });

  it('resets the form after a successful submit', () => {
    component.form.setValue({ name: 'Coffee', category: 'Food', price: 3.5, observation: '' });
    component.onSubmit();
    expect(component.form.value).toEqual({ name: null, category: null, price: null, observation: null });
  });

  it('form is invalid when name is empty', () => {
    component.form.setValue({ name: '', category: 'Food', price: 3.5, observation: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('form is invalid when category is empty', () => {
    component.form.setValue({ name: 'Coffee', category: '', price: 3.5, observation: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('form is invalid when price is 0', () => {
    component.form.setValue({ name: 'Coffee', category: 'Food', price: 0, observation: '' });
    expect(component.form.invalid).toBe(true);
  });
});
