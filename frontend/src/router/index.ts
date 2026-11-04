import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authRoutes } from './auth/auth'
import { publicRoutes } from './public.routes'
import { privateRoutes } from './private.routes'
import { rutaInicio } from './rutaInicio'

// 1. Definimos el array de rutas con su tipo explícito
const routes: Array<RouteRecordRaw> = [
  ...publicRoutes,
  ...authRoutes,
  ...privateRoutes,

  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue'),
  },
]

// 2. Creamos una sola instancia del Router
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 3. Guardias de navegación
router.beforeEach(async (to) => {
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
})

export default router