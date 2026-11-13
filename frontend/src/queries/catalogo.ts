import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import {
  listarAniosPublicos,
  listarProyectosPublicos,
  listarTecnologiasPublicas,
  obtenerProyectoPublico,
  type FiltrosProyectos,
} from '@/service/catalogo'

// Catálogo con filtros y paginación; `keepPreviousData` evita parpadeos al cambiar de página
export function useProyectosPublicos(filtros: MaybeRefOrGetter<FiltrosProyectos>) {
  return useQuery({
    queryKey: computed(() => ['catalogo-proyectos', toValue(filtros)]),
    queryFn: () => listarProyectosPublicos(toValue(filtros)),
    placeholderData: keepPreviousData,
  })
}

export function useProyectoPublico(id: MaybeRefOrGetter<number>) {
  return useQuery({
    queryKey: computed(() => ['catalogo-proyecto', toValue(id)]),
    queryFn: () => obtenerProyectoPublico(toValue(id)),
  })
}

export function useTecnologiasPublicas(limite = 12) {
  return useQuery({
    queryKey: ['catalogo-tecnologias', limite],
    queryFn: () => listarTecnologiasPublicas(limite),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAniosPublicos() {
  return useQuery({
    queryKey: ['catalogo-anios'],
    queryFn: listarAniosPublicos,
    staleTime: 5 * 60 * 1000,
  })
}
