import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type Rol = 'estudiante' | 'docente' | 'admin'

export interface Usuario {
  id: number
  name: string
  email: string
  rol: Rol
}

// Datos falsos (se reemplazan cuando esté la API)
const USUARIOS_MOCK = [
  { id: 1, name: 'Ana Estudiante', email: 'estudiante@uls.edu.sv', password: '123456', rol: 'estudiante' as Rol },
  { id: 2, name: 'Carlos Docente', email: 'docente@uls.edu.sv', password: '123456', rol: 'docente' as Rol },
  { id: 3, name: 'Admin ULS', email: 'admin@uls.edu.sv', password: '123456', rol: 'admin' as Rol },
]

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<Usuario | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const rol = computed(() => user.value?.rol ?? null)

  async function login(email: string, password: string) {
    await esperar(600) // simula la espera de la API

    const encontrado = USUARIOS_MOCK.find(
      (u) => u.email === email && u.password === password,
    )
    if (!encontrado) {
      throw new Error('Credenciales incorrectas')
    }

    const { password: _omitida, ...usuario } = encontrado
    token.value = `mock-token-${usuario.id}`
    user.value = usuario

    localStorage.setItem('token', token.value)
    localStorage.setItem('user', JSON.stringify(usuario))
  }

  // Recupera la sesión al recargar la página
  async function fetchUser() {
    const guardado = localStorage.getItem('user')
    if (token.value && guardado) {
      user.value = JSON.parse(guardado)
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAuthenticated, rol, login, fetchUser, logout }
})