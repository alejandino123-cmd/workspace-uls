// src/router/auth.routes.ts
import type { RouteRecordRaw } from 'vue-router'

export const authRoutes: Array<RouteRecordRaw> = [
{
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
  },
 
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
  },
]