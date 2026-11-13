// src/router/routes/public.routes.ts
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
        // Catálogo de proyectos publicados (buscador, filtros y paginación)
        path: 'proyectos',
        name: 'proyectos',
        component: () => import('@/views/public/ProyectosView.vue'),
      },
      {
        path: 'proyectos/:id',
        name: 'proyecto',
        component: () => import('@/views/public/ProyectoDetalleView.vue'),
        props: (ruta) => ({ id: Number(ruta.params.id) }),
      },
      {
        // Directorio de estudiantes con perfil público
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
