# Verified remaining work

Inspected 2026-10-02 against application revision `7950da8`. This backlog documents existing gaps; it does not authorize an architectural migration.

## Before public or multi-user operation

- [ ] Replace preview identity with authenticated sessions and enforce user/role/branch scope on server reads and writes. Evidence: ShellContext defaults to owner; `/api/local-data` has no authentication. Preserve feature-level role exceptions.
- [ ] Approve and implement safe concurrent updates: `putLocalDatabaseSnapshot` overwrites whole domains without checking a revision. Move critical operations/validation to a trusted server boundary while preserving working UI.
- [ ] Make cross-domain operations durable and atomic with server idempotency. Current SQLite transactions cover one snapshot/mirror, not an entire rental/sale/finance operation.
- [ ] Surface rejected/failed saves and implement deliberate reconciliation/retry. `local-test-data.ts` ignores HTTP status; bridge hydration can replace pending local work with remote snapshots.
- [ ] Deeply validate domain payloads and actual request size, with controlled malformed-body/DB errors. The API only validates key/version/data presence and declared Content-Length.
- [ ] Review bridge first-run browser cleanup and version migration before importing existing data. Preserve data through explicit backup/migration approval.
- [ ] Replace mock clocks, fixed timestamps, fixed-year numbering and preview actor IDs with reviewed real runtime behavior. Examples exist in rentals, sales, finance, expenses and reports.

## Incomplete existing features

- [ ] Persist settings and their audit history. `settings-store.ts` is memory-only and absent from LOCAL_DATA_DOMAINS.
- [ ] Remove report delivery's literal `employee-manager` / `employee-owner` identity requirement when real authentication/employees are introduced.
- [ ] Review rental hydration's automatic paid-amount normalization before real-data migration (`normalizeRentalPayment`).
- [ ] Complete durable maintenance attachment storage if the existing attachment UI is intended for real files; it currently uses names/mock URLs. Review product data-URL size/localStorage limits; no upload service exists.
- [ ] Implement the explicitly deferred scheduler/WhatsApp API only after design approval if reminders must run while the browser is closed. Current reminders evaluate in-browser and WhatsApp uses manual links.
- [ ] Replace mock audit metadata with trusted server metadata and define retention/access policy. Existing client redaction does not make the log tamper-proof. Sprint 15 explicitly leaves retention and realtime/retry design unresolved.

## Tests and deployment

- [ ] Add isolated API/SQLite integration tests for hydration, schema validation, rejected writes, rollback and recovery; add concurrent-client and cross-domain consistency tests.
- [ ] Run production build and full Playwright suite against disposable data. Recheck historical employee search/branch-state flakiness reported in sprint 15; current reproducibility is unknown.
- [ ] Measure load capacity on the intended host using representative records before promising a user count.
- [ ] Confirm deployment route, durable storage and backup/restore procedures. Next.js uses filesystem SQLite; Sites disables server persistence and has no D1/R2 binding. Live domain/DNS, production host and CI/CD are not established by repository files.
- [ ] Record supported Node/npm versions in tooling after review. No engine pin exists despite node:sqlite and strict locked dependency requirements.
- [ ] Resolve Google Font build availability in the intended environment; previous development runs reported download failures and this documentation pass did not establish a successful production build.

Historical Supabase/RLS references are possible later work, not an installed integration or an approved migration in this handoff.
