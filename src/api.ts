import type { Draft, DraftSummary, Employee, FieldErrors, PayrollForm } from './records'

export class ApiError extends Error {
  fields: FieldErrors
  status: number
  constructor(message: string, status = 0, fields: FieldErrors = {}) {
    super(message); this.status = status; this.fields = fields
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  const timer = window.setTimeout(abort, 12_000)
  try {
    const response = await fetch(`/api${path}`, { ...options, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Payroll-Client': '1', ...options.headers } })
    if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('Saving is unavailable. Open the app with its payroll server running.')
    const data = await response.json()
    if (!response.ok) throw new ApiError(data.error || 'The request failed. Please try again.', response.status, data.fields)
    return data as T
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (error instanceof ApiError) throw error
    throw new ApiError(controller.signal.aborted ? 'The server took too long to respond. Your form is still here; try again.'
      : 'Cannot reach the payroll server. Your form is still here; check the connection and try again.')
  } finally {
    window.clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}

export const api = {
  list: (query: string, offset = 0, signal?: AbortSignal) => request<{ items: DraftSummary[]; total: number }>(`/drafts?q=${encodeURIComponent(query)}&offset=${offset}`, { signal }),
  employees: (query: string, signal?: AbortSignal) => request<Employee[]>(`/employees?q=${encodeURIComponent(query)}`, { signal }),
  get: (id: string) => request<Draft>(`/drafts/${id}`),
  save: (id: string, version: number | null, form: PayrollForm) => request<Draft>(`/drafts/${id}`, { method: 'PUT', body: JSON.stringify({ version, form }) }),
  remove: (id: string, version: number) => request<{ id: string; version: number }>(`/drafts/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) }),
  restore: (id: string, version: number) => request<Draft>(`/drafts/${id}/restore`, { method: 'POST', body: JSON.stringify({ version }) }),
}

