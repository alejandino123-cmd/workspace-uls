import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import LineaTiempoProyecto from '../LineaTiempoProyecto.vue'
import type { EventoHistorial } from '@/service'

const obtenerHistorial = vi.fn<(id: number) => Promise<EventoHistorial[]>>()
vi.mock('@/service', async (original) => ({
  ...(await original<typeof import('@/service')>()),
  obtenerHistorial: (id: number) => obtenerHistorial(id),
}))

const coord = { id: 9, nombre: 'Coordinación', rol: 'COORDINACION' }
const ana = { id: 1, nombre: 'Ana López', rol: 'ESTUDIANTE' }

const evento = (e: Partial<EventoHistorial>): EventoHistorial => ({
  id: Math.random(),
  evento: 'CREADO',
  comentario: null,
  fechaLimite: null,
  fueraDePlazo: false,
  createdAt: '2026-11-01T15:00:00Z',
  actor: ana,
  ...e,
})

const montar = (proyectoId = 5) => mount(LineaTiempoProyecto, { props: { proyectoId }, global: { plugins: [PrimeVue] } })

// Con llaves: si beforeEach devuelve una función, Vitest la ejecuta como limpieza al terminar cada prueba
beforeEach(() => {
  obtenerHistorial.mockReset()
})

describe('LineaTiempoProyecto', () => {
  it('muestra los eventos en orden con motivo, plazo y quién lo hizo', async () => {
    obtenerHistorial.mockResolvedValue([
      evento({ evento: 'CREADO' }),
      evento({ evento: 'RECHAZADO', actor: coord, comentario: 'Falta el README', fechaLimite: '2026-11-08T15:00:00Z' }),
      evento({ evento: 'CORREGIDO', fueraDePlazo: true }),
    ])
    const wrapper = montar()
    await flushPromises()

    expect(obtenerHistorial).toHaveBeenCalledWith(5)
    const items = wrapper.findAll('li')
    expect(items.map((li) => li.attributes('data-evento'))).toEqual(['CREADO', 'RECHAZADO', 'CORREGIDO'])
    expect(items[1]!.text()).toContain('Rechazado')
    expect(items[1]!.text()).toContain('Falta el README')
    expect(items[1]!.text()).toContain('Plazo para corregir')
    expect(items[1]!.text()).toContain('Coordinación')
    expect(items[2]!.text()).toContain('Fuera de plazo')
  })

  it('avisa si no hay eventos', async () => {
    obtenerHistorial.mockResolvedValue([])
    const wrapper = montar()
    await flushPromises()
    expect(wrapper.text()).toContain('Sin eventos registrados')
  })

  it('muestra el error si no se pudo cargar', async () => {
    obtenerHistorial.mockRejectedValue(Object.assign(new Error('Error del servidor'), { response: { status: 500, data: {} } }))
    const wrapper = montar()
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo cargar la línea de tiempo')
  })

  it('vuelve a cargar al cambiar de proyecto', async () => {
    obtenerHistorial.mockResolvedValue([])
    const wrapper = montar(1)
    await flushPromises()
    await wrapper.setProps({ proyectoId: 2 })
    await flushPromises()
    expect(obtenerHistorial).toHaveBeenLastCalledWith(2)
  })
})
