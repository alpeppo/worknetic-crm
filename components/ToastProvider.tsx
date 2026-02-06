'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  createdAt: number
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

/* -------------------------------------------------- */
/*  Context & Hook                                     */
/* -------------------------------------------------- */

const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
  removeToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const TOAST_DURATION = 4000 // ms
const MAX_VISIBLE = 5

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
}

const COLOR_MAP: Record<ToastType, string> = {
  success: 'var(--color-green)',
  error: 'var(--color-red)',
  info: 'var(--color-blue)',
  warning: 'var(--color-orange)',
}

/* -------------------------------------------------- */
/*  Provider                                           */
/* -------------------------------------------------- */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [exiting, setExiting] = useState<Set<string>>(new Set())
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const removeToast = useCallback((id: string) => {
    // Start exit animation
    setExiting((prev) => new Set(prev).add(id))

    // After animation completes, remove from state
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      setExiting((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300) // matches animation duration

    // Clear the auto-dismiss timer if it exists
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const newToast: Toast = { id, message, type, createdAt: Date.now() }

      setToasts((prev) => {
        const next = [...prev, newToast]
        // If we exceed max, remove the oldest ones
        if (next.length > MAX_VISIBLE) {
          const overflow = next.slice(0, next.length - MAX_VISIBLE)
          overflow.forEach((t) => {
            const timer = timersRef.current.get(t.id)
            if (timer) {
              clearTimeout(timer)
              timersRef.current.delete(t.id)
            }
          })
          return next.slice(-MAX_VISIBLE)
        }
        return next
      })

      // Auto-dismiss timer
      const timer = setTimeout(() => {
        removeToast(id)
      }, TOAST_DURATION)
      timersRef.current.set(id, timer)
    },
    [removeToast],
  )

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast Container */}
      <div style={containerStyle}>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            isExiting={exiting.has(toast.id)}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* -------------------------------------------------- */
/*  Toast Item                                         */
/* -------------------------------------------------- */

function ToastItem({
  toast,
  isExiting,
  onClose,
}: {
  toast: Toast
  isExiting: boolean
  onClose: () => void
}) {
  const accentColor = COLOR_MAP[toast.type]

  return (
    <div
      style={{
        ...toastStyle,
        animation: isExiting
          ? 'toast-exit 300ms var(--ease-out) forwards'
          : 'toast-enter 300ms var(--ease-spring) forwards',
      }}
    >
      {/* Icon */}
      <div style={{ ...iconStyle, color: accentColor }}>{ICON_MAP[toast.type]}</div>

      {/* Message */}
      <p style={messageStyle}>{toast.message}</p>

      {/* Close button */}
      <button
        onClick={onClose}
        style={closeButtonStyle}
        aria-label="Close notification"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div style={progressTrackStyle}>
        <div
          style={{
            ...progressBarStyle,
            backgroundColor: accentColor,
            animation: `toast-progress ${TOAST_DURATION}ms linear forwards`,
          }}
        />
      </div>

      {/* Inline keyframes */}
      <style>{keyframes}</style>
    </div>
  )
}

/* -------------------------------------------------- */
/*  Keyframes (injected once per toast, deduped by     */
/*  the browser)                                       */
/* -------------------------------------------------- */

const keyframes = `
@keyframes toast-enter {
  0% {
    opacity: 0;
    transform: translateX(100%);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-exit {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(40px);
  }
}

@keyframes toast-progress {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}
`

/* -------------------------------------------------- */
/*  Inline Styles                                      */
/* -------------------------------------------------- */

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 9999,
  pointerEvents: 'none',
}

const toastStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  paddingBottom: '18px',
  minWidth: 320,
  maxWidth: 420,
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 16,
  boxShadow:
    '0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  overflow: 'hidden',
  willChange: 'transform, opacity',
}

const iconStyle: React.CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const messageStyle: React.CSSProperties = {
  flex: 1,
  margin: 0,
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.4,
  color: 'var(--color-text)',
}

const closeButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
  padding: 0,
  transition: 'background 150ms ease, color 150ms ease',
}

const progressTrackStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 3,
  background: 'var(--color-border)',
  borderRadius: '0 0 16px 16px',
  overflow: 'hidden',
}

const progressBarStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '0 0 16px 16px',
}
