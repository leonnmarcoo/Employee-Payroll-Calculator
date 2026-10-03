import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { DraftSummary } from './records'

export const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
export const savedTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
export const secondaryButton = 'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600'
export const primaryButton = 'rounded-lg bg-[#35408e] px-4 py-2 text-sm font-semibold text-white'

export function ConfirmDialog({ title, message, action, onConfirm, onCancel }: {
  title: string; message: string; action: string; onConfirm: () => void; onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close() }, [])
  return <dialog ref={ref} className="confirm-dialog rounded-xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl" aria-labelledby="confirm-title" aria-describedby="confirm-message" onCancel={onCancel}>
    <h2 id="confirm-title" className="text-lg font-bold">{title}</h2>
    <p id="confirm-message" className="mt-3 text-sm leading-relaxed text-slate-500">{message}</p>
    <div className="mt-6 flex justify-end gap-2"><button type="button" autoFocus className={secondaryButton} onClick={onCancel}>Cancel</button><button type="button" className={primaryButton} onClick={onConfirm}>{action}</button></div>
  </dialog>
}

export function DraftHistory({ revision, activeId, disabled, onOpen, onDelete }: {
  revision: number; activeId: string; disabled: boolean; onOpen: (id: string) => void; onDelete: (draft: DraftSummary) => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [retry, setRetry] = useState(0)
  const [items, setItems] = useState<DraftSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { setPage(0) }, [revision])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    const timer = window.setTimeout(() => {
      api.list(query, page * 20, controller.signal).then(result => {
        if (controller.signal.aborted) return
        setItems(result.items); setTotal(result.total)
        if (result.total > 0 && page * 20 >= result.total) setPage(Math.max(0, Math.ceil(result.total / 20) - 1))
      }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query, page, revision, retry])
  return <section className="no-print rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="drafts-title">
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><h3 id="drafts-title" className="font-bold">Saved Drafts</h3><button type="button" className="text-xs font-semibold text-[#35408e]" disabled={loading || disabled} onClick={() => setRetry(value => value + 1)}>Refresh</button></div>
    <div className="p-6">
      <label className="text-xs font-semibold text-slate-500">Search drafts<input className="field" type="search" placeholder="Name, ID or month" maxLength={120} value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} /></label>
      {loading ? <p className="mt-4 text-sm text-slate-500" role="status">Loading drafts…</p>
        : error ? <div className="mt-4 text-sm text-red-700" role="alert"><p>{error}</p><button type="button" className="mt-3 font-semibold underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div>
        : items.length === 0 ? <p className="mt-4 text-sm text-slate-500">{query ? 'No matching drafts. Try a name, employee ID or month.' : 'No saved drafts yet. Fill in an employee and choose Save Draft.'}</p>
        : <><p className="mt-4 text-xs text-slate-400">{total} {total === 1 ? 'draft' : 'drafts'}</p><ul className="mt-2 divide-y divide-slate-100">{items.map(draft => <li key={draft.id} className="py-3">
          <button type="button" className="w-full rounded-lg text-left" disabled={disabled} aria-current={draft.id === activeId ? 'true' : undefined} onClick={() => onOpen(draft.id)}>
            <span className="block break-words text-sm font-semibold text-[#35408e]">{draft.employeeName}{draft.id === activeId && <span className="ml-2 text-xs font-normal text-slate-400">Open</span>}</span>
            <span className="mt-1 block break-words text-xs text-slate-500">{draft.employeeId} · {draft.payrollMonth} · {draft.payPeriod === 'first' ? '1st half' : '2nd half'}</span>
            <span className="mt-1 block text-sm font-semibold">{draft.netPay === null ? 'Incomplete draft' : money(draft.netPay)}</span>
          </button>
          <div className="mt-2 flex items-start justify-between gap-2"><time className="text-xs text-slate-400" dateTime={draft.updatedAt}>{savedTime(draft.updatedAt)}</time><button type="button" className="text-xs text-slate-500 hover:text-red-700" aria-label={`Delete draft for ${draft.employeeName}, ${draft.payrollMonth}, ${draft.payPeriod} half`} disabled={disabled} onClick={() => onDelete(draft)}>Delete</button></div>
        </li>)}</ul>
          {total > 20 && <div className="mt-4 flex items-center justify-between gap-2 text-xs"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page + 1} of {Math.ceil(total / 20)}</span><button type="button" disabled={(page + 1) * 20 >= total} onClick={() => setPage(value => value + 1)}>Next</button></div>}
        </>}
    </div>
  </section>
}

