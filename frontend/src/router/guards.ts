import type { NavigationGuard } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { rutaInicio } from './helpers'

export const authGuard: NavigationGuard = async (to) => {
  const authStore = useAuthStore()

  // Al recargar la página el token sigue en el navegador, pero el usuario hay que recuperarlo
  if (authStore.token && !authStore.user) {
    await authStore.fetchUser()
  }

  // Rutas privadas: sin sesión, al login
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  // Rutas limitadas por rol: si el rol no corresponde, a su pantalla de inicio
  const roles = to.meta.roles
  if (roles && (!authStore.rol || !roles.includes(authStore.rol))) {
    return rutaInicio(authStore.rol)
  }

  // Con sesión activa no tiene sentido ver el login ni el registro
  if ((to.name === 'login' || to.name === 'register') && authStore.isAuthenticated) {
    return rutaInicio(authStore.rol)
  }
}