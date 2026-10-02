# Project Overview

L3BTY / لعبتي is an Arabic RTL operations application for a multi-branch toy/game rental and retail business with repair/workshop operations. It centralizes customers, assets, sales stock, maintenance custody, staff attendance, cash shifts, expenses, payroll and reporting. Roles represented in code are owner, manager, rental/maintenance intake employee, sales employee and maintenance technician.

Main workflows: start/extend/close rentals and issue receipts; sales checkout/returns; maintenance intake/diagnosis/parts/workshop handover; inventory transfers and branch needs; attendance/exceptions; cash-shift reconciliation; expenses/payroll approval; report snapshots and in-app delivery.

Inspected **2026-10-02**, based on application revision **7950da8**. This task changes documentation only. Historical `docs/SPRINT_*` reports are context, not definitive current status: some memory-only persistence statements have been superseded by the SQLite bridge. No real customer rows were read for this handoff.

# Current Project Status

## Implemented in the current local/prototype scope

- Responsive Arabic RTL workspace, navigation, shared forms/drawers, print styles and role/employee/branch preview selection.
- Domain screens, client operations, validation and tests for the major features below.
- Local SQLite snapshot persistence, selected SQL mirrors and browser storage hydration.
- Next.js local build and separate Vinext/Cloudflare preview build configuration.

These are implemented capabilities, not a claim of full production acceptance. The preceding application verification in this session passed **45 Vitest files / 326 tests**, lint, typecheck and style imports. This documentation task did not rerun build or full E2E.

## Partially complete

Persistence is client-led and unsafe for concurrent edits. Permissions exist in UI/client logic, not a trusted backend. Settings are memory-only. Reminders depend on an open browser. Maintenance attachments are mock references. Report delivery still uses preview employee IDs. Some clocks, timestamps, identifiers and audit metadata are simulated.

## Not implemented in inspected source

Real login/session authentication; server user/branch authorization; reliable multi-device reconciliation; backend reminder scheduling; actual WhatsApp Business API/email transport; durable file uploads; a full migration/backup system; measured load capacity. No ORM, AI integration, Docker setup or checked-in CI/CD deployment workflow was found.

# Tech Stack

Versions below are exact resolutions in `package-lock.json`; many package.json declarations use ranges.

| Area | Implementation |
| --- | --- |
| Framework/UI | Next.js 16.3.0 App Router; React / React DOM 19.2.8 |
| Language | TypeScript 5.9.3; ESM package |
| Backend | Next.js Node route handler, Node filesystem and node:sqlite |
| Observed runtime | Node 24.19.0 / npm 11.17.0; no package engine pin |
| Database / ORM | SQLite DatabaseSync, direct SQL, no ORM |
| Authentication | None; browser preview identity selection |
| Styling | Tailwind CSS / @tailwindcss/postcss 4.3.3, custom CSS and tokens |
| Components | Radix Dialog 1.1.23, Tooltip 1.2.16, Lucide React 1.28.0 |
| Testing | Vitest 4.1.10, jsdom 30.0.1, Playwright 1.62.1 |
| Testing Library | React 16.3.2, jest-dom 7.0.0, user-event 14.6.3 |
| Checks | ESLint 9.39.5, eslint-config-next 16.3.0, TypeScript |
| Alternate build | Vite 8.0.13, Vinext 1.0.0-beta.2, Cloudflare Vite plugin 1.37.1, Wrangler 4.92.0 |
| Vite plugins | React 6.0.5, RSC 0.5.26 |
| Fonts | IBM Plex Sans Arabic and Plus Jakarta Sans via next/font/google |
| Storage | localStorage/sessionStorage, local SQLite, static public files, product image data URLs |
| APIs/services | Snapshot API, WhatsApp click-to-chat, browser geolocation, worker image bindings |
| AI / Docker | No integration/configuration found |

SQLite engine version comes from the Node runtime, not a separately pinned database package. No database server installation is needed.

# Architecture

## Frontend architecture

`app/` contains route entry points. `/` redirects to `/dashboard`. `(workspace)/layout.tsx` wraps pages with LocalDatabaseBridge and AppShell. Rental invoice pages also exist outside that route group. The root layout sets `lang=ar`, `dir=rtl`, fonts and metadata.

Features generally have components, forms, hooks, services/stores, schemas, permissions, fixtures, types and tests. Stores use module-level state, subscribers and snapshot getters; React hooks connect to stores, including useSyncExternalStore. There is no Redux/Zustand dependency. Business operations often call other feature stores directly.

## Backend architecture and API structure

The only application API route found is `app/api/local-data/route.ts`, with Node runtime and force-dynamic behavior. No application Server Actions were found.

| Request | Actual contract |
| --- | --- |
| GET /api/local-data | All domain snapshots, storage label and project-relative database path |
| PUT /api/local-data | Accepts `{key, version, data}`; returns `{key, version, updatedAt}` after save |

PUT validates a known domain key, positive safe-integer version and presence of data. It rejects declared Content-Length above 10,000,000 bytes but does not enforce actual streamed body size or validate full domain structures. No authentication, server branch filtering, revision comparison or operation-specific business API exists. Malformed JSON/database errors lack explicit application error mapping here.

## Database architecture and persistence

`lib/local-test-data.ts` writes `{version,data}` to localStorage and asynchronously PUTs the entire domain. Rental browser storage uses top-level fields and version **4**, although its key ends in `v1`; the bridge translates that format. PUT is fire-and-forget and does not check `response.ok`.

On workspace mount the bridge clears known local domain keys if its CLEAN_SLATE_MARKER is absent, then GETs remote snapshots. Remote data normally replaces local data, with one session-guarded reload. Nonempty local data can instead be uploaded when the remote domain is empty or missing. Exceptions show an offline fallback banner. This is initial hydration, not continuous device synchronization or a durable offline queue. Rental storage events additionally synchronize same-origin tabs, not remote clients.

SQLite wraps one domain snapshot and its mirror updates in BEGIN IMMEDIATE / COMMIT, rolling back on errors. Selected mirror tables are deleted/repopulated for that domain. Different domain saves are separate transactions, so cross-feature operations are not atomic. `version` describes serialization, not a concurrency revision.

## Authentication flow

There is no login. ShellContext defaults to owner and restores preview role/employee/branch/workshop from localStorage. Active employee assignments may define allowed branches. A preview fallback shows active branches when old template IDs do not match. Technician scope is global; selectable work locations are active central workshops.

## Authorization and permissions

The central resolver supports role unions, but the UI selects one role. Permission keys filter navigation; feature permission predicates and operation guards impose narrower policies. Browser roles and actor IDs are caller-controlled. None of these authenticate a caller of the snapshot API.

## File storage and external services

Static assets are in `public/`. ProductForm reads an image as a data URL (UI limit 1.5 MB) into product state. Maintenance intake stores names/mock URLs, not uploaded files. Report exports use browser Blobs and printing uses browser print UI. No upload endpoint or configured object storage exists. External interfaces are enumerated below.

# Project Structure

| Path | Responsibility |
| --- | --- |
| app/(workspace)/ | Business routes and shared layout |
| app/api/local-data/ | Snapshot API |
| app/rental-invoices/ | Rental invoice route |
| components/shell/ | ShellContext, preview selectors, navigation/header |
| components/data/ | SQLite/browser hydration bridge |
| components/ui/, components/feedback/ | Controls and state presentation |
| features/ | Domain code and tests |
| permissions/ | Role IDs/templates, permission keys, navigation/resolution |
| lib/ | Persistence contracts, database, dates and money helpers |
| styles/ | Tokens, feature styling, responsive and print styles |
| mock-data/, feature fixtures | Synthetic preview/test data |
| tests/ | Shared setup, component/permission and browser tests |
| docs/ | Historical sprint reports |
| worker/index.ts | Cloudflare handler and image optimization |
| build/sites-vite-plugin.ts | Copies hosting metadata to dist/.openai |
| .openai/hosting.json | Sites project association; D1/R2 are null |
| .data/ | Ignored database and WAL files; not included in Git |

# Database

Schema source: `lib/local-database.ts`. Startup creates `.data/l3bty-local.sqlite`, enables WAL, synchronous=NORMAL and 5000 ms busy timeout. A synchronous connection is cached on globalThis in development. Startup uses CREATE TABLE/INDEX IF NOT EXISTS and inserts schema version 1; no ordered migration runner/down migrations exist.

| Table | Main data/constraints |
| --- | --- |
| schema_migrations | Integer version primary key; applied_at |
| app_snapshots | Domain primary key; version, JSON payload, updated_at |
| branches | ID primary key; unique code; name/status |
| employees | ID primary key; unique employee_number; primary_branch_id/status |
| customers | ID primary key; unique customer_number and primary_phone; preferred_branch_id |
| cashboxes | ID primary key; unique code; branch_id/status/current_balance |
| shifts | ID primary key; unique shift_number; employee/branch/cashbox IDs, status, opening/closing times |
| rental_assets | ID primary key; unique asset_number; barcode, branch/status/current_rental_id |
| rentals | ID primary key; unique rental_number; customer/asset/branch/employee/shift IDs, status/times/amounts |
| payments | ID primary key; unique payment_number; branch/cashbox/shift/customer IDs, source type/ID, direction/amount/status |

All mirror business tables also retain JSON payload and updated_at. Indices cover employee/customer branches, shift scope, asset branch/status, rental active scope and payment source/shift. References are logical: **no SQL FOREIGN KEY constraints** are declared. Statuses are text and business transitions have no SQL CHECK constraints. Some amounts are REAL; some client finance/payroll helpers use integer cents.

Branches relate to employee assignments, cashboxes, customers and assets. Rentals reference customer, asset, staff and collection shift. Payments reference business documents through source type/ID and optionally customer/shift. Snapshot JSON contains richer models than mirror columns; hydration reads app_snapshots, not the mirrors.

The 18 snapshot domains are branches, customers, employees, finance, shifts, rentals, products, sales, maintenance, inventory, transfers, branchNeeds, attendance, expenses, payroll, notifications, audit and reports. Domains without mirrors remain JSON-only. Settings are not included.

No seed command exists. Operational stores mostly default to empty arrays; branch fallback explicitly differs in tests. Reset helpers load fixtures and must not be used on valuable data. No actual customer records are included in this document.

# User Roles and Permissions

These describe current client policies, not backend security. Central ALL_PERMISSIONS does not mean every action is permitted: feature predicates are narrower.

| Role | Can do | Important exclusions |
| --- | --- | --- |
| owner | Global oversight; central permission keys; customer/employee/branch/finance/payroll/reports/settings administration; owner payroll approval | Not POS checkout or rental operation; generic transfer creation/approval/dispatch and inventory adjustment are manager-only; maintenance intake is rental-staff-only |
| manager | Global management; transfer creation/approval/dispatch; stock adjustment; maintenance/workshop management; customer deletion review; report delivery | Not POS checkout/rental operation; cannot use owner-only direct draft payroll approval; maintenance intake predicate is rental-staff-only |
| rental_maintenance_employee | Assigned-branch rentals, maintenance intake, rental assets, branch needs, relevant handover/receipt; shifts/collection; personal attendance/expenses/payroll/advance requests/reports/activity/notifications | No POS or financial/payroll administration, generic transfer creation/approval/dispatch, inventory cost/adjustment or full customer management; may request customer deletion |
| sales_employee | Assigned-branch POS, catalog/stock view, branch needs, incoming sale-stock receipt; shifts/collection and personal staff areas | No rentals/repair operations, administrative approvals, stock cost/adjustment, generic transfer creation/dispatch or full customer management; may request customer deletion |
| maintenance_technician | Global maintenance visibility, technician/workshop operations, workshop parts/custody flows, personal staff areas; special maintenance-to-workshop creation with linked order | No POS/rental operation, financial collection/shifts, generic transfer approval/dispatch; workshop receipt constrained by direction/type; no central branch-needs permission |

Templates have historical branch IDs for sales/rental roles; employee assignments can override them. Staff get self rather than all-employee payroll/report/activity access. Full customer administration is owner/manager; operational quick-customer forms exist separately. Technician locations and narrower transfer/maintenance rules live in feature permission files. Inspect `permissions/role-templates.ts`, ShellContext and each `features/*/permissions.ts` before changes.

# Main Features

| Feature | Current implementation |
| --- | --- |
| Dashboard/operations | Role/branch summaries and operational views derived from domain stores |
| Branches | Create/update branches/workshops, hours, status and geofence fields |
| Customers | Phone normalization, duplicates, activity/branch links, quick forms, deletion requests/review/direct management deletion |
| Employees/profile | Records, role/branch assignments, self-profile edits, employee audit events |
| Attendance | Browser coordinates, geofence status, check-in/out, exceptions/review/corrections |
| Rental assets/rentals | Asset creation/status/location; fixed/custom/open-time rental, extend/change asset/close, timers/reminders/receipts/manual WhatsApp |
| Products/sales | Catalog/images/stock; cart, discounts/overrides, checkout/invoices, returns/exchanges/cancellation |
| Maintenance | Internal/customer intake, fault assignment/acknowledgement, diagnosis/approval, parts, repair and workshop/delivery states |
| Inventory | Receipts, weighted-average cost, adjustments/movements, technician parts intake and restock requests/review |
| Transfers | Branch stock, workshop parts, rental assets and maintenance moves; approval/dispatch/receipt/differences/cancellation |
| Branch needs | Rental-game/sales-item requests, review and linked-transfer fulfillment |
| Finance/shifts | Cashboxes, payments, receivables, vouchers/reversals, shift opening/closure/discrepancy review |
| Expenses | Submission/review/payment/cancellation/reversal; personal and management views |
| Payroll/advances | Salary profiles/periods/calculation, approval/lock/payment, advance requests/installments |
| Reports | Derived reports, frozen snapshots, browser exports/print, in-app send/open/retry and personal reports |
| Notifications/audit | Recipient-scoped notifications/read/unread/dismiss/actions; management/personal activity and redaction |
| Settings | Validated policy editor and local audit entries; memory-only |

Implementation entry points are the corresponding feature service/store files. Rentals own both rental and asset persistence. Shared state calls connect features; UI coverage does not imply server enforcement.

# Important Business Rules

- Customer phone must normalize to an Egyptian 11-digit mobile beginning 01. Alternate phone must differ, and duplicate checks include it (`customer-schema.ts`).
- Rental start requires customer, available asset without another active rental, open collection shift and valid price/duration. Fixed options include 15/30/45/60 minutes, plus custom/open time. Default quarter/hour rates are 50/200; selection elapsed billable time is zero. Hydration normalizes some paid amounts automatically.
- POS operates under sales_employee, not owner/manager. Checkout validates customer/cart/shift/stock/product status. Default employee discount cap is 10%; excess needs management approval/reason. Returns preserve invoices, and damaged goods do not restore sellable stock. Cancellation requires administration and a reason.
- Payment parts must be positive and sum to the amount; card/wallet references are required. Maximum remaining amount can be enforced. Collection needs a matching open shift; reversals preserve originals. Client idempotency is not a server concurrency guarantee.
- Transfers require different locations, a reason, items and positive quantities. Generic creation/approval/dispatch is manager-only; receipt is role/destination constrained. Branch needs do not alter stock when requested and fulfillment uses their linked transfer.
- Attendance rejects checkout-before-check-in and duplicate open check-in. Distance uses Haversine; accuracy above max(radius,200m) is inaccurate. Prior-day open attendance is considered for checkout.
- Payroll does not automatically deduct attendance/shift discrepancies. Negative net needs an exception; advance installment validation compares against supplied net. Duplicate periods and repeat payment are guarded. Owner can approve draft directly; manager submits for approval.
- Report snapshots are copied/frozen and hashed with FNV-1a, not a cryptographic signature. In-app delivery checks literal preview manager/owner IDs.

Sources: feature schemas, permissions, stores and tests. These rules are mostly browser-side.

# Environment Variables

No required application environment variables or credential template were found. Do not invent database/auth/AI keys.

| Variable | Purpose | Required/default |
| --- | --- | --- |
| NODE_ENV | Framework mode, test fixtures, dev DB connection cache | Framework/scripts manage it |
| L3BTY_E2E_PORT | Test server/target port | Optional; 3000 |
| L3BTY_E2E_EXTERNAL | Skip Playwright-managed server | Optional; value 1 enables it |
| WRANGLER_WRITE_LOGS | Alternate build logging | Optional; vite config sets false if absent |
| WRANGLER_LOG_PATH | Alternate build log location | Optional; .wrangler/logs |
| MINIFLARE_REGISTRY_PATH | Alternate build registry location | Optional; .wrangler/registry |

ASSETS and IMAGES are worker runtime bindings, not dotenv strings. They serve worker image requests. Hosting credentials/provisioning are not documented here. No secret values are included.

# Local Development

Use Git and the observed Node 24.19.0/npm 11.17.0 baseline; npm ci installs locked dependencies. jsdom's engine constraint is stricter than Next.js's minimum. No Node version pin exists in project tooling.

Run `npm run dev -- --port 3001`, then open localhost:3001. The command validates CSS imports first. SQLite initializes automatically; allow writes in .data. No .env, ORM migration or seed step is required. README includes copyable commands.

Keep .data out of Git. Transfer business records separately only with explicit authorization and a reviewed backup/restore process. WAL files may exist; copying only the live main database is not a documented backup procedure. Browser storage is origin-specific, so a port/hostname change affects local preview state. Use disposable data for tests.

# Build and Production

Standard: `npm run build`, then `npm run start -- --port 3001`. This uses Node/Next.js and local SQLite; deployment must retain writable database storage. Production mode does not add missing security/concurrency behavior.

Alternate: `npm run build:sites`. Vite aliases the SQLite module to `lib/local-database-sites.ts`: GET snapshots are empty and writes do nothing. The API still labels its storage sqlite, so that label is not evidence of persistence. Preview records stay in the visitor's browser. The build copies hosting metadata into dist/.openai.

No Docker/Compose or generic deploy script exists. Root layout imports Google Fonts; previous local development logged download warnings. A new successful production build was not established by this documentation task.

# Testing

Vitest uses jsdom, React Testing Library, tests/setup.ts and the root alias. Configuration explicitly includes feature, permission and component tests. Commands: npm test, npm run test:watch, npm run typecheck, npm run lint, npm run check:styles.

Existing tests represent all main domain stores, role/branch scope, customer validation, rental timers/payments, stock/workshop/transfers, finance idempotency, expenses/payroll, reports, notifications/audit and UI navigation/drawers/quick forms. No numerical coverage percentage has been established.

Playwright uses tests/responsive, Chrome, ar-EG, one worker, 90-second tests and traces on failure. It starts/reuses a production server, so build first; L3BTY_E2E_EXTERNAL=1 targets an existing server. Responsive/operation/role browser tests can mutate data; use a disposable checkout/database.

No dedicated API/SQLite concurrency, migration/restore, crash recovery or load suite was found. Store unit tests do not prove atomic durable saves. Sprint 15 reports historical employee search/branch-state flakiness; its current reproduction is unknown and configuration now uses one worker. Previous application verification passed 326 tests plus lint/types/styles; this documentation pass does not claim new build/E2E results.

# Security

Implemented protections include UI role/scope filtering, client validation, parameterized SQL, transactional rollback, audit redaction/masked phones and Git exclusions for environment/key/database files.

Critical limits: anyone able to reach the snapshot API can read/write all domains; preview role/actor IDs are client-controlled; nested data lacks server validation; audit data is browser-owned, not tamper-proof. No application-level encryption is configured for SQLite/localStorage. The size check trusts Content-Length. Settings containing a session timeout do not establish an authenticated session implementation. Card/wallet references are recorded data, not gateway processing.

# Known Issues

1. Last-writer-wins domain snapshots can lose other clients' edits; no remote synchronization/conflict detection.
2. Different domain commits can partially persist one operation.
3. Save errors/non-2xx responses are not reliably surfaced/retried; hydration can replace pending local work.
4. First-run cleanup deletes browser domain keys; rental version mismatch can fail hydration; migration handling is limited.
5. Settings and their audit history are memory-only.
6. Mock rental clock, fixed timestamps/year numbering and preview identities remain in several stores.
7. Rental hydration alters paid amounts for some records; review financial semantics before real-data migration.
8. Data-URL images enlarge snapshots; maintenance has no real attachment transport.
9. Report hash/immutability is client-level; delivery is in-app with fixed identities.
10. Sites writes are no-ops despite API sqlite metadata.
11. No measured capacity, verified live infrastructure/backup contract, or current complete build/E2E result is established.
12. Historical sprint descriptions/test counts may be obsolete.

# Important Technical Decisions

Feature-local modules, central shell/permissions and direct SQL are visible choices, but their original comparative rationale is not documented. Do not invent why a framework/database was selected.

The bridge explicitly implements browser fallback and legacy snapshot handling. SQLite transactions/WAL exist, but do not add logical snapshot conflict detection. The Sites adapter explicitly keeps preview records in the browser. next.config.ts disables the development indicator because it overlaps approved mobile navigation. Rental reminder comments explicitly defer closed-browser scheduling to a backend/WhatsApp API; branch fallback comments explicitly defer real identity handling.

Historical reports mention future Supabase/RLS. There is no installed integration and those reports do not authorize a migration.

# Things That Must Not Be Changed Without Review

- Database records, local snapshot keys/versions, bridge cleanup markers and migration/normalization logic.
- Money/stock effects, reversals, shift links, idempotency and cross-domain call ordering.
- Feature-specific role exceptions, branch/workshop custody rules and customer deletion policy.
- Rental timing/billing, Cairo date handling and paid-amount normalization.
- Difference between SQLite runtime and browser-only preview build.
- RTL, mobile navigation, drawer/print behavior and regression tests.
- Next.js conventions: AGENTS.md requires installed node_modules/next/dist/docs guidance before writing code.

# External Services

| Service/interface | Integration and actual behavior |
| --- | --- |
| Google Fonts | app/layout.tsx through next/font/google |
| WhatsApp wa.me | rental-, sales-, maintenance-whatsapp-service.ts; constructs links for manual opening, no delivery API |
| Browser geolocation | AttendanceLocationStatus.tsx reads coordinates with permission; no maps API |
| Cloudflare worker/images | worker/index.ts and vite.config.ts, ASSETS/IMAGES bindings |
| Sites metadata | .openai/hosting.json and build/sites-vite-plugin.ts |
| GitHub | Source remote only, not an application runtime API |

No AI API, payment gateway, SMS/email provider, Supabase client or object-upload integration was found.

# Deployment

Configured paths: Node/Next.js with local filesystem SQLite, and Cloudflare-targeted Sites preview with browser persistence. Hosting metadata includes a project association and null D1/R2; live worker bindings/provisioning were not verified. Build commands are above; no repository-backed generic publishing command exists.

**Cannot confidently determine from this repository:** actual live production URL, domain/DNS, live hosting status, machine sizing, hosted database/backups, account secrets or CI/CD process. No Docker/CI files were found. A GitHub push proves source synchronization, not deployment. No private hosting identifiers/credentials are reproduced here.

# Current Data Flow Examples

## 1. Customer creation

Customer form/quick form → validation/phone normalization → customer-store updates state → localStorage and asynchronous PUT /api/local-data → SQLite transaction upserts customer-domain JSON and recreates customer mirror rows → API metadata response. Subscribers update the UI without awaiting durable-save confirmation. Next workspace entry: GET → bridge → localStorage → hydration/reload.

## 2. Sale checkout

POS → checkoutSale validates role/customer/cart/shift/stock/discount → commitSaleStock changes product inventory/movements → sales-store creates invoice/idempotency record and clears cart → stores separately persist products/sales snapshots → app_snapshots → subscribed stock/invoice UI. Payments here are invoice data, not a gateway transaction, and there is no cross-domain server transaction.

## 3. Rental operation

Rental form → startRental checks customer/asset/shift/duration → rental/asset state plus customer/finance calls as applicable → separate store snapshots → PUT → SQLite snapshots and applicable rental/asset/customer/finance mirrors → subscribed timer/asset/collection UI. Time is derived from the mock clock, not a server-time endpoint.

## 4. Report delivery

Report query → buildReportPayload reads domain stores → createReportSnapshot copies/freezes/hashes → reports snapshot persistence → sendSnapshot validates literal manager/owner IDs and stores delivery → notification/audit stores persist separately → in-app report/notification views. No email/WhatsApp backend or device realtime push occurs.

# Next Recommended Tasks

See TODO.md. Prioritize approved authentication/trusted operation boundaries, concurrency/atomicity/recovery, real runtime identity/time, settings persistence and isolated persistence tests. Then validate build/E2E and deployment/backup/capacity. Complete existing attachment/reminder gaps only within approved scope. A framework rewrite or a particular database migration is not implied.

# AI Agent Handoff Instructions

- Read PROJECT_CONTEXT.md, TODO.md and AGENTS.md before modifying the project.
- Inspect relevant existing code/tests and the installed Next.js docs before changes.
- Preserve current architecture unless changes are explicitly approved.
- Do not rewrite working features unnecessarily.
- Never expose secrets, credentials or customer records.
- Do not delete database data or clear valuable browser state without explicit approval.
- Run relevant tests after changes; keep E2E away from valuable datasets.
- Explain major architectural changes before implementation.
- Update this documentation after significant changes; distinguish fresh verification from historical reports.
- Treat preview permissions, mock time and snapshot persistence as limitations, not production guarantees.
- Ask about unknown deployment/data-handoff requirements instead of inventing infrastructure or copying records.
