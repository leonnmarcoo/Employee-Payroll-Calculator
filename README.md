# Employee Payroll Calculator

A React payroll calculator with a local Node.js API and a real SQLite database.
The existing indigo layout is retained, with draft management and subtle motion.

## Run on your computer

Use **Node.js 22.18 or newer** (Node 24 LTS is also supported).
SQLite comes with Node through `node:sqlite`; no separate database installation,
account, password or database server is needed. Node 22 may print an experimental
SQLite warning; this is informational.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:8443**. This one command starts the webpage and API.
The first launch creates `data/payroll.sqlite` and its tables automatically.
Stop the app with Ctrl+C. Saved drafts survive restarts.

For the built app:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:8787**. `npm run preview` runs the same backend-backed app.
Run all commands from this project's root folder.

## Using the calculator

- Enter an employee ID and name. Previously saved employee IDs appear as
  suggestions. Selecting an ID and leaving the field fills a blank employee
  form with the saved name, position, department and salary.
- Choose a month and half-month period. Salary, absences, overtime, allowances
  and bonuses update the estimate immediately. All attendance values are saved.
- **Save Draft** (Ctrl+S / Cmd+S) creates or updates the current draft. You can
  save an incomplete draft without a salary; employee ID, name and month are
  required. Invalid entered amounts must be corrected first.
- **Saved Drafts** searches by name, ID or month. Click a record to reopen it,
  change values and save. One active draft is allowed per employee/month/half.
- **Reset** starts a new draft. Changing a loaded draft's month edits that draft;
  use Reset first when creating an additional payroll period.
- **Delete** removes a draft from the list. **Undo deletion** restores the last
  deletion during the current page session. Deletions are soft deletions in the
  database; previous employee profiles are retained.
- **Export CSV** downloads the current complete estimate, including its inputs
  and totals. **Print** opens the browser print dialog; choose Save as PDF for a
  PDF copy. Exports reflect the current form, including unsaved edits.
- The employee preview and **Calculation details** explain the current estimate.

Changes are also kept in session storage for recovery on refresh in the same tab.
This is not a permanent save. Use Save Draft before closing the tab. The app warns
before replacing unsaved changes and reports when browser recovery is unavailable.
Two tabs editing the same draft trigger a conflict instead of silently overwriting
each other. Reopen the latest saved draft before reapplying your changes.

## Database and backups

`employees` stores reusable employee details. `payroll_drafts` stores each payroll's
input snapshot, calculated totals, applied rules, timestamps and revision number.
The API validates and recalculates each save. Updating an employee profile does not
rewrite previously saved payroll snapshots. Database migrations use SQLite's
`user_version`; writes are transactional with foreign keys and WAL enabled.

```sh
npm run backup
```

This produces a consistent, timestamped SQLite backup in `backups/`, even while
the app is running. Keep a separate copy in your own secure backup location.
Database and backup files are excluded from Git. Do not commit payroll data.

To restore: stop every app process, retain a backup of the current database, and
copy the chosen backup to a **new** path such as `data/restored.sqlite`. Set
`DATABASE_PATH` to that path before restarting. This avoids mixing a restored
file with old WAL sidecar files.

PowerShell example:

```powershell
$env:DATABASE_PATH = 'data/restored.sqlite'
npm run dev
```

Optional environment variables (set in your shell; `.env` is not automatically loaded):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `data/payroll.sqlite` | SQLite file on a persistent disk |
| `BACKUP_DIR` | `backups` | Backup destination |
| `PORT` | `8443` dev / `8787` start | Web app port |
| `API_PORT` | `8787` | Dev API port; overrides PORT for npm start |
| `HOST` | `127.0.0.1` | Bind address for npm start |
| `APP_ORIGIN` | Local server origins | Comma-separated trusted origins for npm start |

## Hosting

The application runs on your own computer by default. There is no login or user
role system in this version, so keep it local or behind an authenticated private
gateway. Public/shared deployment needs HTTPS and access control, plus a Node
server with a persistent disk for SQLite. Back up that disk regularly. Set
`APP_ORIGIN` to the exact HTTPS origin when using a reverse proxy.

The existing GitHub Pages workflow publishes the calculator interface only.
[GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
and cannot run this SQLite backend. On Pages the calculation still works, while
save/history display an availability message. To enable saving online, deploy
the whole app to a Node host and serve frontend and API from the same origin.
Build with `PUBLIC_URL` unset for the Node server at the domain root.

## Calculation scope and verification

See [CALCULATIONS.md](CALCULATIONS.md) for the existing payroll policy and rates.
This is an estimate using the supplied schedules, not a complete statutory payroll
engine: withholding tax and automatic contribution schedule selection by month
are not included. This update does not change those supplied policy rates.

```sh
npm test
npm run build
```

Tests cover calculation rounding, validation, persistence across restarts,
duplicate and concurrent edits, safe retries, delete/restore, CSV escaping,
API error responses, origin checks and readable database backups.
Browser checks cover saving, reloading, editing, reset confirmation, draft search,
deletion/undo, employee reuse and responsive layout. CSV content is covered by
automated tests. The embedded browser did not report a download event during the
CSV check; normal browser download/print dialogs may behave differently there.

SQLite runtime reference: [Node.js SQLite API](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html).
