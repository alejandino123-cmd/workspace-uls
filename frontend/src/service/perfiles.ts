import { api } from './api'
import type { Disponibilidad } from './perfil'
import type { Proyecto } from './proyectos'

// Endpoints públicos: no requieren sesión.

export interface PerfilPublicoResumen {
  id: number
  nombre: string
  porcentajeAvance: number
  disponibilidad: Disponibilidad | null
  habilidades: string[]
  fotoUrl: string | null
  totalProyectos: number
}

export interface ListaPerfiles {
  total: number
  page: number
  limit: number
  estudiantes: PerfilPublicoResumen[]
}

export async function listarPerfiles(params: { buscar?: string; page?: number; limit?: number } = {}) {
  const { data } = await api.get<ListaPerfiles>('/perfiles', { params })
  return data
}

// Los proyectos públicos no traen `publicado` ni `validacion`
export type ProyectoPublico = Omit<Proyecto, 'publicado' | 'validacion'>

export interface PortafolioPublico {
  estudiante: { id: number; nombre: string }
  perfil: {
    porcentajeAvance: number
    disponibilidad: Disponibilidad | null
    habilidades: string[]
    fotoUrl: string | null
  }
  proyectos: ProyectoPublico[]
}

export async function obtenerPortafolio(userId: number) {
  const { data } = await api.get<PortafolioPublico>(`/perfiles/${userId}`)
  return data
}