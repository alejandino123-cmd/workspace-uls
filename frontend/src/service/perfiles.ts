import { api } from './api'
import type { Disponibilidad } from './perfil'
import type { ProyectoResumen } from './catalogo'

// Endpoints públicos: no requieren sesión.

export interface PerfilPublicoResumen {
  id: number
  nombre: string
  porcentajeAvance: number
  disponibilidad: Disponibilidad | null
  habilidades: string[]
  fotoUrl: string | null
  especialidad: string | null
  totalProyectos: number
}

export interface ListaPerfiles {
  total: number
  page: number
  limit: number
  estudiantes: PerfilPublicoResumen[]
}

export interface FiltrosPerfiles {
  buscar?: string
  habilidad?: string
  tecnologia?: string
  disponibilidad?: Disponibilidad
  page?: number
  limit?: number
}

export async function listarPerfiles(params: FiltrosPerfiles = {}) {
  // Sin valores vacíos en la URL
  const limpio = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  const { data } = await api.get<ListaPerfiles>('/perfiles', { params: limpio })
  return data
}

export interface OpcionesFiltro {
  habilidades: string[]
  tecnologias: string[]
  disponibilidades: Disponibilidad[]
}

export async function obtenerFiltros() {
  const { data } = await api.get<OpcionesFiltro>('/perfiles/filtros')
  return data
}

// Mismo formato que el catálogo público (ver service/catalogo.ts)
export type ProyectoDestacado = ProyectoResumen

// Proyecto dentro del portafolio de un estudiante (sin datos del estudiante, que ya se muestran arriba)
export interface ProyectoPublico {
  id: number
  titulo: string
  descripcion: string
  urlRepositorio: string | null
  urlDemo: string | null
  urlDocumentacion: string | null
  tecnologias: string[]
  imagenUrl: string | null
  createdAt: string
  updatedAt: string
}

export async function listarDestacados() {
  const { data } = await api.get<ProyectoDestacado[]>('/perfiles/destacados')
  return data
}

export interface PortafolioPublico {
  estudiante: { id: number; nombre: string }
  perfil: {
    porcentajeAvance: number
    disponibilidad: Disponibilidad | null
    habilidades: string[]
    fotoUrl: string | null
    especialidad: string | null
    biografia: string | null
    github: string | null
    linkedin: string | null
    sitioWeb: string | null
    cvUrl: string | null
  }
  proyectos: ProyectoPublico[]
}

export async function obtenerPortafolio(userId: number) {
  const { data } = await api.get<PortafolioPublico>(`/perfiles/${userId}`)
  return data
}
