import { labels } from './records.ts'
import type { PayrollForm, Calculation } from './records'

export function csvCell(value: string | number) {
  const text = typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : String(value)
  return `"${text.split('"').join('""')}"`
}
export function payrollCsv(form: PayrollForm, calculation: NonNullable<Calculation>) {
  const rows: (string | number)[][] = [['Payroll estimate', 'Value'],
    ...Object.entries(form).map(([key, value]) => [labels[key as keyof PayrollForm], value]),
    ['Basic pay', calculation.totals.basicPay], ['Absence deduction', calculation.totals.absenceDeduction],
    ['Regular overtime pay', calculation.totals.regularOvertimePay], ['Rest day overtime pay', calculation.totals.restDayOvertimePay],
    ['Gross pay', calculation.totals.grossPay], ['Employee contributions for this period', calculation.totals.totalDeductions],
    ['Net pay estimate', calculation.totals.netPay],
    ['Currency', 'PHP'], ['Daily rate divisor', calculation.rules.workdaysPerMonth], ['Hours per workday', calculation.rules.hoursPerDay],
    ['Note', 'Estimate using the project contribution schedules. Withholding tax is not included.'],
  ]
  for (const [name, shares] of Object.entries(calculation.contributions)) {
    rows.push([`${name} monthly employee share`, shares.employee], [`${name} monthly employer share`, shares.employer])
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
export function downloadCsv(form: PayrollForm, calculation: NonNullable<Calculation>) {
  const url = URL.createObjectURL(new Blob([payrollCsv(form, calculation)], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `payroll-${form.employeeId.replace(/[^A-Za-z0-9_-]/g, '_')}-${form.payrollMonth}-${form.payPeriod}.csv`
  document.body.append(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
