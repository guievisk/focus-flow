'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'


const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })

type Props = {
  scene?: string
  fallback: React.ReactNode
  timeoutMs?: number
  className?: string
  style?: React.CSSProperties
}

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function SplineScene({
  scene,
  fallback,
  timeoutMs = 4000,
  className,
  style,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!scene || reduced || !canUseWebGL()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('fallback')
      return
    }

    setStatus('loading')
    timer.current = setTimeout(() => {
      setStatus(prev => (prev === 'ready' ? prev : 'fallback'))
    }, timeoutMs)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [scene, timeoutMs])

  const showFallback = status !== 'ready'

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {}
      {showFallback && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {fallback}
        </div>
      )}

      {}
      {scene && (status === 'loading' || status === 'ready') && (
        <Spline
          scene={scene}
          onLoad={() => {
            if (timer.current) clearTimeout(timer.current)
            setStatus('ready')
          }}
          onError={() => setStatus('fallback')}
          style={{
            width: '100%',
            height: '100%',
            opacity: status === 'ready' ? 1 : 0,
            transition: 'opacity .5s ease',
          }}
        />
      )}
    </div>
  )
}
