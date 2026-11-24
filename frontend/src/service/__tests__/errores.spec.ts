import { describe, it, expect } from 'vitest'
import { errorDeAuth, mensajeDeError, textoIntentos } from '../errores'

const respuesta = (status: number, data: object) => ({ response: { status, data } })

describe('mensajeDeError', () => {
  it('sin respuesta: problema de conexión', () => {
    expect(mensajeDeError(new Error('Network Error'))).toBe('No se pudo conectar con el servidor')
  })

  it('usa el primer detalle de validación', () => {
    const e = respuesta(400, { error: 'Datos inválidos', detalles: [{ campo: 'titulo', mensaje: 'Muy corto' }] })
    expect(mensajeDeError(e)).toBe('titulo: Muy corto')
  })

  it('usa el error del backend o el mensaje por defecto', () => {
    expect(mensajeDeError(respuesta(404, { error: 'Proyecto no encontrado' }))).toBe('Proyecto no encontrado')
    expect(mensajeDeError(respuesta(500, {}), 'Falló')).toBe('Falló')
  })
})

describe('errorDeAuth', () => {
  it('credenciales inválidas con intentos restantes', () => {
    const info = errorDeAuth(respuesta(401, { error: 'Credenciales inválidas', code: 'CREDENCIALES_INVALIDAS', intentosRestantes: 2 }))
    expect(info).toMatchObject({ mensaje: 'Credenciales inválidas', codigo: 'CREDENCIALES_INVALIDAS', intentosRestantes: 2 })
    expect(info.bloqueadoSegundos).toBeUndefined()
    expect(info.verificacionVencida).toBe(false)
  })

  it('429: bloqueo con los segundos de espera', () => {
    const info = errorDeAuth(respuesta(429, { error: 'Demasiados intentos', reintentarEnSegundos: 240 }))
    expect(info.bloqueadoSegundos).toBe(240)
    expect(info.intentosRestantes).toBe(0)
  })

  it('detecta la verificación en dos pasos vencida', () => {
    const info = errorDeAuth(respuesta(401, { error: 'La verificación venció', code: 'VERIFICACION_VENCIDA' }))
    expect(info.verificacionVencida).toBe(true)
  })

  it('sin conexión', () => {
    expect(errorDeAuth({}).mensaje).toBe('No se pudo conectar con el servidor')
  })
})

describe('textoIntentos', () => {
  it('singular, plural y sin aviso', () => {
    expect(textoIntentos(2)).toContain('quedan 2 intentos')
    expect(textoIntentos(1)).toContain('queda 1 intento')
    expect(textoIntentos(0)).toBeNull()
    expect(textoIntentos(undefined)).toBeNull()
  })
})
