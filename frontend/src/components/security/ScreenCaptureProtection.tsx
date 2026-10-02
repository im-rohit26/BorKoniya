import React, { useEffect, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'

export const ScreenCaptureProtection: React.FC = () => {
  const [warningMessage, setWarningMessage] = useState<string | null>(null)

  useEffect(() => {
    // 1. Handle Keyboard Shortcuts (PrintScreen, Ctrl+S, Ctrl+P, F12, Ctrl+U, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault()
        showWarning('Screenshots are disabled on BorKonya to protect member privacy.')
        // Attempt to clear clipboard if possible
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('')
        }
      }

      // Ctrl + S (Save Page) or Cmd + S
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        showWarning('Saving pages or member details is disabled.')
      }

      // Ctrl + P (Print Page) or Cmd + P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        showWarning('Printing profile documents is prohibited.')
      }

      // F12 or Ctrl + Shift + I (Inspect Element / DevTools)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'))
      ) {
        // Prevent default devtools shortcut
        e.preventDefault()
        showWarning('Developer tools shortcut is restricted.')
      }

      // Ctrl + U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault()
        showWarning('Direct page source export is disabled.')
      }
    }

    // 2. Prevent right-click context menu on images and protected elements
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'IMG' ||
          target.closest('.protected-photo') ||
          target.closest('.photo-watermark-overlay') ||
          target.getAttribute('data-protected') === 'true')
      ) {
        e.preventDefault()
        showWarning('Right-click saving is disabled for profile photos.')
      }
    }

    // 3. Prevent Dragging on images
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target && target.tagName === 'IMG') {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('dragstart', handleDragStart)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('dragstart', handleDragStart)
    }
  }, [])

  const showWarning = (msg: string) => {
    setWarningMessage(msg)
    setTimeout(() => {
      setWarningMessage((prev) => (prev === msg ? null : prev))
    }, 3500)
  }

  if (!warningMessage) return null

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center space-x-3 rounded-2xl bg-navy-950/95 px-5 py-3 text-white shadow-2xl border border-crimson-600/40 backdrop-blur-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-crimson-700/20 text-crimson-300">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-crimson-300">Privacy Shield Active</h4>
          <p className="text-xs text-slate-200">{warningMessage}</p>
        </div>
        <button
          onClick={() => setWarningMessage(null)}
          className="ml-2 rounded-lg p-1 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
