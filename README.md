# L3BTY | لعبتي

Arabic RTL store operations application covering rentals, sales, maintenance, inventory, staff and finance. The current implementation is a local operational prototype with browser-side business logic and SQLite snapshot persistence. It is not yet a production-secured multi-user system.

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the developer/AI handoff, [TODO.md](TODO.md) for remaining work and [AGENTS.md](AGENTS.md) before changing code.

## Prerequisites

- Git and npm.
- Node supporting `node:sqlite` and the locked dependencies. The inspected environment is **Node 24.19.0 / npm 11.17.0**; use this baseline to reproduce it. Node 20 is insufficient even though Next.js alone permits it. Locked jsdom requires `^22.22.2 || ^24.15.0 || >=26.0.0`.
- Internet for installation and Google Fonts used by the root layout.
- Google Chrome for the configured browser tests.

## Install and run

```sh
git clone https://github.com/omar9kk1/l3bty-store-crm.git
cd l3bty-store-crm
npm ci
npm run dev -- --port 3001
```

Open http://localhost:3001. The root redirects to `/dashboard`. Without a port argument development normally uses port 3000.

No application credentials or required `.env` file are currently needed. The role selector is a preview identity selector, not authentication; it defaults to owner. SQLite automatically initializes `.data/l3bty-local.sqlite` and its schema when the server database module loads. The process needs write access to `.data/`. No database service, ORM CLI or seed command is required. Business stores generally start empty outside tests; use management screens to create records. Fixture reset functions are test helpers, not production seeds.

Do not delete `.data/` or clear browser storage as routine troubleshooting: both may contain business data. Read the bridge cleanup/migration warnings in PROJECT_CONTEXT before moving existing data. A Git clone does not include the local database.

## Checks

```sh
npm run check:styles
npm run typecheck
npm run lint
npm test
npm run test:watch
```

Browser tests use Chrome and production mode:

```sh
npx playwright install chrome
npm run build
npm run test:e2e
```

Playwright starts `next start` or reuses a running server. Default test port is 3000. To target an existing server on 3001 in PowerShell:

```powershell
$env:L3BTY_E2E_PORT = '3001'
$env:L3BTY_E2E_EXTERNAL = '1'
npm run test:e2e
```

Use a disposable checkout/data for E2E because browser actions can write to SQLite. The preceding application verification in this handoff session passed **45 Vitest files / 326 tests**, lint, typecheck and style imports. Production build and full E2E were not rerun for the documentation task.

## Build and production mode

```sh
npm run build
npm run start -- --port 3001
```

This runs Next.js with local SQLite. It does not add authentication or concurrent-edit protection. Google Font download availability can affect builds.

The alternate preview build is `npm run build:sites`. It uses Vinext/Vite and Cloudflare Workers and replaces SQLite with a browser-preview adapter whose server writes do nothing. `.openai/hosting.json` has no D1/R2 database/storage binding. No generic publish command, Docker configuration or CI/CD pipeline is checked in; confirm the hosting workflow before deployment.

## Structure

- `app/`: App Router pages, workspace layout and snapshot API.
- `features/`: Domain components, hooks, stores, schemas, permissions and tests.
- `components/`: Shared UI, shell and database hydration bridge.
- `permissions/`: Central roles and navigation policy.
- `lib/`: SQLite, storage contracts and date/money helpers.
- `styles/`: Tokens, feature CSS, responsive and print styles.
- `tests/`: Shared component, permission and browser tests.
- `docs/`: Historical sprint reports; current code takes precedence.
- `worker/`, `build/`, `vite.config.ts`: Alternate hosting build.

## Operational limits

The API has no authentication or server-side role enforcement. Whole-domain saves can overwrite another device's work. Failed saves are not reliably surfaced/retried. Settings are memory-only, and several timestamps/actor IDs remain mock values. See PROJECT_CONTEXT and TODO before using real multi-user data.
