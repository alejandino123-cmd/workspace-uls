import { api } from './api'
import type { Proyecto, EstadoValidacion } from './proyectos'
import type { Disponibilidad } from './perfil'

// Todos estos endpoints exigen rol COORDINACION.

export interface AutorProyecto {
  id: number
  nombre: string
  email: string
  carnet: string | null
}

// GET /validaciones/pendientes no incluye `publicado`, pero sí los datos del autor
export type ProyectoPendiente = Omit<Proyecto, 'publicado'> & { estudiante: AutorProyecto }

export async function listarPendientes() {
  const { data } = await api.get<ProyectoPendiente[]>('/validaciones/pendientes')
  return data
}

// Mismo formato que los pendientes; `validacion` trae la fecha y el comentario de la revisión
export type ProyectoValidado = ProyectoPendiente

export async function listarValidados() {
  const { data } = await api.get<ProyectoValidado[]>('/validaciones/validados')
  return data
}

export interface EvaluacionInput {
  estado: 'VALIDADO' | 'RECHAZADO'
  comentario?: string // obligatorio al rechazar
}

// 409 si el proyecto ya fue evaluado por otra persona
export async function evaluarProyecto(proyectoId: number, datos: EvaluacionInput) {
  const { data } = await api.post(`/validaciones/${proyectoId}`, datos)
  return data
}

// Búsqueda de estudiantes (GET /validaciones/estudiantes)
export interface EstudianteResumen {
  id: number
  nombre: string
  email: string
  carnet: string | null
  fotoUrl: string | null
  porcentajeAvance: number
}

export interface ListaEstudiantes {
  total: number
  page: number
  limit: number
  estudiantes: EstudianteResumen[]
}

export async function buscarEstudiantes(params: { buscar?: string; page?: number; limit?: number } = {}) {
  const { data } = await api.get<ListaEstudiantes>('/validaciones/estudiantes', { params })
  return data
}

// Perfil completo (GET /validaciones/estudiantes/:userId). Los proyectos vienen como conteo por estado.
export interface EstudianteCompleto {
  estudiante: { id: number; nombre: string; email: string; createdAt: string }
  perfil: {
    carnet: string | null
    fotoUrl: string | null
    porcentajeAvance: number
    historialAcademico: string | null
    disponibilidad: Disponibilidad | null
    habilidades: string[]
  }
  proyectos: Record<EstadoValidacion, number>
}

export async function obtenerEstudianteCompleto(userId: number) {
  const { data } = await api.get<EstudianteCompleto>(`/validaciones/estudiantes/${userId}`)
  return data
}

// Todos los proyectos del estudiante, sin importar su estado (GET /validaciones/estudiantes/:userId/proyectos)
export type ProyectoDelEstudiante = Omit<Proyecto, 'publicado'>

export interface ProyectosDelEstudiante {
  estudiante: { id: number; nombre: string; email: string; rol: string; carnet: string | null }
  proyectos: ProyectoDelEstudiante[]
}

export async function listarProyectosDeEstudiante(userId: number) {
  const { data } = await api.get<ProyectosDelEstudiante>(`/validaciones/estudiantes/${userId}/proyectos`)
  return data
}
