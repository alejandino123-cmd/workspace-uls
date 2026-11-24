// Punto único de importación de los servicios de la API:
//   import { listarMisProyectos, mensajeDeError, type Proyecto } from '@/service'
// El cliente HTTP (`api`) queda interno: las vistas usan siempre estas funciones.
export * from './catalogo'
export * from './chatBot'
export * from './dosPasos'
export * from './errores'
export * from './perfil'
export * from './perfiles'
export * from './proyectos'
export * from './validaciones'
