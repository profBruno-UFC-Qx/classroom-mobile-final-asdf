const now = new Date().toISOString();
const mockSpending = {
  id: 'uuid-1',
  user_id: 1,
  name: 'Coffee',
  category: 'Food',
  price: 3.5,
  observation: null,
  spent_at: now,
  order_number: 1,
  created_at: now,
  updated_at: now,
};

describe('Dashboard', () => {
  beforeEach(() => {
    cy.loginByApi();
  });

  it('shows the dashboard heading', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [] } });
    cy.visit('/dashboard');
    cy.get('[data-cy="dashboard-title"]').should('be.visible');
  });

  it('shows the empty state when no spendings are returned', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
    cy.get('[data-cy="empty-state"]').should('be.visible');
  });

  it('renders the spending table when spendings are returned', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
    cy.get('app-spending-list').should('exist');
    cy.get('tbody tr').should('have.length', 1);
    cy.get('tbody tr').first().find('[data-cy="edit-name"]').should('have.value', 'Coffee');
  });

  it('sends from and to query params scoped to the current month', () => {
    cy.intercept('GET', '**/api/spendings*', req => {
      expect(req.query['from']).to.match(/^\d{4}-\d{2}-01$/);
      expect(req.query['to']).to.match(/^\d{4}-\d{2}-\d{2}$/);
      req.reply({ body: { data: [] } });
    }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
  });

  it('clicking add-spending-btn opens the draft row', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
    cy.get('[data-cy="add-spending-btn"]').click();
    cy.get('[data-cy="draft-row"]').should('exist');
  });

  it('add-spending-btn is always visible', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [] } });
    cy.visit('/dashboard');
    cy.get('[data-cy="add-spending-btn"]').should('be.visible');
  });

  it('add-spending-btn-bottom is always visible', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [] } });
    cy.visit('/dashboard');
    cy.get('[data-cy="add-spending-btn-bottom"]').should('be.visible');
  });

  it('clicking add-spending-btn-bottom opens the draft row', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
    cy.get('[data-cy="add-spending-btn-bottom"]').click();
    cy.get('[data-cy="draft-row"]').should('exist');
  });

  it('add-spending-btn-bottom appears below the draft row when open', () => {
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
    cy.get('[data-cy="add-spending-btn-bottom"]').click();
    cy.get('[data-cy="draft-row"]').then($draft => {
      cy.get('[data-cy="add-spending-btn-bottom"]').then($btn => {
        expect($btn[0].getBoundingClientRect().top).to.be.greaterThan($draft[0].getBoundingClientRect().bottom - 1);
      });
    });
  });
});

describe('spending creation', () => {
  beforeEach(() => {
    cy.loginByApi();
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
  });

  it('creates a spending via add button + draft row with observation', () => {
    const newSpending = { ...mockSpending, id: 'uuid-2', name: 'Lunch', observation: 'With colleagues' };

    cy.intercept('POST', '**/api/spendings', {
      statusCode: 201,
      body: { data: newSpending },
    }).as('createSpending');

    cy.get('[data-cy="add-spending-btn"]').click();
    cy.get('[data-cy="draft-name"]').type('Lunch');
    cy.get('[data-cy="draft-category"]').type('Food');
    cy.get('[data-cy="draft-price"]').type('12.5');
    cy.get('[data-cy="draft-observation"]').type('With colleagues');
    cy.get('[data-cy="save-draft-btn"]').click();

    cy.wait('@createSpending').its('request.body.observation').should('equal', 'With colleagues');
  });
});

describe('spending deletion', () => {
  beforeEach(() => {
    cy.loginByApi();
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
  });

  it('removes the row immediately and shows the delete toast', () => {
    cy.intercept('DELETE', '**/api/spendings/uuid-1', { statusCode: 204, body: '' }).as('deleteSpending');

    cy.get('[data-cy="spending-row"]').should('have.length', 1);
    cy.get('[data-cy="delete-spending-btn"]').first().click({ force: true });
    cy.get('[data-cy="spending-row"]').should('have.length', 0);
    cy.get('[data-cy="delete-toast"]').should('be.visible');

    cy.wait('@deleteSpending', { timeout: 5000 });
  });

  it('undo restores the deleted spending and hides the toast', () => {
    cy.get('[data-cy="spending-row"]').should('have.length', 1);

    cy.get('[data-cy="delete-spending-btn"]').first().click({ force: true });
    cy.get('[data-cy="spending-row"]').should('have.length', 0);
    cy.get('[data-cy="delete-toast"]').should('be.visible');

    cy.get('[data-cy="toast-undo"]').click();
    cy.get('[data-cy="spending-row"]').should('have.length', 1);
    cy.get('[data-cy="delete-toast"]').should('not.exist');
  });
});

describe('inline editing — character limits', () => {
  beforeEach(() => {
    cy.loginByApi();
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
  });

  it('shows name max-length warning when name reaches 50 characters', () => {
    const fortyNineChars = 'a'.repeat(49);
    cy.get('[data-cy="spending-row"]').first().find('[data-cy="edit-name"]').clear().type(fortyNineChars);
    cy.get('[data-cy="name-max-warn"]').should('not.exist');

    cy.get('[data-cy="spending-row"]').first().find('[data-cy="edit-name"]').type('a');
    cy.get('[data-cy="name-max-warn"]').should('be.visible');
  });

  it('shows category max-length warning when category reaches 50 characters', () => {
    cy.get('[data-cy="spending-row"]').first().find('[data-cy="edit-category"]').clear().type('a'.repeat(49));
    cy.get('[data-cy="category-max-warn"]').should('not.exist');
    cy.get('[data-cy="spending-row"]').first().find('[data-cy="edit-category"]').type('a');
    cy.get('[data-cy="category-max-warn"]').should('be.visible');
  });

  it('shows date-required warning when date is cleared', () => {
    cy.get('[data-cy="spending-row"]').first().find('[data-cy="edit-date"]')
      .invoke('val', '')
      .trigger('input');
    cy.get('[data-cy="date-required-warn"]').should('be.visible');
  });
});

describe('inline editing — update', () => {
  beforeEach(() => {
    cy.loginByApi();
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
  });

  it('sends PATCH request after editing name and debounce elapses', () => {
    const updatedSpending = { ...mockSpending, name: 'Updated Coffee' };

    cy.intercept('PATCH', '**/api/spendings/uuid-1', { body: { data: updatedSpending } }).as('patchSpending');

    cy.get('[data-cy="spending-row"]').should('have.length', 1);
    cy.get('[data-cy="spending-row"]').first().find('[data-cy="edit-name"]').clear().type('Updated Coffee');
    cy.wait('@patchSpending', { timeout: 3000 }).its('request.body.name').should('equal', 'Updated Coffee');
  });

  it('shows the update-error toast when PATCH fails after both attempts', () => {
    cy.intercept('PATCH', '**/api/spendings/uuid-1', { statusCode: 500 }).as('patchSpending');

    cy.get('[data-cy="spending-row"]').should('have.length', 1);
    cy.get('[data-cy="spending-row"]').first().find('[data-cy="edit-name"]').clear().type('Fail');
    cy.wait('@patchSpending', { timeout: 3000 });
    cy.wait('@patchSpending', { timeout: 8000 });

    cy.get('[data-cy="update-error-toast"]').should('be.visible');
  });
});

describe('inline draft row — create from last row', () => {
  beforeEach(() => {
    cy.loginByApi();
    cy.intercept('GET', '**/api/spendings*', { body: { data: [mockSpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
  });

  it('opens a draft row when Enter is pressed on the last row name field', () => {
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-row"]').should('exist');
  });

  it('draft row date defaults to today\'s local date', () => {
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-row"]').should('exist');
    cy.get('[data-cy="draft-date"]').invoke('val').then(val => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(val).to.equal(expected);
    });
  });

  it('save button is disabled when required fields are empty', () => {
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="save-draft-btn"]').should('be.disabled');
  });

  it('creates a spending from the draft row and opens a new draft', () => {
    const newSpending = { ...mockSpending, id: 'uuid-2', name: 'Lunch' };
    cy.intercept('POST', '**/api/spendings', { statusCode: 201, body: { data: newSpending } }).as('createSpending');

    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-name"]').type('Lunch');
    cy.get('[data-cy="draft-category"]').type('Food');
    cy.get('[data-cy="draft-price"]').type('12.5');
    cy.get('[data-cy="save-draft-btn"]').click();

    cy.wait('@createSpending').its('request.body.name').should('equal', 'Lunch');
    cy.get('[data-cy="draft-row"]').should('exist');
    cy.get('[data-cy="draft-name"]').should('have.value', '');
  });

  it('removes the draft row when Escape is pressed', () => {
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-row"]').should('exist');
    cy.get('[data-cy="draft-name"]').type('{esc}');
    cy.get('[data-cy="draft-row"]').should('not.exist');
  });

  it('pressing Enter in the draft row with empty fields shows required error', () => {
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-name"]').type('{enter}');
    cy.get('[data-cy="draft-name-required"]').should('be.visible');
  });

  it('after saving, opens a new draft row and focuses draft name', () => {
    const newSpending = { ...mockSpending, id: 'uuid-2', name: 'Lunch' };
    cy.intercept('POST', '**/api/spendings', { statusCode: 201, body: { data: newSpending } }).as('createSpending');

    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-name"]').type('Lunch');
    cy.get('[data-cy="draft-category"]').type('Food');
    cy.get('[data-cy="draft-price"]').type('12.5');
    cy.get('[data-cy="draft-name"]').type('{enter}');

    cy.wait('@createSpending');
    cy.get('[data-cy="draft-row"]').should('exist');
    cy.focused().should('have.attr', 'data-cy', 'draft-name');
  });

  it('Shift+Enter closes the draft row', () => {
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-row"]').should('exist');
    cy.get('[data-cy="draft-name"]').type('{shift+enter}');
    cy.get('[data-cy="draft-row"]').should('not.exist');
  });

  it('can re-open draft after leaving and returning to last row', () => {
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-row"]').should('exist');

    // Leave the draft by clicking away
    cy.get('body').click(0, 0);

    // Re-open by pressing Enter on last row again
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-row"]').should('exist');
    cy.focused().should('have.attr', 'data-cy', 'draft-name');
  });
});

describe('spending summary', () => {
  const summaryMock = [
    { id: 'uuid-s1', user_id: 1, name: 'Coffee', category: 'Food', price: 2.0, observation: null, order_number: 1, spent_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'uuid-s2', user_id: 1, name: 'Bus', category: 'Transport', price: 1.5, observation: null, order_number: 2, spent_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  const tallMock = Array.from({ length: 10 }, (_, i) => ({
    id: `uuid-t${i + 1}`,
    user_id: 1,
    name: `Spending item with a long descriptive name number ${i + 1}`,
    category: ['Food & Groceries', 'Transport & Commute', 'Entertainment', 'Utilities', 'Health'][i % 5],
    price: 10 + i * 5,
    observation: null,
    order_number: i + 1,
    spent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  describe('desktop', () => {
    beforeEach(() => {
      cy.viewport(1280, 800);
      cy.loginByApi();
      cy.intercept('GET', '**/api/spendings*', { body: { data: summaryMock } }).as('getSpendings');
      cy.visit('/dashboard');
      cy.wait('@getSpendings');
    });

    it('renders the summary panel', () => {
      cy.get('[data-cy="spending-summary"]').should('be.visible');
    });

    it('shows the grand total', () => {
      cy.get('[data-cy="summary-total"]').should('contain', '3.50');
    });

    it('panel top is below the header', () => {
      cy.get('[data-cy="spending-summary"]').then($el => {
        const win = $el[0].ownerDocument.defaultView!;
        const top = $el[0].getBoundingClientRect().top;
        expect(top).to.be.greaterThan(80);
        win; // suppress unused warning
      });
    });

    it('shows category breakdown items', () => {
      cy.get('[data-cy="summary-category-item"]').should('exist');
    });

    it('chart type carousel button for by-category is visible', () => {
      cy.get('[data-cy="chart-type-btn-by-category"]').should('be.visible');
    });

    it('chart type carousel button for by-category has the active CSS class', () => {
      cy.get('[data-cy="chart-type-btn-by-category"]').should('have.class', 'chart-panel__type-btn--active');
    });
  });

  describe('mobile', () => {
    beforeEach(() => {
      cy.viewport(375, 600);
      cy.loginByApi();
      cy.intercept('GET', '**/api/spendings*', { body: { data: summaryMock } }).as('getSpendings');
      cy.visit('/dashboard');
      cy.wait('@getSpendings');
    });

    it('summary panel is visible on mobile', () => {
      cy.get('[data-cy="spending-summary"]').should('exist');
    });
  });
});

describe('draft row — add then cancel', () => {
  const earlySpending = {
    id: 'uuid-e1', user_id: 1, name: 'Coffee', category: 'Food', price: 3.5,
    observation: null, order_number: 1, spent_at: '2026-03-10T00:00:00Z',
    created_at: '2026-03-10T00:00:00Z', updated_at: '2026-03-10T00:00:00Z',
  };
  const lateSpending = {
    id: 'uuid-l1', user_id: 1, name: 'Lunch', category: 'Food', price: 12,
    observation: null, order_number: 2, spent_at: '2026-03-20T00:00:00Z',
    created_at: '2026-03-20T00:00:00Z', updated_at: '2026-03-20T00:00:00Z',
  };

  beforeEach(() => {
    cy.loginByApi();
    cy.intercept('GET', '**/api/spendings*', { body: { data: [lateSpending, earlySpending] } }).as('getSpendings');
    cy.visit('/dashboard');
    cy.wait('@getSpendings');
  });

  it('Escape after filling draft fields — no spending created', () => {
    cy.intercept('POST', '**/api/spendings').as('createSpending');

    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-name"]').type('Nope');
    cy.get('[data-cy="draft-category"]').type('Test');
    cy.get('[data-cy="draft-price"]').type('5');
    cy.get('[data-cy="draft-name"]').type('{esc}');

    cy.get('[data-cy="draft-row"]').should('not.exist');
    cy.get('@createSpending.all').should('have.length', 0);
  });

  it('Shift+Enter after filling draft fields — no spending created', () => {
    cy.intercept('POST', '**/api/spendings').as('createSpending');

    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-name"]').type('Nope');
    cy.get('[data-cy="draft-category"]').type('Test');
    cy.get('[data-cy="draft-price"]').type('5');
    cy.get('[data-cy="draft-name"]').type('{shift+enter}');

    cy.get('[data-cy="draft-row"]').should('not.exist');
    cy.get('@createSpending.all').should('have.length', 0);
  });

  it('Enter on last row opens draft when sorted order differs from API order', () => {
    // API sends [lateSpending, earlySpending] but sorted by order_number asc shows [earlySpending, lateSpending]
    // The visually last row should be lateSpending (order_number=2)
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').should('have.value', 'Lunch');
    cy.get('[data-cy="spending-row"]').last().find('[data-cy="edit-name"]').type('{enter}');
    cy.get('[data-cy="draft-row"]').should('exist');
    cy.focused().should('have.attr', 'data-cy', 'draft-name');
  });
});
