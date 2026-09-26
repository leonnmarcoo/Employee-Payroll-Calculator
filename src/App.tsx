import { useState } from 'react'
import { calculateContributions } from './contributions'
import { calculatePayroll, DEFAULT_PAYROLL_RULES } from './payroll'

const navigation = ['Payroll Calculator']
const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
const parseAmount = (value: string) => value.trim() === '' ? 0
  : /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()) ? Number(value) : NaN

export default function App() {
  const [monthlySalary, setMonthlySalary] = useState('')
  const [payPeriod, setPayPeriod] = useState<'first' | 'second'>('first')
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [earnings, setEarnings] = useState<Record<string, string>>({})
  const salary = Number(monthlySalary)
  const contributions = monthlySalary.trim() !== '' && Number.isFinite(salary) && salary > 0
    ? calculateContributions(salary)
    : null
  const contributionRows = [
    { label: 'SSS Contribution', value: contributions?.sss },
    { label: 'PhilHealth', value: contributions?.philHealth },
    { label: 'Pag-IBIG', value: contributions?.pagIbig },
  ]
  let payroll: ReturnType<typeof calculatePayroll> | null = null
  let payrollError = ''
  if (monthlySalary.trim() !== '') {
    try {
      if (Object.values(attendance).some((value) => !Number.isFinite(parseAmount(value)))) {
        throw new Error('Attendance must contain valid nonnegative numbers.')
      }
      payroll = calculatePayroll({
        monthlySalary: parseAmount(monthlySalary),
        payPeriod,
        absentDays: parseAmount(attendance['Absent Days'] ?? ''),
        regularOvertimeHours: parseAmount(earnings['Regular Overtime Hours'] ?? ''),
        restDayOvertimeHours: parseAmount(earnings['Rest Day Overtime Hours'] ?? ''),
        allowances: parseAmount(earnings['Allowances'] ?? ''),
        bonuses: parseAmount(earnings['Bonuses'] ?? ''),
      }, DEFAULT_PAYROLL_RULES)
    } catch (error) {
      payrollError = error instanceof Error ? error.message : 'Check the payroll inputs.'
    }
  }
  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-800 lg:flex">
      <aside className="flex w-full flex-col bg-[#35408e] text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        <div className="border-b border-white/10 px-6 py-6">
          <p className="text-lg font-bold tracking-wide">19H</p>
          <p className="text-xs text-white/55">HRMS System</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-4 lg:flex-col">
          {navigation.map((item) => (
            <div
              className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm ${item === 'Payroll Calculator' ? 'bg-white/15 font-semibold text-white' : 'text-white/65'}`}
              key={item}
            >
              {item}
            </div>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 px-6 py-5 lg:block">
          <p className="text-sm font-semibold">Payroll Admin</p>
          <p className="mt-1 text-xs text-white/55">Frontend workspace</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
            <h1 className="mt-1 text-xl font-bold text-[#35408e]">Employee Payroll Calculator</h1>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="h-9 w-9 rounded-full bg-[#ffd41c] text-center text-sm font-bold leading-9 text-[#35408e]">PA</div>
          </div>
        </header>

        <div className="space-y-6 p-5 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Payroll workspace</h2>
              <p className="mt-1 text-sm text-slate-500">Frontend layout ready for backend data and actions.</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">Reset</button>
              <button className="rounded-lg bg-[#35408e] px-4 py-2 text-sm font-semibold text-white">Save Draft</button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="font-bold">Employee Information</h3>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-500">Employee ID<input className="field" placeholder="EMP-2024-0001" /></label>
                  <label className="text-xs font-semibold text-slate-500">Employee Name<input className="field" placeholder="Full name" /></label>
                  <label className="text-xs font-semibold text-slate-500">Position<input className="field" placeholder="Job title" /></label>
                  <label className="text-xs font-semibold text-slate-500">Department<input className="field" placeholder="Department" /></label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <h3 className="font-bold">Payroll Schedule</h3>
                  <span className="rounded-full bg-[#eef0fb] px-3 py-1 text-xs font-semibold text-[#35408e]">Semi-Monthly</span>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-500">Payroll Month<input className="field" type="month" /></label>
                  <label className="text-xs font-semibold text-slate-500">Pay Period<select className="field" value={payPeriod} onChange={(event) => setPayPeriod(event.target.value as 'first' | 'second')}><option value="first">1st Half (1-15)</option><option value="second">2nd Half (16-end)</option></select></label>
                  <label className="text-xs font-semibold text-slate-500">Monthly Basic Salary<input className="field" type="number" min="0" step="0.01" placeholder="0.00" value={monthlySalary} onChange={(event) => setMonthlySalary(event.target.value)} /></label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="font-bold">Attendance Verification</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
                  {['Days Worked', 'Present Days', 'Absent Days', 'Total Hours'].map((label) => (
                    <label className="text-center text-xs font-semibold text-slate-500" key={label}>{label}<input className="field text-center" placeholder="0" inputMode="decimal" value={attendance[label] ?? ''} onChange={(event) => setAttendance((values) => ({ ...values, [label]: event.target.value }))} aria-invalid={!Number.isFinite(parseAmount(attendance[label] ?? ''))} /></label>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="font-bold">Earnings and Adjustments</h3>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  {['Regular Overtime Hours', 'Rest Day Overtime Hours', 'Allowances', 'Bonuses'].map((label) => (
                    <label className="text-xs font-semibold text-slate-500" key={label}>{label}<input className="field" placeholder="0.00" inputMode="decimal" value={earnings[label] ?? ''} onChange={(event) => setEarnings((values) => ({ ...values, [label]: event.target.value }))} aria-invalid={!Number.isFinite(parseAmount(earnings[label] ?? ''))} /></label>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="font-bold">Government Contributions</h3>
                </div>
                <p className="px-6 pt-5 text-xs text-slate-500">Monthly estimates based on basic salary and the 2025 SSS and PhilHealth schedules and Pag-IBIG Circular 460. SSS includes employer-paid EC. Verify rates for the selected payroll month. Half of each monthly employee share is deducted per semi-monthly period.</p>
                <div className="overflow-x-auto p-6">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3">Contribution</th><th className="pb-3 text-right">Employee Share</th><th className="pb-3 text-right">Employer Share</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{contributionRows.map(({ label, value }) => <tr key={label}><td className="py-3 font-medium">{label}</td><td className="py-3 text-right text-slate-500">{value ? money(value.employee) : '-'}</td><td className="py-3 text-right text-slate-500">{value ? money(value.employer) : '-'}</td></tr>)}</tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Employee preview</p>
                <div className="mt-5 flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#eef0fb] text-xl font-bold text-[#35408e]">?</div>
                  <div><p className="font-bold">No employee selected</p><p className="mt-1 text-xs text-slate-500">Details will appear here</p></div>
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-[#35408e] px-6 py-4 text-white"><h3 className="font-bold">Payroll Summary</h3></div>
                <div className="space-y-4 p-6 text-sm" aria-live="polite" title={payrollError || undefined}>
                  <div className="flex justify-between"><span className="text-slate-500">Gross Pay</span><strong>{payroll ? money(payroll.grossPay) : '-'}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Total Deductions</span><strong>{payroll ? money(payroll.totalDeductions) : '-'}</strong></div>
                  <div className="border-t border-dashed border-slate-200 pt-4"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net Pay</span><p className="mt-2 text-3xl font-bold text-[#35408e]">{payroll ? money(payroll.netPay) : '-'}</p></div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
