import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyForm, calculateForm, validateForm, parseAmount } from '../src/records.ts'
import { payrollCsv, csvCell } from '../src/export.ts'

test('attendance validation respects February and both halves of the month', () => {
  const form = { ...emptyForm(), payrollMonth: '2026-02', payPeriod: 'second', monthlySalary: '30000' }
  assert.ok(validateForm({ ...form, presentDays: '14' }).presentDays)
  assert.equal(validateForm({ ...form, payrollMonth: '2028-02', presentDays: '14' }).presentDays, undefined)
  assert.ok(validateForm({ ...form, totalHours: '313' }).totalHours)
  assert.ok(validateForm({ ...form, regularOvertimeHours: '200', restDayOvertimeHours: '200' }).regularOvertimeHours)
})

test('reference attendance is saved without double-counting pay', () => {
  const form = { ...emptyForm(), monthlySalary: '30000', absentDays: '1' }
  assert.equal(calculateForm({ ...form, presentDays: '12', daysWorked: '12', totalHours: '96' }).totals.netPay, calculateForm(form).totals.netPay)
  assert.equal(calculateForm({ ...form, bonuses: 'bad' }), null)
  assert.equal(calculateForm(emptyForm()), null)
})

test('decimal parser rejects signed, exponent, nonfinite and over-precise amounts', () => {
  for (const value of ['-1', '+1', '1e5', 'NaN', 'Infinity', '2.001', 'abc']) assert.ok(Number.isNaN(parseAmount(value)))
  assert.equal(parseAmount(' '), 0)
  assert.equal(parseAmount('.25'), .25)
})

test('CSV includes accurate totals and escapes formulas, commas and quotes', () => {
  const form = { ...emptyForm(), employeeId: 'TEST-1', employeeName: '=HYPERLINK("bad")', monthlySalary: '30000', department: 'People, Ops' }
  const csv = payrollCsv(form, calculateForm(form))
  assert.ok(csv.includes('"Net pay estimate","13775"'))
  assert.ok(csv.includes('"People, Ops"'))
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'))
  assert.equal(csvCell(-100), '"-100"')
  assert.equal(csvCell('  +SUM(A1)'), '"\'  +SUM(A1)"')
})
