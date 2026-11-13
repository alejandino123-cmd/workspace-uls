import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../service/api'
import { queryClient } from '../lib/queryClient'

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<Usuario | null>(null)

  // URL de la foto de perfil (solo estudiantes). La comparten la barra superior y
  // la página Mi perfil: si una la cambia, la otra se entera sola.
  const fotoUrl = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const rol = computed(() => user.value?.rol ?? null)

  // Guarda la sesión en el store y en el navegador (lo usan login y register)
  function guardarSesion(t: string, u: Usuario) {
    token.value = t
    user.value = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  // Devuelve el token temporal si la cuenta tiene autenticación en dos pasos (no guarda sesión todavía)
  async function login(email: string, password: string): Promise<string | null> {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.requiere2fa) return data.tokenTemporal as string
    guardarSesion(data.token, data.user)
    return null
  }

  // Segundo paso del login: el código de la aplicación completa la sesión
  async function verificarDosPasos(tokenTemporal: string, codigo: string) {
    const { data } = await api.post('/auth/2fa/verificar', { tokenTemporal, codigo })
    guardarSesion(data.token, data.user)
  }

  async function register(nombre: string, email: string, password: string, carnet?: string) {
    const { data } = await api.post('/auth/register', {
      nombre,
      email,
      password,
      carnet: carnet || undefined, // si viene vacío no se manda
    })
    guardarSesion(data.token, data.user)
  }

  async function fetchUser() {
    const guardado = localStorage.getItem('user')
    if (token.value && guardado) {
      user.value = JSON.parse(guardado)
    }
  }

  // Tras cambiar el nombre en el perfil, la barra y el menú lo muestran sin volver a iniciar sesión
  function actualizarNombre(nombre: string) {
    if (!user.value) return
    user.value = { ...user.value, nombre }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  function logout() {
    token.value = null
    user.value = null
    fotoUrl.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Que los datos de esta cuenta no queden en caché para la siguiente
    queryClient.clear()
  }

  return { token, user, fotoUrl, isAuthenticated, rol, login, verificarDosPasos, fetchUser, register, logout, actualizarNombre }
})