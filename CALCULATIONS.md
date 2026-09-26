# Payroll calculation rules

The Payroll Summary updates from the existing inputs. Calculation logic lives in
`src/payroll.ts`; this repository is a browser-based React app with no server API.

The user confirmed these project defaults, configurable in `DEFAULT_PAYROLL_RULES`:

- Basic pay: half the monthly salary for each pay period.
- Daily rate: monthly salary divided by 26 workdays.
- Hourly rate: daily rate divided by 8 hours.
- Absence adjustment: unpaid absent days multiplied by the daily rate, subtracted
  from basic pay before calculating gross pay.
- Regular overtime: hours multiplied by hourly rate multiplied by 1.25.
- Rest-day overtime: overtime hours multiplied by hourly rate multiplied by 1.69.
  These are overtime hours, not the first eight hours of ordinary rest-day work.
- Allowances and bonuses: entered amounts belong to the selected pay period.
- Gross pay: basic pay minus absence adjustment, plus both overtime amounts,
  allowances and bonuses.
- Total deductions: half of each monthly employee SSS, PhilHealth and Pag-IBIG
  contribution. Employer shares are excluded. Withholding tax is not included.
- Net pay: gross pay minus total deductions.

The Government Contributions table continues to display full monthly estimates
using the existing basic-salary contribution model and supplied reference rates.
These are not an automatic schedule selection based on Payroll Month.

Days Worked, Present Days and Total Hours remain attendance reference values.
They do not also reduce pay: only Absent Days changes regular pay, avoiding
multiple deductions for the same absence. Blank optional inputs mean zero.
Missing/invalid salary, negative or invalid numbers, or absences exceeding the
period's basic pay leave summary values blank (shown as dashes).

Each pay component is rounded to cents. A split rounds the first period to cents
and assigns the remaining cents to the second period so monthly totals reconcile.

Run `npm test` with Node 22.6+ (TypeScript stripping support), `npx tsc --noEmit`,
and `npm run build` to verify the calculations and application.
