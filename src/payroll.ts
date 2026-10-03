import { calculateContributions } from './contributions.ts'

export type PayrollRules = {
  workdaysPerMonth: number
  hoursPerDay: number
  regularOvertimeMultiplier: number
  restDayOvertimeMultiplier: number
  contributionSchedule: 'split' | 'first' | 'second'
}

// Project defaults confirmed by the user; update these to match a payroll policy.
export const DEFAULT_PAYROLL_RULES: PayrollRules = {
  workdaysPerMonth: 26,
  hoursPerDay: 8,
  regularOvertimeMultiplier: 1.25,
  restDayOvertimeMultiplier: 1.69,
  contributionSchedule: 'split',
}

export type PayrollInput = {
  monthlySalary: number
  payPeriod: 'first' | 'second'
  absentDays: number
  regularOvertimeHours: number
  restDayOvertimeHours: number
  allowances: number
  bonuses: number
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

function periodShare(monthlyAmount: number, period: PayrollInput['payPeriod']) {
  const firstShare = roundMoney(monthlyAmount / 2)
  return period === 'first' ? firstShare : roundMoney(monthlyAmount - firstShare)
}

// Rules are explicit so payroll policy cannot be hidden in the interface.
// Allowances, bonuses, absences and overtime refer to the selected pay period.
export function calculatePayroll(input: PayrollInput, rules: PayrollRules) {
  if (input.payPeriod !== 'first' && input.payPeriod !== 'second') throw new Error('Choose a valid pay period.')
  if (!['split', 'first', 'second'].includes(rules.contributionSchedule)) throw new Error('Choose a valid contribution schedule.')
  const amounts = [input.monthlySalary, input.absentDays, input.regularOvertimeHours,
    input.restDayOvertimeHours, input.allowances, input.bonuses]
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0) || input.monthlySalary === 0) {
    throw new Error('Enter a positive monthly salary and nonnegative payroll amounts.')
  }
  const rates = [rules.workdaysPerMonth, rules.hoursPerDay,
    rules.regularOvertimeMultiplier, rules.restDayOvertimeMultiplier]
  if (rates.some((rate) => !Number.isFinite(rate) || rate <= 0)) {
    throw new Error('Payroll divisors and overtime multipliers must be positive.')
  }

  const basicPay = periodShare(input.monthlySalary, input.payPeriod)
  const dailyRate = input.monthlySalary / rules.workdaysPerMonth
  const hourlyRate = dailyRate / rules.hoursPerDay
  const absenceDeduction = roundMoney(input.absentDays * dailyRate)
  if (absenceDeduction > basicPay) {
    throw new Error('Absences exceed the basic pay available for this period.')
  }
  const regularPay = roundMoney(basicPay - absenceDeduction)
  const regularOvertimePay = roundMoney(input.regularOvertimeHours * hourlyRate * rules.regularOvertimeMultiplier)
  const restDayOvertimePay = roundMoney(input.restDayOvertimeHours * hourlyRate * rules.restDayOvertimeMultiplier)
  const grossPay = roundMoney(regularPay + regularOvertimePay + restDayOvertimePay + input.allowances + input.bonuses)

  const monthlyContributions = calculateContributions(input.monthlySalary)
  const employeeDeductions = Object.values(monthlyContributions).map(({ employee }) => {
    if (rules.contributionSchedule === 'split') return periodShare(employee, input.payPeriod)
    return rules.contributionSchedule === input.payPeriod ? employee : 0
  })
  const totalDeductions = roundMoney(employeeDeductions.reduce((total, amount) => total + amount, 0))
  const netPay = roundMoney(grossPay - totalDeductions)

  if (![grossPay, totalDeductions, netPay].every(Number.isFinite)) {
    throw new Error('Payroll amounts are too large to calculate.')
  }
  return { basicPay, dailyRate, hourlyRate, absenceDeduction, regularPay,
    regularOvertimePay, restDayOvertimePay, grossPay, totalDeductions, netPay }
}
