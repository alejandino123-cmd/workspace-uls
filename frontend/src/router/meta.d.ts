import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** La ruta exige sesión iniciada */
    requiresAuth?: boolean
    /** Roles que pueden entrar (ESTUDIANTE, COORDINACION, EMPRESA) */
    roles?: string[]
  }
}