import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from './api'
import { calculateForm, normalizeForm, validateForm } from './records'
import type { DraftSummary, Employee, FieldErrors, PayrollForm } from './records'
import { newWorkspace, recoverWorkspace, recoveryKey, signature, workspaceFromDraft } from './workspace'

type Confirmation = { title: string; message: string; action: string; run: () => void }
type Notice = { kind: 'success' | 'error'; message: string }

export function usePayroll() {
  const [workspace, setWorkspace] = useState(recoverWorkspace)
  const [touched, setTouched] = useState<Partial<Record<keyof PayrollForm, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState('')
  const busyRef = useRef(false)
  const [revision, setRevision] = useState(0)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [undo, setUndo] = useState<{ id: string; version: number } | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [storageWarning, setStorageWarning] = useState(false)
  const form = workspace.form
  const dirty = signature(form) !== workspace.savedSignature
  const errors = { ...validateForm(form, submitted), ...serverErrors }
  const computed = useMemo(() => {
    try { return { result: calculateForm(form), error: '' } }
    catch (error) { return { result: null, error: error instanceof Error ? error.message : 'Check your payroll amounts.' } }
  }, [form])
  const exportReady = !!computed.result && Object.keys(validateForm(form, true)).length === 0

  useEffect(() => {
    try { sessionStorage.setItem(recoveryKey, JSON.stringify(workspace)); setStorageWarning(false) }
    catch { setStorageWarning(true) }
  }, [workspace])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api.employees(form.employeeId, controller.signal).then(items => {
        if (!controller.signal.aborted) setEmployees(items)
      }).catch(() => { if (!controller.signal.aborted) setEmployees([]) })
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [form.employeeId, revision])

  function change<K extends keyof PayrollForm>(key: K, value: PayrollForm[K]) {
    setWorkspace(current => ({ ...current, form: { ...current.form, [key]: value } }))
    setServerErrors({}); setNotice(null)
  }
  function focusError(fields: FieldErrors) {
    requestAnimationFrame(() => document.getElementById(Object.keys(fields)[0])?.focus())
  }
  async function perform(label: string, action: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current = true; setBusy(label); setNotice(null)
    try { await action() }
    catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'Something went wrong. Please try again.' })
      if (error instanceof ApiError) { setServerErrors(error.fields); focusError(error.fields) }
    } finally { busyRef.current = false; setBusy('') }
  }
  function save(event?: FormEvent) {
    event?.preventDefault()
    if (busyRef.current) return
    setSubmitted(true)
    const normalized = normalizeForm(form)
    const invalid = validateForm(normalized, true)
    if (Object.keys(invalid).length || computed.error) {
      setNotice({ kind: 'error', message: computed.error || 'Please correct the highlighted fields before saving.' })
      focusError(invalid); return
    }
    void perform('Saving…', async () => {
      const draft = await api.save(workspace.id, workspace.version, normalized)
      setWorkspace(workspaceFromDraft(draft)); setRevision(value => value + 1)
      setServerErrors({}); setSubmitted(false); setTouched({})
      setNotice({ kind: 'success', message: draft.calculation ? 'Draft saved. You can reopen it from Saved Drafts.' : 'Incomplete draft saved. Add a salary when you are ready.' })
    })
  }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (!confirmation) save() }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  })
  function clearFeedback() { setTouched({}); setSubmitted(false); setServerErrors({}) }
  function withDiscard(title: string, action: string, run: () => void) {
    if (dirty) setConfirmation({ title, action, message: 'You have unsaved changes. Continuing will replace the current form. Saved drafts will still be available.', run })
    else run()
  }
  function reset() {
    withDiscard('Reset this form?', 'Reset', () => {
      setWorkspace(newWorkspace()); clearFeedback(); setNotice({ kind: 'success', message: 'Form reset. Your saved drafts are still available.' })
      requestAnimationFrame(() => document.getElementById('employeeId')?.focus())
    })
  }
  function openDraft(id: string) {
    withDiscard('Open another draft?', 'Open draft', () => void perform('Opening…', async () => {
      const draft = await api.get(id)
      setWorkspace(workspaceFromDraft(draft)); clearFeedback()
      setNotice({ kind: 'success', message: `Opened ${draft.form.employeeName}’s draft.` })
      document.getElementById('workspace-heading')?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }))
  }
  function deleteDraft(draft: DraftSummary) {
    setConfirmation({ title: 'Delete this draft?', action: 'Delete draft',
      message: `Remove ${draft.employeeName}’s ${draft.payrollMonth} ${draft.payPeriod === 'first' ? '1st' : '2nd'} half draft? You can undo this deletion.${draft.id === workspace.id && dirty ? ' Unsaved changes to this draft will also be discarded.' : ''}`,
      run: () => void perform('Deleting…', async () => {
        const result = await api.remove(draft.id, draft.version)
        setUndo(result); setRevision(value => value + 1)
        if (draft.id === workspace.id) { setWorkspace(newWorkspace()); clearFeedback() }
        setNotice({ kind: 'success', message: 'Draft deleted. Use Undo deletion to restore it.' })
      }) })
  }
  function restoreDraft() {
    if (!undo) return
    void perform('Restoring…', async () => {
      await api.restore(undo.id, undo.version)
      setUndo(null); setRevision(value => value + 1)
      setNotice({ kind: 'success', message: 'Draft restored to Saved Drafts.' })
    })
  }
  function blur(key: keyof PayrollForm) {
    setTouched(current => ({ ...current, [key]: true }))
    if (key !== 'employeeId' || workspace.version !== null || form.employeeName.trim()) return
    const employeeId = form.employeeId.trim().toUpperCase()
    const apply = (employee: Employee | undefined) => {
      if (!employee) return
      setWorkspace(current => {
        if (current.version !== null || current.form.employeeId.trim().toUpperCase() !== employeeId || current.form.employeeName.trim()) return current
        return { ...current, form: { ...current.form, ...employee,
          position: current.form.position || employee.position, department: current.form.department || employee.department,
          monthlySalary: current.form.monthlySalary || employee.monthlySalary } }
      })
    }
    const employee = employees.find(item => item.employeeId === employeeId)
    if (employee) apply(employee)
    else if (employeeId) void api.employees(employeeId).then(items => apply(items.find(item => item.employeeId === employeeId))).catch(() => {})
  }
  return { workspace, form, dirty, touched, submitted, errors, serverErrors, notice, setNotice, busy, revision,
    confirmation, setConfirmation, undo, employees, storageWarning, computed, exportReady,
    change, blur, save, reset, openDraft, deleteDraft, restoreDraft }
}
