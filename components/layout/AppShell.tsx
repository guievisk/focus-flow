'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import AnimatedBg from '../AnimatedBg'
import AuthGuard from '../AuthGuard'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <AuthGuard>
      <style>{`
        .appshell-root { min-height: 100vh; background: var(--bg); }

        .appshell-main {
          margin-left: 228px;
          padding: 30px 34px;
          min-height: 100vh;
          position: relative;
          z-index: 1;
        }

        .appshell-sidebar { transition: transform 0.3s ease; }

        .appshell-topbar { display: none; }
        .appshell-backdrop { display: none; }
        .appshell-sidebar-close { display: none; }

        @media (max-width: 768px) {
          .appshell-main {
            margin-left: 0;
            padding: 72px 16px 24px;
          }
          .appshell-sidebar {
            transform: translateX(-100%);
          }
          .appshell-sidebar.open {
            transform: translateX(0);
            box-shadow: 0 0 18px rgba(0,0,0,0.5);
          }
          .appshell-topbar {
            display: flex;
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 56px;
            background: rgba(15, 8, 30, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            align-items: center;
            padding: 0 12px;
            gap: 12px;
            z-index: 40;
          }
          .appshell-backdrop.open {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(2px);
            -webkit-backdrop-filter: blur(2px);
            z-index: 45;
          }
          .appshell-sidebar-close {
            display: flex;
          }
        }

        @media (max-width: 480px) {
          .appshell-main {
            padding: 70px 12px 20px;
          }
        }
      `}</style>

      <div className="appshell-root">
        <AnimatedBg />

        {}
        <header className="appshell-topbar">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Menu size={20} color="#fff" />
          </button>
          <Link
            href="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none',
            }}
          >
            <Image src="/logo.png" alt="FocusFlow" width={28} height={28} />
            <span style={{
              color: 'var(--ink)', fontWeight: 700, fontSize: 15,
              letterSpacing: '-0.02em',
            }}>
              FocusFlow
            </span>
          </Link>
        </header>

        {}
        <div
          className={`appshell-backdrop ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />

        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <main className="appshell-main">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}