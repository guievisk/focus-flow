// components/AnimatedBg.tsx
'use client'

export default function AnimatedBg() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      {/* Orbs: roxo mais profundo e saturado, com halo bem menor. A opacidade
          baixa evita o véu claro que lavava o fundo e comia o contraste. */}
      <div style={{
        position:'absolute', width:850, height:850, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(90,0,196,0.22) 0%, rgba(122,0,255,0.07) 45%, transparent 70%)',
        top:'2%', left:'18%', filter:'blur(70px)',
        animation:'orb1 16s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(110,0,224,0.18) 0%, transparent 65%)',
        top:'-8%', right:'4%', filter:'blur(80px)',
        animation:'orb2 20s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', width:520, height:520, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(64,0,160,0.16) 0%, transparent 65%)',
        bottom:'0%', left:'-3%', filter:'blur(75px)',
        animation:'orb3 22s ease-in-out infinite',
      }}/>
      {/* Grid de pontos sutil */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:'radial-gradient(rgba(122,0,255,0.10) 1px, transparent 1px)',
        backgroundSize:'42px 42px',
        maskImage:'radial-gradient(ellipse 90% 90% at 50% 40%, black 30%, transparent 100%)',
        WebkitMaskImage:'radial-gradient(ellipse 90% 90% at 50% 40%, black 30%, transparent 100%)',
      }}/>
      {/* Scrim escuro: afunda o fundo e sobe o contraste do texto por cima. */}
      <div style={{ position:'absolute', inset:0, background:'rgba(5,3,8,0.72)' }}/>
    </div>
  )
}