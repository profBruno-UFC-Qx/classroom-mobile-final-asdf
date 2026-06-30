import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PublicNavListComponent } from './public-nav-list.component';

describe('PublicNavListComponent', () => {
  let fixture: ComponentFixture<PublicNavListComponent>;
  let component: PublicNavListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicNavListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicNavListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('renders login link', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="nav-login"]'))).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('emits linkClicked when login link clicked', () => {
      const spy = vi.fn();
      component.linkClicked.subscribe(spy);

      fixture.debugElement.query(By.css('[data-cy="nav-login"]')).triggerEventHandler('click', { button: 0 });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
