import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { backup } from 'node:sqlite'
import { openDatabase } from '../server/database.mjs'
import { emptyForm } from '../src/records.ts'

const form = () => ({ ...emptyForm(), employeeId: 'emp-001', employeeName: 'Alex Test', payrollMonth: '2026-10',
  monthlySalary: '26000', absentDays: '1', regularOvertimeHours: '2', restDayOvertimeHours: '1', allowances: '500', bonuses: '1000' })
const memory = (t) => { const store = openDatabase(':memory:'); t.after(() => store.close()); return store }

test('SQLite persists employees, attendance, calculations and edits across restarts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'payroll-test-'))
  const filename = join(directory, 'payroll.sqlite')
  let store
  try {
    store = openDatabase(filename)
    const id = randomUUID()
    const initial = store.save(id, null, { ...form(), daysWorked: '12', presentDays: '12', totalHours: '96' })
    assert.equal(initial.form.employeeId, 'EMP-001')
    assert.equal(initial.calculation.totals.netPay, 12948.75)
    assert.equal(initial.calculation.rules.workdaysPerMonth, 26)
    store.close(); store = openDatabase(filename)
    assert.equal(store.get(id).form.totalHours, '96')
    const edit = store.save(id, 1, { ...initial.form, bonuses: '2000' })
    assert.equal(edit.version, 2)
    assert.equal(edit.calculation.totals.netPay, 13948.75)
    assert.equal(store.list().total, 1)
    assert.equal(store.employees('Alex')[0].monthlySalary, '26000')
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true }) }
})

test('duplicate periods, stale edits and stale deletions cannot overwrite saved payroll', t => {
  const store = memory(t)
  const draft = store.save(randomUUID(), null, form())
  assert.throws(() => store.save(randomUUID(), null, { ...form(), employeeName: 'Wrong Name' }), { status: 409 })
  assert.equal(store.employees()[0].employeeName, 'Alex Test')
  store.save(draft.id, 1, { ...form(), bonuses: '2000' })
  assert.throws(() => store.save(draft.id, 1, { ...form(), bonuses: '3000' }), { status: 409 })
  assert.throws(() => store.remove(draft.id, 1), { status: 409 })
  assert.equal(store.get(draft.id).form.bonuses, '2000')
})

test('retries are idempotent and incomplete drafts can be completed later', t => {
  const store = memory(t)
  const id = randomUUID()
  const incomplete = { ...form(), monthlySalary: '' }
  const saved = store.save(id, null, incomplete)
  assert.equal(saved.calculation, null)
  assert.equal(store.save(id, null, incomplete).version, 1)
  const complete = store.save(id, 1, form())
  assert.equal(complete.version, 2)
  assert.equal(store.save(id, 1, form()).version, 2)
  assert.equal(store.list().total, 1)
})

test('delete and undo preserve the saved snapshot and enforce uniqueness on restore', t => {
  const store = memory(t)
  const original = store.save(randomUUID(), null, form())
  const removed = store.remove(original.id, 1)
  assert.equal(store.list().total, 0)
  assert.throws(() => store.get(original.id), { status: 404 })
  const restored = store.restore(original.id, removed.version)
  assert.deepEqual(restored.calculation, original.calculation)
  const deleted = store.remove(original.id, restored.version)
  store.save(randomUUID(), null, form())
  assert.throws(() => store.restore(original.id, deleted.version), { status: 409 })
})

test('server rejects invalid data and does not trust client calculations', t => {
  const store = memory(t)
  for (const invalid of [{ monthlySalary: '-1' }, { monthlySalary: 'Infinity' }, { monthlySalary: '1e10' },
    { monthlySalary: '1.234' }, { employeeName: '' }, { payrollMonth: '2026-13' }, { absentDays: '14' },
    { payPeriod: 'third' }, { presentDays: '15', absentDays: '1' }, { totalHours: '999' }]) {
    assert.throws(() => store.save(randomUUID(), null, { ...form(), ...invalid }), { status: 422 })
  }
  assert.throws(() => store.save(randomUUID(), null, { ...form(), bonuses: 200 }), { status: 400 })
  const record = store.save(randomUUID(), null, { ...form(), calculation: { netPay: 999999 } })
  assert.equal(record.calculation.totals.netPay, 12948.75)
  assert.equal(store.list().total, 1)
})

test('employee updates do not rewrite old payroll snapshots and search is literal', t => {
  const store = memory(t)
  const first = store.save(randomUUID(), null, form())
  store.save(randomUUID(), null, { ...form(), payPeriod: 'second', employeeName: "O'Brien Test", monthlySalary: '30000' })
  assert.equal(store.get(first.id).form.employeeName, 'Alex Test')
  assert.equal(store.list("O'Brien").total, 1)
  assert.equal(store.list("' OR 1=1 --").total, 0)
  assert.equal(store.list('%').total, 0)
  assert.equal(store.list('2026-10', 1, 1).items.length, 1)
})

test('online backup is a readable, independent SQLite database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'payroll-backup-test-'))
  const store = openDatabase(join(directory, 'live.sqlite'))
  let copy
  try {
    const record = store.save(randomUUID(), null, form())
    await backup(store.db, join(directory, 'backup.sqlite'))
    copy = openDatabase(join(directory, 'backup.sqlite'))
    assert.deepEqual(copy.get(record.id), record)
  } finally { copy?.close(); store.close(); rmSync(directory, { recursive: true, force: true }) }
})

