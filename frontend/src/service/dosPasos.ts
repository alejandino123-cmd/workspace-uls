import { api } from './api'

// Autenticación en dos pasos con aplicación de códigos (Google Authenticator u otra compatible TOTP)

export interface ConfiguracionDosPasos {
  secreto: string
  otpauthUrl: string
  qr: string
}

export interface ActivacionDosPasos {
  codigosRespaldo: string[]
}

export async function estadoDosPasos() {
  const { data } = await api.get<{ activo: boolean }>('/auth/2fa/estado')
  return data.activo
}

export async function configurarDosPasos() {
  const { data } = await api.post<ConfiguracionDosPasos>('/auth/2fa/configurar')
  return data
}

export async function activarDosPasos(codigo: string) {
  const { data } = await api.post<ActivacionDosPasos>('/auth/2fa/activar', { codigo })
  return data
}

export async function desactivarDosPasos(codigo: string) {
  await api.post('/auth/2fa/desactivar', { codigo })
}

// Segundo paso del inicio de sesión: canjea el token temporal y el código por la sesión
export async function verificarDosPasos(tokenTemporal: string, codigo: string) {
  const { data } = await api.post<{ user: { id: number; nombre: string; email: string; rol: string }; token: string }>(
    '/auth/2fa/verificar',
    { tokenTemporal, codigo },
  )
  return data
}
