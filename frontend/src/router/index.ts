import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authRoutes } from './auth.routes'


// 1. Definimos el array de rutas con su tipo explícito
const routes: Array<RouteRecordRaw> = [
  { 
    path: '/', 
    redirect: '/login' 
  },

  ...authRoutes,

  {
    path: '/perfil',
    name: 'perfil',
    component: () => import('@/views/PerfilView.vue'),
    meta: { requiresAuth: true },
  },
  

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

// 3. Guardias de navegación (Auth Navigation Guard)
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (authStore.token && !authStore.user) {
    await authStore.fetchUser()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }
  
  if (to.name === 'login' && authStore.isAuthenticated) {
    return '/perfil'
  }
})

export default router