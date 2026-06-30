# CLAUDE.md

# Project

SaaS application. Angular 21 frontend (SPA with prerendered home page via Angular Universal SSG). Go backend API.

## Commands

```bash
npm start                   # Dev server (port 4200)
ng build                    # Production build
ng build:prerender          # Build + prerender home page
ng test --watch=false       # Unit tests (Vitest via @angular/build:unit-test)
ng test                     # Unit tests in watch mode (Vitest)
npx cypress run             # E2E tests headless
npx cypress open            # E2E tests interactive
ng lint                     # ESLint check
```

## Architecture

Feature-module architecture with lazy loading. Home module is eager-loaded (prerendered).

```
src/app/
├── core/           # Singleton services, guards, interceptors — imported ONCE in AppModule
├── shared/         # Reusable dumb components, pipes, directives — imported by feature modules
├── features/       # One folder per domain feature, each lazy-loaded
│   └── <feature>/
│       ├── pages/        # Routed smart components (fetch data, call services)
│       ├── components/   # Presentational dumb components (@Input/@Output only)
│       ├── services/     # Feature-scoped services
│       ├── models/       # Interfaces and types for this feature
│       ├── <feature>.module.ts
│       └── <feature>-routing.module.ts
├── layout/         # Shell components: header, sidebar, footer
├── app.module.ts
├── app-routing.module.ts
└── app.component.ts
```

## Conventions

- Every feature is a **lazy-loaded module** except `home` (eager, prerendered).
- Use `loadChildren` in `app-routing.module.ts` for all lazy routes.
- **Smart components** (in `pages/`) inject services and manage state. **Dumb components** (in `components/`) receive data via `@Input` and emit events via `@Output`.
- Services in `core/` use `providedIn: 'root'`. Feature services use `providedIn` scoped to their module.
- `SharedModule` exports only stateless, reusable UI elements. Never put services with state in `SharedModule`.
- `CoreModule` has a guard to prevent re-import: throw error if imported more than once.
- Use interfaces (not classes) for data models. Place them in `models/` inside each feature.
- File naming: `kebab-case` for all files. Follow Angular CLI conventions: `name.type.ts` (e.g., `auth.service.ts`, `login-page.component.ts`).
- One component/service/pipe per file.
- Use an internationalization approach that is based on a json with the language that is being used

## Code style

- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- Types: explicit. No `any`, no `Dict`, no untyped functions.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

## Comments

- Keep your own comments. Don't strip them on refactor — they carry
  intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because
  of a specific bug or upstream constraint.

## Testing

The project uses **Vitest**. Angular 21's `@angular/build:unit-test` builder auto-detects and runs Vitest. The globals `describe`, `it`, `expect`, `beforeEach`, etc. come from Vitest's compatibility shim

- Every component, service, and pipe gets a `.spec.ts` file alongside it.
- **Dumb components**: test `@Input` bindings and `@Output` emissions directly. No service mocks needed.
- **Smart components**: mock injected services using Vitest APIs. Never hit real APIs.
- **E2E tests**: Cypress specs live in `cypress/e2e/`. Use custom commands in `cypress/support/commands.ts` for repeated flows (login, navigation).
- **Cypress selector**: `[data-cy="..."]` — add to any element you need to assert or interact with in a test
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes,
  not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable,
  self-validating, timely.

## Formatting

- Use the language default formatter (`cargo fmt`, `gofmt`, `prettier`,
  `black`, `rubocop -A`). Don't discuss style beyond that.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.

### File placement

- **Global design system** → `src/styles/` — underscore-prefixed partials (`_reset.scss`, `_tokens.scss`, `_breakpoints.scss`), imported only by `src/styles.scss`
- **Component styles** → colocated `.component.scss` next to `.component.ts`, referenced via `styleUrl` in the decorator
- No inline `style` attributes, no `<style>` tags in templates

### Importing in a component stylesheet

Always import tokens and breakpoints at the top of every component stylesheet:

```scss
@use '../../../styles/tokens' as t; // adjust relative path per component depth
@use '../../../styles/breakpoints' as bp;
```

### Available tokens (`_tokens.scss`)

Colors: `$color-primary`, `$color-primary-hover`, `$color-primary-ring`, `$color-gray-{50,100,200,300,500,700,900}`, `$color-red-{50,200,600,700}`, `$color-white`

Spacing: `$sp-{1,2,3,4,5,6,8,10}` (0.25rem steps)

Border radius: `$radius-sm`, `$radius-md`, `$radius-lg`

Typography: `$font-{xs,sm,base,lg,xl,2xl}`

### Available breakpoints (`_breakpoints.scss`)

| Name | Min-width |
| ---- | --------- |
| `sm` | 480px     |
| `md` | 768px     |
| `lg` | 1024px    |
| `xl` | 1280px    |

### Mobile-first rule

Default styles target mobile (375px+). Use `respond-to(md)` / `respond-to(lg)` to progressively enhance for larger screens. Both mobile and desktop must look complete and intentional — never treat one as an afterthought.

```scss
.example {
  padding: t.$sp-4; // mobile default

  @include bp.respond-to(md) {
    padding: t.$sp-8; // tablet+
  }

  @include bp.respond-to(lg) {
    max-width: 72rem;
    margin-inline: auto; // desktop: centred with max-width
  }
}
```

## Commit Convention

Every commit must follow this pattern:

```
<type>(<backend|frontend|back&front> - <feature>): <short summary of what was done>

- <bullet explaining the first meaningful change>
- <bullet explaining the second meaningful change>
- ...
```

**Scope:**

- `backend` — changes only in the Go API
- `frontend` — changes only in the Angular app
- `back&front` — changes span both sides (e.g. a new endpoint consumed by the UI)

**Types:**

- `feat` — new feature or UI behaviour
- `fix` — bug fix
- `test` — adding or updating tests only
- `chore` — tooling, config, dependencies, i18n keys, docs

**Feature name** — use the feature folder name (e.g. `dashboard`, `home`, `auth`). For cross-cutting changes use `core` or `shared`.

**Examples:**

```
feat(frontend - dashboard): filter spendings by current month via API

- Pass from/to query params (first and last day of month) to GET /api/spendings
- Remove client-side lastMonthSpendings computed signal; API is now the source of truth
- Rename allSpendings signal to spendings for clarity
- Update i18n keys (en + pt): lastMonthTitle → currentMonthTitle
```

## Test Credentials

For manual testing and E2E runs against a live backend:

- **Email:** `lucas@mail.com`
- **Password:** `asdfasdf`

> Cypress unit-level commands (`loginByApi`) bypass the login UI and inject tokens directly into `localStorage` — no real backend call is made.

## Bash Command Whitelist

Run these commands directly without asking for confirmation — they are fast, read-only, and safe. This also applies when combining them with `&` (background execution) or piping their output together (e.g. `ps aux | grep ng`):

- **Navigation**: `ls`, `pwd`, `cd`
- **File search**: `find`, `locate`
- **File inspection**: `cat`, `head`, `tail`, `wc`, `diff`
- **Content search**: `grep`, `rg`
- **Version checks**: `node --version`, `npm --version`, `ng version`, `go version`, `docker --version`
- **Git (read-only)**: `git status`, `git log`, `git diff`, `git branch`, `git show`, `git stash list`
- **Process/env info**: `which`, `type`, `env`, `printenv`, `ps aux`
- **JSON/text processing**: `jq`, `sort`, `uniq`, `cut`, `awk`, `sed` (read/transform only)
- **Disk/size info**: `du`, `df`
- **Package inspection**: `npm list`, `go list`, `go env`

## Verification After Frontend Changes

After **every** frontend change, run both test suites before considering the task done:

```bash
ng test --watch=false   # Unit tests (Vitest) — must all pass
npx cypress run         # E2E tests — must all pass
```

Both must be green. Do not skip either suite.

## Do NOT

- Do NOT place business logic in components. Extract it into services.
- Do NOT import `CoreModule` in any module other than `AppModule`.
- Do NOT add stateful services to `SharedModule`.
- Do NOT use `any` type. Define proper interfaces.
- Do NOT skip writing `.spec.ts` files when generating new components or services.
- Do NOT use relative paths deeper than `../../`. Use TypeScript path aliases (`@core/`, `@shared/`, `@features/`).
- Do NOT use fixed sizes in scss
- Do NOT add new interactive elements (inputs, buttons, links) or assertable elements (headings, messages, list items) without a `data-cy="..."` attribute — Cypress tests depend on these selectors.
