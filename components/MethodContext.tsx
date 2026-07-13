// components/MethodContext.tsx
// O "cérebro" que guarda qual método de estudo o usuário escolheu
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// IDs possíveis de métodos
export type MethodId =
  | 'pomodoro'
  | 'active-recall'
  | 'feynman'
  | 'cornell'
  | 'spaced'
  | 'interleaving'
  | null

// Formato do que o Context vai compartilhar
type MethodContextType = {
  method: MethodId
  setMethod: (m: MethodId) => void
}

// Cria o Context vazio
const MethodContext = createContext<MethodContextType>({
  method: null,
  setMethod: () => {},
})

// Provider — componente que "envolve" o site e fornece os dados
export function MethodProvider({ children }: { children: ReactNode }) {
  const [method, setMethodState] = useState<MethodId>(null)

  /*
   LINGUAGEM → useEffect + localStorage
      Ao carregar a página, lemos do localStorage qual método
      foi escolhido antes. Assim a escolha não se perde quando
      o usuário recarrega ou fecha o navegador.
  */
  useEffect(() => {
    // localStorage só existe no cliente — leitura pós-montagem é o padrão correto (SSR-safe).
    const saved = localStorage.getItem('focusflow-method') as MethodId
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setMethodState(saved)
  }, [])

  // Função que atualiza o método e salva no localStorage
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

// Hook para qualquer página ler/mudar o método facilmente
export function useMethod() {
  return useContext(MethodContext)
}