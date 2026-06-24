// components/AnimatedBg.tsx
'use client'

export default function AnimatedBg() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      {/* Orb principal roxo vibrante */}
      <div style={{
        position:'absolute', width:850, height:850, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(109,40,217,0.5) 0%, rgba(139,92,246,0.18) 45%, transparent 70%)',
        top:'2%', left:'18%', filter:'blur(50px)',
        animation:'orb1 16s ease-in-out infinite',
      }}/>
      {/* Orb violeta topo direito */}
      <div style={{
        position:'absolute', width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(139,92,246,0.45) 0%, transparent 65%)',
        top:'-8%', right:'4%', filter:'blur(60px)',
        animation:'orb2 20s ease-in-out infinite',
      }}/>
      {/* Orb azul-roxo inferior esquerdo */}
      <div style={{
        position:'absolute', width:520, height:520, borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(79,20,200,0.4) 0%, transparent 65%)',
        bottom:'0%', left:'-3%', filter:'blur(55px)',
        animation:'orb3 22s ease-in-out infinite',
      }}/>
      {/* Grid de pontos sutil */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:'radial-gradient(rgba(139,92,246,0.12) 1px, transparent 1px)',
        backgroundSize:'42px 42px',
        maskImage:'radial-gradient(ellipse 90% 90% at 50% 40%, black 30%, transparent 100%)',
        WebkitMaskImage:'radial-gradient(ellipse 90% 90% at 50% 40%, black 30%, transparent 100%)',
      }}/>
      {/* Overlay para legibilidade — mais claro que antes */}
      <div style={{ position:'absolute', inset:0, background:'rgba(14,14,26,0.4)' }}/>
    </div>
  )
}