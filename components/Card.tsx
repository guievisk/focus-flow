'use client'

import { useRef } from 'react'

export default function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    el.style.setProperty('--mx', `${x}px`)
    el.style.setProperty('--my', `${y}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouse}
      className="glass-card"
      style={style}
    >
      {children}
    </div>
  )
}