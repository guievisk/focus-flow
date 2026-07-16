'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type MethodId =
  | 'pomodoro'
  | 'active-recall'
  | 'feynman'
  | 'cornell'
  | 'spaced'
  | 'interleaving'
  | null

type MethodContextType = {
  method: MethodId
  setMethod: (m: MethodId) => void
}

const MethodContext = createContext<MethodContextType>({
  method: null,
  setMethod: () => {},
})

export function MethodProvider({ children }: { children: ReactNode }) {
  const [method, setMethodState] = useState<MethodId>(null)

  useEffect(() => {
    const saved = localStorage.getItem('focusflow-method') as MethodId
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setMethodState(saved)
  }, [])

  const setMethod = (m: MethodId) => {
    setMethodState(m)
    if (m) localStorage.setItem('focusflow-method', m)
    else localStorage.removeItem('focusflow-method')
  }

  return (
    <MethodContext.Provider value={{ method, setMethod }}>
      {children}
    </MethodContext.Provider>
  )
}

export function useMethod() {
  return useContext(MethodContext)
}