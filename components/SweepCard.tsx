'use client'

import { ReactNode, CSSProperties } from 'react'

type Props = {
  children: ReactNode
  accent?: string
  radius?: number
  opacity?: number
  duration?: number
  delay?: number
  background?: string
  padding?: string | number
  stroke?: number
  style?: CSSProperties
  className?: string
}

export default function SweepCard({
  children,
  accent = '#7A00FF',
  radius = 16,
  opacity = 0.35,
  duration = 4,
  delay = 0,
  background = '#0B0616',
  padding = 22,
  stroke = 1.5,
  style,
  className,
}: Props) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: radius + stroke,
        padding: stroke,
        overflow: 'hidden',
        ...style,
      }}
    >
      {}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '280%',
          height: '280%',
          background: `conic-gradient(from 0deg, transparent 0deg 220deg, ${accent} 270deg, #ffffff 308deg, ${accent} 340deg, transparent 360deg)`,
          animation: `sweep ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          opacity,
          pointerEvents: 'none',
        }}
      />
      {}
      <div
        style={{
          position: 'relative',
          borderRadius: radius,
          background,
          padding,
        }}
      >
        {children}
      </div>
    </div>
  )
}