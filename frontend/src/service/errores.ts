// Convierte un error de axios en un mensaje legible para mostrar al usuario.
// El backend responde { error } o { error, detalles: [{ campo, mensaje }] },
// y en las rutas con límite de intentos agrega { code, intentosRestantes, reintentarEnSegundos }.

interface DatosError {
  error?: string
  code?: string
  detalles?: { campo: string; mensaje: string }[]
  intentosRestantes?: number
  reintentarEnSegundos?: number
}

interface ErrorApi {
  response?: { status?: number; data?: DatosError }
}

export function mensajeDeError(e: unknown, porDefecto = 'Ocurrió un error inesperado'): string {
  const err = e as ErrorApi
  if (!err?.response) return 'No se pudo conectar con el servidor'

  const data = err.response.data
  const detalle = data?.detalles?.[0]
  if (detalle) return detalle.campo ? `${detalle.campo}: ${detalle.mensaje}` : detalle.mensaje

  return data?.error ?? porDefecto
}

// Error del inicio de sesión o del código de verificación en dos pasos, listo para la pantalla
export interface ErrorAuth {
  mensaje: string
  codigo?: string
  intentosRestantes?: number
  // Si se agotaron los intentos: segundos hasta poder volver a intentar
  bloqueadoSegundos?: number
  // La verificación en dos pasos venció: hay que volver a escribir correo y contraseña
  verificacionVencida: boolean
}

export function errorDeAuth(e: unknown, porDefecto = 'No se pudo iniciar sesión'): ErrorAuth {
  const err = e as ErrorApi
  if (!err?.response) return { mensaje: 'No se pudo conectar con el servidor', verificacionVencida: false }

  const data = err.response.data ?? {}
  const resultado: ErrorAuth = {
    mensaje: data.detalles?.[0]?.mensaje ?? data.error ?? porDefecto,
    codigo: data.code,
    intentosRestantes: data.intentosRestantes,
    verificacionVencida: data.code === 'VERIFICACION_VENCIDA',
  }
  if (err.response.status === 429) {
    resultado.intentosRestantes = 0
    resultado.bloqueadoSegundos = data.reintentarEnSegundos ?? 300
  }
  return resultado
}

// "Te queda 1 intento" / "Te quedan 2 intentos" (null si no aplica o si ya no quedan)
export function textoIntentos(restantes: number | undefined): string | null {
  if (restantes === undefined || restantes <= 0) return null
  return `Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`} antes de un bloqueo temporal.`
}
