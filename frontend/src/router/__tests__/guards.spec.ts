import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'
import { authGuard } from '../guards'
import { rutaInicio } from '../helpers'
import { useAuthStore } from '@/stores/auth'

// Ejecuta el guard con una ruta mínima
function navegar(ruta: Partial<RouteLocationNormalized>) {
  const destino = { meta: {}, ...ruta } as RouteLocationNormalized
  return authGuard(destino, destino, () => {})
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('rutaInicio', () => {
  it('lleva a cada rol a su pantalla', () => {
    expect(rutaInicio('COORDINACION')).toBe('/admin')
    expect(rutaInicio('ESTUDIANTE')).toBe('/mis-proyectos')
    expect(rutaInicio('EMPRESA')).toBe('/')
    expect(rutaInicio(null)).toBe('/')
  })
})

describe('authGuard', () => {
  it('sin sesión, una ruta privada manda al login', async () => {
    expect(await navegar({ meta: { requiresAuth: true } })).toBe('/login')
  })

  it('las rutas públicas pasan sin sesión', async () => {
    expect(await navegar({ name: 'proyectos' })).toBeUndefined()
  })

  it('un estudiante no entra a rutas de coordinación', async () => {
    const auth = useAuthStore()
    auth.token = 'token'
    auth.user = { id: 1, nombre: 'Ana', email: 'ana@uls.edu.sv', rol: 'ESTUDIANTE' }
    expect(await navegar({ meta: { requiresAuth: true, roles: ['COORDINACION'] } })).toBe('/mis-proyectos')
  })

  it('con sesión, el login redirige a la pantalla del rol', async () => {
    const auth = useAuthStore()
    auth.token = 'token'
    auth.user = { id: 2, nombre: 'Coord', email: 'c@uls.edu.sv', rol: 'COORDINACION' }
    expect(await navegar({ name: 'login' })).toBe('/admin')
  })

  it('al recargar con token recupera el usuario antes de decidir', async () => {
    const auth = useAuthStore()
    auth.token = 'token'
    const fetchUser = vi.spyOn(auth, 'fetchUser').mockImplementation(async () => {
      auth.user = { id: 1, nombre: 'Ana', email: 'ana@uls.edu.sv', rol: 'ESTUDIANTE' }
    })
    expect(await navegar({ meta: { requiresAuth: true, roles: ['ESTUDIANTE'] } })).toBeUndefined()
    expect(fetchUser).toHaveBeenCalledOnce()
  })
})
