// components/SweepCard.tsx
'use client'

import { ReactNode, CSSProperties } from 'react'

type Props = {
  children: ReactNode
  /** Cor principal do sweep. Default: roxo do app. */
  accent?: string
  /** Raio interno em px. */
  radius?: number
  /** Opacidade do sweep (0–1). Mais baixo = mais sutil. */
  opacity?: number
  /** Duração da rotação em segundos. Mais alto = mais elegante. */
  duration?: number
  /** Delay (use negativo pra começar fora de fase — cria stagger entre vários cards). */
  delay?: number
  /** Fundo sólido interno. Importante: tem que ser opaco senão o sweep vaza. */
  background?: string
  /** Padding interno. */
  padding?: string | number
  /** Largura da stroke (espessura da borda iluminada). */
  stroke?: number
  style?: CSSProperties
  className?: string
}

/**
 * Card com light sweep girando na borda — efeito "CC Light Rays" estilo AE.
 * Requer `@keyframes sweep` já no globals.css.
 */
export default function SweepCard({
  children,
  accent = '#9333FF',
  radius = 16,
  opacity = 0.35,
  duration = 4,
  delay = 0,
  background = '#150e24',
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
      {/* light sweep girando */}
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
      {/* conteúdo com fundo opaco */}
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