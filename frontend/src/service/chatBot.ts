import { api } from './api'

// Quita markdown: **negritas**, # títulos, líneas ---, tablas con |, viñetas, `código`
export function limpiarTexto(texto: string): string {
  return texto
    .replace(/```\w*\n?/g, '')
    .replace(/^[\s|:\-]*-{3,}[\s|:\-]*$/gm, '') // líneas --- y separadores de tabla
    .replace(/^#{1,6}\s+/gm, '') // # títulos
    .replace(/\*\*(.+?)\*\*/g, '$1') // **negrita**
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(?!\s)(.+?)\*/g, '$1') // *cursiva*
    .replace(/`([^`]+)`/g, '$1') // `código`
    .replace(/^\s*[-*•]\s+/gm, '') // viñetas
    .replace(/^\s*\|\s*/gm, '') // tablas: | al inicio
    .replace(/\s*\|\s*$/gm, '') // | al final
    .replace(/\s*\|\s*/g, ', ') // | intermedios
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface TarjetaEstudiante {
  id: number
  nombre: string
  especialidad: string | null
  fotoUrl: string | null
}

export interface TarjetaProyecto {
  id: number
  titulo: string
  imagenUrl: string | null
  tecnologias: string[]
  estudiante: string
}

export interface Tarjetas {
  estudiantes: TarjetaEstudiante[]
  proyectos: TarjetaProyecto[]
}

export interface RespuestaChat {
  texto: string
  tarjetas: Tarjetas
}

export const chatService = {
  async ask(message: string): Promise<RespuestaChat> {
    const { data } = await api.post<{ response: string; tarjetas?: Tarjetas }>('/chat', { message })
    return {
      texto: limpiarTexto(data.response),
      tarjetas: data.tarjetas ?? { estudiantes: [], proyectos: [] },
    }
  },
}