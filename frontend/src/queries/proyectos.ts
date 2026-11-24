import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  actualizarProyecto,
  eliminarProyecto,
  listarMisProyectos,
  obtenerRequisitosPublicacion,
  type ProyectoInput,
} from '@/service'

export const clavesProyectos = {
  misProyectos: ['mis-proyectos'] as const,
  requisitos: ['requisitos-publicacion'] as const,
}

// ¿El perfil tiene lo mínimo para publicar? Se vuelve a pedir al entrar (el perfil pudo cambiar)
export function useRequisitosPublicacion() {
  return useQuery({
    queryKey: clavesProyectos.requisitos,
    queryFn: obtenerRequisitosPublicacion,
    staleTime: 0,
  })
}

// Lista de mis proyectos, con caché y reintento automático
export function useMisProyectos() {
  return useQuery({
    queryKey: clavesProyectos.misProyectos,
    queryFn: listarMisProyectos,
  })
}

// Cambiar publicado o editar el contenido: después se vuelve a pedir la lista
export function useActualizarProyecto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: Partial<ProyectoInput> & { publicado?: boolean } }) =>
      actualizarProyecto(id, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesProyectos.misProyectos }),
  })
}

export function useEliminarProyecto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eliminarProyecto(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesProyectos.misProyectos }),
  })
}
