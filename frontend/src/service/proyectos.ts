import { api } from './api'

export type EstadoValidacion = 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO'

// Lo que devuelve GET /proyectos (mis proyectos)
export interface Proyecto {
  id: number
  titulo: string
  descripcion: string
  urlRepositorio: string | null
  urlDemo: string | null
  urlDocumentacion: string | null
  tecnologias: string[]
  imagenUrl: string | null
  estadoValidacion: EstadoValidacion
  publicado: boolean
  destacado: boolean
  // Solo en RECHAZADO: hasta cuándo puede corregirlo el estudiante
  fechaLimiteCorreccion: string | null
  createdAt: string
  updatedAt: string
  validacion: { comentario: string | null; createdAt: string } | null
}

// Lo que se envía al crear o editar. Las URLs vacías deben ir como null:
// el backend rechaza "" porque no es una URL válida.
export interface ProyectoInput {
  titulo: string
  descripcion: string
  urlRepositorio: string | null
  urlDemo: string | null
  urlDocumentacion: string | null
  tecnologias: string[]
}

export async function listarMisProyectos() {
  const { data } = await api.get<Proyecto[]>('/proyectos')
  return data
}

export async function crearProyecto(datos: ProyectoInput) {
  const { data } = await api.post<Proyecto>('/proyectos', datos)
  return data
}

// Editar el contenido devuelve el proyecto a PENDIENTE y borra su validación.
// Cambiar solo `publicado` no reinicia la revisión.
export async function actualizarProyecto(id: number, datos: Partial<ProyectoInput> & { publicado?: boolean }) {
  const { data } = await api.put<Proyecto>(`/proyectos/${id}`, datos)
  return data
}

export async function eliminarProyecto(id: number) {
  await api.delete(`/proyectos/${id}`)
}

// Para publicar se necesita foto de perfil, biografía y al menos una habilidad
export interface RequisitosPublicacion {
  cumple: boolean
  faltantes: string[]
}

export async function obtenerRequisitosPublicacion() {
  const { data } = await api.get<RequisitosPublicacion>('/proyectos/requisitos-publicacion')
  return data
}
// Vista previa del proyecto. Cambiarla vuelve el proyecto a PENDIENTE (igual que editar su contenido).
export const TAMANO_MAX_IMAGEN = 2 * 1024 * 1024
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']

export async function subirImagenProyecto(id: number, archivo: File) {
  const formData = new FormData()
  formData.append('imagen', archivo)
  const { data } = await api.put<Proyecto>(`/proyectos/${id}/imagen`, formData)
  return data
}

export async function quitarImagenProyecto(id: number) {
  const { data } = await api.delete<Proyecto>(`/proyectos/${id}/imagen`)
  return data
}
