import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePayroll, DEFAULT_PAYROLL_RULES } from '../src/payroll.ts'
import { calculateContributions } from '../src/contributions.ts'

const input = {
  monthlySalary: 30000, payPeriod: 'first', absentDays: 0,
  regularOvertimeHours: 0, restDayOvertimeHours: 0, allowances: 0, bonuses: 0,
}

test('half-month salary subtracts only half the employee contributions', () => {
  const result = calculatePayroll(input, DEFAULT_PAYROLL_RULES)
  assert.equal(result.grossPay, 15000)
  assert.equal(result.totalDeductions, 1225)
  assert.equal(result.netPay, 13775)
})

test('absence, both overtime types, allowances and bonuses affect pay once', () => {
  const result = calculatePayroll({ ...input, monthlySalary: 26000, absentDays: 1,
    regularOvertimeHours: 2, restDayOvertimeHours: 1, allowances: 500, bonuses: 1000,
  }, DEFAULT_PAYROLL_RULES)
  assert.equal(result.regularPay, 12000)
  assert.equal(result.regularOvertimePay, 312.5)
  assert.equal(result.restDayOvertimePay, 211.25)
  assert.equal(result.grossPay, 14023.75)
  assert.equal(result.totalDeductions, 1075)
  assert.equal(result.netPay, 12948.75)
})

test('two periods preserve monthly salary and contribution totals down to the cent', () => {
  const monthlySalary = 10000.21
  const first = calculatePayroll({ ...input, monthlySalary }, DEFAULT_PAYROLL_RULES)
  const second = calculatePayroll({ ...input, monthlySalary, payPeriod: 'second' }, DEFAULT_PAYROLL_RULES)
  assert.equal(Math.round((first.basicPay + second.basicPay) * 100), 1000021)
  assert.equal(Math.round((first.totalDeductions + second.totalDeductions) * 100), 95001)
})

test('contribution deduction timing is configurable', () => {
  const rules = { ...DEFAULT_PAYROLL_RULES, contributionSchedule: 'second' }
  assert.equal(calculatePayroll(input, rules).totalDeductions, 0)
  assert.equal(calculatePayroll({ ...input, payPeriod: 'second' }, rules).totalDeductions, 2450)
})

test('rejects invalid inputs and absences exceeding period basic pay', () => {
  for (const monthlySalary of [NaN, Infinity, -1, 0]) {
    assert.throws(() => calculatePayroll({ ...input, monthlySalary }, DEFAULT_PAYROLL_RULES))
  }
  assert.throws(() => calculatePayroll({ ...input, regularOvertimeHours: -1 }, DEFAULT_PAYROLL_RULES))
  assert.throws(() => calculatePayroll({ ...input, absentDays: 14 }, DEFAULT_PAYROLL_RULES))
  assert.throws(() => calculatePayroll(input, { ...DEFAULT_PAYROLL_RULES, workdaysPerMonth: 0 }))
})

test('contribution floors, bracket boundaries and caps feed the summary', () => {
  assert.equal(calculateContributions(5249.99).sss.employee, 250)
  assert.equal(calculateContributions(5250).sss.employee, 275)
  assert.equal(calculateContributions(1500).pagIbig.employee, 15)
  assert.equal(calculateContributions(1501).pagIbig.employee, 30.02)
  const high = calculateContributions(200000)
  assert.equal(high.sss.employee, 1750)
  assert.equal(high.philHealth.employee, 2500)
  assert.equal(high.pagIbig.employee, 200)
})
