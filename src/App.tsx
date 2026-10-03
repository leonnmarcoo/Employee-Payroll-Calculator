import { labels, normalizeForm, validateForm } from './records'
import type { PayrollForm } from './records'
import { ConfirmDialog, DraftHistory, money, primaryButton, savedTime, secondaryButton } from './components'
import { downloadCsv } from './export'
import { usePayroll } from './usePayroll'

export default function App() {
  const app = usePayroll()
  const { form, workspace, computed, busy, notice, confirmation } = app
  const payroll = computed.result?.totals
  const contributionRows = [
    { label: 'SSS Contribution', value: computed.result?.contributions.sss },
    { label: 'PhilHealth', value: computed.result?.contributions.philHealth },
    { label: 'Pag-IBIG', value: computed.result?.contributions.pagIbig },
  ]
  function field(key: keyof PayrollForm, options: { placeholder?: string; type?: string; centered?: boolean } = {}) {
    const invalid = (app.touched[key] || app.submitted || app.serverErrors[key]) && app.errors[key]
    return <label key={key} htmlFor={key} className={`text-xs font-semibold text-slate-500 ${options.centered ? 'text-center' : ''}`}>
      {labels[key]}<input id={key} name={key} className={`field ${options.centered ? 'text-center' : ''}`} type={options.type || 'text'}
        placeholder={options.placeholder} value={form[key]} onChange={event => app.change(key, event.target.value)} onBlur={() => app.blur(key)}
        maxLength={key === 'employeeId' ? 40 : ['employeeName', 'position', 'department'].includes(key) ? 120 : 20}
        inputMode={['employeeId', 'employeeName', 'position', 'department', 'payrollMonth'].includes(key) ? undefined : 'decimal'}
        list={key === 'employeeId' ? 'saved-employees' : undefined} autoComplete="off"
        min={key === 'payrollMonth' ? '1900-01' : undefined} max={key === 'payrollMonth' ? '2199-12' : undefined}
        aria-invalid={!!invalid} aria-describedby={invalid ? `${key}-error` : undefined} />
      {invalid && <span id={`${key}-error`} className="mt-1 block text-left text-xs font-normal text-red-700">{invalid}</span>}
    </label>
  }
  const initials = form.employeeName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'
  const breakdown: [string, number][] = payroll ? [['Basic pay', payroll.basicPay], ['Daily rate', payroll.dailyRate],
    ['Hourly rate', payroll.hourlyRate], ['Absence adjustment', payroll.absenceDeduction], ['Regular overtime', payroll.regularOvertimePay],
    ['Rest day overtime', payroll.restDayOvertimePay], ['Allowances', Number(form.allowances || 0)], ['Bonuses', Number(form.bonuses || 0)]] : []

  return <>
    <div className="app-shell min-h-screen bg-[#f4f6fb] text-slate-800 lg:flex">
      <aside className="flex w-full flex-col bg-[#35408e] text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        <div className="border-b border-white/10 px-6 py-6"><p className="text-lg font-bold tracking-wide">19H</p><p className="text-xs text-white/55">HRMS System</p></div>
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-3 py-4 lg:flex-col"><a href="#workspace-heading" aria-current="page" className="whitespace-nowrap rounded-lg bg-white/15 px-3 py-2.5 text-sm font-semibold text-white">Payroll Calculator</a></nav>
        <div className="mt-auto hidden border-t border-white/10 px-6 py-5 lg:block"><p className="text-sm font-semibold">Payroll Admin</p><p className="mt-1 text-xs text-white/55">Payroll workspace</p></div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p><h1 className="mt-1 text-xl font-bold text-[#35408e]">Employee Payroll Calculator</h1></div>
          <div className="hidden items-center gap-3 sm:flex"><div className="h-9 w-9 rounded-full bg-[#ffd41c] text-center text-sm font-bold leading-9 text-[#35408e]">PA</div></div>
        </header>
        <form noValidate onSubmit={app.save} className="space-y-6 p-5 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><h2 id="workspace-heading" className="text-2xl font-bold text-slate-900">Payroll workspace</h2>
              <p className="mt-1 text-sm text-slate-500">{busy || (app.dirty ? 'Unsaved changes' : workspace.updatedAt ? `Saved ${savedTime(workspace.updatedAt)}` : 'Calculate payroll and keep your drafts in one place.')}</p></div>
            <div className="flex gap-2"><button type="button" className={secondaryButton} disabled={!!busy} onClick={app.reset}>Reset</button><button type="submit" className={primaryButton} disabled={!!busy}>{busy === 'Saving…' ? 'Saving…' : 'Save Draft'}</button></div>
          </div>
          {notice && <div className={`notice flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${notice.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-[#35408e]/15 bg-[#eef0fb] text-[#35408e]'}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span><button type="button" className="shrink-0 font-semibold" aria-label="Dismiss notification" onClick={() => app.setNotice(null)}>×</button>
          </div>}
          {app.storageWarning && <p className="text-sm text-amber-800" role="status">Browser recovery is unavailable. Save your draft before refreshing or closing this page.</p>}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <fieldset disabled={!!busy} className="min-w-0 space-y-6">
              <legend className="sr-only">Payroll details</legend>
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4"><h3 className="font-bold">Employee Information</h3></div>
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  {field('employeeId', { placeholder: 'EMP-2024-0001' })}{field('employeeName', { placeholder: 'Full name' })}
                  {field('position', { placeholder: 'Job title' })}{field('department', { placeholder: 'Department' })}
                  <datalist id="saved-employees">{app.employees.map(employee => <option key={employee.employeeId} value={employee.employeeId}>{employee.employeeName}</option>)}</datalist>
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><h3 className="font-bold">Payroll Schedule</h3><span className="rounded-full bg-[#eef0fb] px-3 py-1 text-xs font-semibold text-[#35408e]">Semi-Monthly</span></div>
                <div className="grid gap-4 p-6 sm:grid-cols-3">
                  {field('payrollMonth', { type: 'month' })}
                  <label htmlFor="payPeriod" className="text-xs font-semibold text-slate-500">Pay Period<select id="payPeriod" className="field" value={form.payPeriod} onChange={event => app.change('payPeriod', event.target.value as PayrollForm['payPeriod'])}><option value="first">1st Half (1-15)</option><option value="second">2nd Half (16-end)</option></select></label>
                  {field('monthlySalary', { placeholder: '0.00' })}
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4"><h3 className="font-bold">Attendance Verification</h3></div>
                <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">{(['daysWorked', 'presentDays', 'absentDays', 'totalHours'] as const).map(key => field(key, { placeholder: '0', centered: true }))}</div>
                <p className="px-6 pb-5 text-xs text-slate-500">Attendance is for this pay period. Only absent days reduce basic pay; the other attendance fields are saved for reference.</p>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4"><h3 className="font-bold">Earnings and Adjustments</h3></div>
                <div className="grid gap-4 p-6 sm:grid-cols-2">{(['regularOvertimeHours', 'restDayOvertimeHours', 'allowances', 'bonuses'] as const).map(key => field(key, { placeholder: '0.00' }))}</div>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4"><h3 className="font-bold">Government Contributions</h3></div>
                <p className="px-6 pt-5 text-xs text-slate-500">Monthly estimates based on basic salary and the 2025 SSS and PhilHealth schedules and Pag-IBIG Circular 460. SSS includes employer-paid EC. Verify rates for the selected payroll month. Half of each monthly employee share is deducted per semi-monthly period.</p>
                <div className="overflow-x-auto p-6"><table className="w-full min-w-[520px] text-left text-sm"><caption className="sr-only">Monthly government contribution estimates</caption>
                  <thead className="text-xs uppercase tracking-wide text-slate-400"><tr><th scope="col" className="pb-3">Contribution</th><th scope="col" className="pb-3 text-right">Employee Share</th><th scope="col" className="pb-3 text-right">Employer Share</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{contributionRows.map(({ label, value }) => <tr key={label}><th scope="row" className="py-3 font-medium">{label}</th><td className="py-3 text-right text-slate-500">{value ? money(value.employee) : '-'}</td><td className="py-3 text-right text-slate-500">{value ? money(value.employer) : '-'}</td></tr>)}</tbody>
                </table></div>
              </section>
            </fieldset>
            <aside className="min-w-0 space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Employee preview</p>
                <div className="mt-5 flex items-center gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#eef0fb] text-xl font-bold text-[#35408e]">{initials}</div>
                  <div className="min-w-0"><p className="break-words font-bold">{form.employeeName.trim() || 'No employee selected'}</p><p className="mt-1 break-words text-xs text-slate-500">{[form.position, form.department].filter(Boolean).join(' · ') || form.employeeId || 'Details will appear here'}</p></div></div>
              </section>
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-[#35408e] px-6 py-4 text-white"><h3 className="font-bold">Payroll Summary</h3></div>
                <div className="space-y-4 p-6 text-sm" aria-live="polite" aria-atomic="true">
                  <div className="flex justify-between gap-2"><span className="text-slate-500">Gross Pay</span><strong>{payroll ? money(payroll.grossPay) : '-'}</strong></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">Total Deductions</span><strong>{payroll ? money(payroll.totalDeductions) : '-'}</strong></div>
                  <div className="border-t border-dashed border-slate-200 pt-4"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net Pay</span><p className="amount mt-2 break-words text-3xl font-bold text-[#35408e]">{payroll ? money(payroll.netPay) : '-'}</p></div>
                  {!payroll && <p className="text-xs text-slate-500">{computed.error || (Object.keys(validateForm(form)).length ? 'Correct the payroll fields to see your estimate.' : 'Enter a monthly salary to see your estimate.')}</p>}
                  {payroll && payroll.netPay < 0 && <p className="text-xs text-amber-800">Deductions exceed earnings. Review this negative net pay before using the estimate.</p>}
                </div>
                <div className="border-t border-slate-100 px-6 pb-5 pt-4">
                  <details className="text-xs text-slate-500"><summary className="cursor-pointer font-semibold text-[#35408e]">Calculation details</summary>
                    <dl className="mt-3 space-y-2">{breakdown.map(([label, value]) => <div className="flex justify-between gap-2" key={label}><dt>{label}</dt><dd>{money(value)}</dd></div>)}</dl>
                    <p className="mt-3 leading-relaxed">26 workdays/month, 8 hours/day. Overtime multipliers: 1.25 regular and 1.69 rest day. Allowances and bonuses apply to this period. Absences are deducted before gross pay. Withholding tax is not included.</p>
                  </details>
                  <p className="mt-3 text-xs text-slate-400">Estimate only · withholding tax excluded</p>
                  <div className="mt-4 flex gap-2"><button type="button" className={`${secondaryButton} flex-1 px-2 text-xs`} disabled={!app.exportReady || !!busy} onClick={() => { if (computed.result) downloadCsv(normalizeForm(form), computed.result) }}>Export CSV</button><button type="button" className={`${secondaryButton} flex-1 px-2 text-xs`} disabled={!app.exportReady || !!busy} onClick={() => window.print()}>Print</button></div>
                </div>
              </section>
              {app.undo && <div className="flex items-center justify-between gap-2 rounded-lg bg-[#eef0fb] px-4 py-3 text-xs text-[#35408e]"><span>Last deleted draft</span><button type="button" className="font-semibold underline" disabled={!!busy} onClick={app.restoreDraft}>Undo deletion</button></div>}
              <DraftHistory revision={app.revision} activeId={workspace.id} disabled={!!busy} onOpen={app.openDraft} onDelete={app.deleteDraft} />
            </aside>
          </div>
        </form>
      </main>
    </div>
    {confirmation && <ConfirmDialog title={confirmation.title} message={confirmation.message} action={confirmation.action} onCancel={() => app.setConfirmation(null)} onConfirm={() => { const run = confirmation.run; app.setConfirmation(null); run() }} />}
    <section className="print-report" aria-label="Printable payroll estimate">
      <h1>19H · Payroll estimate</h1><p>{form.employeeName} · {form.employeeId}</p><p>{form.position} · {form.department}</p>
      <p>{form.payrollMonth} · {form.payPeriod === 'first' ? '1st half (1–15)' : '2nd half (16–end)'}</p>
      <table><tbody>{Object.entries(form).filter(([key]) => !['employeeId', 'employeeName', 'position', 'department', 'payPeriod', 'payrollMonth'].includes(key)).map(([key, value]) => <tr key={key}><th>{labels[key as keyof PayrollForm]}</th><td>{value || '0'}</td></tr>)}
        {payroll && [...breakdown.filter(([key]) => !['Allowances', 'Bonuses'].includes(key)), ['Gross pay', payroll.grossPay], ['Employee contributions', payroll.totalDeductions], ['Net pay estimate', payroll.netPay]].map(([key, value]) => <tr key={key}><th>{key}</th><td>{money(Number(value))}</td></tr>)}
      </tbody></table><p>Estimate in PHP using the project contribution schedules. Withholding tax is not included. Verify rates and company policy before payroll processing.</p>
    </section>
  </>
}
