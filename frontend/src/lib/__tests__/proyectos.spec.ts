import { describe, it, expect } from 'vitest'
import { plazoCorreccion, visibilidadDe } from '../proyectos'

describe('visibilidadDe', () => {
  it('no publicado es Privado, sin importar su validación', () => {
    expect(visibilidadDe({ publicado: false, estadoValidacion: 'VALIDADO' }).label).toBe('Privado')
    expect(visibilidadDe({ publicado: false, estadoValidacion: 'PENDIENTE' }).label).toBe('Privado')
  })

  it('publicado y validado es Público', () => {
    const v = visibilidadDe({ publicado: true, estadoValidacion: 'VALIDADO' })
    expect(v.label).toBe('Público')
    expect(v.severity).toBe('success')
  })

  it('publicado pero sin validar queda en espera', () => {
    expect(visibilidadDe({ publicado: true, estadoValidacion: 'PENDIENTE' }).label).toBe('Público (en espera)')
    expect(visibilidadDe({ publicado: true, estadoValidacion: 'RECHAZADO' }).label).toBe('Público (en espera)')
  })
})

describe('plazoCorreccion', () => {
  const ahora = new Date('2026-11-23T12:00:00Z')
  const dentroDe = (horas: number) => new Date(ahora.getTime() + horas * 3600_000).toISOString()

  it('sin fecha límite no hay plazo', () => {
    expect(plazoCorreccion(null, ahora)).toBeNull()
  })

  it('cuenta los días restantes', () => {
    expect(plazoCorreccion(dentroDe(7 * 24), ahora)).toMatchObject({ texto: 'Quedan 7 días', vencido: false, severity: 'info' })
    expect(plazoCorreccion(dentroDe(36), ahora)).toMatchObject({ texto: 'Quedan 2 días', severity: 'warn' })
  })

  it('menos de un día: vence hoy', () => {
    expect(plazoCorreccion(dentroDe(5), ahora)).toMatchObject({ texto: 'Vence hoy', vencido: false, severity: 'danger' })
  })

  it('fecha pasada: vencido', () => {
    expect(plazoCorreccion(dentroDe(-2), ahora)).toMatchObject({ texto: 'Plazo vencido hoy', vencido: true })
    expect(plazoCorreccion(dentroDe(-25), ahora)).toMatchObject({ texto: 'Plazo vencido hace 1 día', vencido: true })
    expect(plazoCorreccion(dentroDe(-24 * 3 - 1), ahora)?.texto).toBe('Plazo vencido hace 3 días')
  })
})
