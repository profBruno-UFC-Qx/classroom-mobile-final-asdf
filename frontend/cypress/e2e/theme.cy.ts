describe('Dark mode toggle', () => {
  beforeEach(() => {
    // Seed explicit light theme so ThemeService doesn't fall back to the
    // system preference (Electron headless reports prefers-color-scheme: dark).
    cy.clearLocalStorage();
    cy.window().then(win => win.localStorage.setItem('theme', 'light'));
  });

  it('FAB is visible and fixed on the home page', () => {
    cy.visit('/');
    cy.get('[data-cy="theme-toggle"]').should('be.visible').and('have.css', 'position', 'fixed');
  });

  it('toggles dark mode on click', () => {
    cy.visit('/');
    cy.get('html').should('not.have.class', 'dark');
    cy.get('[data-cy="theme-toggle"]').click();
    cy.get('html').should('have.class', 'dark');
  });

  it('reverts to light mode on second click', () => {
    cy.visit('/');
    cy.get('[data-cy="theme-toggle"]').click();
    cy.get('html').should('have.class', 'dark');
    cy.get('[data-cy="theme-toggle"]').click();
    cy.get('html').should('not.have.class', 'dark');
  });

  it('persists dark theme across page reload', () => {
    cy.visit('/');
    cy.get('[data-cy="theme-toggle"]').click();
    cy.get('html').should('have.class', 'dark');
    cy.reload();
    cy.get('html').should('have.class', 'dark');
  });

  it('FAB is visible on /dashboard when authenticated', () => {
    cy.loginByApi();
    cy.intercept('GET', '**/api/spendings*', { body: { data: [] } });
    cy.visit('/dashboard');
    cy.get('[data-cy="theme-toggle"]').should('be.visible');
  });
});
