import { api } from './api'
import type { Proyecto } from './proyectos'

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

export interface EvaluacionInput {
  estado: 'VALIDADO' | 'RECHAZADO'
  comentario?: string // obligatorio al rechazar
}

// 409 si el proyecto ya fue evaluado por otra persona
export async function evaluarProyecto(proyectoId: number, datos: EvaluacionInput) {
  const { data } = await api.post(`/validaciones/${proyectoId}`, datos)
  return data
}