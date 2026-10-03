export type Contribution = { employee: number; employer: number }

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

// Guide estimates for a covered private-sector employee, using monthly basic
// salary as the available compensation input. SSS uses the 2025 MSC brackets.
export function calculateContributions(monthlySalary: number): {
  sss: Contribution
  philHealth: Contribution
  pagIbig: Contribution
} {
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    throw new Error('Monthly basic salary must be a nonnegative number.')
  }

  const salaryCredit = Math.min(35000, Math.max(5000, Math.floor((monthlySalary + 250) / 500) * 500))
  const sssEc = salaryCredit <= 14500 ? 10 : 30
  const philHealthBase = Math.min(100000, Math.max(10000, monthlySalary))
  const pagIbigBase = Math.min(10000, monthlySalary)

  return {
    sss: { employee: salaryCredit * 0.05, employer: salaryCredit * 0.1 + sssEc },
    philHealth: {
      employee: roundMoney(philHealthBase * 0.025),
      employer: roundMoney(philHealthBase * 0.025),
    },
    pagIbig: {
      employee: roundMoney(pagIbigBase * (monthlySalary <= 1500 ? 0.01 : 0.02)),
      employer: roundMoney(pagIbigBase * 0.02),
    },
  }
}
