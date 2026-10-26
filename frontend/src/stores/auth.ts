import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../service/api'

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<Usuario | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const rol = computed(() => user.value?.rol ?? null)

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })

    // Ajustar cuando veamos la respuesta real
    token.value = data.token ?? data.data?.token
    user.value = data.user ?? data.data?.user

    localStorage.setItem('token', token.value!)
    localStorage.setItem('user', JSON.stringify(user.value))
    
  }

  

  async function fetchUser() {
    const guardado = localStorage.getItem('user')
    if (token.value && guardado) {
      user.value = JSON.parse(guardado)
    }
  }

async function register(nombre: string, email: string, password: string) {
  await api.post('/auth/register', { nombre, email, password })
  await login(email, password)
}
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAuthenticated, rol, login, fetchUser, register, logout }
})