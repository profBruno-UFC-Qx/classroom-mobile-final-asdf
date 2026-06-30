import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PrivateNavListComponent } from './private-nav-list.component';

describe('PrivateNavListComponent', () => {
  let fixture: ComponentFixture<PrivateNavListComponent>;
  let component: PrivateNavListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivateNavListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivateNavListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('renders dashboard link', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="nav-dashboard"]'))).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('emits linkClicked when dashboard link clicked', () => {
      const spy = vi.fn();
      component.linkClicked.subscribe(spy);

      fixture.debugElement.query(By.css('[data-cy="nav-dashboard"]')).triggerEventHandler('click', { button: 0 });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
