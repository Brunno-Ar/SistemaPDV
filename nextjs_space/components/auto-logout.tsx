
'use client'

import { useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'

export function AutoLogout() {
  const { data: session, status } = useSession() || {}

  useEffect(() => {
    // Só executa no cliente
    if (typeof window === 'undefined') return

    // Verificar se é uma nova sessão do navegador (não apenas nova aba)
    // localStorage persiste entre abas, sessionStorage não
    const browserSessionId = localStorage.getItem('pdv_browser_session_id')
    const tabSessionId = sessionStorage.getItem('pdv_tab_session_id')
    
    if (status === 'authenticated') {
      // Se não tem ID de browser session, significa que o navegador foi fechado e reaberto
      if (!browserSessionId && !tabSessionId) {
        // Nova sessão do navegador - força logout
        signOut({ redirect: false }).then(() => {
          sessionStorage.clear()
          localStorage.clear()
          window.location.href = '/login'
        })
      } else {
        // Sessão ativa - atualiza os IDs
        const currentTime = Date.now().toString()
        if (!browserSessionId) {
          localStorage.setItem('pdv_browser_session_id', currentTime)
        }
        if (!tabSessionId) {
          sessionStorage.setItem('pdv_tab_session_id', currentTime)
        }
      }
    }
  }, [status])

  return null
}
