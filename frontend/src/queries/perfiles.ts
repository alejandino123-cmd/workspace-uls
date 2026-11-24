import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { listarDestacados, listarPerfiles, obtenerFiltros, type FiltrosPerfiles } from '@/service'

// Portafolio público con caché. `keepPreviousData` mantiene la lista visible mientras carga la siguiente página.
export function usePortafolios(filtros: MaybeRefOrGetter<FiltrosPerfiles>) {
  return useQuery({
    queryKey: computed(() => ['portafolios', toValue(filtros)]),
    queryFn: () => listarPerfiles(toValue(filtros)),
    placeholderData: keepPreviousData,
  })
}

export function useDestacados() {
  return useQuery({
    queryKey: ['portafolios-destacados'],
    queryFn: listarDestacados,
  })
}

export function useFiltrosPublicos() {
  return useQuery({
    queryKey: ['portafolios-filtros'],
    queryFn: obtenerFiltros,
    staleTime: 5 * 60 * 1000,
  })
}
