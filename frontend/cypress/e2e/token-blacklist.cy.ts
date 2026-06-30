// Token blacklist integration test
//
// Requires the full stack to be running:
//   docker compose -f backend/docker-compose.yml up -d
//   cd backend && air
//   cd frontend && npm start
//
// Test credentials: lucas@mail.com / asdfasdf

describe('Token blacklist (requires live backend + Redis)', () => {
  it('redirects to / when the dashboard is accessed with blacklisted tokens', () => {
    let capturedTokens: { access_token: string; refresh_token: string };

    cy.intercept('POST', '**/api/auth/login').as('login');
    cy.intercept('POST', '**/api/auth/logout').as('logout');
    cy.intercept('GET', '**/api/spendings*').as('spendings');

    cy.visit('/');
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500); // allow SSR hydration to complete before typing
    cy.get('[data-cy="email-input"]').type('lucas@mail.com');
    cy.get('[data-cy="password-input"]').type('asdfasdf');
    cy.get('[data-cy="login-submit"]').click();
    cy.wait('@login').its('response.statusCode').should('eq', 200);

    cy.url().should('include', '/dashboard');
    cy.wait('@spendings');

    // Capture real tokens from localStorage before they are cleared by logout
    cy.window().then(win => {
      capturedTokens = {
        access_token: win.localStorage.getItem('access_token')!,
        refresh_token: win.localStorage.getItem('refresh_token')!,
      };
    });

    // Logout — backend blacklists both tokens in Redis
    cy.get('[data-cy="user-menu-btn"]').click();
    cy.get('[data-cy="logout-btn"]').click();
    cy.wait('@logout').its('response.statusCode').should('eq', 204);
    cy.url().should('not.include', '/dashboard');

    // Re-inject the now-blacklisted tokens into localStorage
    cy.window().then(win => {
      win.localStorage.setItem('access_token', capturedTokens.access_token);
      win.localStorage.setItem('refresh_token', capturedTokens.refresh_token);
    });

    // Visiting /dashboard with blacklisted tokens:
    // - Auth guard passes (tokens are present in localStorage)
    // - Dashboard loads and calls GET /api/spendings with the blacklisted access token
    // - Backend returns 401
    // - Interceptor attempts POST /api/auth/renew with the blacklisted refresh token
    // - Backend returns 401 again
    // - Interceptor calls clearTokens() and navigates to /
    cy.visit('/dashboard');
    cy.url().should('not.include', '/dashboard');
  });
});
