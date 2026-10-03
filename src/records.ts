import { calculatePayroll, DEFAULT_PAYROLL_RULES } from './payroll.ts'
import { calculateContributions } from './contributions.ts'

export const numericFields = ['monthlySalary', 'daysWorked', 'presentDays', 'absentDays', 'totalHours',
  'regularOvertimeHours', 'restDayOvertimeHours', 'allowances', 'bonuses'] as const
export type NumericField = typeof numericFields[number]
export type PayrollForm = {
  employeeId: string; employeeName: string; position: string; department: string
  payrollMonth: string; payPeriod: 'first' | 'second'
} & Record<NumericField, string>
export type FieldErrors = Partial<Record<keyof PayrollForm, string>>
export const labels: Record<keyof PayrollForm, string> = {
  employeeId: 'Employee ID', employeeName: 'Employee Name', position: 'Position', department: 'Department',
  payrollMonth: 'Payroll Month', payPeriod: 'Pay Period', monthlySalary: 'Monthly Basic Salary',
  daysWorked: 'Days Worked', presentDays: 'Present Days', absentDays: 'Absent Days', totalHours: 'Total Hours',
  regularOvertimeHours: 'Regular Overtime Hours', restDayOvertimeHours: 'Rest Day Overtime Hours',
  allowances: 'Allowances', bonuses: 'Bonuses',
}

export function emptyForm(now = new Date()): PayrollForm {
  return { employeeId: '', employeeName: '', position: '', department: '',
    payrollMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, payPeriod: 'first',
    monthlySalary: '', daysWorked: '', presentDays: '', absentDays: '', totalHours: '',
    regularOvertimeHours: '', restDayOvertimeHours: '', allowances: '', bonuses: '' }
}

export const parseAmount = (value: string) => value.trim() === '' ? 0
  : /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value.trim()) ? Number(value) : NaN

export function normalizeForm(value: unknown): PayrollForm {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter a payroll form.')
  const source = value as Record<string, unknown>
  const result = {} as Record<string, string>
  for (const key of Object.keys(emptyForm())) {
    if (typeof source[key] !== 'string') throw new Error(`Enter a valid ${labels[key as keyof PayrollForm].toLowerCase()}.`)
    result[key] = (source[key] as string).trim()
  }
  result.employeeId = result.employeeId.toUpperCase()
  return result as PayrollForm
}

export function validateForm(form: PayrollForm, requireEmployee = false): FieldErrors {
  const errors: FieldErrors = {}
  for (const field of ['employeeId', 'employeeName', 'position', 'department'] as const) {
    if (form[field].length > (field === 'employeeId' ? 40 : 120)) errors[field] = 'This value is too long.'
    if (/[\u0000-\u001f\u007f]/.test(form[field])) errors[field] = 'Remove control characters.'
  }
  if (form.employeeId && !/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/.test(form.employeeId)) {
    errors.employeeId = 'Use letters, numbers, spaces, dots, underscores or hyphens.'
  }
  if (requireEmployee) {
    if (!form.employeeId.trim()) errors.employeeId = 'Enter an employee ID to save this draft.'
    if (!form.employeeName.trim()) errors.employeeName = 'Enter an employee name to save this draft.'
  }
  if (!/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(form.payrollMonth)) {
    errors.payrollMonth = 'Choose a month between 1900 and 2199.'
  }
  if (form.payPeriod !== 'first' && form.payPeriod !== 'second') errors.payPeriod = 'Choose a pay period.'
  for (const field of numericFields) {
    const amount = parseAmount(form[field])
    const maximum = field.endsWith('Days') || field === 'daysWorked' ? 31
      : field.includes('Hours') ? 744 : 1_000_000_000
    if (!Number.isFinite(amount) || amount < 0) errors[field] = 'Use a nonnegative number with up to 2 decimal places.'
    else if (amount > maximum) errors[field] = `Enter ${maximum.toLocaleString('en-US')} or less.`
  }
  if (form.monthlySalary.trim() && parseAmount(form.monthlySalary) === 0) errors.monthlySalary = 'Salary must be greater than zero.'
  if (!errors.payrollMonth && !errors.payPeriod) {
    const [year, month] = form.payrollMonth.split('-').map(Number)
    const periodDays = form.payPeriod === 'first' ? 15 : new Date(year, month, 0).getDate() - 15
    for (const field of ['daysWorked', 'presentDays', 'absentDays'] as const) {
      if (parseAmount(form[field]) > periodDays) errors[field] = `This period has only ${periodDays} calendar days.`
    }
    if (parseAmount(form.presentDays) + parseAmount(form.absentDays) > periodDays) {
      errors.presentDays = `Present and absent days cannot exceed ${periodDays} days combined.`
    }
    if (parseAmount(form.totalHours) > periodDays * 24) errors.totalHours = 'Hours exceed the time available in this period.'
    if (parseAmount(form.regularOvertimeHours) + parseAmount(form.restDayOvertimeHours) > periodDays * 24) {
      errors.regularOvertimeHours = 'Combined overtime exceeds the time available in this period.'
    }
  }
  if (parseAmount(form.absentDays) > DEFAULT_PAYROLL_RULES.workdaysPerMonth / 2) {
    errors.absentDays = 'Absences exceed the basic pay available for this period (13 days).'
  }
  return errors
}

export function calculateForm(form: PayrollForm) {
  if (!form.monthlySalary.trim() || Object.keys(validateForm(form)).length) return null
  return {
    version: 1,
    rules: { ...DEFAULT_PAYROLL_RULES },
    totals: calculatePayroll({ monthlySalary: parseAmount(form.monthlySalary), payPeriod: form.payPeriod,
      absentDays: parseAmount(form.absentDays), regularOvertimeHours: parseAmount(form.regularOvertimeHours),
      restDayOvertimeHours: parseAmount(form.restDayOvertimeHours), allowances: parseAmount(form.allowances),
      bonuses: parseAmount(form.bonuses) }, DEFAULT_PAYROLL_RULES),
    contributions: calculateContributions(parseAmount(form.monthlySalary)),
  }
}

export type Calculation = ReturnType<typeof calculateForm>
export type Draft = { id: string; version: number; form: PayrollForm; calculation: Calculation; createdAt: string; updatedAt: string }
export type DraftSummary = { id: string; version: number; employeeId: string; employeeName: string;
  payrollMonth: string; payPeriod: PayrollForm['payPeriod']; netPay: number | null; updatedAt: string }
export type Employee = Pick<PayrollForm, 'employeeId' | 'employeeName' | 'position' | 'department' | 'monthlySalary'>
export const summarizeDraft = (draft: Draft): DraftSummary => ({ id: draft.id, version: draft.version,
  employeeId: draft.form.employeeId, employeeName: draft.form.employeeName, payrollMonth: draft.form.payrollMonth,
  payPeriod: draft.form.payPeriod, netPay: draft.calculation?.totals.netPay ?? null, updatedAt: draft.updatedAt })

