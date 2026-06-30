declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Seeds localStorage with stub tokens so the auth guard treats the browser
       * as authenticated. Tokens are injected before Angular bootstraps via
       * onBeforeLoad, so no form interaction is needed.
       */
      loginByApi(): Chainable<void>;
    }
  }
}

function seedAuthTokens(win: Window): void {
  win.localStorage.setItem('access_token', 'test.jwt');
  win.localStorage.setItem('refresh_token', 'test.refresh');
}

Cypress.Commands.add('loginByApi', () => {
  cy.visit('/', { onBeforeLoad: seedAuthTokens });
});

export {};
