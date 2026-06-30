import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TableNavDirective } from './table-nav.directive';

@Component({
  standalone: true,
  imports: [TableNavDirective],
  template: `
    <table>
      <tbody appTableNav (pastLastRow)="lastField = $event">
        <tr>
          <td><input data-field="name" value="A" /></td>
          <td><input data-field="category" value="X" /></td>
        </tr>
        <tr>
          <td><input data-field="name" value="B" /></td>
          <td><input data-field="category" value="Y" /></td>
        </tr>
        <tr>
          <td><input data-field="name" value="C" /></td>
          <td><input data-field="category" value="Z" /></td>
        </tr>
      </tbody>
    </table>
  `,
})
class TestHostComponent {
  lastField: string | null = null;
}

describe('TableNavDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function getInputs(field: string): HTMLInputElement[] {
    return fixture.debugElement
      .queryAll(By.css(`[data-field="${field}"]`))
      .map(de => de.nativeElement as HTMLInputElement);
  }

  function pressEnter(el: HTMLElement, shiftKey = false): void {
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, bubbles: true });
    el.dispatchEvent(event);
  }

  describe('Enter key', () => {
    it('navigates to same field in next row', () => {
      const inputs = getInputs('name');
      inputs[0].focus();
      pressEnter(inputs[0]);
      expect(document.activeElement).toBe(inputs[1]);
    });

    it('emits pastLastRow with field name when on last row', () => {
      const inputs = getInputs('name');
      pressEnter(inputs[2]);
      expect(host.lastField).toBe('name');
    });
  });

  describe('Shift+Enter key', () => {
    it('navigates to same field in previous row', () => {
      const inputs = getInputs('category');
      inputs[1].focus();
      pressEnter(inputs[1], true);
      expect(document.activeElement).toBe(inputs[0]);
    });

    it('does nothing when on first row', () => {
      const inputs = getInputs('name');
      inputs[0].focus();
      pressEnter(inputs[0], true);
      expect(document.activeElement).toBe(inputs[0]);
    });
  });

  describe('edge cases', () => {
    it('non-Enter keys are ignored', () => {
      const inputs = getInputs('name');
      inputs[0].focus();
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      inputs[0].dispatchEvent(event);
      expect(document.activeElement).toBe(inputs[0]);
      expect(host.lastField).toBeNull();
    });

    it('elements without data-field are ignored', () => {
      const button = document.createElement('button');
      const tbody = fixture.debugElement.query(By.css('tbody')).nativeElement;
      const firstRow = tbody.querySelector('tr')!;
      const td = document.createElement('td');
      td.appendChild(button);
      firstRow.appendChild(td);

      button.focus();
      pressEnter(button);
      expect(host.lastField).toBeNull();
    });
  });

  describe('focusCell()', () => {
    function getDirective(): TableNavDirective {
      return fixture.debugElement
        .query(By.directive(TableNavDirective))
        .injector.get(TableNavDirective);
    }

    it('focusCell("last", "name") focuses the last row input', () => {
      const inputs = getInputs('name');
      getDirective().focusCell('last', 'name');
      expect(document.activeElement).toBe(inputs[2]);
    });

    it('focusCell("first", "category") focuses the first row input', () => {
      const inputs = getInputs('category');
      getDirective().focusCell('first', 'category');
      expect(document.activeElement).toBe(inputs[0]);
    });
  });
});
