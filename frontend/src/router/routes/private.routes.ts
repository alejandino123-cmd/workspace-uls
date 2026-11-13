// src/router/routes/private.routes.ts
import type { RouteRecordRaw } from 'vue-router'

// Zona privada: exige sesión (requiresAuth) y limita cada pantalla por rol (roles).
// El backend vuelve a validar el rol en cada endpoint; esto es solo para la experiencia de uso.
export const privateRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/layouts/PrivateLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'mis-proyectos',
        name: 'mis-proyectos',
        component: () => import('@/views/estudiante/MisProyectosView.vue'),
        meta: { roles: ['ESTUDIANTE'] },
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: () => import('@/views/estudiante/MiPerfilView.vue'),
        meta: { roles: ['ESTUDIANTE'] },
      },
      {
        path: 'perfil/editar',
        name: 'perfil-editar',
        component: () => import('@/views/estudiante/EditarPerfilView.vue'),
        meta: { roles: ['ESTUDIANTE'] },
      },
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/views/admin/AdminDashboard.vue'),
        meta: { roles: ['COORDINACION'] },
      },
      {
        path: 'admin/estudiantes',
        name: 'admin-estudiantes',
        component: () => import('@/views/admin/EstudiantesView.vue'),
        meta: { roles: ['COORDINACION'] },
      },
      {
        path: 'admin/estudiantes/:id',
        name: 'admin-estudiante-detalle',
        component: () => import('@/views/admin/EstudianteDetalleView.vue'),
        meta: { roles: ['COORDINACION'] },
      },
    ],
  },
]