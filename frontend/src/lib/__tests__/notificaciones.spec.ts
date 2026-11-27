import { describe, it, expect } from 'vitest'
import { notificacionesDe, sinVer } from '../notificaciones'

const ahora = new Date('2026-11-23T12:00:00Z')
const base = { titulo: 'App', fechaLimiteCorreccion: null, validacion: null }

describe('notificacionesDe', () => {
  it('solo notifica los proyectos rechazados', () => {
    const lista = notificacionesDe(
      [
        { ...base, id: 1, estadoValidacion: 'PENDIENTE' },
        { ...base, id: 2, estadoValidacion: 'VALIDADO' },
        { ...base, id: 3, estadoValidacion: 'RECHAZADO' },
      ],
      ahora,
    )
    expect(lista.map((n) => n.proyectoId)).toEqual([3])
  })

  it('incluye motivo y plazo de 7 días', () => {
    const limite = new Date(ahora.getTime() + 7 * 24 * 3600_000).toISOString()
    const [n] = notificacionesDe(
      [
        {
          ...base,
          id: 5,
          estadoValidacion: 'RECHAZADO',
          fechaLimiteCorreccion: limite,
          validacion: { comentario: 'Falta el repositorio', createdAt: '2026-11-23T12:00:00Z' },
        },
      ],
      ahora,
    )
    expect(n!.motivo).toBe('Falta el repositorio')
    expect(n!.plazo?.texto).toBe('Quedan 7 días')
  })

  it('un nuevo rechazo genera otra clave y vuelve a notificar', () => {
    const rechazo = (createdAt: string) => ({
      ...base,
      id: 9,
      estadoValidacion: 'RECHAZADO' as const,
      validacion: { comentario: 'x', createdAt },
    })
    const primera = notificacionesDe([rechazo('2026-11-01T00:00:00Z')], ahora)
    const segunda = notificacionesDe([rechazo('2026-11-20T00:00:00Z')], ahora)
    expect(sinVer(segunda, [primera[0]!.clave])).toHaveLength(1)
    expect(sinVer(primera, [primera[0]!.clave])).toHaveLength(0)
  })
})
