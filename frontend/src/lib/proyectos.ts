// Reglas de presentación de proyectos: visibilidad, plazo de corrección y eventos de la línea de tiempo.
// Son funciones puras para poder probarlas sin montar componentes.
import type { EstadoValidacion, EventoProyecto } from '@/service'
type Severidad = 'success' | 'warn' | 'danger' | 'info' | 'secondary'

const DIA_MS = 24 * 60 * 60 * 1000

export interface Visibilidad {
  label: string
  severity: Severidad
  icon: string
  descripcion: string
}

// Un proyecto es visible para el público solo si el estudiante lo publicó y Coordinación lo validó
export function visibilidadDe(p: { publicado: boolean; estadoValidacion: EstadoValidacion }): Visibilidad {
  if (!p.publicado) {
    return { label: 'Privado', severity: 'secondary', icon: 'pi pi-lock', descripcion: 'Solo tú y la coordinación lo ven' }
  }
  if (p.estadoValidacion === 'VALIDADO') {
    return { label: 'Público', severity: 'success', icon: 'pi pi-globe', descripcion: 'Visible en tu portafolio público' }
  }
  return {
    label: 'Público (en espera)',
    severity: 'info',
    icon: 'pi pi-clock',
    descripcion: 'Se mostrará cuando la coordinación lo valide',
  }
}

export interface Plazo {
  texto: string
  vencido: boolean
  severity: Severidad
}

// Texto del plazo para corregir un proyecto rechazado, contado en días calendario
export function plazoCorreccion(fechaLimite: string | null, ahora: Date = new Date()): Plazo | null {
  if (!fechaLimite) return null
  const limite = new Date(fechaLimite)
  const restanteMs = limite.getTime() - ahora.getTime()
  if (restanteMs < 0) {
    const dias = Math.floor(-restanteMs / DIA_MS)
    return {
      texto: dias === 0 ? 'Plazo vencido hoy' : `Plazo vencido hace ${dias} día${dias === 1 ? '' : 's'}`,
      vencido: true,
      severity: 'danger',
    }
  }
  const dias = Math.ceil(restanteMs / DIA_MS)
  if (restanteMs < DIA_MS) return { texto: 'Vence hoy', vencido: false, severity: 'danger' }
  return {
    texto: `Quedan ${dias} día${dias === 1 ? '' : 's'}`,
    vencido: false,
    severity: dias <= 2 ? 'warn' : 'info',
  }
}

export const EVENTOS: Record<EventoProyecto, { label: string; icon: string; color: string }> = {
  CREADO: { label: 'Proyecto enviado', icon: 'pi pi-plus', color: 'var(--ws-primario)' },
  EDITADO: { label: 'Editado y reenviado a revisión', icon: 'pi pi-pencil', color: 'var(--ws-primario)' },
  CORREGIDO: { label: 'Corrección enviada', icon: 'pi pi-replay', color: '#f59e0b' },
  VALIDADO: { label: 'Validado', icon: 'pi pi-check', color: '#22c55e' },
  RECHAZADO: { label: 'Rechazado', icon: 'pi pi-times', color: '#ef4444' },
  PUBLICADO: { label: 'Publicado por el estudiante', icon: 'pi pi-globe', color: '#22c55e' },
  OCULTADO: { label: 'Ocultado por el estudiante', icon: 'pi pi-lock', color: 'var(--ws-texto-suave)' },
}
