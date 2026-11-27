// Notificaciones del estudiante. No hay tabla propia: salen de sus proyectos RECHAZADOS,
// que ya traen el motivo (validacion.comentario) y el plazo de corrección (7 días por defecto).
import type { Proyecto } from '@/service'
import { plazoCorreccion, type Plazo } from './proyectos'

export interface Notificacion {
  // Cambia cuando Coordinación vuelve a rechazar el proyecto, así la notificación reaparece como nueva
  clave: string
  proyectoId: number
  titulo: string
  motivo: string | null
  fechaLimite: string | null
  plazo: Plazo | null
}

type ProyectoNotificable = Pick<Proyecto, 'id' | 'titulo' | 'estadoValidacion' | 'fechaLimiteCorreccion' | 'validacion'>

export function notificacionesDe(proyectos: ProyectoNotificable[], ahora: Date = new Date()): Notificacion[] {
  return proyectos
    .filter((p) => p.estadoValidacion === 'RECHAZADO')
    .map((p) => ({
      clave: `rechazo-${p.id}-${p.validacion?.createdAt ?? p.fechaLimiteCorreccion ?? ''}`,
      proyectoId: p.id,
      titulo: p.titulo,
      motivo: p.validacion?.comentario ?? null,
      fechaLimite: p.fechaLimiteCorreccion,
      plazo: plazoCorreccion(p.fechaLimiteCorreccion, ahora),
    }))
    .sort((a, b) => (a.fechaLimite ?? '').localeCompare(b.fechaLimite ?? ''))
}

// Qué notificaciones ya vio el usuario, guardado en su navegador (por usuario)
const claveAlmacen = (userId: number) => `notificaciones-vistas-${userId}`

export function leerVistas(userId: number): string[] {
  try {
    const crudo = localStorage.getItem(claveAlmacen(userId))
    const datos: unknown = crudo ? JSON.parse(crudo) : []
    return Array.isArray(datos) ? datos.filter((d): d is string => typeof d === 'string') : []
  } catch {
    return []
  }
}

export function guardarVistas(userId: number, claves: string[]) {
  try {
    localStorage.setItem(claveAlmacen(userId), JSON.stringify(claves))
  } catch {
    // Sin acceso al almacenamiento, la campana simplemente vuelve a avisar
  }
}

export function sinVer(notificaciones: Notificacion[], vistas: string[]): Notificacion[] {
  return notificaciones.filter((n) => !vistas.includes(n.clave))
}
