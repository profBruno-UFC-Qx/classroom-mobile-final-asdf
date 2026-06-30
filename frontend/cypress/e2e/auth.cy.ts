describe('Authentication flow', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.intercept('POST', '**/api/auth/login').as('loginRequest');
  });

  it('shows the login form on the home page', () => {
    cy.visit('/');
    cy.get('[data-cy="email-input"]').should('exist');
    cy.get('[data-cy="password-input"]').should('exist');
    cy.get('[data-cy="login-submit"]').should('exist');
  });

  it('shows an error message when credentials are invalid', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: { error: 'Invalid credentials' },
    }).as('failedLogin');

    cy.visit('/');
    cy.get('[data-cy="email-input"]').should('be.visible').and('be.enabled');
    // withEventReplay() briefly re-disables inputs after hydration;
    // wait for that phase to complete before typing
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.get('[data-cy="email-input"]').type('wrong@example.com');
    cy.get('[data-cy="password-input"]').type('wrongpassword');
    cy.get('[data-cy="login-submit"]').click();
    cy.wait('@failedLogin');

    cy.get('[role="alert"]').should('be.visible');
  });

  it('redirects to /dashboard after a successful login', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: { data: { access_token: 'test.jwt', refresh_token: 'test.refresh' } },
    }).as('successfulLogin');

    cy.intercept('GET', '**/api/spendings*', { body: { data: [] } });

    cy.visit('/');
    cy.get('[data-cy="email-input"]').should('be.visible').and('be.enabled');
    // withEventReplay() briefly re-disables inputs after hydration;
    // wait for that phase to complete before typing
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
    cy.get('[data-cy="email-input"]').type('user@example.com');
    cy.get('[data-cy="password-input"]').type('password123');
    cy.get('[data-cy="login-submit"]').click();
    cy.wait('@successfulLogin');

    cy.url().should('include', '/dashboard');
  });

  it('redirects unauthenticated users away from /dashboard', () => {
    cy.visit('/dashboard');
    cy.url().should('not.include', '/dashboard');
  });

  it('redirects authenticated users from / to /dashboard', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [] } });
    cy.loginByApi();
    cy.url().should('include', '/dashboard');
  });

  it('logs out via the user menu and redirects to /', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [] } });
    cy.intercept('POST', '**/api/auth/logout', { statusCode: 204 }).as('logout');
    cy.loginByApi();
    cy.url().should('include', '/dashboard');
    cy.get('[data-cy="user-menu-btn"]').click();
    cy.get('[data-cy="user-dropdown"]').should('be.visible');
    cy.get('[data-cy="logout-btn"]').click();
    cy.wait('@logout');
    cy.url().should('not.include', '/dashboard');
  });
});
