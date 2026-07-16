'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home, Brain, TrendingUp, Users, MessageCircle, Lightbulb,
  User, UserPlus, X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/AuthContext'
import { shouldShowParents } from '@/lib/age'
import StreakFlame from '@/components/Streakflame'

const navItems = [
  { href: '/dashboard',     icon: Home,          label: 'Início' },
  { href: '/profile',       icon: User,          label: 'Meu perfil' },
  { href: '/friends',       icon: UserPlus,      label: 'Amigos' },
  { href: '/study',         icon: Brain,         label: 'Estudar agora' },
  { href: '/methods',       icon: Lightbulb,     label: 'Métodos de estudo' },
  { href: '/progress',      icon: TrendingUp,    label: 'Meu progresso' },
  { href: '/parents',       icon: Users,         label: 'Painel dos pais' },
  { href: '/chat',          icon: MessageCircle, label: 'FlowBot IA' },
  { href: '/study-session', icon: Brain,         label: 'Estudar com IA' },
]

type Props = {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onClose }: Props) {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  const showParents = shouldShowParents(
    profile?.birth_date ?? null,
    profile?.wants_parental ?? false
  )

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    'Aluno'

  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null

  return (
    <aside
      className={`appshell-sidebar ${mobileOpen ? 'open' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 228,
        background: 'var(--card)',
        borderRight: '1px solid var(--p-line)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        zIndex: 50,
      }}
    >
      {}
      <button
        onClick={onClose}
        aria-label="Fechar menu"
        className="appshell-sidebar-close"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={16} color="#fff" />
      </button>

      {}
      <Link
        href="/dashboard"
        onClick={onClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          padding: '4px 6px',
        }}
      >
        <Image src="/logo.png" alt="FocusFlow" width={38} height={38} />
        <span
          style={{
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-0.02em',
          }}
        >
          FocusFlow
        </span>
      </Link>

      <StreakFlame />

      {}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
        {navItems
          .filter(({ href }) => href !== '/parents' || showParents)
          .map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <motion.div key={href} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={href}
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: active ? 'var(--ink)' : 'var(--ink-2)',
                    background: active ? 'var(--p-soft)' : 'transparent',
                    border: active ? '1px solid var(--p-line)' : '1px solid transparent',
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={18} color={active ? 'var(--p)' : 'var(--ink-2)'} />
                  {label}
                </Link>
              </motion.div>
            )
          })}
      </nav>

      {}
      <button
        onClick={() => signOut()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'var(--p-soft)',
          border: '1px solid var(--p-line)',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
        title="Clique para sair"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            width={32}
            height={32}
            referrerPolicy="no-referrer"
            style={{ borderRadius: '50%' }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--p)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: 'var(--ink)',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayName}
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>Sair</div>
        </div>
      </button>
    </aside>
  )
}