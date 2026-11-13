import { api } from './api'

export type Disponibilidad = 'TIEMPO_COMPLETO' | 'TIEMPO_PARCIAL' | 'SOLO_PROYECTOS'

export const DISPONIBILIDADES: { value: Disponibilidad; label: string }[] = [
  { value: 'TIEMPO_COMPLETO', label: 'Tiempo completo' },
  { value: 'TIEMPO_PARCIAL', label: 'Tiempo parcial' },
  { value: 'SOLO_PROYECTOS', label: 'Solo proyectos' },
]

export function etiquetaDisponibilidad(valor: Disponibilidad | null | undefined): string {
  return DISPONIBILIDADES.find((d) => d.value === valor)?.label ?? ''
}

export interface Perfil {
  id: number
  carnet: string | null
  porcentajeAvance: number
  historialAcademico: string | null
  disponibilidad: Disponibilidad | null
  habilidades: string[]
  fotoUrl: string | null
  cvUrl: string | null
  telefono: string | null
  ubicacion: string | null
  especialidad: string | null
  biografia: string | null
  github: string | null
  linkedin: string | null
  sitioWeb: string | null
}

// Datos de la cuenta (el correo es solo lectura)
export interface Cuenta {
  nombre: string
  email: string
}

// PUT /perfil acepta cualquier subconjunto de estos campos.
// El nombre se guarda en la cuenta; el resto en el perfil. La foto va en PUT /perfil/foto.
export type PerfilInput = Partial<Omit<Perfil, 'id' | 'fotoUrl'>> & { nombre?: string }

export async function obtenerPerfil() {
  const { data } = await api.get<{ perfil: Perfil; cuenta: Cuenta }>('/perfil')
  return data.perfil
}

export async function obtenerPerfilCompleto() {
  const { data } = await api.get<{ perfil: Perfil; cuenta: Cuenta }>('/perfil')
  return data
}

export async function actualizarPerfil(datos: PerfilInput) {
  const { data } = await api.put<{ perfil: Perfil }>('/perfil', datos)
  return data.perfil
}

// Foto de perfil (se guarda en Cloudinary; el backend devuelve el perfil con la nueva fotoUrl).
// Axios arma solo el multipart cuando recibe un FormData.
export async function subirFotoPerfil(archivo: File) {
  const datos = new FormData()
  datos.append('foto', archivo)
  const { data } = await api.put<{ perfil: Perfil }>('/perfil/foto', datos)
  return data.perfil
}

export async function quitarFotoPerfil() {
  const { data } = await api.delete<{ perfil: Perfil }>('/perfil/foto')
  return data.perfil
}

// Currículum en PDF (máximo 5 MB). El backend lo guarda en Cloudinary y devuelve el perfil con cvUrl.
export async function subirCv(archivo: File) {
  const datos = new FormData()
  datos.append('cv', archivo)
  const { data } = await api.put<{ cvUrl: string | null }>('/perfil/cv', datos)
  return data.cvUrl
}

export async function quitarCv() {
  await api.delete('/perfil/cv')
}
