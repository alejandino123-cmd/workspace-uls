import { api } from './api'

// Catálogo público de proyectos. No requiere sesión.
// Solo llegan proyectos VALIDADOS por Coordinación y publicados por su estudiante.

export interface ProyectoResumen {
  id: number
  titulo: string
  descripcion: string
  tecnologias: string[]
  imagenUrl: string | null
  urlRepositorio: string | null
  urlDemo: string | null
  urlDocumentacion: string | null
  createdAt: string
  updatedAt: string
  estudiante: { id: number; nombre: string; fotoUrl: string | null }
}

export interface ProyectoDetalle extends Omit<ProyectoResumen, 'estudiante'> {
  estudiante: ProyectoResumen['estudiante'] & {
    especialidad: string | null
    biografia: string | null
    github: string | null
    linkedin: string | null
    sitioWeb: string | null
  }
}

export interface ListaProyectos {
  total: number
  page: number
  limit: number
  proyectos: ProyectoResumen[]
}

export interface FiltrosProyectos {
  buscar?: string
  tecnologia?: string
  anio?: number
  page?: number
  limit?: number
}

export interface TecnologiaPublica {
  nombre: string
  total: number
}

export async function listarProyectosPublicos(params: FiltrosProyectos = {}) {
  const limpio = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  const { data } = await api.get<ListaProyectos>('/catalogo/proyectos', { params: limpio })
  return data
}

export async function obtenerProyectoPublico(id: number) {
  const { data } = await api.get<ProyectoDetalle>(`/catalogo/proyectos/${id}`)
  return data
}

export async function listarTecnologiasPublicas(limite = 12) {
  const { data } = await api.get<TecnologiaPublica[]>('/catalogo/tecnologias', { params: { limite } })
  return data
}

export async function listarAniosPublicos() {
  const { data } = await api.get<number[]>('/catalogo/anios')
  return data
}
