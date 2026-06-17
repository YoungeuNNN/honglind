import { useEffect, useRef } from 'react'
import { useToastStore } from '@/stores/toastStore'

export function Toast() {
  const { message, visible } = useToastStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.className = visible ? 'toast show' : 'toast'
    }
  }, [visible])

  return <div ref={ref} className="toast">{message}</div>
}
