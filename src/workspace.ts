import { emptyForm, normalizeForm, validateForm } from './records'
import type { PayrollForm, Draft } from './records'

export type Workspace = { id: string; version: number | null; form: PayrollForm; savedSignature: string; updatedAt: string | null }
export const recoveryKey = 'payroll-workspace-v1'
export const signature = (form: PayrollForm) => JSON.stringify(form)
export function newWorkspace(): Workspace {
  const form = emptyForm()
  return { id: crypto.randomUUID(), version: null, form, savedSignature: signature(form), updatedAt: null }
}
export const workspaceFromDraft = (draft: Draft): Workspace => ({ id: draft.id, version: draft.version,
  form: draft.form, savedSignature: signature(draft.form), updatedAt: draft.updatedAt })
export function recoverWorkspace(): Workspace {
  try {
    const item = JSON.parse(sessionStorage.getItem(recoveryKey) || 'null')
    if (item && typeof item.id === 'string' && /^[a-f0-9-]{36}$/.test(item.id)
      && (item.version === null || Number.isSafeInteger(item.version) && item.version > 0)
      && typeof item.savedSignature === 'string' && (item.updatedAt === null || typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt)))) {
      // Preserve invalid input for correction, but never accept a malformed recovery payload.
      const form = normalizeForm(item.form)
      validateForm(form)
      return { ...item, form: item.form }
    }
  } catch { /* Unavailable storage or an old recovery entry must not prevent opening the app. */ }
  return newWorkspace()
}
