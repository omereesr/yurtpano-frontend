import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import { closeSocket } from '../socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('yurtpano_user')
    return raw ? JSON.parse(raw) : null
  })

  // Token suresi dolduysa/gecersizse api.js bu event'i tetikler,
  // biz de kullaniciyi giris ekranina geri yolluyoruz.
  useEffect(() => {
    function handleUnauthorized() {
      closeSocket()
      setUser(null)
    }
    window.addEventListener('yurtpano:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('yurtpano:unauthorized', handleUnauthorized)
  }, [])

  const persist = (data) => {
    localStorage.setItem('yurtpano_token', data.token)
    localStorage.setItem('yurtpano_user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const login = useCallback(async (identifier, password) => {
    const data = await api.login(identifier, password)
    persist(data)
  }, [])

  const register = useCallback(async (payload) => {
    const data = await api.register(payload)
    persist(data)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('yurtpano_token')
    localStorage.removeItem('yurtpano_user')
    closeSocket()
    setUser(null)
  }, [])

  // Profil bilgilerinden (isim, oda no vb.) biri degisince, ust bardaki
  // avatar/isim gibi yerlerin de ANINDA guncellenmesi icin - onceden
  // sadece login/register'da user state'i set ediliyordu, profil
  // guncellemesi sadece ProfileTab'in kendi YEREL state'ini
  // guncelliyordu, ust bar eski ismi gostermeye devam ediyordu.
  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      localStorage.setItem('yurtpano_user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
