// components/three/SplineScene.tsx
'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

/*
  Wrapper da cena Spline.

  O runtime do Spline é pesado (ordem de MB) e só existe no browser, então:
  - carrega sob demanda (`ssr: false` — só funciona dentro de Client Component);
  - se não houver cena, se der erro, se estourar o timeout, se não houver WebGL
    ou se o usuário pedir menos movimento, cai no `fallback` e nunca monta o runtime.

  Enquanto NEXT_PUBLIC_SPLINE_CHAT_SCENE não estiver no .env.local, o fallback
  é o que aparece — a tela fica bonita e funcional sem a cena.
*/

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })

type Props = {
  /** URL .splinecode exportada pelo Spline (Code → React). Sem ela, renderiza o fallback. */
  scene?: string
  /** O que mostrar antes de carregar, e em definitivo se a cena não puder rodar. */
  fallback: React.ReactNode
  /** Tempo até desistir da cena e ficar no fallback. */
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
  // 'idle' = ainda decidindo | 'loading' = runtime montado, cena carregando
  // 'ready' = cena viva | 'fallback' = desistimos, fallback é definitivo
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Sem cena, sem WebGL ou com reduced-motion: nem carrega o runtime.
    // A decisão depende de APIs do browser (matchMedia/WebGL), que não existem
    // no SSR: o primeiro render é sempre 'idle' e só aqui dá para resolver.
    if (!scene || reduced || !canUseWebGL()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('fallback')
      return
    }

    setStatus('loading')
    timer.current = setTimeout(() => {
      // Só desiste se ainda não ficou pronta.
      setStatus(prev => (prev === 'ready' ? prev : 'fallback'))
    }, timeoutMs)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [scene, timeoutMs])

  const showFallback = status !== 'ready'

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {/* O fallback fica montado até a cena estar pronta — sem buraco na tela. */}
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

      {/* O runtime só monta quando há chance real de rodar. */}
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
