// components/FlowMascot.tsx
'use client'

import Image from 'next/image'

export type FlowExpression = 'neutral' | 'happy' | 'content' | 'kissing' | 'thinking'
export type FlowAnimation = 'none' | 'float' | 'breathe' | 'bob'

const SOURCES: Record<FlowExpression, string> = {
  neutral:  '/bubble.png',
  happy:    '/happy.png',
  content:  '/content.png',
  kissing:  '/kissing.png',
  thinking: '/thinking.png',
}

const ANIMATIONS: Record<FlowAnimation, string | undefined> = {
  none:    undefined,
  float:   'flow-float 3.5s ease-in-out infinite',
  breathe: 'flow-breathe 2.8s ease-in-out infinite',
  bob:     'flow-bob 2.6s ease-in-out infinite',
}

type Props = {
  expression?: FlowExpression
  size?: number
  /** Animação idle: 'breathe' é ideal pra slime, 'float' sobe/desce, 'bob' balanceia. */
  animation?: FlowAnimation
  className?: string
  style?: React.CSSProperties
  priority?: boolean
}

export default function FlowMascot({
  expression = 'neutral',
  size = 120,
  animation = 'breathe',
  className,
  style,
  priority = false,
}: Props) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        animation: ANIMATIONS[animation],
        transformOrigin: 'center bottom',
        userSelect: 'none',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <Image
        src={SOURCES[expression]}
        alt={`Flow — ${expression}`}
        width={size}
        height={size}
        priority={priority}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      <style>{`
        @keyframes flow-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes flow-breathe {
          0%, 100% { transform: scale(1, 1); }
          50%      { transform: scale(1.04, 0.96); }
        }
        @keyframes flow-bob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-4px) rotate(2deg); }
        }
      `}</style>
    </div>
  )
}