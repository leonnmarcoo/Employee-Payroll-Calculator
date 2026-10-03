import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('The payroll screen could not render.', error.message, info.componentStack) }
  render() {
    if (this.state.failed) return <main className="grid min-h-screen place-items-center bg-[#f4f6fb] p-6"><section className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm" role="alert"><h1 className="text-xl font-bold text-[#35408e]">The calculator could not open</h1><p className="mt-3 text-sm text-slate-500">Your saved drafts are still in the database. Reload the page to try again.</p><button className="mt-5 rounded-lg bg-[#35408e] px-4 py-2 text-white" onClick={() => window.location.reload()}>Reload calculator</button></section></main>
    return this.props.children
  }
}
