import { useState, useCallback } from 'react'
import companyPhoto from './assets/company-logo.png'
import profilePhoto from './assets/profile-photo.png'

const PRIMARY = '#35408E'
const ACCENT = '#FFD41C'

function fmt(v: number) {
  return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function parseNum(v: string) {
  return parseFloat(v.replace(/[^0-9.]/g, '')) || 0
}

const NAV = [
  { label: 'Dashboard', Icon: GridIcon },
  { label: 'Employees', Icon: UsersIcon },
  { label: 'Payroll Calculator', Icon: CalcIcon, active: true },
  { label: 'Payroll Records', Icon: FileTextIcon },
  { label: 'Reports', Icon: BarChartIcon },
  { label: 'Settings', Icon: SettingsIcon },
]

const ALLOWANCE_TYPES = ['Clothing Allowance', 'Uniform Allowance', 'Transportation Allowance', 'Meal Allowance', 'Other Allowance']
const BONUS_TYPES = ['Year-End Bonus', 'Performance Bonus', 'Incentive Bonus', 'Other Bonus']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

type AttStatus = 'verified' | 'pending' | 'incomplete'
type ListItem = { id: number; type: string; amount: string }

const IC = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white'

export default function App() {
  const [emp, setEmp] = useState({ id: 'EMP-2024-0087', name: 'Maria Santos', position: 'Senior HR Officer', department: 'Human Resources', status: 'Regular' })
  const setE = (k: keyof typeof emp) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setEmp(f => ({ ...f, [k]: e.target.value }))

  const [payMonth, setPayMonth] = useState('2024-09')
  const [payPeriod, setPayPeriod] = useState<'1st' | '2nd'>('1st')
  const [basicSalary, setBasicSalary] = useState('45000')

  const [attStats, setAttStats] = useState({ daysWorked: 11, presentDays: 10, absentDays: 1, lateInstances: 3, totalHours: 88 })
  const [attStatus, setAttStatus] = useState<AttStatus>('verified')
  const setAtt = (k: keyof typeof attStats) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAttStats(a => ({ ...a, [k]: parseInt(e.target.value) || 0 }))

  const [ot, setOt] = useState({ regular: '10', restDay: '4', holiday: '0', nightDiff: '8' })
  const setOtF = (k: keyof typeof ot) => (e: React.ChangeEvent<HTMLInputElement>) => setOt(f => ({ ...f, [k]: e.target.value }))

  const [allowances, setAllowances] = useState<ListItem[]>([
    { id: 1, type: 'Transportation Allowance', amount: '2500' },
    { id: 2, type: 'Meal Allowance', amount: '3500' },
    { id: 3, type: 'Clothing Allowance', amount: '1000' },
  ])
  const [newAllowance, setNewAllowance] = useState({ type: ALLOWANCE_TYPES[0], amount: '' })

  const [bonuses, setBonuses] = useState<ListItem[]>([
    { id: 1, type: 'Performance Bonus', amount: '8000' },
    { id: 2, type: 'Incentive Bonus', amount: '3000' },
  ])
  const [newBonus, setNewBonus] = useState({ type: BONUS_TYPES[0], amount: '' })

  const [sssOv, setSssOv] = useState('')
  const [phOv, setPhOv] = useState('')
  const [pgOv, setPgOv] = useState('')

  const [showSuccess, setShowSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const monthly = parseNum(basicSalary)
  const semiMonthly = monthly / 2
  const hourlyRate = monthly / 22 / 8

  const [yr, mo] = payMonth.split('-').map(Number)
  const lastDay = new Date(yr, mo, 0).getDate()
  const periodFrom = payPeriod === '1st' ? `${payMonth}-01` : `${payMonth}-16`
  const periodTo   = payPeriod === '1st' ? `${payMonth}-15` : `${payMonth}-${lastDay}`
  const payDate    = payPeriod === '1st' ? `${payMonth}-15` : `${payMonth}-${lastDay}`
  const monthLabel = mo ? MONTH_NAMES[mo - 1] : ''

  const regularOTHrs  = parseNum(ot.regular)
  const restDayOTHrs  = parseNum(ot.restDay)
  const holidayOTHrs  = parseNum(ot.holiday)
  const nightDiffHrs  = parseNum(ot.nightDiff)
  const regularOTPay  = regularOTHrs  * hourlyRate * 1.25
  const restDayOTPay  = restDayOTHrs  * hourlyRate * 1.30
  const holidayOTPay  = holidayOTHrs  * hourlyRate * 2.00
  const nightDiffPay  = nightDiffHrs  * hourlyRate * 0.10
  const totalOTPay    = regularOTPay + restDayOTPay + holidayOTPay + nightDiffPay

  const totalAllowances = allowances.reduce((s, a) => s + parseNum(a.amount), 0)
  const totalBonuses    = bonuses.reduce((s, b) => s + parseNum(b.amount), 0)
  const grossPay        = semiMonthly + totalAllowances + totalBonuses + totalOTPay

  const sssMSC = monthly <= 0 ? 0 : Math.min(Math.max(Math.round(monthly / 500) * 500, 4000), 35000)
  const sssEmpMonthly  = sssMSC * 0.05
  const sssEmprMonthly = sssMSC * 0.10
  const sssEmp  = sssOv ? parseNum(sssOv) : sssEmpMonthly / 2
  const sssEmpr = sssEmprMonthly / 2

  const phEmpMonthly  = Math.min(Math.max(monthly * 0.025, 250), 2500)
  const phEmprMonthly = phEmpMonthly
  const phEmp   = phOv ? parseNum(phOv) : phEmpMonthly / 2
  const phEmpr  = phEmprMonthly / 2

  const pgRate       = monthly <= 1500 ? 0.01 : 0.02
  const pgEmpMonthly  = Math.min(monthly * pgRate, 200)
  const pgEmprMonthly = Math.min(monthly * 0.02, 200)
  const pgEmp   = pgOv ? parseNum(pgOv) : pgEmpMonthly / 2
  const pgEmpr  = pgEmprMonthly / 2

  const monthlyGross  = grossPay * 2
  const govMonthly    = (sssEmp + phEmp + pgEmp) * 2
  const taxableIncome = monthlyGross - govMonthly
  let monthlyTax = 0
  if (taxableIncome > 666667)      monthlyTax = 200833.33 + (taxableIncome - 666667) * 0.35
  else if (taxableIncome > 166667) monthlyTax = 40833.33  + (taxableIncome - 166667) * 0.32
  else if (taxableIncome > 66667)  monthlyTax = 10833.33  + (taxableIncome - 66667)  * 0.30
  else if (taxableIncome > 33333)  monthlyTax = 2500       + (taxableIncome - 33333)  * 0.25
  else if (taxableIncome > 20833)  monthlyTax =               (taxableIncome - 20833)  * 0.20
  const withholdingTax  = monthlyTax / 2
  const totalDeductions = sssEmp + phEmp + pgEmp + withholdingTax
  const netPay          = grossPay - totalDeductions

  const taxBracket = taxableIncome > 666667 ? '35% bracket' : taxableIncome > 166667 ? '32% bracket' : taxableIncome > 66667 ? '30% bracket' : taxableIncome > 33333 ? '25% bracket' : taxableIncome > 20833 ? '20% bracket' : 'Exempt (₱0)'

  const attColor = attStatus === 'verified' ? '#10B981' : attStatus === 'pending' ? '#F59E0B' : '#EF4444'
  const attLabel = attStatus === 'verified' ? 'Verified' : attStatus === 'pending' ? 'Pending Review' : 'Incomplete Data'

  const calculate = useCallback(() => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3500)
  }, [])

  const reset = () => {
    setEmp({ id: '', name: '', position: '', department: '', status: 'Regular' })
    setBasicSalary('')
    setOt({ regular: '0', restDay: '0', holiday: '0', nightDiff: '0' })
    setAllowances([])
    setBonuses([])
    setSssOv(''); setPhOv(''); setPgOv('')
  }

  const addAllowance = () => {
    if (!newAllowance.amount) return
    setAllowances(a => [...a, { id: Date.now(), type: newAllowance.type, amount: newAllowance.amount }])
    setNewAllowance(n => ({ ...n, amount: '' }))
  }
  const addBonus = () => {
    if (!newBonus.amount) return
    setBonuses(b => [...b, { id: Date.now(), type: newBonus.type, amount: newBonus.amount }])
    setNewBonus(n => ({ ...n, amount: '' }))
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F4F6FB', fontFamily: 'Inter, sans-serif' }}>

      <aside className="flex flex-col w-64 h-screen flex-shrink-0 sticky top-0" style={{ background: PRIMARY, fontFamily: 'DM Sans, sans-serif' }}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
            <img src={companyPhoto} alt="19H" className="w-full h-full object-cover object-center" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">19H</p>
            <p className="text-white/50 text-xs">HRMS System</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto">
          {NAV.map(({ label, Icon, active }) => (
            <button key={label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${active ? 'text-white' : 'text-white/60 hover:text-white'}`}
              style={active ? { background: 'rgba(255,255,255,0.15)' } : {}}>
              <Icon size={18} color={active ? ACCENT : 'currentColor'} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />}
            </button>
          ))}
        </nav>
        <div className="px-4 py-5 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img src={profilePhoto} alt="Leon Marco Devela" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">Leon Marco Devela</p>
              <p className="text-white/50 text-xs">Payroll Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon size={16} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search employee..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl text-sm border border-gray-200 bg-gray-50 outline-none focus:border-blue-400 focus:bg-white transition-all w-64" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <BellIcon size={17} color="#6B7280" />
            </button>
            <div className="w-9 h-9 rounded-xl overflow-hidden">
              <img src={profilePhoto} alt="Leon Marco Devela" className="w-full h-full object-cover object-top" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-8 py-7 flex flex-col gap-6">

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: PRIMARY, fontFamily: 'DM Sans, sans-serif' }}>Employee Payroll Calculator</h1>
              <p className="text-gray-500 text-sm mt-1">Calculate employee salary, deductions, and net pay — Semi-Monthly</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                <RefreshIcon size={15} color="#6B7280" /> Reset
              </button>
              <button className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border" style={{ borderColor: PRIMARY + '33', color: PRIMARY }}>
                <ExportIcon size={15} color={PRIMARY} /> Export
              </button>
              <button className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border" style={{ borderColor: PRIMARY + '33', color: PRIMARY }}>
                <PrintIcon size={15} color={PRIMARY} /> Print Payslip
              </button>
              <button onClick={calculate} className="px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm" style={{ background: ACCENT, color: PRIMARY, fontFamily: 'DM Sans' }}>
                <CalcIcon size={16} color={PRIMARY} /> Calculate Payroll
              </button>
            </div>
          </div>

          <div className={`fixed top-6 right-8 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium transition-all duration-300 ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
            style={{ background: '#fff', border: `1.5px solid ${ACCENT}`, color: PRIMARY }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: ACCENT }}>
              <CheckIcon size={14} color={PRIMARY} />
            </span>
            Payroll calculated successfully!
          </div>

          <div className="flex gap-6 items-start">

            <div className="flex-1 flex flex-col gap-5 min-w-0">

              <Card title="Employee Information" icon={<UserIcon size={17} color={PRIMARY} />}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Employee ID"><input value={emp.id} onChange={setE('id')} placeholder="EMP-2024-0001" className={IC} /></Field>
                  <Field label="Employee Name"><input value={emp.name} onChange={setE('name')} placeholder="Full name" className={IC} /></Field>
                  <Field label="Position"><input value={emp.position} onChange={setE('position')} placeholder="Job title" className={IC} /></Field>
                  <Field label="Department"><input value={emp.department} onChange={setE('department')} placeholder="Department" className={IC} /></Field>
                  <Field label="Employment Status" className="col-span-2">
                    <select value={emp.status} onChange={setE('status')} className={IC}>
                      <option>Regular</option><option>Probationary</option><option>Contractual</option><option>Part-time</option>
                    </select>
                  </Field>
                </div>
              </Card>

              <Card title="Payroll Schedule" icon={<CalendarIcon size={17} color={PRIMARY} />} badge="Semi-Monthly">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Payroll Month">
                    <input type="month" value={payMonth} onChange={e => setPayMonth(e.target.value)} className={IC} />
                  </Field>
                  <Field label="Pay Period">
                    <div className="flex gap-2">
                      {(['1st', '2nd'] as const).map(p => (
                        <button key={p} onClick={() => setPayPeriod(p)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                          style={payPeriod === p ? { background: PRIMARY, color: '#fff', borderColor: PRIMARY } : { color: '#6B7280', borderColor: '#E5E7EB' }}>
                          {p === '1st' ? '1–15' : `16–${lastDay}`}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Monthly Basic Salary">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                      <input value={basicSalary} onChange={e => setBasicSalary(e.target.value)} placeholder="0.00" className={IC + ' pl-7'} />
                    </div>
                  </Field>
                </div>

                <div className="mt-4 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ background: PRIMARY + '08' }}>
                    <p className="text-xs font-semibold" style={{ color: PRIMARY }}>
                      {monthLabel} {yr} — {payPeriod === '1st' ? '1st Half (1–15)' : `2nd Half (16–${lastDay})`}
                    </p>
                    <div className="flex gap-5 text-xs text-gray-500">
                      <span>From: <strong className="text-gray-700">{periodFrom}</strong></span>
                      <span>To: <strong className="text-gray-700">{periodTo}</strong></span>
                      <span>Pay Date: <strong style={{ color: PRIMARY }}>{payDate}</strong></span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-6">
                    {[
                      { label: 'Semi-Monthly Basic', val: semiMonthly },
                      { label: 'Daily Rate', val: hourlyRate * 8 },
                      { label: 'Hourly Rate', val: hourlyRate },
                    ].map(({ label, val }, i, arr) => (
                      <div key={label} className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-base font-bold mt-0.5" style={{ color: PRIMARY, fontFamily: 'DM Sans' }}>{fmt(val)}</p>
                        </div>
                        {i < arr.length - 1 && <div className="w-px h-8 bg-gray-200" />}
                      </div>
                    ))}
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Working Days / Period</p>
                      <p className="text-base font-bold mt-0.5" style={{ color: PRIMARY, fontFamily: 'DM Sans' }}>11 days</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Attendance Verification" icon={<CheckCircleIcon size={17} color={PRIMARY} />}>
                <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-xl border" style={{ borderColor: attColor + '50', background: attColor + '10' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: attColor }} />
                    <span className="text-sm font-semibold" style={{ color: attColor }}>Attendance Status: {attLabel}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {(['verified', 'pending', 'incomplete'] as AttStatus[]).map(s => (
                      <button key={s} onClick={() => setAttStatus(s)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                        style={attStatus === s
                          ? { background: s === 'verified' ? '#10B981' : s === 'pending' ? '#F59E0B' : '#EF4444', color: '#fff', borderColor: 'transparent' }
                          : { color: '#6B7280', borderColor: '#E5E7EB', background: '#fff' }}>
                        {s === 'verified' ? '✓ Verified' : s === 'pending' ? '⏳ Pending' : '✗ Incomplete'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {([
                    { label: 'Days Worked', key: 'daysWorked', icon: '📅' },
                    { label: 'Present Days', key: 'presentDays', icon: '✅' },
                    { label: 'Absent Days', key: 'absentDays', icon: '❌' },
                    { label: 'Late Instances', key: 'lateInstances', icon: '⏰' },
                    { label: 'Total Hours', key: 'totalHours', icon: '⌛' },
                  ] as { label: string; key: keyof typeof attStats; icon: string }[]).map(({ label, key, icon }) => (
                    <div key={key} className="rounded-xl border border-gray-100 p-3 text-center flex flex-col items-center">
                      <p className="text-lg mb-1">{icon}</p>
                      <p className="text-xl font-bold" style={{ color: PRIMARY, fontFamily: 'DM Sans' }}>{attStats[key]}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
                      <input type="number" value={attStats[key]} onChange={setAtt(key)}
                        className="mt-2 w-full text-center text-xs border border-gray-200 rounded-lg py-1 outline-none focus:border-blue-400" />
                    </div>
                  ))}
                </div>

                {attStats.absentDays > 0 && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: '#FEF3C7', color: '#92400E' }}>
                    <InfoIcon size={13} color="#F59E0B" />
                    Absent deduction: <strong>{fmt((hourlyRate * 8) * attStats.absentDays)}</strong> — {attStats.absentDays} day{attStats.absentDays > 1 ? 's' : ''} × {fmt(hourlyRate * 8)}/day
                  </div>
                )}
                {attStatus === 'incomplete' && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                    <InfoIcon size={13} color="#EF4444" />
                    Incomplete attendance data — payroll may be inaccurate. Please complete records before processing.
                  </div>
                )}
              </Card>

              <Card title="Overtime Calculation" icon={<ClockIcon size={17} color={PRIMARY} />}>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {([
                    { label: 'Regular Overtime Hours', key: 'regular', rate: 1.25, tag: '× 1.25' },
                    { label: 'Rest Day Overtime Hours', key: 'restDay', rate: 1.30, tag: '× 1.30' },
                    { label: 'Holiday Overtime Hours', key: 'holiday', rate: 2.00, tag: '× 2.00' },
                    { label: 'Night Differential Hours', key: 'nightDiff', rate: 0.10, tag: '+10%' },
                  ] as { label: string; key: keyof typeof ot; rate: number; tag: string }[]).map(({ label, key, tag }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-500">{label}</label>
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: ACCENT + '40', color: PRIMARY }}>{tag}</span>
                      </div>
                      <input type="number" min="0" value={ot[key]} onChange={setOtF(key)} className={IC} />
                    </div>
                  ))}
                </div>

                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: PRIMARY + '08' }}>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Type</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Hours</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Rate / hr</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        { type: 'Regular Overtime',  hrs: regularOTHrs, mult: 1.25, pay: regularOTPay },
                        { type: 'Rest Day Overtime', hrs: restDayOTHrs, mult: 1.30, pay: restDayOTPay },
                        { type: 'Holiday Overtime',  hrs: holidayOTHrs, mult: 2.00, pay: holidayOTPay },
                        { type: 'Night Differential', hrs: nightDiffHrs, mult: 0.10, pay: nightDiffPay },
                      ].map(row => (
                        <tr key={row.type} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-700">{row.type}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{row.hrs}h</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmt(hourlyRate * row.mult)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold" style={{ color: PRIMARY }}>{fmt(row.pay)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: PRIMARY + '08' }}>
                        <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-gray-600">Total Overtime Pay</td>
                        <td className="px-4 py-2.5 text-right font-bold" style={{ color: PRIMARY }}>{fmt(totalOTPay)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>

              <Card title="Allowances" icon={<PlusCircleIcon size={17} color={PRIMARY} />}>
                <div className="flex gap-3 mb-4">
                  <select value={newAllowance.type} onChange={e => setNewAllowance(n => ({ ...n, type: e.target.value }))} className={IC + ' flex-1'}>
                    {ALLOWANCE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <div className="relative w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                    <input value={newAllowance.amount} onChange={e => setNewAllowance(n => ({ ...n, amount: e.target.value }))} placeholder="0.00" className={IC + ' pl-7'} />
                  </div>
                  <button onClick={addAllowance} className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 flex-shrink-0" style={{ background: PRIMARY, color: '#fff' }}>
                    <PlusIcon size={15} color="#fff" /> Add
                  </button>
                </div>
                {allowances.length > 0 ? (
                  <ListTable
                    rows={allowances}
                    onRemove={id => setAllowances(a => a.filter(x => x.id !== id))}
                    total={totalAllowances}
                    label="Total Allowances"
                  />
                ) : <EmptyState label="No allowances added yet." />}
              </Card>

              <Card title="Bonuses & Incentives" icon={<StarIcon size={17} color={PRIMARY} />}>
                <div className="flex gap-3 mb-4">
                  <select value={newBonus.type} onChange={e => setNewBonus(n => ({ ...n, type: e.target.value }))} className={IC + ' flex-1'}>
                    {BONUS_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <div className="relative w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                    <input value={newBonus.amount} onChange={e => setNewBonus(n => ({ ...n, amount: e.target.value }))} placeholder="0.00" className={IC + ' pl-7'} />
                  </div>
                  <button onClick={addBonus} className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 flex-shrink-0" style={{ background: PRIMARY, color: '#fff' }}>
                    <PlusIcon size={15} color="#fff" /> Add
                  </button>
                </div>
                {bonuses.length > 0 ? (
                  <ListTable
                    rows={bonuses}
                    onRemove={id => setBonuses(b => b.filter(x => x.id !== id))}
                    total={totalBonuses}
                    label="Total Bonuses"
                  />
                ) : <EmptyState label="No bonuses added yet." />}
              </Card>

              <Card title="Government Contributions" icon={<ShieldIcon size={17} color={PRIMARY} />} badge="PH Regulated">
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: PRIMARY + '08' }}>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Contribution</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Employee Share</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Employer Share</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Total</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Admin Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <GovRow label="SSS Contribution" hint={`5% EE / 10% ER · MSC ₱${sssMSC.toLocaleString()}`}
                        employee={sssEmp} employer={sssEmpr} override={sssOv} onOverride={setSssOv} />
                      <GovRow label="PhilHealth" hint="2.5% EE / 2.5% ER · min ₱250, max ₱2,500/mo"
                        employee={phEmp} employer={phEmpr} override={phOv} onOverride={setPhOv} />
                      <GovRow label="Pag-IBIG" hint={`${monthly <= 1500 ? '1%' : '2%'} EE / 2% ER · max ₱200/mo`}
                        employee={pgEmp} employer={pgEmpr} override={pgOv} onOverride={setPgOv} />
                    </tbody>
                    <tfoot>
                      <tr style={{ background: PRIMARY + '08' }}>
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-600">Totals (Semi-Monthly)</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-500">{fmt(sssEmp + phEmp + pgEmp)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-600">{fmt(sssEmpr + phEmpr + pgEmpr)}</td>
                        <td className="px-4 py-2.5 text-right font-bold" style={{ color: PRIMARY }}>{fmt(sssEmp + phEmp + pgEmp + sssEmpr + phEmpr + pgEmpr)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>

              <Card title="Tax Calculation" icon={<ReceiptIcon size={17} color={PRIMARY} />} badge="BIR Graduated Table">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { label: 'Monthly Gross Pay', val: monthlyGross, red: false },
                    { label: 'Gov. Deductions (Monthly)', val: govMonthly, red: true },
                    { label: 'Taxable Income (Monthly)', val: taxableIncome, red: false },
                    { label: 'Non-Taxable — 13th Mo. Est.', val: monthly / 12, green: true },
                  ].map(({ label, val, red, green }) => (
                    <div key={label} className="rounded-xl border border-gray-100 p-4">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className={`text-xl font-bold`} style={{ color: red ? '#EF4444' : green ? '#10B981' : PRIMARY, fontFamily: 'DM Sans' }}>{fmt(val)}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-4 flex items-center justify-between mb-3" style={{ background: PRIMARY + '08', border: `1px solid ${PRIMARY}22` }}>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Monthly Withholding Tax</p>
                    <p className="text-2xl font-bold" style={{ color: PRIMARY, fontFamily: 'DM Sans' }}>{fmt(monthlyTax)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-0.5">Semi-Monthly Withholding Tax</p>
                    <p className="text-2xl font-bold text-red-500" style={{ fontFamily: 'DM Sans' }}>{fmt(withholdingTax)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <InfoIcon size={12} color="#9CA3AF" />
                  Tax bracket applied: <strong className="text-gray-600">{taxBracket}</strong> — based on monthly taxable income of {fmt(taxableIncome)}
                </p>
              </Card>

            </div>

            <div className="w-80 flex-shrink-0 flex flex-col gap-4">

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                    style={{ background: PRIMARY + '18', color: PRIMARY, fontFamily: 'DM Sans' }}>
                    {emp.name ? emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate" style={{ fontFamily: 'DM Sans' }}>{emp.name || '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{emp.position || '—'}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: ACCENT + '33', color: PRIMARY }}>{emp.status}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-gray-400">Employee ID</p><p className="font-medium text-gray-700 mt-0.5">{emp.id || '—'}</p></div>
                  <div><p className="text-gray-400">Department</p><p className="font-medium text-gray-700 mt-0.5">{emp.department || '—'}</p></div>
                  <div><p className="text-gray-400">Pay Period</p><p className="font-medium text-gray-700 mt-0.5">{payPeriod === '1st' ? '1st Half (1–15)' : `2nd Half (16–${lastDay})`}</p></div>
                  <div><p className="text-gray-400">Pay Date</p><p className="font-medium mt-0.5" style={{ color: PRIMARY }}>{payDate}</p></div>
                </div>
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: attColor + '15', color: attColor }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: attColor }} />
                  {attLabel} — {attStats.daysWorked} days worked / {attStats.totalHours}h total
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: PRIMARY }}>
                  <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'DM Sans' }}>Payroll Summary</h3>
                  <span className="text-xs text-white/60">{payPeriod === '1st' ? '1st Half' : '2nd Half'} · {monthLabel} {yr}</span>
                </div>
                <div className="p-5 flex flex-col gap-2">

                  <SectionLabel>Earnings</SectionLabel>
                  <SummaryRow label="Basic Pay (Semi-Monthly)" value={semiMonthly} />
                  <SummaryRow label="Total Allowances" value={totalAllowances} />
                  <SummaryRow label="Total Bonuses" value={totalBonuses} />
                  <SummaryRow label="Overtime Pay" value={totalOTPay} />

                  <div className="my-1.5 border-t border-dashed border-gray-200" />
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: PRIMARY + '0F' }}>
                    <span className="text-sm font-bold" style={{ color: PRIMARY }}>Gross Pay</span>
                    <span className="font-bold text-base" style={{ color: PRIMARY }}>{fmt(grossPay)}</span>
                  </div>

                  <div className="h-1" />
                  <SectionLabel>Deductions</SectionLabel>
                  <SummaryRow label="SSS Contribution" value={sssEmp} red />
                  <SummaryRow label="PhilHealth" value={phEmp} red />
                  <SummaryRow label="Pag-IBIG" value={pgEmp} red />
                  <SummaryRow label="Withholding Tax" value={withholdingTax} red />

                  <div className="my-1.5 border-t border-dashed border-gray-200" />
                  <SummaryRow label="Total Deductions" value={totalDeductions} red bold />

                  <div className="h-1" />
                  <div className="rounded-2xl p-4 flex flex-col items-center gap-1" style={{ background: ACCENT }}>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: PRIMARY + 'AA' }}>Net Pay</p>
                    <p className="text-3xl font-bold" style={{ color: PRIMARY, fontFamily: 'DM Sans' }}>{fmt(netPay)}</p>
                    <p className="text-xs" style={{ color: PRIMARY + '88' }}>Take-home pay</p>
                  </div>

                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Deduction rate</span>
                      <span>{grossPay > 0 ? ((totalDeductions / grossPay) * 100).toFixed(1) : '0.0'}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: grossPay > 0 ? `${Math.min((totalDeductions / grossPay) * 100, 100)}%` : '0%', background: PRIMARY }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Quick Actions</p>
                <QuickAction icon={<ExportIcon size={15} color={PRIMARY} />} label="Export to Excel" />
                <QuickAction icon={<PrintIcon size={15} color={PRIMARY} />} label="Print Payslip" />
                <QuickAction icon={<FileTextIcon size={15} color={PRIMARY} />} label="Save to Records" />
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function Card({ title, icon, badge, children }: { title: string; icon?: React.ReactNode; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
        {icon}
        <h2 className="font-bold text-gray-800 text-sm flex-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{title}</h2>
        {badge && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#EEF0FB', color: PRIMARY }}>{badge}</span>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function GovRow({ label, hint, employee, employer, override, onOverride }: {
  label: string; hint: string; employee: number; employer: number; override: string; onOverride: (v: string) => void
}) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{hint}</p>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-red-500">{fmt(employee)}</td>
      <td className="px-4 py-3 text-right font-medium text-gray-600">{fmt(employer)}</td>
      <td className="px-4 py-3 text-right font-bold" style={{ color: PRIMARY }}>{fmt(employee + employer)}</td>
      <td className="px-4 py-3">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₱</span>
          <input value={override} onChange={e => onOverride(e.target.value)} placeholder="Override"
            className="w-24 pl-5 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white" />
        </div>
      </td>
    </tr>
  )
}

function ListTable({ rows, onRemove, total, label }: { rows: { id: number; type: string; amount: string }[]; onRemove: (id: number) => void; total: number; label: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: PRIMARY + '08' }}>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Type</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Amount</th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-700">{r.type}</td>
              <td className="px-4 py-2.5 text-right font-medium" style={{ color: PRIMARY }}>{fmt(parseNum(r.amount))}</td>
              <td className="px-4 py-2.5 text-center">
                <button onClick={() => onRemove(r.id)} className="text-red-400 hover:text-red-600 transition-colors text-xs font-bold">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: PRIMARY + '08' }}>
            <td className="px-4 py-2.5 text-xs font-bold text-gray-600">{label}</td>
            <td className="px-4 py-2.5 text-right font-bold" style={{ color: PRIMARY }}>{fmt(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-center text-sm text-gray-400 py-6 border border-dashed border-gray-200 rounded-xl">{label}</p>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-1 mb-0.5">{children}</p>
}

function SummaryRow({ label, value, red, bold }: { label: string; value: number; red?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? 'font-bold text-gray-700' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${red ? 'text-red-500' : 'text-gray-800'}`}>{fmt(value)}</span>
    </div>
  )
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium text-left">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EEF0FB' }}>{icon}</span>
      {label}
    </button>
  )
}

function GridIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function UsersIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function CalcIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="14" y2="18"/><line x1="16" y1="18" x2="16" y2="16"/></svg>
}
function FileTextIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
}
function BarChartIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
}
function SettingsIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
function SearchIcon({ size = 20, color = 'currentColor', className = '' }: { size?: number; color?: string; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function BellIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function UserIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function CalendarIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function CheckCircleIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
}
function ClockIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function PlusCircleIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
}
function PlusIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function StarIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}
function ShieldIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function ReceiptIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
}
function InfoIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
}
function RefreshIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
}
function ExportIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function PrintIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
}
function CheckIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
