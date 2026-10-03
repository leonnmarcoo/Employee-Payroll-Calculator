import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { calculateForm, normalizeForm, validateForm, summarizeDraft } from '../src/records.ts'

export class HttpError extends Error {
  constructor(status, message, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export function openDatabase(filename = process.env.DATABASE_PATH || 'data/payroll.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
  const { user_version: version } = db.prepare('PRAGMA user_version').get()
  if (version > 1) { db.close(); throw new Error('This database was created by a newer app version.') }
  if (version === 0) db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE employees (
      employee_id TEXT PRIMARY KEY, employee_name TEXT NOT NULL, position TEXT NOT NULL,
      department TEXT NOT NULL, monthly_salary TEXT NOT NULL, updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE payroll_drafts (
      id TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK(version > 0),
      employee_id TEXT NOT NULL REFERENCES employees(employee_id), employee_name TEXT NOT NULL,
      payroll_month TEXT NOT NULL, pay_period TEXT NOT NULL CHECK(pay_period IN ('first', 'second')),
      form_json TEXT NOT NULL, calculation_json TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    ) STRICT;
    CREATE UNIQUE INDEX unique_active_payroll ON payroll_drafts(employee_id, payroll_month, pay_period)
      WHERE deleted_at IS NULL;
    CREATE INDEX recent_payroll ON payroll_drafts(deleted_at, updated_at DESC);
    PRAGMA user_version = 1;
    COMMIT;
  `)

  const decode = (row) => ({ id: row.id, version: row.version, form: JSON.parse(row.form_json),
    calculation: JSON.parse(row.calculation_json), createdAt: row.created_at, updatedAt: row.updated_at })
  function get(id) {
    const row = db.prepare('SELECT * FROM payroll_drafts WHERE id = ? AND deleted_at IS NULL').get(id)
    if (!row) throw new HttpError(404, 'This draft no longer exists. Refresh the saved drafts list.')
    return decode(row)
  }
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE')
    try { const result = fn(); db.exec('COMMIT'); return result } catch (error) { db.exec('ROLLBACK'); throw error }
  }
  function checkVersion(row, expected) {
    if (!Number.isInteger(expected) || expected !== row.version) {
      throw new HttpError(409, 'This draft changed in another tab. Reopen it from Saved Drafts before saving again.')
    }
  }
  function checkDuplicate(form, id) {
    const duplicate = db.prepare(`SELECT id FROM payroll_drafts WHERE employee_id = ? AND payroll_month = ?
      AND pay_period = ? AND id <> ? AND deleted_at IS NULL`).get(form.employeeId, form.payrollMonth, form.payPeriod, id)
    if (duplicate) throw new HttpError(409, 'A draft already exists for this employee and pay period. Open it from Saved Drafts to make changes.')
  }
  return {
    db,
    close: () => db.close(),
    get,
    list(query = '', offset = 0, limit = 20) {
      // instr treats %, _ and quotes as literal search text, not SQL wildcards.
      const filter = `deleted_at IS NULL AND instr(lower(employee_id || ' ' || employee_name || ' ' || payroll_month), lower(?)) > 0`
      const { total } = db.prepare(`SELECT count(*) AS total FROM payroll_drafts WHERE ${filter}`).get(query)
      const rows = db.prepare(`SELECT * FROM payroll_drafts WHERE ${filter} ORDER BY updated_at DESC, id LIMIT ? OFFSET ?`).all(query, limit, offset)
      return { items: rows.map(row => summarizeDraft(decode(row))), total }
    },
    employees(query = '') {
      return db.prepare(`SELECT employee_id AS employeeId, employee_name AS employeeName, position,
        department, monthly_salary AS monthlySalary FROM employees
        WHERE instr(lower(employee_id || ' ' || employee_name), lower(?)) > 0 ORDER BY updated_at DESC LIMIT 20`).all(query)
    },
    save(id, expectedVersion, value) {
      let form
      try { form = normalizeForm(value) } catch (error) { throw new HttpError(400, error.message) }
      const errors = validateForm(form, true)
      if (Object.keys(errors).length) throw new HttpError(422, 'Please correct the highlighted fields.', errors)
      let calculation
      try { calculation = calculateForm(form) } catch (error) { throw new HttpError(422, error.message) }
      return transaction(() => {
        const existing = db.prepare('SELECT * FROM payroll_drafts WHERE id = ?').get(id)
        if (existing) {
          if (existing.deleted_at) throw new HttpError(409, 'This draft was deleted. Restore it before saving.')
          // A retried request whose response was lost returns the already committed save.
          if (JSON.stringify(form) === existing.form_json && (expectedVersion === existing.version - 1 || expectedVersion === null && existing.version === 1)) return decode(existing)
          checkVersion(existing, expectedVersion)
        } else if (expectedVersion !== null) throw new HttpError(404, 'This draft no longer exists.')
        checkDuplicate(form, id)
        const now = new Date().toISOString()
        db.prepare(`INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(employee_id) DO UPDATE SET employee_name=excluded.employee_name,
          position=excluded.position, department=excluded.department,
          monthly_salary=CASE WHEN excluded.monthly_salary = '' THEN employees.monthly_salary ELSE excluded.monthly_salary END,
          updated_at=excluded.updated_at`).run(form.employeeId, form.employeeName, form.position, form.department, form.monthlySalary, now)
        db.prepare(`INSERT INTO payroll_drafts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
          ON CONFLICT(id) DO UPDATE SET version=excluded.version, employee_id=excluded.employee_id,
          employee_name=excluded.employee_name, payroll_month=excluded.payroll_month, pay_period=excluded.pay_period,
          form_json=excluded.form_json, calculation_json=excluded.calculation_json, updated_at=excluded.updated_at`)
          .run(id, existing ? existing.version + 1 : 1, form.employeeId, form.employeeName, form.payrollMonth,
            form.payPeriod, JSON.stringify(form), JSON.stringify(calculation), existing?.created_at || now, now)
        return get(id)
      })
    },
    remove(id, expectedVersion) {
      return transaction(() => {
        const draft = get(id)
        checkVersion(draft, expectedVersion)
        db.prepare('UPDATE payroll_drafts SET deleted_at = ?, version = version + 1 WHERE id = ?').run(new Date().toISOString(), id)
        return { id, version: draft.version + 1 }
      })
    },
    restore(id, expectedVersion) {
      return transaction(() => {
        const row = db.prepare('SELECT * FROM payroll_drafts WHERE id = ? AND deleted_at IS NOT NULL').get(id)
        if (!row) throw new HttpError(404, 'This deleted draft is no longer available to restore.')
        checkVersion(row, expectedVersion)
        checkDuplicate(JSON.parse(row.form_json), id)
        db.prepare('UPDATE payroll_drafts SET deleted_at = NULL, version = version + 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id)
        return get(id)
      })
    },
  }
}

