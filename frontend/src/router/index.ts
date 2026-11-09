import { createRouter, createWebHistory } from 'vue-router'
import { authRoutes } from './routes/auth.routes'
import { publicRoutes } from './routes/public.routes'
import { privateRoutes } from './routes/private.routes'
import { authGuard } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...publicRoutes,
    ...authRoutes,
    ...privateRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
})

router.beforeEach(authGuard)

export default router