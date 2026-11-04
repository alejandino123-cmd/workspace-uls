// Convierte un error de axios en un mensaje legible para mostrar al usuario.
// El backend responde { error } o { error, detalles: [{ campo, mensaje }] }.

interface ErrorApi {
  response?: {
    data?: {
      error?: string
      detalles?: { campo: string; mensaje: string }[]
    }
  }
}

export function mensajeDeError(e: unknown, porDefecto = 'Ocurrió un error inesperado'): string {
  const err = e as ErrorApi
  if (!err?.response) return 'No se pudo conectar con el servidor'

  const data = err.response.data
  const detalle = data?.detalles?.[0]
  if (detalle) return detalle.campo ? `${detalle.campo}: ${detalle.mensaje}` : detalle.mensaje

  return data?.error ?? porDefecto
}