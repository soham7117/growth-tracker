import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'

/**
 * In-app replacements for window.confirm / window.alert.
 * `confirmDialog()` resolves true/false; `toast()` shows a short, self-dismissing message.
 * Render <DialogHost /> once near the app root.
 */
export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** "danger" styles the confirm button red and focuses Cancel first, so Enter can't destroy data by accident. */
  tone?: 'default' | 'danger'
}

type Pending = ConfirmOptions & { id: number; resolve: (ok: boolean) => void }
export type ToastKind = 'info' | 'success' | 'error'
interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

let nextId = 1
let pending: Pending[] = []
let toasts: ToastItem[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => void listeners.delete(cb)
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    pending = [...pending, { ...options, id: nextId++, resolve }]
    emit()
  })
}

function settle(id: number, ok: boolean) {
  const item = pending.find((p) => p.id === id)
  if (!item) return
  pending = pending.filter((p) => p.id !== id)
  emit()
  item.resolve(ok)
}

function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function toast(message: string, kind: ToastKind = 'info') {
  const id = nextId++
  toasts = [...toasts, { id, message, kind }].slice(-4)
  emit()
  setTimeout(() => dismissToast(id), kind === 'error' ? 7000 : 4000)
}

function ConfirmDialog({ item }: { item: Pending }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)
  const danger = item.tone === 'danger'

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    ;(danger ? cancelRef : okRef).current?.focus()
    return () => before?.focus?.() // give focus back to the button that opened the dialog
  }, [danger])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      settle(item.id, false)
    } else if (e.key === 'Tab') {
      // keep keyboard focus inside the dialog
      const order = [cancelRef.current, okRef.current].filter(Boolean) as HTMLElement[]
      const i = order.indexOf(document.activeElement as HTMLElement)
      e.preventDefault()
      order[(i + (e.shiftKey ? -1 : 1) + order.length) % order.length].focus()
    }
  }

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && settle(item.id, false)}>
      <div className="modal dialog" role="alertdialog" aria-modal="true" aria-labelledby={`dlg-t-${item.id}`} aria-describedby={item.message ? `dlg-m-${item.id}` : undefined} onKeyDown={onKeyDown}>
        <h2 id={`dlg-t-${item.id}`}>{item.title}</h2>
        {item.message && (
          <p id={`dlg-m-${item.id}`} className="sub dialog-msg">
            {item.message}
          </p>
        )}
        <div className="row end">
          <button ref={cancelRef} className="btn ghost" onClick={() => settle(item.id, false)}>
            {item.cancelLabel ?? 'Cancel'}
          </button>
          <button ref={okRef} className={`btn ${danger ? 'danger-solid' : ''}`} onClick={() => settle(item.id, true)}>
            {item.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DialogHost() {
  const dialogs = useSyncExternalStore(subscribe, () => pending)
  const messages = useSyncExternalStore(subscribe, () => toasts)
  return (
    <>
      {dialogs[0] && <ConfirmDialog key={dialogs[0].id} item={dialogs[0]} />}
      <div className="toasts" role="status" aria-live="polite">
        {messages.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span>{t.message}</span>
            <button className="x" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
