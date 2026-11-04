// src/router/public.routes.ts
import type { RouteRecordRaw } from 'vue-router'

export const publicRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/layouts/PublicLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/public/HomeView.vue'),
      },
      {
        path: 'portafolios',
        name: 'portafolios',
        component: () => import('@/views/public/PortafoliosView.vue'),
      },
      {
        path: 'portafolios/:userId',
        name: 'portafolio',
        component: () => import('@/views/public/PortafolioDetalleView.vue'),
        props: true, // userId llega como prop
      },
    ],
  },
]